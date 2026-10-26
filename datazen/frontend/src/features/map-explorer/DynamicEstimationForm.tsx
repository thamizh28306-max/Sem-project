import React from 'react';
import { PropertyType, isFieldVisible } from '../../config/fieldVisibility';
import { CoverageBadgeState } from '../../types/coverage';
import { PlaceItem } from '../../types/places';
import { GeoTechSection, GeoTechFormState } from './GeoTechSection';
import { buildNearbyPlaceText } from '../../utils/nearbyText';
import { Button } from '../../components/common/Button';

export interface EstimationFormState extends GeoTechFormState {
  property_type: PropertyType;
  area: string;
  built_up_area: string;
  road_width: string;
  approved: string;
  corner: string;
  flood_prone: string;
  bhk: string;
  bathrooms: string;
  floor: string;
  total_floors: string;
  age: string;
  parking: string;
  furnished: string;
  lift: string;
  power_backup: string;
  gated: string;
  facing: string;
  plot_shape: string;
  boundary_wall: string;
  commercial_subtype: string;
  frontage_ft: string;
  parking_slots: string;
  comm_furnished: string;
  main_road_facing: string;
  notes: string;

  // Nearby distance values
  school_dist: string;
  college_dist: string;
  hospital_dist: string;
  clinic_dist: string;
  supermarket_dist: string;
  restaurant_dist: string;
  bank_dist: string;
  park_dist: string;
  bus_dist: string;
  metro_dist: string;
  amenity_score: number;
}

export interface DynamicEstimationFormProps {
  form: EstimationFormState;
  setForm: React.Dispatch<React.SetStateAction<EstimationFormState>>;
  coverageState: CoverageBadgeState | null;
  nearbyPlaces: PlaceItem[];
  nearestPerCategory: Record<string, PlaceItem>;
  nearbyLoading: boolean;
  radiusMeters: number;
  onPredict: () => Promise<void>;
  isPredicting: boolean;
  predictError: string | null;
  soilData?: { ph?: number; moisture?: number } | null;
}

