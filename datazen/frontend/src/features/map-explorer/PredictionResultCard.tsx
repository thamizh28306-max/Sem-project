import React, { useState } from 'react';
import { PredictResponse } from '../../types/predict';
import { formatINR } from '../../utils/format';
import { Badge } from '../../components/common/Badge';

export interface PredictionResultCardProps {
  prediction: PredictResponse;
  locality?: string;
  onUseDistances?: (school: number, metro: number) => void;
  distances?: { school?: number | null; metro?: number | null };
}

export const PredictionResultCard: React.FC<PredictionResultCardProps> = ({
  prediction,
  locality,
  onUseDistances,
  distances,
}) => {
  const [showHow, setShowHow] = useState(false);

  const coveragePct = Math.round((prediction.interval_coverage ?? 0.8) * 100);
  const wideningFactor = prediction.interval_widening_factor ?? 1.0;

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        background: 'white',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--g700)', fontWeight: 700 }}>
          Estimated Value
        </span>
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

      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate)', marginBottom: 2 }}>
        {formatINR(prediction.predicted_price)}
      </div>

      <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>
        ₹{(prediction.price_per_sqft || 0).toLocaleString('en-IN')}/sqft · {prediction.resolved_locality || locality || 'Chennai'}
      </div>

      {prediction.is_fallback && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: '0.74rem',
            color: '#92400e',
            marginBottom: 10,
          }}
        >
          ⚠️ Approximate benchmark estimate. The machine learning model is operating in fallback mode.
        </div>
      )}

      <div
        style={{
          background: 'var(--g50)',
          border: '1px solid var(--g200)',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 12,
          fontSize: '0.8rem',
          color: 'var(--g800)',
          fontWeight: 600,
        }}
      >
        Likely range ({coveragePct}% interval): {formatINR(prediction.range_low)} – {formatINR(prediction.range_high)}
        {wideningFactor > 1.0 && (
          <span style={{ fontSize: '0.72rem', color: '#92400e', display: 'block', fontWeight: 400, marginTop: 2 }}>
            (Interval widened {wideningFactor}× due to location extrapolation)
          </span>
        )}
      </div>

      {/* Disclosures: Imputed or Clamped Fields */}
      {((prediction.imputed_fields && prediction.imputed_fields.length > 0) ||
        (prediction.clamped_fields && prediction.clamped_fields.length > 0)) && (
        <div style={{ fontSize: '0.72rem', color: '#64748b', background: '#f8fafc', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 12 }}>
          {prediction.imputed_fields && prediction.imputed_fields.length > 0 && (
            <div>ℹ️ Used neighborhood medians for: {prediction.imputed_fields.join(', ')}</div>
          )}
          {prediction.clamped_fields && prediction.clamped_fields.length > 0 && (
            <div>⚠️ Clamped extreme values for: {prediction.clamped_fields.join(', ')}</div>
          )}
        </div>
      )}

      {/* Warnings */}
      {prediction.warnings && prediction.warnings.length > 0 && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px', fontSize: '0.73rem', color: '#92400e', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Model Disclosures:</div>
          <ul style={{ margin: 0, paddingLeft: 14 }}>
            {prediction.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Factors / Valuation Drivers */}
      {prediction.factors && prediction.factors.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 12 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate)', marginBottom: 6 }}>
            Key Valuation Drivers
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {prediction.factors.map((f, i) => (
              <span
                key={i}
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: f.type === 'negative' ? '#fef2f2' : '#f0fdf4',
                  color: f.type === 'negative' ? '#dc2626' : '#15803d',
                  border: `1px solid ${f.type === 'negative' ? '#fecaca' : '#bbf7d0'}`,
                }}
              >
                {f.label} ({f.impact_pct})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible calculation info */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <button
          type="button"
          onClick={() => setShowHow((s) => !s)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.74rem', color: 'var(--g700)', fontWeight: 600 }}
        >
          {showHow ? '▲ Hide calculation details' : '▼ How is this calculated?'}
        </button>

        {showHow && (
          <div style={{ marginTop: 8, fontSize: '0.74rem', color: 'var(--slate3)', lineHeight: 1.5 }}>
            Estimate is calculated by an XGBoost regression model trained on Chennai residential benchmarks, physical property parameters, and walking distances to daily amenities derived from OpenStreetMap data.
          </div>
        )}
      </div>

      {onUseDistances && distances?.school && distances?.metro && (
        <button
          type="button"
          className="btn-secondary"
          style={{ width: '100%', marginTop: 12, padding: '6px 12px', fontSize: '0.78rem' }}
          onClick={() => onUseDistances(distances.school!, distances.metro!)}
        >
          Open in Full Price Predictor ↗
        </button>
      )}
    </div>
  );
};
