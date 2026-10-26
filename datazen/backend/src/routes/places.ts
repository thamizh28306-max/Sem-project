import { Router, Request, Response } from "express";
import {
  LRUCache,
  CircuitBreaker,
  ThrottledQueue,
  ClientRateLimiter,
  SingleFlightCoalescer,
  checkUserAgent,
  logUpstreamRequest,
} from "../services/osmPolicy";

const router = Router();

// ── Policy Instances & Caches ───────────────────────────────────────────────
// Search Cache: max 500 entries, 24 hours TTL
export const searchCache = new LRUCache<any[]>(500, 24 * 60 * 60 * 1000);

// Nearby Surroundings Cache: max 500 entries, 1 hour TTL
export const nearbyCache = new LRUCache<any>(500, 60 * 60 * 1000);

// Upstream Throttling Queues (concurrency = 1, min gap = 1000ms, max queue = 20)
export const nominatimQueue = new ThrottledQueue("Nominatim", 1000, 20, 1);
export const overpassQueue = new ThrottledQueue("Overpass", 1000, 20, 1);

// Circuit Breakers (trip after 3 consecutive failures, 60s cooldown)
export const nominatimBreaker = new CircuitBreaker("Nominatim", 3, 60_000);
export const overpassBreaker = new CircuitBreaker("Overpass", 3, 60_000);

// Per-client Rate Limiters (Search: 30/min, Nearby: 20/min per IP)
export const searchRateLimiter = new ClientRateLimiter(30, 60_000);
export const nearbyRateLimiter = new ClientRateLimiter(20, 60_000);

// Single-Flight Request Coalescers (collapse simultaneous identical requests)
export const searchCoalescer = new SingleFlightCoalescer();
export const nearbyCoalescer = new SingleFlightCoalescer();

// ── Config Helpers ──────────────────────────────────────────────────────────
export function getNominatimBaseUrl(): string {
  const url = process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
  return url.replace(/\/+$/, "");
}

export function getOverpassUrls(): string[] {
  const defaultMirrors = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  ];
  const envVal = process.env.OVERPASS_URLS;
  if (!envVal || !envVal.trim()) return defaultMirrors;
  const list = envVal.split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
  return list.length > 0 ? list : defaultMirrors;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

