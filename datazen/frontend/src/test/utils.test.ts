import { describe, it, expect } from 'vitest';
import { formatINR, formatDistance } from '../utils/format';
import { buildNearbyPlaceText } from '../utils/nearbyText';
import { groupAndSortPlaces } from '../utils/grouping';
import { escapeHtml } from '../utils/escapeHtml';
import { PlaceItem } from '../types/places';

describe('format utils', () => {
  it('formats Indian Rupee correctly across scales', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(null)).toBe('₹0');
    expect(formatINR(50000)).toBe('₹50,000');
    expect(formatINR(650000)).toBe('₹6.5 L');
    expect(formatINR(12500000)).toBe('₹1.25 Cr');
  });

  it('formats distances correctly in meters and kilometers', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDistance(undefined, 0.4)).toBe('400 m');
    expect(formatDistance(undefined, 2.34)).toBe('2.3 km');
    expect(formatDistance()).toBe('—');
  });
});

describe('nearbyText', () => {
  it('builds "0.5 km from here there is <name>" strings', () => {
    const text = buildNearbyPlaceText(
      { name: 'St. Johns School', category: 'school', lat: 13.0, lng: 80.2, distance_km: 0.5 },
      'School',
      1000
    );
    expect(text).toBe('0.5 km from here there is St. Johns School');
  });

  it('handles distances under 1 km in meters', () => {
    const text = buildNearbyPlaceText(
      { name: 'Govt Clinic', category: 'clinic', lat: 13.0, lng: 80.2, distance_m: 350 },
      'Clinic',
      1000
    );
    expect(text).toBe('350 m from here there is Govt Clinic');
  });

  it('handles an unnamed category gracefully', () => {
    const text = buildNearbyPlaceText(
      { name: '', category: 'hospital', lat: 13.0, lng: 80.2, distance_km: 1.2 },
      'Hospital',
      2000
    );
    expect(text).toBe('1.2 km from here there is an unnamed hospital');
  });

  it('returns "None found within <radius>" when no place exists', () => {
    expect(buildNearbyPlaceText(null, 'Metro', 1000)).toBe('None found within 1 km');
    expect(buildNearbyPlaceText(null, 'Park', 500)).toBe('None found within 500m');
  });
});

describe('grouping by category sorted by distance', () => {
  it('groups places by category and sorts ascending by distance', () => {
    const rawPlaces: PlaceItem[] = [
      { name: 'Far School', category: 'school', lat: 13.0, lng: 80.2, distance_m: 800 },
      { name: 'Near School', category: 'school', lat: 13.0, lng: 80.2, distance_m: 200 },
      { name: 'Mid Hospital', category: 'hospital', lat: 13.0, lng: 80.2, distance_m: 400 },
    ];

    const grouped = groupAndSortPlaces(rawPlaces);
    expect(grouped['school']).toHaveLength(2);
    expect(grouped['school'][0].name).toBe('Near School');
    expect(grouped['school'][1].name).toBe('Far School');
    expect(grouped['hospital'][0].name).toBe('Mid Hospital');
  });
});

describe('escapeHtml', () => {
  it('properly sanitizes HTML tags and attributes', () => {
    const dirty = '<script>alert("xss")</script>';
    expect(escapeHtml(dirty)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});
