import React, { useState } from 'react';
import { useCoverage } from '../../state/CoverageContext';
import { usePredict } from '../../hooks/usePredict';
import { formatINR } from '../../utils/format';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ErrorBanner } from '../../components/common/ErrorBanner';

export interface PredictPageProps {
  predictionDistances?: { school: number; metro: number } | null;
}

export const PredictPage: React.FC<PredictPageProps> = ({ predictionDistances }) => {
  const { localities } = useCoverage();
  const { prediction, isLoading, error, predict } = usePredict();

  const [form, setForm] = useState({
    type: 'residential',
    locality: 'Anna Nagar',
    sqft: '1200',
    bhk: '2',
    age: '5',
    floor: '2',
    schoolDist: predictionDistances?.school ? String(predictionDistances.school) : '1.0',
    metroDist: predictionDistances?.metro ? String(predictionDistances.metro) : '1.5',
    parking: 'yes',
    furnished: '0',
  });

  const setF = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const areaVal = Number(form.sqft);
    if (!areaVal || areaVal <= 0) return;

    await predict({
      property_type: form.type === 'residential' ? 'Apartment/Flat' : form.type === 'commercial' ? 'Commercial' : 'Residential Plot',
      locality: form.locality,
      area_sqft: areaVal,
      bhk: Number(form.bhk) || 2,
      age_years: Number(form.age) || 0,
      floor: Number(form.floor) || 0,
      parking: form.parking === 'yes' ? 1 : 0,
      furnished: Number(form.furnished) || 0,
      school_dist_km: Number(form.schoolDist) || null,
      metro_dist_km: Number(form.metroDist) || null,
    });
  };

  return (
    <div className="section" style={{ paddingTop: 100 }}>
      <div className="section-inner">
        <div className="fade-up" style={{ marginBottom: 36 }}>
          <span className="section-label">Predictive Analytics</span>
          <h1 className="section-title">AI Property Price Predictor</h1>
          <p className="section-sub">
            Algorithmic valuation benchmarked against real Chennai listing rates with conformal uncertainty bounds.
          </p>
        </div>

        <div className="predict-layout">
          {/* Form Column */}
          <div className="predict-form-card fade-up fade-up-d1">
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Property Type</label>
                <div className="toggle-group">
                  {[
                    ['residential', '🏠 Residential'],
                    ['commercial', '🏢 Commercial'],
                    ['plot', '🌿 Plot / Land'],
                  ].map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      className={`toggle-btn ${form.type === v ? 'active' : ''}`}
                      onClick={() => setF('type', v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Locality *</label>
                  <select
                    className="form-select"
                    value={form.locality}
                    onChange={(e) => setF('locality', e.target.value)}
                  >
                    {localities.map((l) => (
                      <option key={l.name} value={l.name}>
                        {l.name} {l.status === 'assumed' ? '(approx.)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Area (sq ft) *</label>
                  <input
                    className="form-input"
                    type="number"
                    required
                    min={100}
                    max={100000}
                    value={form.sqft}
                    onChange={(e) => setF('sqft', e.target.value)}
                    placeholder="e.g. 1200"
                  />
                </div>

                {form.type !== 'plot' && (
                  <>
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

                    <div className="form-group">
                      <label className="form-label">Floor</label>
                      <input
                        className="form-input"
                        type="number"
                        min={0}
                        max={100}
                        value={form.floor}
                        onChange={(e) => setF('floor', e.target.value)}
                        placeholder="e.g. 2"
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Distance to Nearest School (km)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.1"
                    min={0.1}
                    max={50}
                    value={form.schoolDist}
                    onChange={(e) => setF('schoolDist', e.target.value)}
                    placeholder="1.0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Distance to Nearest Metro (km)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.1"
                    min={0.1}
                    max={50}
                    value={form.metroDist}
                    onChange={(e) => setF('metroDist', e.target.value)}
                    placeholder="1.5"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Parking Available</label>
                  <div className="toggle-group">
                    {[
                      ['yes', '✅ Yes'],
                      ['no', '❌ No'],
                    ].map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        className={`toggle-btn ${form.parking === v ? 'active' : ''}`}
                        onClick={() => setF('parking', v)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.type !== 'plot' && (
                  <div className="form-group full" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Furnishing Status</label>
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
              </div>

              {error && (
                <ErrorBanner
                  title="Estimation Failed"
                  message={error}
                  style={{ marginTop: 14 }}
                />
              )}

              <Button
                type="submit"
                variant="predict"
                isLoading={isLoading}
                style={{ width: '100%', marginTop: 20 }}
              >
                🔮 Predict Valuation
              </Button>
            </form>
          </div>

          {/* Results Column */}
          <div className="fade-up fade-up-d2">
            {!prediction ? (
              <div
                style={{
                  background: 'white',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                  padding: '48px 32px',
                  textAlign: 'center',
                  color: 'var(--muted)',
                }}
              >
                <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>🔮</div>
                <div
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--slate)',
                    marginBottom: 8,
                  }}
                >
                  Your Valuation Will Appear Here
                </div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
                  Fill in your property parameters and click Predict Valuation to compute an algorithmic estimate with likely uncertainty intervals.
                </p>
              </div>
            ) : (
              <div className="result-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="result-label">Estimated Market Value</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {prediction.quality && (
                      <Badge variant={prediction.quality === 'high' ? 'green' : prediction.quality === 'medium' ? 'amber' : 'red'}>
                        Quality: {prediction.quality}
                      </Badge>
                    )}
                    <Badge variant={prediction.data_source === 'synthetic+real' ? 'green' : 'slate'}>
                      {prediction.data_source === 'synthetic+real' ? 'Model + Real Data' : 'DEMO ESTIMATE'}
                    </Badge>
                  </div>
                </div>

                <div className="result-price">{formatINR(prediction.predicted_price)}</div>

                <div className="result-per-sqft">
                  ₹{(prediction.price_per_sqft || 0).toLocaleString('en-IN')}/sqft · {prediction.resolved_locality || form.locality}
                </div>

                <div
                  style={{
                    background: 'var(--g50)',
                    border: '1px solid var(--g200)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    margin: '16px 0',
                    fontSize: '0.82rem',
                    color: 'var(--g800)',
                    fontWeight: 600,
                  }}
                >
                  Likely range ({Math.round((prediction.interval_coverage || 0.8) * 100)}% interval): {formatINR(prediction.range_low)} to {formatINR(prediction.range_high)}
                </div>

                <div className="result-breakdown">
                  <div className="result-row">
                    <span>Valuation Low Bound</span>
                    <strong>{formatINR(prediction.range_low)}</strong>
                  </div>
                  <div className="result-row">
                    <span>Valuation High Bound</span>
                    <strong>{formatINR(prediction.range_high)}</strong>
                  </div>
                  <div className="result-row">
                    <span>Effective Rate</span>
                    <strong>₹{(prediction.price_per_sqft || 0).toLocaleString('en-IN')} / sq ft</strong>
                  </div>
                  {prediction.validation_mape != null && (
                    <div className="result-row">
                      <span>Historical Error (MAPE)</span>
                      <strong>{Number(prediction.validation_mape).toFixed(1)}%</strong>
                    </div>
                  )}
                </div>

                {prediction.warnings && prediction.warnings.length > 0 && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 6,
                      padding: '10px 12px',
                      fontSize: '0.74rem',
                      color: '#92400e',
                      marginTop: 14,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Model Disclosures:</div>
                    <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.5 }}>
                      {prediction.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
