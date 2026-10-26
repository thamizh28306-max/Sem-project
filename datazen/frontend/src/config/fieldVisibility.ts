export type PropertyType =
  | 'Apartment/Flat'
  | 'Independent House/Villa'
  | 'Residential Plot'
  | 'Commercial'
  | 'Other';

export interface FieldVisibilityConfig {
  bhk: boolean;
  bathrooms: boolean;
  floor: boolean;
  total_floors: boolean;
  age: boolean;
  built_up_area: boolean; // Plot area for House/Villa
  parking: boolean;
  furnished: boolean;
  lift: boolean;
  power_backup: boolean;
  gated: boolean;
  facing: boolean;
  plot_shape: boolean;
  boundary_wall: boolean;
  commercial_subtype: boolean;
  frontage_ft: boolean;
  parking_slots: boolean;
  comm_furnished: boolean;
  main_road_facing: boolean;
  geotech_section: boolean;
  soil_note: boolean;
}

export const PROPERTY_TYPE_FIELD_VISIBILITY: Record<PropertyType, FieldVisibilityConfig> = {
  'Apartment/Flat': {
    bhk: true,
    bathrooms: true,
    floor: true,
    total_floors: true,
    age: true,
    built_up_area: false,
    parking: true,
    furnished: true,
    lift: true,
    power_backup: true,
    gated: true,
    facing: true,
    plot_shape: false,
    boundary_wall: false,
    commercial_subtype: false,
    frontage_ft: false,
    parking_slots: false,
    comm_furnished: false,
    main_road_facing: false,
    geotech_section: false,
    soil_note: false,
  },
  'Independent House/Villa': {
    bhk: true,
    bathrooms: true,
    floor: false,
    total_floors: true,
    age: true,
    built_up_area: true, // Plots area
    parking: true,
    furnished: true,
    lift: false,
    power_backup: false,
    gated: false,
    facing: true,
    plot_shape: false,
    boundary_wall: false,
    commercial_subtype: false,
    frontage_ft: false,
    parking_slots: false,
    comm_furnished: false,
    main_road_facing: false,
    geotech_section: true,
    soil_note: false,
  },
  'Residential Plot': {
    bhk: false,
    bathrooms: false,
    floor: false,
    total_floors: false,
    age: false,
    built_up_area: false,
    parking: false,
    furnished: false,
    lift: false,
    power_backup: false,
    gated: false,
    facing: true,
    plot_shape: true,
    boundary_wall: true,
    commercial_subtype: false,
    frontage_ft: false,
    parking_slots: false,
    comm_furnished: false,
    main_road_facing: false,
    geotech_section: true,
    soil_note: true,
  },
  'Commercial': {
    bhk: false,
    bathrooms: false,
    floor: true,
    total_floors: false,
    age: true,
    built_up_area: false,
    parking: false,
    furnished: false,
    lift: false,
    power_backup: false,
    gated: false,
    facing: false,
    plot_shape: false,
    boundary_wall: false,
    commercial_subtype: true,
    frontage_ft: true,
    parking_slots: true,
    comm_furnished: true,
    main_road_facing: true,
    geotech_section: false,
    soil_note: false,
  },
  'Other': {
    bhk: false,
    bathrooms: false,
    floor: true,
    total_floors: false,
    age: true,
    built_up_area: false,
    parking: false,
    furnished: false,
    lift: false,
    power_backup: false,
    gated: false,
    facing: false,
    plot_shape: false,
    boundary_wall: false,
    commercial_subtype: false,
    frontage_ft: false,
    parking_slots: false,
    comm_furnished: false,
    main_road_facing: false,
    geotech_section: false,
    soil_note: false,
  },
};

export function isFieldVisible(type: PropertyType, field: keyof FieldVisibilityConfig): boolean {
  const config = PROPERTY_TYPE_FIELD_VISIBILITY[type] || PROPERTY_TYPE_FIELD_VISIBILITY['Other'];
  return Boolean(config[field]);
}
