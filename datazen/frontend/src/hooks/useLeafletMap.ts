import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '../config/map';

// Fix default marker icon assets for bundlers
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export interface UseLeafletMapOptions {
  onMapClick?: (lat: number, lng: number) => void;
}

export function useLeafletMap(options: UseLeafletMapOptions = {}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const tileErrorCountRef = useRef(0);
  const isFallbackActiveRef = useRef(false);

  const [isReady, setIsReady] = useState(false);

  // Keep callback fresh
  const onMapClickRef = useRef(options.onMapClick);
  useEffect(() => {
    onMapClickRef.current = options.onMapClick;
  }, [options.onMapClick]);

  const switchToFallbackTileLayer = useCallback((map: L.Map) => {
    if (isFallbackActiveRef.current) return;
    isFallbackActiveRef.current = true;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const { url, attribution, maxZoom } = MAP_CONFIG.layers.cartoFallback;
    const fallbackLayer = L.tileLayer(url, { attribution, maxZoom });
    fallbackLayer.addTo(map);
    activeTileLayerRef.current = fallbackLayer;

    console.info('[DataZen Map] Switched to CARTO basemap fallback due to tile errors.');
  }, []);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // React StrictMode double-mount safeguard
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const { lat, lng, zoom } = MAP_CONFIG.defaultCenter;
    const map = L.map(container, {
      center: [lat, lng],
      zoom,
      zoomControl: true,
    });

    // Primary OSM tile layer with error monitoring
    const { url, attribution, maxZoom } = MAP_CONFIG.layers.osm;
    const osmLayer = L.tileLayer(url, { attribution, maxZoom });

    osmLayer.on('tileerror', () => {
      tileErrorCountRef.current += 1;
      if (tileErrorCountRef.current >= MAP_CONFIG.tileErrorThreshold) {
        switchToFallbackTileLayer(map);
      }
    });

    osmLayer.addTo(map);
    activeTileLayerRef.current = osmLayer;
    mapInstanceRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    setIsReady(true);

    return () => {
      setIsReady(false);
      map.remove();
      mapInstanceRef.current = null;
      activeTileLayerRef.current = null;
    };
  }, [switchToFallbackTileLayer]);

  return {
    mapContainerRef,
    map: mapInstanceRef.current,
    isReady,
  };
}
