import React, { useState } from 'react';
import { PlaceItem } from '../../types/places';
import { CATEGORIES_ORDER, CATEGORY_META } from '../../config/constants';
import { SoilSummaryResponse } from '../../types/soil';

export interface SurroundingsPanelProps {
  radiusMeters: number;
  setRadiusMeters: (r: number) => void;
  groupedPlaces: Record<string, PlaceItem[]>;
  activeCategories: Set<string>;
  toggleCategory: (cat: string) => void;
  onFocusPlace: (place: PlaceItem) => void;
  soilSummary?: SoilSummaryResponse | null;
  soilLoading?: boolean;
}

export const SurroundingsPanel: React.FC<SurroundingsPanelProps> = ({
  radiusMeters,
  setRadiusMeters,
  groupedPlaces,
  activeCategories,
  toggleCategory,
  onFocusPlace,
  soilSummary,
  soilLoading,
}) => {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleAccordion = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div style={{ marginTop: 20 }}>
      {/* ── Radius Filter ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate)', marginBottom: 6 }}>
          Radius Filter
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[500, 1000, 2000].map((r) => (
            <button
              key={r}
              type="button"
              className={`filter-btn ${radiusMeters === r ? 'active' : ''}`}
              style={{ fontSize: '0.74rem', padding: '4px 10px' }}
              onClick={() => setRadiusMeters(r)}
            >
              {r < 1000 ? `${r}m` : `${r / 1000}km`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category Visibility Chips ──────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate)', marginBottom: 6 }}>
          Filter Categories on Map
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES_ORDER.map((cat) => {
            const meta = CATEGORY_META[cat];
            const active = activeCategories.has(cat);
            return (
              <button
                key={cat}
                type="button"
                className={`map-chip ${active ? 'active' : ''}`}
                onClick={() => toggleCategory(cat)}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Surroundings Accordions ────────────────────────────────────── */}
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--slate)', marginBottom: 8 }}>
        Neighborhood Surroundings
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CATEGORIES_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const list = groupedPlaces[cat] || [];
          const count = list.length;
          const isOpen = openCategories.has(cat);

          return (
            <div key={cat} className="cat-accordion">
              <div
                className="cat-accordion-header"
                onClick={() => toggleAccordion(cat)}
                style={{ cursor: count > 0 ? 'pointer' : 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{meta.emoji}</span>
                  <span style={{ fontWeight: 600 }}>{meta.label}</span>
                  <span className={`cat-count-badge ${count === 0 ? 'zero' : ''}`}>{count}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--muted)',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                >
                  {count > 0 ? '▼' : '—'}
                </span>
              </div>

              {isOpen && count > 0 && (
                <div className="cat-accordion-body">
                  {list.map((place, idx) => {
                    const distLabel =
                      place.distance_km != null
                        ? `${place.distance_km} km`
                        : `${place.distance_m || 0} m`;
                    return (
                      <div
                        key={place.id || idx}
                        className="cat-place-item"
                        onClick={() => onFocusPlace(place)}
                        title="Click to focus on map"
                      >
                        <div style={{ fontWeight: 600, color: 'var(--slate)', fontSize: '0.82rem' }}>
                          {place.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                          {distLabel} away
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Agricultural Soil Panel ─────────────────────────────────────── */}
      <div
        className="soil-card"
        style={{
          marginTop: 20,
          background: 'white',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--slate)' }}>
            🌱 Land &amp; Soil Indicators (agricultural)
          </span>
          {soilLoading && <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Loading...</span>}
        </div>

        {/* Permanent Non-Dismissible Notice */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: '0.72rem',
            color: '#475569',
            marginBottom: 12,
            lineHeight: 1.4,
          }}
        >
          ℹ️ <strong>Scope Note:</strong> Indicators of agricultural soil properties at probe location.
          Not a geotechnical assessment. Foundation safety requires borehole testing.
        </div>

        {soilSummary ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)' }}>Quality:</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 700,
                  background:
                    soilSummary.reading_quality === 'adequate'
                      ? '#f0f9ff'
                      : soilSummary.reading_quality === 'noisy'
                        ? '#fffbeb'
                        : '#fef2f2',
                  color:
                    soilSummary.reading_quality === 'adequate'
                      ? '#0369a1'
                      : soilSummary.reading_quality === 'noisy'
                        ? '#92400e'
                        : '#991b1b',
                }}
              >
                {soilSummary.reading_quality.toUpperCase()}
              </span>
            </div>

            {soilSummary.reading_quality === 'insufficient' ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>
                Not enough readings to summarize agricultural conditions.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {soilSummary.metrics.ph && (
                  <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>pH (Median)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0369a1' }}>
                      {soilSummary.metrics.ph.median}
                    </div>
                  </div>
                )}
                {soilSummary.metrics.moisture && (
                  <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Moisture (Median)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0369a1' }}>
                      {soilSummary.metrics.moisture.median}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>
            No live ESP32 soil sensor connected for this location.
          </p>
        )}
      </div>

      {/* ── OpenStreetMap Policy & Attribution Notice ───────────────────── */}
      <div
        style={{
          marginTop: 16,
          padding: '8px 10px',
          fontSize: '0.7rem',
          color: 'var(--muted)',
          background: '#f8fafc',
          borderRadius: 6,
          lineHeight: 1.4,
        }}
      >
        Map data &copy;{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors (ODbL). All surroundings searches routed via DataZen backend caching proxy.
      </div>
    </div>
  );
};
