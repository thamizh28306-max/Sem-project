import { LocalityInfo } from '../config/constants';

export interface CoverageBounds {
  lat_min: number;
  lat_max: number;
  lng_min: number;
  lng_max: number;
  description?: string;
}

export interface CoverageResponse {
  status: string;
  bounds: CoverageBounds;
  localities: LocalityInfo[];
}

export interface CoverageBadgeState {
  type: 'green' | 'amber' | 'red';
  title: string;
  text: string;
  disabled: boolean;
  locality?: string;
  distanceKm?: number;
  reason?: string;
}
