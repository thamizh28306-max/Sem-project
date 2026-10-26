export interface LocalityInfo {
  name: string;
  aliases: string[];
  centroid: { lat: number; lng: number };
  base_rate_per_sqft: number;
  status: 'trained' | 'assumed';
}

export const DEFAULT_LOCALITIES: LocalityInfo[] = [
  { name: 'Adyar', aliases: ['Adyar', 'Gandhi Nagar', 'Kasturba Nagar', 'Besant Nagar'], centroid: { lat: 13.0067, lng: 80.2570 }, base_rate_per_sqft: 9500, status: 'trained' },
  { name: 'T Nagar', aliases: ['T Nagar', 'T. Nagar', 'Thyagaraya Nagar', 'Pondy Bazaar'], centroid: { lat: 13.0418, lng: 80.2341 }, base_rate_per_sqft: 8800, status: 'trained' },
  { name: 'Anna Nagar', aliases: ['Anna Nagar', 'Anna Nagar East', 'Anna Nagar West'], centroid: { lat: 13.0850, lng: 80.2101 }, base_rate_per_sqft: 8500, status: 'trained' },
  { name: 'Velachery', aliases: ['Velachery', 'Vijaya Nagar'], centroid: { lat: 12.9815, lng: 80.2180 }, base_rate_per_sqft: 7200, status: 'trained' },
  { name: 'OMR', aliases: ['OMR', 'Old Mahabalipuram Road', 'Rajiv Gandhi Salai'], centroid: { lat: 12.9010, lng: 80.2279 }, base_rate_per_sqft: 6800, status: 'trained' },
  { name: 'Porur', aliases: ['Porur', 'Mugalivakkam', 'Ramapuram'], centroid: { lat: 13.0382, lng: 80.1565 }, base_rate_per_sqft: 6000, status: 'trained' },
  { name: 'Chrompet', aliases: ['Chrompet', 'Radha Nagar'], centroid: { lat: 12.9516, lng: 80.1462 }, base_rate_per_sqft: 5500, status: 'trained' },
  { name: 'Tambaram', aliases: ['Tambaram', 'Tambaram West', 'Tambaram East'], centroid: { lat: 12.9249, lng: 80.1000 }, base_rate_per_sqft: 5200, status: 'trained' },
  { name: 'Guindy', aliases: ['Guindy', 'Kathipara', 'Ekkattuthangal'], centroid: { lat: 13.0067, lng: 80.2020 }, base_rate_per_sqft: 8200, status: 'assumed' },
  { name: 'Perungudi', aliases: ['Perungudi', 'Kandhanchavadi'], centroid: { lat: 12.9654, lng: 80.2461 }, base_rate_per_sqft: 7200, status: 'assumed' },
  { name: 'Sholinganallur', aliases: ['Sholinganallur', 'Semmancheri'], centroid: { lat: 12.8980, lng: 80.2280 }, base_rate_per_sqft: 6500, status: 'assumed' },
  { name: 'Medavakkam', aliases: ['Medavakkam'], centroid: { lat: 12.9185, lng: 80.1915 }, base_rate_per_sqft: 5500, status: 'assumed' },
  { name: 'Pallavaram', aliases: ['Pallavaram'], centroid: { lat: 12.9675, lng: 80.1491 }, base_rate_per_sqft: 5800, status: 'assumed' },
  { name: 'Mylapore', aliases: ['Mylapore', 'Luz', 'Mandaveli'], centroid: { lat: 13.0368, lng: 80.2676 }, base_rate_per_sqft: 11000, status: 'assumed' },
  { name: 'Kilpauk', aliases: ['Kilpauk', 'Kellys'], centroid: { lat: 13.0784, lng: 80.2412 }, base_rate_per_sqft: 9500, status: 'assumed' },
  { name: 'Nungambakkam', aliases: ['Nungambakkam', 'Sterling Road'], centroid: { lat: 13.0569, lng: 80.2425 }, base_rate_per_sqft: 11500, status: 'assumed' },
  { name: 'Perambur', aliases: ['Perambur'], centroid: { lat: 13.1075, lng: 80.2337 }, base_rate_per_sqft: 6200, status: 'assumed' },
  { name: 'Ambattur', aliases: ['Ambattur', 'Ambattur OT'], centroid: { lat: 13.1143, lng: 80.1548 }, base_rate_per_sqft: 5000, status: 'assumed' },
  { name: 'Thoraipakkam', aliases: ['Thoraipakkam', '200 Feet Radial Road'], centroid: { lat: 12.9382, lng: 80.2337 }, base_rate_per_sqft: 7000, status: 'assumed' },
  { name: 'Madipakkam', aliases: ['Madipakkam'], centroid: { lat: 12.9623, lng: 80.1986 }, base_rate_per_sqft: 6200, status: 'assumed' },
];

export const CATEGORIES_ORDER = [
  'school',
  'college',
  'hospital',
  'clinic_pharmacy',
  'supermarket',
  'restaurant',
  'bank',
  'park',
  'bus',
  'metro',
] as const;

export type CategoryKey = (typeof CATEGORIES_ORDER)[number] | 'other';

export interface CategoryMeta {
  emoji: string;
  label: string;
  color: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  school:           { emoji: '🏫', label: 'Schools',           color: '#2563eb' },
  college:          { emoji: '🎓', label: 'Colleges',          color: '#7c3aed' },
  hospital:         { emoji: '🏥', label: 'Hospitals',         color: '#dc2626' },
  clinic_pharmacy:  { emoji: '💊', label: 'Clinic / Pharmacy', color: '#db2777' },
  supermarket:      { emoji: '🛒', label: 'Supermarkets',      color: '#ea580c' },
  restaurant:       { emoji: '🍽️', label: 'Restaurants',       color: '#d97706' },
  bank:             { emoji: '🏦', label: 'Banks / ATMs',      color: '#059669' },
  park:             { emoji: '🌳', label: 'Parks',             color: '#16a34a' },
  bus:              { emoji: '🚌', label: 'Bus Stops',         color: '#0891b2' },
  metro:            { emoji: '🚇', label: 'Metro / Rail',      color: '#4f46e5' },
};
