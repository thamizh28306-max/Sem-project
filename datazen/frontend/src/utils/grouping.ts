import { PlaceItem } from '../types/places';
import { CATEGORIES_ORDER } from '../config/constants';

/**
 * Groups a list of places into category buckets and sorts each bucket ascending by distance.
 */
export function groupAndSortPlaces(places: PlaceItem[]): Record<string, PlaceItem[]> {
  const grouped: Record<string, PlaceItem[]> = {};

  // Initialize all standard categories with empty arrays
  CATEGORIES_ORDER.forEach((cat) => {
    grouped[cat] = [];
  });

  places.forEach((place) => {
    const cat = place.category || 'other';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(place);
  });

  // Sort each category by distance
  Object.keys(grouped).forEach((cat) => {
    grouped[cat].sort((a, b) => {
      const distA = a.distance_m ?? (a.distance_km ? a.distance_km * 1000 : Infinity);
      const distB = b.distance_m ?? (b.distance_km ? b.distance_km * 1000 : Infinity);
      return distA - distB;
    });
  });

  return grouped;
}

/**
 * Returns the single nearest unique place for each category.
 */
export function getNearestPerCategory(places: PlaceItem[]): Record<string, PlaceItem> {
  const nearest: Record<string, PlaceItem> = {};
  const grouped = groupAndSortPlaces(places);

  Object.entries(grouped).forEach(([cat, items]) => {
    if (items.length > 0) {
      nearest[cat] = items[0];
    }
  });

  return nearest;
}
