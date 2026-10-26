export interface PlaceItem {
  id?: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distance_m?: number;
  distance_km?: number;
}

export interface SearchResult {
  place_id?: string | number;
  osm_id?: string | number;
  display_name: string;
  lat: string;
  lon: string;
}

export interface LocalSuggestion {
  name: string;
  centroid: { lat: number; lng: number };
  status: 'trained' | 'assumed';
  matchType: 'name' | 'alias';
  matchedAlias?: string;
}
