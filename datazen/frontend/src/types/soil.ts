export interface SoilMetricStats {
  count: number;
  median: number;
  min: number;
  max: number;
  p10?: number;
  p90?: number;
  outliers_excluded?: number;
  last_reading_at?: string;
}

export interface SoilInterpretation {
  metric: string;
  note: string;
  source: string;
}

export interface SoilSummaryResponse {
  listing_id: string;
  total_readings: number;
  reading_quality: 'insufficient' | 'stale' | 'noisy' | 'adequate';
  quality_reasons: string[];
  scope_note: string;
  metrics: {
    ph?: SoilMetricStats | null;
    moisture?: SoilMetricStats | null;
    nitrogen?: SoilMetricStats | null;
    phosphorus?: SoilMetricStats | null;
    potassium?: SoilMetricStats | null;
    temperature?: SoilMetricStats | null;
  };
  interpretation: SoilInterpretation[];
}

export interface LiveSoilReading {
  ph?: number;
  moisture?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  temperature?: number;
}
