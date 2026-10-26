import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SurroundingsPanel } from '../features/map-explorer/SurroundingsPanel';
import { SoilSummaryResponse } from '../types/soil';

describe('Soil Panel Component', () => {
  const mockInsufficientSoil: SoilSummaryResponse = {
    listing_id: 'test-123',
    total_readings: 2,
    reading_quality: 'insufficient',
    quality_reasons: ['Fewer than 5 readings recorded.'],
    scope_note: 'Indicators of agricultural soil properties at probe location. Not a geotechnical assessment.',
    metrics: {},
    interpretation: [],
  };

  it('renders permanent notice, "Not enough readings to summarize", and no "suitable" wording', () => {
    render(
      <SurroundingsPanel
        radiusMeters={1000}
        setRadiusMeters={() => {}}
        groupedPlaces={{}}
        activeCategories={new Set()}
        toggleCategory={() => {}}
        onFocusPlace={() => {}}
        soilSummary={mockInsufficientSoil}
      />
    );

    // Scope note notice
    expect(screen.getByText(/Not a geotechnical assessment/i)).toBeInTheDocument();

    // Insufficient readings text
    expect(
      screen.getByText(/Not enough readings to summarize agricultural conditions/i)
    ).toBeInTheDocument();

    // Verify absence of "suitable" or "good for construction"
    const textContent = document.body.textContent?.toLowerCase() || '';
    expect(textContent).not.toContain('suitable for construction');
    expect(textContent).not.toContain('good for construction');
  });
});
