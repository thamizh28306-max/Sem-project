import { describe, it, expect } from 'vitest';
import { haversineKm } from '../utils/geo';
import { DEFAULT_LOCALITIES } from '../config/constants';
import { MAP_CONFIG } from '../config/map';

describe('Coverage evaluation logic', () => {
  function evaluateCoverage(lat: number, lng: number, localityName?: string) {
    const { lat_min, lat_max, lng_min, lng_max } = MAP_CONFIG.chennaiBounds;

    if (lat < lat_min || lat > lat_max || lng < lng_min || lng > lng_max) {
      return { type: 'red', disabled: true, reason: 'outside bounds' };
    }

    let nearest = DEFAULT_LOCALITIES[0];
    let minDist = Infinity;

    for (const loc of DEFAULT_LOCALITIES) {
      const d = haversineKm(lat, lng, loc.centroid.lat, loc.centroid.lng);
      if (d < minDist) {
        minDist = d;
        nearest = loc;
      }
    }

    if (minDist > 8.0) {
      return { type: 'red', disabled: true, reason: 'too far' };
    }

    const effectiveLoc = localityName || nearest.name;
    const match = DEFAULT_LOCALITIES.find(
      (l) => l.name.toLowerCase() === effectiveLoc.toLowerCase()
    ) || nearest;

    if (match.status === 'assumed') {
      return { type: 'amber', disabled: false, reason: 'assumed-rate' };
    }

    if (minDist > 3.0) {
      return { type: 'amber', disabled: false, reason: 'extrapolated' };
    }

    return { type: 'green', disabled: false, reason: 'covered' };
  }

  it('assigns green for coordinates close to trained localities', () => {
    // Anna Nagar centroid: 13.0850, 80.2101
    const res = evaluateCoverage(13.0860, 80.2110, 'Anna Nagar');
    expect(res.type).toBe('green');
    expect(res.disabled).toBe(false);
  });

  it('assigns amber for localities with assumed benchmark rates', () => {
    // Guindy centroid: 13.0067, 80.2020 (status: assumed)
    const res = evaluateCoverage(13.0067, 80.2020, 'Guindy');
    expect(res.type).toBe('amber');
    expect(res.reason).toBe('assumed-rate');
  });

  it('assigns amber when extrapolated more than 3 km from nearest trained centroid', () => {
    // 5 km from Velachery
    const res = evaluateCoverage(12.9400, 80.2180);
    expect(res.type).toBe('amber');
    expect(res.disabled).toBe(false);
  });

  it('assigns red and disables prediction when coordinates exceed bounds or > 8km', () => {
    // Bangalore coordinates (clearly outside Chennai)
    const res = evaluateCoverage(12.9716, 77.5946);
    expect(res.type).toBe('red');
    expect(res.disabled).toBe(true);
  });
});
