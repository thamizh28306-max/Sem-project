import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, setAccessToken, clearAccessToken, ApiError } from '../api/client';

describe('apiClient', () => {
  beforeEach(() => {
    clearAccessToken();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches credentials and headers', async () => {
    setAccessToken('test-token');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    await apiClient('/api/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].credentials).toBe('include');
    expect(callArgs[1].headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('refreshes once on TOKEN_EXPIRED and retries request', async () => {
    setAccessToken('expired-token');

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes('/api/auth/refresh')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ accessToken: 'new-token' }),
        };
      }
      if (callCount === 1) {
        return {
          ok: false,
          status: 401,
          clone: () => ({
            json: async () => ({ code: 'TOKEN_EXPIRED' }),
          }),
          json: async () => ({ code: 'TOKEN_EXPIRED' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: 'recovered' }),
      };
    });
    global.fetch = mockFetch;

    const res = await apiClient<{ data: string }>('/api/protected');
    expect(res).toEqual({ data: 'recovered' });
    expect(mockFetch).toHaveBeenCalledTimes(3); // 1. initial fail, 2. refresh call, 3. retried request
  });

  it('throws ApiError and clears token if refresh fails without looping', async () => {
    setAccessToken('bad-token');

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/auth/refresh')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Invalid refresh token' }),
        };
      }
      return {
        ok: false,
        status: 401,
        clone: () => ({
          json: async () => ({ code: 'TOKEN_EXPIRED' }),
        }),
        json: async () => ({ code: 'TOKEN_EXPIRED' }),
      };
    });
    global.fetch = mockFetch;

    await expect(apiClient('/api/protected')).rejects.toThrow(ApiError);
  });

  it('aborts a request when signal is triggered', async () => {
    const controller = new AbortController();
    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          }, 10);
        })
    );
    global.fetch = mockFetch;

    controller.abort();
    await expect(apiClient('/api/long', { signal: controller.signal })).rejects.toThrow();
  });
});
