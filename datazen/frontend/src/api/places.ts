import { apiClient } from './client';
import { PlaceItem, SearchResult } from '../types/places';

export async function searchPlacesApi(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const url = `/api/places/search?q=${encodeURIComponent(query.trim())}`;
  return apiClient<SearchResult[]>(url, {
    skipAuth: true,
    signal,
  });
}

export async function fetchNearbyPlacesApi(
  lat: number,
  lng: number,
  radius: number,
  signal?: AbortSignal
): Promise<PlaceItem[]> {
  const url = `/api/places/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
  return apiClient<PlaceItem[]>(url, {
    skipAuth: true,
    signal,
  });
}
