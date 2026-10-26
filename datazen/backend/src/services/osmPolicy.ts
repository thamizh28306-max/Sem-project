/**
 * OpenStreetMap, Nominatim, and Overpass Usage Policy Engine for DataZen.
 *
 * Implements strict adherence to:
 * - Nominatim Usage Policy (max 1 req/sec, valid identifying User-Agent with contact, caching, no autocomplete abuse).
 * - Overpass API Usage Guidelines (concurrency limits, backoff on 429/503, multi-mirror failover).
 * - Client-side rate limiting per IP (search: 30/min, nearby: 20/min).
 * - Bounded LRU cache with TTL (500 entries max; 24h search, 1h nearby).
 * - Request coalescing (single-flight) for simultaneous duplicate requests.
 * - Circuit breakers to protect upstream servers from hammering during outages.
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  public hits = 0;
  public misses = 0;

  constructor(public readonly capacity: number = 500, public readonly ttlMs: number = 24 * 60 * 60 * 1000) {}

  public get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      this.misses++;
      return null;
    }

    // Refresh LRU order (delete & re-insert)
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits++;
    return entry.value;
  }

  public set(key: string, value: T): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      // Evict least recently used (first key in insertion-ordered Map)
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }

    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  public has(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  public size(): number {
    return this.map.size;
  }

  public clear(): void {
    this.map.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public getHitRatePct(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return Math.round((this.hits / total) * 1000) / 10;
  }
}

export class CircuitBreaker {
  public state: "CLOSED" | "OPEN" = "CLOSED";
  public failures = 0;
  public openedAt = 0;

  constructor(
    public readonly name: string,
    public readonly failureThreshold: number = 3,
    public readonly resetTimeoutMs: number = 60_000
  ) {}

  public isOpen(): boolean {
    if (this.state === "OPEN") {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        // Half-open transition: allow next attempt
        this.state = "CLOSED";
        this.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  public recordSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
  }

  public recordFailure(): void {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = Date.now();
      console.warn(`[CIRCUIT BREAKER] Tripped OPEN for ${this.name} after ${this.failures} failures. Muting upstream for ${this.resetTimeoutMs / 1000}s.`);
    }
  }

  public reset(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.openedAt = 0;
  }
}

export class ThrottledQueue {
  private queue: Array<{
    task: () => Promise<any>;
    resolve: (val: any) => void;
    reject: (err: any) => void;
  }> = [];
  private activeCount = 0;
  private lastDispatchTime = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    public readonly name: string,
    public readonly minGapMs: number = 1000,
    public readonly maxQueueLength: number = 20,
    public readonly concurrency: number = 1
  ) {}

  public enqueue<T>(task: () => Promise<T>): Promise<T> {
    if (this.queue.length >= this.maxQueueLength) {
      const err: any = new Error("Upstream request queue is full. Please try again later.");
      err.code = "QUEUE_FULL";
      err.retryAfter = 5;
      return Promise.reject(err);
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.scheduleNext();
    });
  }

  private scheduleNext(): void {
    if (this.queue.length === 0 || this.activeCount >= this.concurrency) {
      return;
    }

    if (this.timer) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastDispatchTime;
    const waitTime = Math.max(0, this.minGapMs - elapsed);

    this.timer = setTimeout(() => {
      this.timer = null;
      this.dispatch();
    }, waitTime);
  }

  private async dispatch(): Promise<void> {
    if (this.queue.length === 0 || this.activeCount >= this.concurrency) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeCount++;
    this.lastDispatchTime = Date.now();

    try {
      const result = await item.task();
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    } finally {
      this.activeCount--;
      this.scheduleNext();
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const oldQueue = this.queue;
    this.queue = [];
    this.activeCount = 0;
    for (const item of oldQueue) {
      item.reject(new Error("Queue cleared"));
    }
  }
}

export class ClientRateLimiter {
  private clients = new Map<string, { count: number; windowStart: number }>();

  constructor(
    public readonly maxRequests: number = 30,
    public readonly windowMs: number = 60_000
  ) {}

  public check(ip: string): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const cleanIp = ip || "unknown-client";
    const record = this.clients.get(cleanIp);

    if (!record || now - record.windowStart >= this.windowMs) {
      this.clients.set(cleanIp, { count: 1, windowStart: now });
      return { allowed: true, remaining: this.maxRequests - 1, retryAfterSeconds: 0 };
    }

    if (record.count < this.maxRequests) {
      record.count++;
      return { allowed: true, remaining: this.maxRequests - record.count, retryAfterSeconds: 0 };
    }

    const retryAfter = Math.ceil((record.windowStart + this.windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  public reset(): void {
    this.clients.clear();
  }
}

export class SingleFlightCoalescer {
  private inFlight = new Map<string, Promise<any>>();

  public async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  public getInFlightCount(): number {
    return this.inFlight.size;
  }

  public clear(): void {
    this.inFlight.clear();
  }
}

export function checkUserAgent(ua?: string): { valid: boolean; userAgent: string; error?: string } {
  const raw = ua !== undefined ? ua : process.env.NOMINATIM_USER_AGENT;
  const val = (raw || "").trim();

  if (!val) {
    return {
      valid: false,
      userAgent: "",
      error: "Server is not configured with a contact User-Agent. Please configure NOMINATIM_USER_AGENT."
    };
  }

  const lower = val.toLowerCase();
  const isPlaceholder =
    lower.includes("<email") ||
    lower.includes("<your-email") ||
    lower.includes("<email or url>") ||
    lower.includes("example.com") ||
    lower.includes("placeholder");

  if (isPlaceholder) {
    return {
      valid: false,
      userAgent: val,
      error: "Server is not configured with a contact User-Agent (contains placeholder value)."
    };
  }

  return { valid: true, userAgent: val };
}

export function logUpstreamRequest(service: string, cached: boolean, status: number, durationMs: number): void {
  console.log(`[UPSTREAM] service=${service} cached=${cached} status=${status} duration=${durationMs}ms`);
}
