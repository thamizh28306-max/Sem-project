import { apiClient } from './client';
import { SoilSummaryResponse, LiveSoilReading } from '../types/soil';

export async function fetchSoilSummaryApi(
  listingId: string,
  signal?: AbortSignal
): Promise<SoilSummaryResponse> {
  return apiClient<SoilSummaryResponse>(
    `/api/soil-data/listing/${encodeURIComponent(listingId)}/summary`,
    { skipAuth: true, signal }
  );
}

export async function fetchLiveSensorData(
  url = 'http://localhost:5000/api/soil',
  signal?: AbortSignal
): Promise<LiveSoilReading> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Live sensor unreachable');
  return res.json();
}
