import { apiClient } from './client';
import { Listing, CreateListingInput, ContactSellerResponse } from '../types/listing';

export async function fetchListingsApi(type?: string): Promise<Listing[]> {
  const query = type && type !== 'all' ? `?type=${encodeURIComponent(type)}` : '';
  return apiClient<Listing[]>(`/api/listings${query}`, { skipAuth: true });
}

export async function fetchListingByIdApi(id: string): Promise<Listing> {
  return apiClient<Listing>(`/api/listings/${encodeURIComponent(id)}`, { skipAuth: true });
}

export async function createListingApi(input: CreateListingInput): Promise<Listing> {
  return apiClient<Listing>('/api/listings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function toggleSaveListingApi(id: string): Promise<{ saved: boolean }> {
  return apiClient<{ saved: boolean }>(`/api/listings/${encodeURIComponent(id)}/save`, {
    method: 'POST',
  });
}

export async function fetchSavedListingsApi(): Promise<Listing[]> {
  return apiClient<Listing[]>('/api/listings/user/saved');
}

export async function contactSellerApi(id: string): Promise<ContactSellerResponse> {
  return apiClient<ContactSellerResponse>(`/api/listings/${encodeURIComponent(id)}/contact`, {
    method: 'POST',
  });
}
