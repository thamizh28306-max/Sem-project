export interface GeotechSiteInfo {
  geotech_report_available?: string;
  report_date?: string;
  report_agency?: string;
  dominant_soil_type?: string;
  groundwater_depth_m?: number;
  groundwater_date?: string;
  safe_bearing_capacity?: number;
  spt_n_value?: number;
  flood_history?: string;
  prev_water_body?: string;
}

export interface PredictRequest {
  property_type?: string;
  locality?: string;
  lat?: number;
  lng?: number;
  area_sqft: number;
  built_up_sqft?: number;
  road_width_ft?: number;
  approved?: string;
  corner?: number;
  flood_prone?: number;
  bhk?: number;
  bathrooms?: number;
  age_years?: number;
  floor?: number;
  total_floors?: number;
  parking?: number;
  furnished?: number;
  lift?: number;
  power_backup?: number;
  gated?: number;
  facing?: string;
  commercial_subtype?: string;
  frontage_ft?: number;
  school_dist_km?: number | null;
  hospital_dist_km?: number | null;
  bus_dist_km?: number | null;
  metro_dist_km?: number | null;
  supermarket_dist_km?: number | null;
  park_dist_km?: number | null;
  amenity_score?: number;
  notes?: string;
  site_info?: GeotechSiteInfo;
}

export interface ValuationFactor {
  label: string;
  impact_pct: string;
  type?: 'positive' | 'negative';
}

export interface PredictResponse {
  predicted_price: number;
  price_per_sqft?: number;
  range_low: number;
  range_high: number;
  interval_coverage?: number;
  interval_widening_factor?: number;
  quality?: 'high' | 'medium' | 'low';
  data_source?: string;
  n_real_rows?: number;
  warning?: string;
  warnings?: string[];
  resolved_locality?: string;
  locality?: string;
  coverage?: string;
  validation_mape?: number | null;
  imputed_fields?: string[];
  clamped_fields?: string[];
  factors?: ValuationFactor[];
  is_fallback?: boolean;
  site_info?: GeotechSiteInfo;
}
