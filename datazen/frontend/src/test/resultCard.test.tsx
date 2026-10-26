import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PredictionResultCard } from '../features/map-explorer/PredictionResultCard';
import { PredictResponse } from '../types/predict';

describe('PredictionResultCard Component', () => {
  const mockPrediction: PredictResponse = {
    predicted_price: 8500000,
    price_per_sqft: 7083,
    range_low: 6800000,
    range_high: 10200000,
    interval_coverage: 0.8,
    interval_widening_factor: 1.5,
    quality: 'medium',
    data_source: 'synthetic-demo',
    is_fallback: true,
    warnings: ['Location is 4.2 km from Anna Nagar centroid.'],
    imputed_fields: ['metro_dist_km'],
    clamped_fields: ['age_years'],
    resolved_locality: 'Anna Nagar',
  };

  it('renders DEMO badge, quality level, 80% interval wording, and no 82% text', () => {
    render(<PredictionResultCard prediction={mockPrediction} />);

    // DEMO badge
    expect(screen.getByText('DEMO ESTIMATE')).toBeInTheDocument();

    // Quality level
    expect(screen.getByText(/Quality:\s*medium/i)).toBeInTheDocument();

    // 80% interval wording
    expect(screen.getByText(/Likely range \(80% interval\)/i)).toBeInTheDocument();

    // Explicit check: MUST NOT contain "82%" text
    expect(document.body.textContent).not.toContain('82%');

    // Heuristic fallback warning
    expect(
      screen.getByText(/The machine learning model is operating in fallback mode/i)
    ).toBeInTheDocument();

    // Imputed and clamped fields
    expect(screen.getByText(/Used neighborhood medians for:\s*metro_dist_km/i)).toBeInTheDocument();
    expect(screen.getByText(/Clamped extreme values for:\s*age_years/i)).toBeInTheDocument();

    // Warnings list
    expect(screen.getByText(/Location is 4\.2 km from Anna Nagar centroid/i)).toBeInTheDocument();
  });
});
