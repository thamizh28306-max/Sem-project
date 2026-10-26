import { PlaceItem } from '../types/places';

/**
 * Builds descriptive human-readable strings for auto-filled nearby places inputs.
 * Format examples:
 * - "0.5 km from here there is St. Johns School"
 * - "350 m from here there is Govt Clinic"
 * - "None found within 1 km"
 */
export function buildNearbyPlaceText(
  place: PlaceItem | undefined | null,
  categoryLabel: string,
  radiusMeters: number
): string {
  const radiusText = radiusMeters < 1000 ? `${radiusMeters}m` : `${radiusMeters / 1000} km`;

  if (!place) {
    return `None found within ${radiusText}`;
  }

  const name =
    place.name && place.name.trim() !== ''
      ? place.name.trim()
      : `an unnamed ${categoryLabel.toLowerCase()}`;

  let distText: string;
  if (place.distance_m != null && place.distance_m < 1000) {
    distText = `${Math.round(place.distance_m)} m`;
  } else if (place.distance_km != null) {
    distText = `${Number(place.distance_km.toFixed(1))} km`;
  } else if (place.distance_m != null) {
    distText = `${(place.distance_m / 1000).toFixed(1)} km`;
  } else {
    distText = 'nearby';
  }

  return `${distText} from here there is ${name}`;
}