export const DynamicEstimationForm: React.FC<DynamicEstimationFormProps> = ({
  form,
  setForm,
  coverageState,
  nearestPerCategory,
  nearbyLoading,
  radiusMeters,
  onPredict,
  isPredicting,
  predictError,
  soilData,
}) => {
  const setF = (key: string, val: string | number) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const pType = form.property_type;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate)', marginBottom: 8 }}>
        Dynamic Property Estimation Form
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onPredict();
        }}
      >
        {/* Property Type Selector */}
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Property Type</label>
          <select
            className="form-select"
            value={form.property_type}
            onChange={(e) => setF('property_type', e.target.value as PropertyType)}
          >
            <option value="Apartment/Flat">Apartment / Flat</option>
            <option value="Independent House/Villa">Independent House / Villa</option>
            <option value="Residential Plot">Residential Plot</option>
            <option value="Commercial">Commercial</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-grid">
          {/* Common Field: Area */}
          <div className="form-group">
            <label className="form-label">
              {pType === 'Residential Plot' ? 'Plot Area (sq ft) *' : 'Area (sq ft) *'}
            </label>
            <input
              className="form-input"
              type="number"
              required
              min={100}
              max={100000}
              value={form.area}
              onChange={(e) => setF('area', e.target.value)}
              placeholder="e.g. 1200"
            />
          </div>

          {/* House/Villa Built-up Area */}
          {isFieldVisible(pType, 'built_up_area') && (
            <div className="form-group">
              <label className="form-label">Built-up Area (sq ft)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                value={form.built_up_area}
                onChange={(e) => setF('built_up_area', e.target.value)}
                placeholder="Optional"
              />
            </div>
          )}

          {/* Road Width */}
          <div className="form-group">
            <label className="form-label">Road Width (ft)</label>
            <input
              className="form-input"
              type="number"
              min={10}
              max={200}
              value={form.road_width}
              onChange={(e) => setF('road_width', e.target.value)}
              placeholder="30"
            />
          </div>

          {/* Approval Status */}
          <div className="form-group">
            <label className="form-label">Approval Status</label>
            <select
              className="form-select"
              value={form.approved}
              onChange={(e) => setF('approved', e.target.value)}
            >
              <option value="CMDA/DTCP approved">CMDA / DTCP Approved</option>
              <option value="Panchayat">Panchayat Approved</option>
              <option value="Unapproved">Unapproved</option>
              <option value="Not sure">Not sure</option>
            </select>
          </div>

          {/* Corner Property */}
          <div className="form-group">
            <label className="form-label">Corner Property</label>
            <select
              className="form-select"
              value={form.corner}
              onChange={(e) => setF('corner', e.target.value)}
            >
              <option value="no">No</option>
              <option value="yes">Yes (+4% premium)</option>
            </select>
          </div>

          {/* Flood Prone */}
          <div className="form-group">
            <label className="form-label">Flood Prone Area</label>
            <select
              className="form-select"
              value={form.flood_prone}
              onChange={(e) => setF('flood_prone', e.target.value)}
            >
              <option value="no">No</option>
              <option value="yes">Yes (-9% risk)</option>
            </select>
          </div>

          {/* BHK */}
          {isFieldVisible(pType, 'bhk') && (
            <div className="form-group">
              <label className="form-label">BHK</label>
              <select
                className="form-select"
                value={form.bhk}
                onChange={(e) => setF('bhk', e.target.value)}
              >
                {['1', '2', '3', '4', '5'].map((v) => (
                  <option key={v} value={v}>
                    {v} BHK
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bathrooms */}
          {isFieldVisible(pType, 'bathrooms') && (
            <div className="form-group">
              <label className="form-label">Bathrooms</label>
              <select
                className="form-select"
                value={form.bathrooms}
                onChange={(e) => setF('bathrooms', e.target.value)}
              >
                {['1', '2', '3', '4', '5'].map((v) => (
                  <option key={v} value={v}>
                    {v} Bath
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Floor */}
          {isFieldVisible(pType, 'floor') && (
            <div className="form-group">
              <label className="form-label">Floor</label>
              <input
                className="form-input"
                type="number"
                min={0}
                max={60}
                value={form.floor}
                onChange={(e) => setF('floor', e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
          )}

          {/* Total Floors */}
          {isFieldVisible(pType, 'total_floors') && (
            <div className="form-group">
              <label className="form-label">Total Floors</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={60}
                value={form.total_floors}
                onChange={(e) => setF('total_floors', e.target.value)}
                placeholder="e.g. 5"
              />
            </div>
          )}

          {/* Building Age */}
          {isFieldVisible(pType, 'age') && (
            <div className="form-group">
              <label className="form-label">Age of Property (years)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                max={100}
                value={form.age}
                onChange={(e) => setF('age', e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          {/* Parking */}
          {isFieldVisible(pType, 'parking') && (
            <div className="form-group">
              <label className="form-label">Parking</label>
              <select
                className="form-select"
                value={form.parking}
                onChange={(e) => setF('parking', e.target.value)}
              >
                <option value="none">None</option>
                <option value="bike">Bike only</option>
                <option value="1 car">1 Car</option>
                <option value="2+ cars">2+ Cars</option>
              </select>
            </div>
          )}

          {/* Furnishing */}
          {isFieldVisible(pType, 'furnished') && (
            <div className="form-group">
              <label className="form-label">Furnishing</label>
              <select
                className="form-select"
                value={form.furnished}
                onChange={(e) => setF('furnished', e.target.value)}
              >
                <option value="0">Unfurnished</option>
                <option value="1">Semi-furnished</option>
                <option value="2">Fully furnished</option>
              </select>
            </div>
          )}

          {/* Facing */}
          {isFieldVisible(pType, 'facing') && (
            <div className="form-group">
              <label className="form-label">Facing</label>
              <select
                className="form-select"
                value={form.facing}
                onChange={(e) => setF('facing', e.target.value)}
              >
                {['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'].map(
                  (f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {/* Apartment Extras: Lift, Power Backup, Gated */}
          {isFieldVisible(pType, 'lift') && (
            <>
              <div className="form-group">
                <label className="form-label">Lift Available</label>
                <select className="form-select" value={form.lift} onChange={(e) => setF('lift', e.target.value)}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Power Backup</label>
                <select className="form-select" value={form.power_backup} onChange={(e) => setF('power_backup', e.target.value)}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Gated Community</label>
                <select className="form-select" value={form.gated} onChange={(e) => setF('gated', e.target.value)}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </>
          )}

          {/* Commercial Specific Fields */}
          {isFieldVisible(pType, 'commercial_subtype') && (
            <>
              <div className="form-group">
                <label className="form-label">Commercial Type</label>
                <select
                  className="form-select"
                  value={form.commercial_subtype}
                  onChange={(e) => setF('commercial_subtype', e.target.value)}
                >
                  <option value="Shop">Retail Shop</option>
                  <option value="Office">Office Space</option>
                  <option value="Showroom">Showroom</option>
                  <option value="Warehouse">Warehouse / Godown</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Frontage (ft)</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  value={form.frontage_ft}
                  onChange={(e) => setF('frontage_ft', e.target.value)}
                  placeholder="e.g. 25"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Parking Slots</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  value={form.parking_slots}
                  onChange={(e) => setF('parking_slots', e.target.value)}
                  placeholder="0"
                />
              </div>
            </>
          )}

          {/* Plot Specific Fields */}
          {isFieldVisible(pType, 'plot_shape') && (
            <>
              <div className="form-group">
                <label className="form-label">Plot Shape</label>
                <select className="form-select" value={form.plot_shape} onChange={(e) => setF('plot_shape', e.target.value)}>
                  <option value="regular">Regular (Square / Rectangular)</option>
                  <option value="corner">Corner Plot</option>
                  <option value="irregular">Irregular Shape</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Boundary Wall</label>
                <select className="form-select" value={form.boundary_wall} onChange={(e) => setF('boundary_wall', e.target.value)}>
                  <option value="yes">Yes (Fenced/Walled)</option>
                  <option value="no">No boundary</option>
                </select>
              </div>
            </>
          )}

          {/* Agricultural Soil Note */}
          {isFieldVisible(pType, 'soil_note') && (
            <div
              className="form-group full"
              style={{
                gridColumn: 'span 2',
                background: '#f8fafc',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 2 }}>
                🌱 Land &amp; Soil Indicators (agricultural):
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {soilData
                  ? `Latest pH: ${soilData.ph} · Moisture: ${soilData.moisture}% (agricultural indicators only — not a construction assessment)`
                  : 'No live sensor data connected'}
              </div>
            </div>
          )}

          {/* Geotechnical Section */}
          {isFieldVisible(pType, 'geotech_section') && (
            <GeoTechSection form={form} setF={setF} />
          )}
        </div>

        {/* ── Auto-gathered Nearby Amenities Text Boxes ──────────────────── */}
        <div
          style={{
            marginTop: 14,
            background: '#f8fafc',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--slate2)' }}>
              📍 Auto-gathered Nearby Places (Editable)
            </span>
            {nearbyLoading && (
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Fetching surroundings...</span>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nearest School</label>
              <input
                className="form-input"
                type="text"
                value={form.school_dist}
                onChange={(e) => setF('school_dist', e.target.value)}
                placeholder={buildNearbyPlaceText(nearestPerCategory['school'], 'School', radiusMeters)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nearest Hospital</label>
              <input
                className="form-input"
                type="text"
                value={form.hospital_dist}
                onChange={(e) => setF('hospital_dist', e.target.value)}
                placeholder={buildNearbyPlaceText(nearestPerCategory['hospital'], 'Hospital', radiusMeters)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nearest Metro / Rail</label>
              <input
                className="form-input"
                type="text"
                value={form.metro_dist}
                onChange={(e) => setF('metro_dist', e.target.value)}
                placeholder={buildNearbyPlaceText(nearestPerCategory['metro'], 'Metro station', radiusMeters)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nearest Bus Stop</label>
              <input
                className="form-input"
                type="text"
                value={form.bus_dist}
                onChange={(e) => setF('bus_dist', e.target.value)}
                placeholder={buildNearbyPlaceText(nearestPerCategory['bus'], 'Bus stop', radiusMeters)}
              />
            </div>
          </div>
        </div>

        {predictError && (
          <div
            style={{
              color: '#dc2626',
              fontSize: '0.8rem',
              marginTop: 10,
              background: '#fef2f2',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #fecaca',
            }}
          >
            {predictError}
          </div>
        )}

        <Button
          type="submit"
          variant="predict"
          isLoading={isPredicting}
          disabled={coverageState?.disabled}
          style={{ width: '100%', marginTop: 14 }}
        >
          {coverageState?.disabled ? 'Location Outside Supported Area' : '🔮 Predict Valuation for Location'}
        </Button>
      </form>
    </div>
  );
};
