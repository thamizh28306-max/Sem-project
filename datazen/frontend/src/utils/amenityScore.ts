import { PlaceItem } from '../types/places';

/**
 * Calculates a dynamic amenity proximity score (0-100) from nearby places.
 */
export function calculateAmenityScore(places: PlaceItem[]): number {
  if (!places || places.length === 0) return 40;

  let score = 50;
  const categoriesFound = new Set(places.map((p) => p.category));

  if (categoriesFound.has('metro')) score += 15;
  if (categoriesFound.has('bus')) score += 10;
  if (categoriesFound.has('school') || categoriesFound.has('college')) score += 10;
  if (categoriesFound.has('hospital') || categoriesFound.has('clinic_pharmacy')) score += 10;
  if (categoriesFound.has('supermarket')) score += 5;

  const totalCountBonus = Math.min(10, Math.floor(places.length / 3));
  score += totalCountBonus;

  return Math.min(100, Math.max(20, score));
}
