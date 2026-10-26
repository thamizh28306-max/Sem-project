import { Router, Request, Response } from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';

export const placesRouter = Router();

// Cache with 10-minute TTL
const nearbyCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
const searchCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Rate limiter: track last request time for Overpass and Nominatim
let lastOverpassRequest = 0;
let lastNominatimRequest = 0;
const MIN_REQUEST_INTERVAL = 1100; // ms between requests

async function throttledRequest(
  url: string,
  params: Record<string, string>,
  lastRequestRef: { value: number },
  headers?: Record<string, string>
): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastRequestRef.value;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestRef.value = Date.now();
  const response = await axios.get(url, { params, headers, timeout: 15000 });
  return response.data;
}

// ─── GET /api/places/search?q=<query> ──────────────────────────────
// Proxies Nominatim with proper User-Agent (required by OSM usage policy)
placesRouter.get('/search', async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  // Check cache
  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const data = await throttledRequest(
      'https://nominatim.openstreetmap.org/search',
      {
        format: 'json',
        q,
        countrycodes: 'in',
        viewbox: '79.9,13.3,80.4,12.7',
        bounded: '0',
        limit: '5'
      },
      { value: lastNominatimRequest },
      { 'User-Agent': 'DataZen/1.0 (college project)' }
    );
    lastNominatimRequest = Date.now();

    const results = (data as any[]).map(item => ({
      place_id: item.place_id,
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      category: item.class
    }));

    searchCache.set(cacheKey, results);
    return res.json(results);
  } catch (err: any) {
    console.error('Nominatim search error:', err.message);
    if (err.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limited by Nominatim. Please wait and try again.' });
    }
    return res.status(502).json({ error: 'Failed to fetch search results from Nominatim.' });
  }
});

// ─── GET /api/places/nearby?lat=&lng=&radius= ─────────────────────
// Proxies Overpass API, caches by rounded lat/lng + radius
placesRouter.get('/nearby', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseInt(req.query.radius as string) || 1000;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Missing or invalid lat/lng parameters' });
  }

  // Round to ~100m precision for cache key
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  const cacheKey = `nearby:${roundedLat}:${roundedLng}:${radius}`;

  const cached = nearbyCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // Overpass QL query for all required categories
  const overpassQuery = `
[out:json][timeout:25];
(
  // Schools
  node["amenity"="school"](around:${radius},${lat},${lng});
  way["amenity"="school"](around:${radius},${lat},${lng});
  // Colleges
  node["amenity"="college"](around:${radius},${lat},${lng});
  way["amenity"="college"](around:${radius},${lat},${lng});
  node["amenity"="university"](around:${radius},${lat},${lng});
  way["amenity"="university"](around:${radius},${lat},${lng});
  // Hospitals
  node["amenity"="hospital"](around:${radius},${lat},${lng});
  way["amenity"="hospital"](around:${radius},${lat},${lng});
  // Clinics
  node["amenity"="clinic"](around:${radius},${lat},${lng});
  // Pharmacies
  node["amenity"="pharmacy"](around:${radius},${lat},${lng});
  // Supermarkets
  node["shop"="supermarket"](around:${radius},${lat},${lng});
  way["shop"="supermarket"](around:${radius},${lat},${lng});
  // Restaurants
  node["amenity"="restaurant"](around:${radius},${lat},${lng});
  // Banks & ATMs
  node["amenity"="bank"](around:${radius},${lat},${lng});
  node["amenity"="atm"](around:${radius},${lat},${lng});
  // Parks
  node["leisure"="park"](around:${radius},${lat},${lng});
  way["leisure"="park"](around:${radius},${lat},${lng});
  // Bus stations & stops
  node["amenity"="bus_station"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
  // Metro / Railway stations
  node["railway"="station"](around:${radius},${lat},${lng});
  node["station"="subway"](around:${radius},${lat},${lng});
  node["railway"="halt"](around:${radius},${lat},${lng});
);
out center;
`;

  try {
    const data = await throttledRequest(
      'https://overpass-api.de/api/interpreter',
      { data: overpassQuery },
      { value: lastOverpassRequest }
    );
    lastOverpassRequest = Date.now();

    // Classify and clean results
    const places = classifyOverpassResults(data.elements || [], lat, lng);
    nearbyCache.set(cacheKey, places);
    return res.json(places);
  } catch (err: any) {
    console.error('Overpass API error:', err.message);
    if (err.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limited by Overpass API. Please wait.' });
    }
    return res.status(502).json({ error: 'Failed to fetch nearby places from Overpass API.' });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────

interface PlaceResult {
  name: string;
  category: string;
  lat: number;
  lng: number;
  distance_km: number;
}

function classifyOverpassResults(
  elements: any[],
  centerLat: number,
  centerLng: number
): { places: PlaceResult[]; summary: Record<string, { count: number; nearest_km: number }> } {
  const places: PlaceResult[] = [];

  for (const el of elements) {
    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (!elLat || !elLng) continue;

    const tags = el.tags || {};
    const name = tags.name || tags['name:en'] || categoryFromTags(tags);
    const category = categoryFromTags(tags);
    const distance_km = haversine(centerLat, centerLng, elLat, elLng);

    places.push({ name, category, lat: elLat, lng: elLng, distance_km: Math.round(distance_km * 1000) / 1000 });
  }

  // Sort by distance within each category
  places.sort((a, b) => a.distance_km - b.distance_km);

  // Build summary
  const summary: Record<string, { count: number; nearest_km: number }> = {};
  for (const p of places) {
    if (!summary[p.category]) {
      summary[p.category] = { count: 0, nearest_km: p.distance_km };
    }
    summary[p.category].count++;
    if (p.distance_km < summary[p.category].nearest_km) {
      summary[p.category].nearest_km = p.distance_km;
    }
  }

  return { places, summary };
}

function categoryFromTags(tags: Record<string, string>): string {
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'college' || tags.amenity === 'university') return 'college';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.amenity === 'clinic') return 'clinic';
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.shop === 'supermarket') return 'supermarket';
  if (tags.amenity === 'restaurant') return 'restaurant';
  if (tags.amenity === 'bank') return 'bank';
  if (tags.amenity === 'atm') return 'atm';
  if (tags.leisure === 'park') return 'park';
  if (tags.amenity === 'bus_station' || tags.highway === 'bus_stop') return 'bus_stop';
  if (tags.railway === 'station' || tags.station === 'subway' || tags.railway === 'halt') return 'metro_station';
  return 'other';
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
