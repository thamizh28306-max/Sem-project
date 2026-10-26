import { apiClient } from './client';
import { PredictRequest, PredictResponse } from '../types/predict';
import { CoverageResponse } from '../types/coverage';

export async function predictPriceApi(
  payload: PredictRequest,
  signal?: AbortSignal
): Promise<PredictResponse> {
  return apiClient<PredictResponse>('/api/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
    signal,
  });
}

export async function fetchCoverageApi(signal?: AbortSignal): Promise<CoverageResponse> {
  return apiClient<CoverageResponse>('/api/predict/coverage', {
    skipAuth: true,
    signal,
  });
}