function parseRetryAfterSeconds(headerVal: string | null): number {
  if (!headerVal) return 2;
  const parsed = parseInt(headerVal, 10);
  if (!isNaN(parsed) && parsed > 0) return parsed;
  const date = Date.parse(headerVal);
  if (!isNaN(date)) {
    return Math.max(1, Math.ceil((date - Date.now()) / 1000));
  }
  return 2;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Category mapper for OSM tags
function categorizeElement(tags: Record<string, string> = {}): string | null {
  const amenity = tags.amenity || "";
  const shop = tags.shop || "";
  const leisure = tags.leisure || "";
  const highway = tags.highway || "";
  const railway = tags.railway || "";
  const station = tags.station || "";

  if (amenity === "school") return "school";
  if (amenity === "college" || amenity === "university") return "college";
  if (amenity === "hospital") return "hospital";
  if (amenity === "clinic" || amenity === "doctors") return "clinic";
  if (amenity === "pharmacy") return "pharmacy";
  if (shop === "supermarket" || shop === "mall") return "supermarket";
  if (amenity === "restaurant" || amenity === "cafe") return "restaurant";
  if (amenity === "bank" || amenity === "atm") return "bank";
  if (leisure === "park") return "park";
  if (highway === "bus_stop" || amenity === "bus_station") return "bus";
  if (
    station === "subway" ||
    railway === "subway_entrance" ||
    (railway === "station" && (tags.subway === "yes" || tags.station === "subway" || !tags.amenity))
  ) {
    return "metro";
  }

  return null;
}

// ─── GET /api/places/status ─────────────────────────────────────────────────
router.get("/status", (_req: Request, res: Response): void => {
  const uaCheck = checkUserAgent();
  res.json({
    status: "ok",
    user_agent_configured: uaCheck.valid,
    nominatim: {
      base_url: getNominatimBaseUrl(),
      queue_length: nominatimQueue.getQueueLength(),
      in_flight: searchCoalescer.getInFlightCount(),
      cache: {
        size: searchCache.size(),
        capacity: searchCache.capacity,
        hits: searchCache.hits,
        misses: searchCache.misses,
        hit_rate_pct: searchCache.getHitRatePct(),
      },
      circuit_breaker: {
        state: nominatimBreaker.state,
        failures: nominatimBreaker.failures,
      },
    },
    overpass: {
      mirrors: getOverpassUrls(),
      queue_length: overpassQueue.getQueueLength(),
      in_flight: nearbyCoalescer.getInFlightCount(),
      cache: {
        size: nearbyCache.size(),
        capacity: nearbyCache.capacity,
        hits: nearbyCache.hits,
        misses: nearbyCache.misses,
        hit_rate_pct: nearbyCache.getHitRatePct(),
      },
      circuit_breaker: {
        state: overpassBreaker.state,
        failures: overpassBreaker.failures,
      },
    },
    rate_limits: {
      search_per_minute: 30,
      nearby_per_minute: 20,
    },
  });
});

// ─── GET /api/places/search?q= ───────────────────────────────────────────────
router.get("/search", async (req: Request, res: Response): Promise<void> => {
  // 1. Validate User-Agent configuration
  const uaCheck = checkUserAgent();
  if (!uaCheck.valid) {
    res.status(503).json({ error: uaCheck.error });
    return;
  }

  // 2. Client-side Rate Limit check (30 requests/minute per IP)
  const clientIp = getClientIp(req);
  const rateLimit = searchRateLimiter.check(clientIp);
  if (!rateLimit.allowed) {
    res.set("Retry-After", String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: "Rate limit exceeded. Please wait a moment." });
    return;
  }

  // 3. Input sanitation & length capping
  const rawQ = String(req.query.q || "");
  const cleanQ = rawQ.replace(/[\x00-\x1F\x7F]/g, "").trim();

  if (cleanQ.length < 3) {
    res.status(400).json({ error: "Search query must be at least 3 characters" });
    return;
  }
  if (cleanQ.length > 100) {
    res.status(400).json({ error: "Search query must not exceed 100 characters" });
    return;
  }

  // 4. Cache check (normalized: lowercase, collapsed whitespace)
  const cacheKey = cleanQ.toLowerCase().replace(/\s+/g, " ");
  const cachedData = searchCache.get(cacheKey);
  if (cachedData) {
    logUpstreamRequest("Nominatim", true, 200, 0);
    res.json(cachedData);
    return;
  }

  // 5. Circuit Breaker check
  if (nominatimBreaker.isOpen()) {
    res.status(503).json({
      error: "Upstream Nominatim service is temporarily unavailable (circuit breaker open). Please try again shortly.",
    });
    return;
  }

  // 6. Request Coalescing (Single-Flight) & Upstream Queue
  try {
    const data = await searchCoalescer.run(cacheKey, async () => {
      // Re-check cache in case earlier coalesced call resolved
      const inFlightCached = searchCache.get(cacheKey);
      if (inFlightCached) return inFlightCached;

      return await nominatimQueue.enqueue(async () => {
        const startTime = Date.now();
        const baseUrl = getNominatimBaseUrl();
        const url = `${baseUrl}/search?format=json&q=${encodeURIComponent(
          cleanQ
        )}&countrycodes=in&viewbox=79.9,13.3,80.4,12.7&bounded=0&limit=5`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(url, {
            headers: {
              "User-Agent": uaCheck.userAgent,
              "Accept-Language": "en",
            },
            signal: controller.signal,
          });
          clearTimeout(timer);
          const duration = Date.now() - startTime;

          if (!response.ok) {
            logUpstreamRequest("Nominatim", false, response.status, duration);
            if (response.status === 429 || response.status === 503) {
              nominatimBreaker.recordFailure();
              const retryAfter = parseRetryAfterSeconds(response.headers.get("Retry-After"));
              const err: any = new Error(
                response.status === 429
                  ? "Nominatim rate limit reached. Please wait a moment."
                  : `Nominatim upstream error (${response.status})`
              );
              err.status = response.status;
              err.retryAfter = retryAfter;
              throw err;
            }
            nominatimBreaker.recordFailure();
            const err: any = new Error(`Nominatim upstream error (${response.status})`);
            err.status = 502;
            throw err;
          }

          const json = await response.json();
          logUpstreamRequest("Nominatim", false, response.status, duration);
          nominatimBreaker.recordSuccess();

          // Cache only successful non-empty results
          if (Array.isArray(json) && json.length > 0) {
            searchCache.set(cacheKey, json);
          }

          return json;
        } catch (fetchErr: any) {
          clearTimeout(timer);
          const duration = Date.now() - startTime;
          if (fetchErr.status) throw fetchErr;

          logUpstreamRequest("Nominatim", false, 502, duration);
          nominatimBreaker.recordFailure();
          const err: any = new Error("Failed to fetch from Nominatim search service");
          err.status = 502;
          throw err;
        }
      });
    });

    res.json(data);
  } catch (err: any) {
    if (err.code === "QUEUE_FULL") {
      res.set("Retry-After", String(err.retryAfter || 5));
      res.status(429).json({ error: err.message });
      return;
    }
    if (err.retryAfter) {
      res.set("Retry-After", String(err.retryAfter));
    }
    res.status(err.status || 502).json({ error: err.message || "Failed to fetch from Nominatim search service" });
  }
});

