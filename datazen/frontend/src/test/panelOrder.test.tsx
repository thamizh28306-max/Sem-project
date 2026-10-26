import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DynamicEstimationForm, EstimationFormState } from '../features/map-explorer/DynamicEstimationForm';
import { PredictionResultCard } from '../features/map-explorer/PredictionResultCard';
import { SurroundingsPanel } from '../features/map-explorer/SurroundingsPanel';
import { PredictResponse } from '../types/predict';

describe('Map Explorer Panel Order', () => {
  const dummyForm: EstimationFormState = {
    property_type: 'Apartment/Flat',
    area: '1000',
    built_up_area: '',
    road_width: '30',
    approved: 'CMDA/DTCP approved',
    corner: 'no',
    flood_prone: 'no',
    bhk: '2',
    bathrooms: '2',
    floor: '1',
    total_floors: '4',
    age: '2',
    parking: '1 car',
    furnished: '0',
    lift: 'yes',
    power_backup: 'yes',
    gated: 'yes',
    facing: 'North',
    plot_shape: 'regular',
    boundary_wall: 'yes',
    commercial_subtype: 'Shop',
    frontage_ft: '20',
    parking_slots: '2',
    comm_furnished: 'unfurnished',
    main_road_facing: 'yes',
    notes: '',
    school_dist: '',
    college_dist: '',
    hospital_dist: '',
    clinic_dist: '',
    supermarket_dist: '',
    restaurant_dist: '',
    bank_dist: '',
    park_dist: '',
    bus_dist: '',
    metro_dist: '',
    amenity_score: 75,
  };

  const dummyPrediction: PredictResponse = {
    predicted_price: 6500000,
    price_per_sqft: 6500,
    range_low: 5500000,
    range_high: 7500000,
    interval_coverage: 0.8,
  };

  it('renders form first, then result card, then surroundings below in DOM order', () => {
    const { container } = render(
      <div data-testid="sidebar-container">
        <div data-testid="panel-form">
          <DynamicEstimationForm
            form={dummyForm}
            setForm={() => {}}
            coverageState={null}
            nearbyPlaces={[]}
            nearestPerCategory={{}}
            nearbyLoading={false}
            radiusMeters={1000}
            onPredict={async () => {}}
            isPredicting={false}
            predictError={null}
          />
        </div>
        <div data-testid="panel-result">
          <PredictionResultCard prediction={dummyPrediction} />
        </div>
        <div data-testid="panel-surroundings">
          <SurroundingsPanel
            radiusMeters={1000}
            setRadiusMeters={() => {}}
            groupedPlaces={{}}
            activeCategories={new Set()}
            toggleCategory={() => {}}
            onFocusPlace={() => {}}
          />
        </div>
      </div>
    );

    const formEl = container.querySelector('[data-testid="panel-form"]');
    const resultEl = container.querySelector('[data-testid="panel-result"]');
    const surroundingsEl = container.querySelector('[data-testid="panel-surroundings"]');

    expect(formEl).toBeInTheDocument();
    expect(resultEl).toBeInTheDocument();
    expect(surroundingsEl).toBeInTheDocument();

    // Verify DOM position comparison: Node.DOCUMENT_POSITION_FOLLOWING (4)
    const formBeforeResult = formEl!.compareDocumentPosition(resultEl!);
    expect(formBeforeResult & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const resultBeforeSurroundings = resultEl!.compareDocumentPosition(surroundingsEl!);
    expect(resultBeforeSurroundings & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
