/**
 * Application environment configuration.
 * Validates VITE_API_BASE_URL at startup.
 */

function validateUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'http://localhost:3000';
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Protocol must be http: or https:');
    }
    return url.replace(/\/+$/, ''); // Remove trailing slash
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[DataZen Config Error] Invalid VITE_API_BASE_URL '${url}': ${msg}`);
    return 'INVALID_CONFIG';
  }
}

export const API_BASE_URL = validateUrl(import.meta.env.VITE_API_BASE_URL);
export const IS_CONFIG_VALID = API_BASE_URL !== 'INVALID_CONFIG';
