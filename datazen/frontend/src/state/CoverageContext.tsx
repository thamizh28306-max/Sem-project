import React, { createContext, useContext, useState, useEffect } from 'react';
import { CoverageResponse, CoverageBadgeState } from '../types/coverage';
import { LocalityInfo, DEFAULT_LOCALITIES } from '../config/constants';
import { MAP_CONFIG } from '../config/map';
import { fetchCoverageApi } from '../api/predict';
import { haversineKm } from '../utils/geo';

interface CoverageContextType {
  coverageData: CoverageResponse;
  localities: LocalityInfo[];
  resolveCoverageBadge: (lat: number, lng: number, localityName?: string) => CoverageBadgeState;
}

const CoverageContext = createContext<CoverageContextType | undefined>(undefined);

const DEFAULT_COVERAGE_RESPONSE: CoverageResponse = {
  status: 'ok',
  bounds: MAP_CONFIG.chennaiBounds,
  localities: DEFAULT_LOCALITIES,
};

export const CoverageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coverageData, setCoverageData] = useState<CoverageResponse>(DEFAULT_COVERAGE_RESPONSE);

  useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();

    async function loadCoverage() {
      try {
        const data = await fetchCoverageApi(ctrl.signal);
        if (mounted && data?.localities?.length) {
          setCoverageData(data);
        }
      } catch {
        // Fallback remains active
      }
    }

    loadCoverage();
    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, []);

  const localities = coverageData.localities || DEFAULT_LOCALITIES;

  const resolveCoverageBadge = (lat: number, lng: number, localityName?: string): CoverageBadgeState => {
    const { lat_min, lat_max, lng_min, lng_max } = coverageData.bounds || MAP_CONFIG.chennaiBounds;

    if (lat < lat_min || lat > lat_max || lng < lng_min || lng > lng_max) {
      return {
        type: 'red',
        title: 'Outside Supported Area',
        text: 'Coordinates are outside Chennai Metropolitan Area. Prediction disabled.',
        disabled: true,
        reason: 'Selected location is outside Chennai metropolitan boundaries (lat 12.7-13.3, lng 79.9-80.4).',
      };
    }

    let nearest = localities[0];
    let minDist = Infinity;

    for (const loc of localities) {
      const d = haversineKm(lat, lng, loc.centroid.lat, loc.centroid.lng);
      if (d < minDist) {
        minDist = d;
        nearest = loc;
      }
    }

    if (minDist > 8.0) {
      return {
        type: 'red',
        title: 'Outside Supported Area',
        text: `Nearest covered locality (${nearest.name}) is ${minDist.toFixed(1)} km away (max 8 km). Prediction disabled.`,
        disabled: true,
        reason: `Location is ${minDist.toFixed(1)} km from the nearest supported locality '${nearest.name}' (max 8 km).`,
      };
    }

    const effectiveLocality = localityName || nearest.name;
    const matchedLocObj = localities.find(
      (l) => l.name.toLowerCase() === effectiveLocality.toLowerCase()
    ) || nearest;

    if (matchedLocObj.status === 'assumed') {
      return {
        type: 'amber',
        title: `Assumed Rate Area: ${matchedLocObj.name}`,
        text: `Uses placeholder benchmark rates (${minDist.toFixed(1)} km from center). Estimate is less reliable.`,
        disabled: false,
        locality: matchedLocObj.name,
        distanceKm: minDist,
      };
    }

    if (minDist > 3.0) {
      return {
        type: 'amber',
        title: `Extrapolated: ${nearest.name}`,
        text: `Nearest known training locality is ${minDist.toFixed(1)} km away. Uncertainty range widened.`,
        disabled: false,
        locality: nearest.name,
        distanceKm: minDist,
      };
    }

    return {
      type: 'green',
      title: `Covered: ${nearest.name}`,
      text: `Well-supported locality with measured training coverage (${minDist.toFixed(1)} km from centroid).`,
      disabled: false,
      locality: nearest.name,
      distanceKm: minDist,
    };
  };

  return (
    <CoverageContext.Provider
      value={{
        coverageData,
        localities,
        resolveCoverageBadge,
      }}
    >
      {children}
    </CoverageContext.Provider>
  );
};

export function useCoverage(): CoverageContextType {
  const ctx = useContext(CoverageContext);
  if (!ctx) {
    throw new Error('useCoverage must be used within a CoverageProvider');
  }
  return ctx;
}
