import { useState, useCallback, useRef, useEffect } from 'react';
import { PlaceItem } from '../types/places';
import { fetchNearbyPlacesApi } from '../api/places';
import { groupAndSortPlaces, getNearestPerCategory } from '../utils/grouping';

export function useNearby() {
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAbortRef = useRef<AbortController | null>(null);

  const fetchNearby = useCallback(async (lat: number, lng: number, radiusMeters: number) => {
    // Abort pending in-flight request
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchNearbyPlacesApi(lat, lng, radiusMeters, controller.signal);
      setPlaces(data || []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Stale request cancelled; ignore
      }
      const msg = err instanceof Error ? err.message : 'Could not fetch surroundings';
      setError(msg);
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearNearby = useCallback(() => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    setPlaces([]);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
    };
  }, []);

  const groupedPlaces = groupAndSortPlaces(places);
  const nearestPerCategory = getNearestPerCategory(places);

  return {
    places,
    groupedPlaces,
    nearestPerCategory,
    isLoading,
    error,
    fetchNearby,
    clearNearby,
  };
}