// ─── GET /api/places/nearby?lat=&lng=&radius= ────────────────────────────────
router.get("/nearby", async (req: Request, res: Response): Promise<void> => {
  // 1. Validate User-Agent configuration
  const uaCheck = checkUserAgent();
  if (!uaCheck.valid) {
    res.status(503).json({ error: uaCheck.error });
    return;
  }

  // 2. Client-side Rate Limit check (20 requests/minute per IP)
  const clientIp = getClientIp(req);
  const rateLimit = nearbyRateLimiter.check(clientIp);
  if (!rateLimit.allowed) {
    res.set("Retry-After", String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: "Rate limit exceeded. Please wait a moment." });
    return;
  }

  // 3. Input validation
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseInt(req.query.radius as string, 10);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "Valid 'lat' and 'lng' query parameters are required" });
    return;
  }

  // Validate radius: must be one of 500, 1000, 2000
  if (![500, 1000, 2000].includes(radius)) {
    res.status(400).json({ error: "Radius must be one of: 500, 1000, 2000 meters" });
    return;
  }

  // Validate coordinates inside Chennai metropolitan bounding box (lat 12.7-13.3, lng 79.9-80.4)
  if (lat < 12.7 || lat > 13.3 || lng < 79.9 || lng > 80.4) {
    res.status(400).json({
      error: `Coordinates (${lat}, ${lng}) are outside Chennai metro bounds (lat: 12.7 to 13.3, lng: 79.9 to 80.4).`
    });
    return;
  }

  // 4. Cache check (rounded to 3 decimals ~100m + radius)
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
  const cachedData = nearbyCache.get(cacheKey);
  if (cachedData) {
    logUpstreamRequest("Overpass", true, 200, 0);
    res.json(cachedData);
    return;
  }

  // 5. Circuit Breaker check
  if (overpassBreaker.isOpen()) {
    res.status(503).json({
      error: "Upstream Overpass service is temporarily unavailable (circuit breaker open). Please try again shortly."
    });
    return;
  }

  // 6. Request Coalescing (Single-Flight) & Upstream Queue
  try {
    const result = await nearbyCoalescer.run(cacheKey, async () => {
      // Re-check cache in case previous coalesced call resolved
      const inFlightCached = nearbyCache.get(cacheKey);
      if (inFlightCached) return inFlightCached;

      return await overpassQueue.enqueue(async () => {
        const query = `[out:json][timeout:25];(nwr(around:${radius},${lat},${lng})["amenity"~"^(school|college|university|hospital|clinic|doctors|pharmacy|restaurant|cafe|bank|atm|bus_station)$"];nwr(around:${radius},${lat},${lng})["shop"~"^(supermarket|mall)$"];nwr(around:${radius},${lat},${lng})["leisure"="park"];nwr(around:${radius},${lat},${lng})["highway"="bus_stop"];nwr(around:${radius},${lat},${lng})["railway"~"^(station|subway_entrance)$"];nwr(around:${radius},${lat},${lng})["station"="subway"];);out center tags;`;

        const mirrors = getOverpassUrls();
        let elements: any[] | null = null;
        let lastErrorMsg = "";

        for (let attempt = 0; attempt < mirrors.length; attempt++) {
          const mirrorUrl = mirrors[attempt];
          const startTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);

          try {
            const resp = await fetch(mirrorUrl, {
              method: "POST",
              body: "data=" + encodeURIComponent(query),
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": uaCheck.userAgent,
              },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            if (resp.ok) {
              const json: any = await resp.json();
              elements = json.elements || [];
              logUpstreamRequest("Overpass", false, resp.status, duration);
              overpassBreaker.recordSuccess();
              break;
            }

            logUpstreamRequest("Overpass", false, resp.status, duration);

            // If 429 or 503, inspect Retry-After and back off before next mirror
            if (resp.status === 429 || resp.status === 503) {
              const retryAfterSec = parseRetryAfterSeconds(resp.headers.get("Retry-After"));
              lastErrorMsg = `Mirror ${mirrorUrl} returned status ${resp.status} (Retry-After: ${retryAfterSec}s)`;
              console.warn(`[Overpass] Attempt ${attempt + 1} backoff: ${lastErrorMsg}`);
              if (attempt < mirrors.length - 1) {
                await new Promise((r) => setTimeout(r, Math.min(retryAfterSec * 1000, 3000)));
              }
            } else {
              lastErrorMsg = `Mirror ${mirrorUrl} returned status ${resp.status}`;
              console.warn(`[Overpass] Attempt ${attempt + 1} failed: ${lastErrorMsg}`);
            }
          } catch (e: any) {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            lastErrorMsg = e.name === "AbortError" ? `Timeout (25s) on ${mirrorUrl}` : (e.message || String(e));
            logUpstreamRequest("Overpass", false, 502, duration);
            console.warn(`[Overpass] Attempt ${attempt + 1} exception: ${lastErrorMsg}`);
          }
        }

        if (elements === null) {
          overpassBreaker.recordFailure();
          const err: any = new Error("Unable to retrieve nearby amenities from Overpass service. Please retry in a few moments.");
          err.status = 502;
          throw err;
        }

        // Process elements into categorized places
        const CATEGORIES = [
          "school", "college", "hospital", "clinic", "pharmacy",
          "supermarket", "restaurant", "bank", "park", "bus", "metro"
        ] as const;

        const grouped: Record<string, Array<{
          id: string | number;
          name: string;
          category: string;
          lat: number;
          lng: number;
          distance_km: number;
          distance_m: number;
        }>> = {};

        CATEGORIES.forEach((c) => { grouped[c] = []; });
        const allPlaces: Array<{
          id: string | number;
          name: string;
          category: string;
          lat: number;
          lng: number;
          distance_km: number;
          distance_m: number;
        }> = [];

        const counts: Record<string, number> = {};
        const nearest: Record<string, { name: string; distance_km: number }> = {};

        elements.forEach((el: any) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          if (!elLat || !elLng) return;

          const tags = el.tags || {};
          const cat = categorizeElement(tags);
          if (!cat) return;

          const cleanCategoryName = cat.replace("_", " ");
          const name = tags.name || tags["name:en"] || `Unnamed ${cleanCategoryName}`;
          const distKm = Math.round(haversineDistanceKm(lat, lng, elLat, elLng) * 100) / 100;
          const distM = Math.round(distKm * 1000);

          const list = grouped[cat] || [];
          const isDuplicate = list.some((item) => {
            if (item.name.toLowerCase() === name.toLowerCase()) {
              const itemDistM = haversineDistanceKm(item.lat, item.lng, elLat, elLng) * 1000;
              return itemDistM < 30;
            }
            return false;
          });

          if (!isDuplicate) {
            const placeItem = {
              id: el.id,
              name,
              category: cat,
              lat: elLat,
              lng: elLng,
              distance_km: distKm,
              distance_m: distM,
            };

            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(placeItem);
            allPlaces.push(placeItem);
          }
        });

        CATEGORIES.forEach((cat) => {
          grouped[cat].sort((a, b) => a.distance_m - b.distance_m);
          counts[cat] = grouped[cat].length;
          if (grouped[cat].length > 0) {
            nearest[cat] = {
              name: grouped[cat][0].name,
              distance_km: grouped[cat][0].distance_km,
            };
          }
        });
        allPlaces.sort((a, b) => a.distance_m - b.distance_m);

        const legacyCounts: Record<string, number> = {
          ...counts,
          metro_station: counts["metro"] || 0,
          bus_stop: counts["bus"] || 0,
          bank_atm: counts["bank"] || 0,
        };
        const legacyNearest: Record<string, { name: string; distance_km: number }> = {
          ...nearest,
          metro_station: nearest["metro"],
          bus_stop: nearest["bus"],
          bank_atm: nearest["bank"],
        };

        const responsePayload = {
          center: { lat, lng, radius },
          search_radius_m: radius,
          total_count: allPlaces.length,
          grouped,
          counts: legacyCounts,
          nearest: legacyNearest,
          school_dist_km: nearest["school"]?.distance_km ?? null,
          hospital_dist_km: nearest["hospital"]?.distance_km ?? null,
          bus_dist_km: nearest["bus"]?.distance_km ?? null,
          metro_dist_km: nearest["metro"]?.distance_km ?? null,
          supermarket_dist_km: nearest["supermarket"]?.distance_km ?? null,
          park_dist_km: nearest["park"]?.distance_km ?? null,
          places: allPlaces,
        };

        // Cache ONLY successful non-empty results
        if (allPlaces.length > 0) {
          nearbyCache.set(cacheKey, responsePayload);
        }

        return responsePayload;
      });
    });

    res.json(result);
  } catch (err: any) {
    if (err.code === "QUEUE_FULL") {
      res.set("Retry-After", String(err.retryAfter || 5));
      res.status(429).json({ error: err.message });
      return;
    }
    res.status(err.status || 502).json({
      error: err.message || "Unable to retrieve nearby amenities from Overpass service. Please retry in a few moments."
    });
  }
});

export default router;
