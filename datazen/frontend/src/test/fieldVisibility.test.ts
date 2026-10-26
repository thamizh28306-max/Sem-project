import { describe, it, expect } from 'vitest';
import { isFieldVisible } from '../config/fieldVisibility';

describe('Field Visibility Data Table', () => {
  it('correctly configures Apartment / Flat fields', () => {
    expect(isFieldVisible('Apartment/Flat', 'bhk')).toBe(true);
    expect(isFieldVisible('Apartment/Flat', 'floor')).toBe(true);
    expect(isFieldVisible('Apartment/Flat', 'lift')).toBe(true);
    expect(isFieldVisible('Apartment/Flat', 'gated')).toBe(true);
    expect(isFieldVisible('Apartment/Flat', 'plot_shape')).toBe(false);
    expect(isFieldVisible('Apartment/Flat', 'commercial_subtype')).toBe(false);
    expect(isFieldVisible('Apartment/Flat', 'geotech_section')).toBe(false);
  });

  it('correctly configures Residential Plot fields', () => {
    expect(isFieldVisible('Residential Plot', 'bhk')).toBe(false);
    expect(isFieldVisible('Residential Plot', 'floor')).toBe(false);
    expect(isFieldVisible('Residential Plot', 'age')).toBe(false);
    expect(isFieldVisible('Residential Plot', 'plot_shape')).toBe(true);
    expect(isFieldVisible('Residential Plot', 'boundary_wall')).toBe(true);
    expect(isFieldVisible('Residential Plot', 'soil_note')).toBe(true);
    expect(isFieldVisible('Residential Plot', 'geotech_section')).toBe(true);
  });

  it('correctly configures Commercial fields', () => {
    expect(isFieldVisible('Commercial', 'commercial_subtype')).toBe(true);
    expect(isFieldVisible('Commercial', 'frontage_ft')).toBe(true);
    expect(isFieldVisible('Commercial', 'parking_slots')).toBe(true);
    expect(isFieldVisible('Commercial', 'bhk')).toBe(false);
    expect(isFieldVisible('Commercial', 'lift')).toBe(false);
  });
});
