import { useState, useCallback, useRef, useEffect } from 'react';
import { PredictRequest, PredictResponse } from '../types/predict';
import { predictPriceApi } from '../api/predict';

export function usePredict() {
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const predict = useCallback(async (payload: PredictRequest): Promise<PredictResponse | null> => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const data = await predictPriceApi(payload, controller.signal);
      setPrediction(data);
      return data;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      const msg = err instanceof Error ? err.message : 'Prediction request failed';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPrediction = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setPrediction(null);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return {
    prediction,
    isLoading,
    error,
    predict,
    clearPrediction,
  };
}
