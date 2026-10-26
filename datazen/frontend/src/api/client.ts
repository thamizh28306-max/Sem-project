import { API_BASE_URL } from '../config/env';

let inMemoryToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

export function getAccessToken(): string | null {
  return inMemoryToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryToken = token;
}

export function clearAccessToken(): void {
  inMemoryToken = null;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retryOnExpire?: boolean;
}

/**
 * Universal fetch wrapper supporting credentials, in-memory tokens,
 * automatic single retry on TOKEN_EXPIRED, and cancellation.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, retryOnExpire = true, headers = {}, ...rest } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('Content-Type') && !(rest.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const token = inMemoryToken;
  if (!skipAuth && token && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    credentials: rest.credentials ?? 'include',
  });

  if (res.status === 401 && retryOnExpire) {
    const errorData = await res.clone().json().catch(() => ({}));
    if (errorData.code === 'TOKEN_EXPIRED') {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });

          if (!refreshRes.ok) {
            clearAccessToken();
            onRefreshed(null);
            isRefreshing = false;
            throw new ApiError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED');
          }

          const refreshData = await refreshRes.json();
          const newToken = refreshData.accessToken || refreshData.token || null;
          setAccessToken(newToken);
          isRefreshing = false;
          onRefreshed(newToken);

          // Retry the initiating request directly with new token
          return apiClient<T>(endpoint, {
            ...options,
            retryOnExpire: false,
          });
        } catch (refreshErr) {
          isRefreshing = false;
          clearAccessToken();
          onRefreshed(null);
          throw refreshErr instanceof ApiError
            ? refreshErr
            : new ApiError('Failed to refresh session', 401, 'REFRESH_FAILED');
        }
      } else {
        // Await pending refresh initiated by another concurrent call
        const refreshedToken = await new Promise<string | null>((resolve) => {
          refreshSubscribers.push(resolve);
        });

        if (!refreshedToken) {
          throw new ApiError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED');
        }

        // Retry original request exactly once
        return apiClient<T>(endpoint, {
          ...options,
          retryOnExpire: false,
        });
      }
    }
  }

  if (!res.ok) {
    let errBody: any = {};
    try {
      errBody = await res.json();
    } catch {
      errBody = { message: res.statusText };
    }

    const message =
      errBody.error ||
      errBody.message ||
      (typeof errBody.detail === 'string' ? errBody.detail : errBody.detail?.message) ||
      'Request failed';

    throw new ApiError(message, res.status, errBody.code, errBody);
  }

  return res.json() as Promise<T>;
}
