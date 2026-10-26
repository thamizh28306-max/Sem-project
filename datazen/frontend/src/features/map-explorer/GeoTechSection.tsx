import React, { useState } from 'react';

export interface GeoTechFormState {
  geotech_report?: string;
  geotech_soil_type?: string;
  geotech_gw_depth?: string;
  geotech_gw_date?: string;
  geotech_sbc?: string;
  geotech_spt?: string;
  geotech_flood?: string;
  geotech_prev_water?: string;
  geotech_report_agency?: string;
}

export interface GeoTechSectionProps {
  form: GeoTechFormState;
  setF: (key: string, val: string) => void;
}

export const GeoTechSection: React.FC<GeoTechSectionProps> = ({ form, setF }) => {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        gridColumn: 'span 2',
        marginTop: 10,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '10px 14px',
          background: '#f8fafc',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        aria-expanded={open}
      >
        <span>🏗️ Site &amp; soil information (from a geotechnical report or owner records)</span>
        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
          {open ? '▲ Collapse' : '▼ Expand (optional)'}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: '14px',
            background: 'white',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          <div
            style={{
              gridColumn: 'span 2',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: '0.73rem',
              color: '#92400e',
            }}
          >
            ⚠️ These fields are informational only. They are <strong>not used in the price estimate</strong>.
            Foundation suitability requires borehole testing by a licensed geotechnical firm.
          </div>

          <div className="form-group">
            <label className="form-label">Geotechnical report available</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8rem' }}
              value={form.geotech_report || ''}
              onChange={(e) => setF('geotech_report', e.target.value)}
            >
              <option value="">— select —</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="not_sure">Not sure</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Dominant soil type</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8rem' }}
              value={form.geotech_soil_type || ''}
              onChange={(e) => setF('geotech_soil_type', e.target.value)}
            >
              <option value="">— select —</option>
              <option value="sand">Sand</option>
              <option value="silt">Silt</option>
              <option value="clay">Clay</option>
              <option value="gravel">Gravel</option>
              <option value="weathered rock">Weathered rock</option>
              <option value="fill or made-up ground">Fill or made-up ground</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Groundwater depth (metres)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              max="500"
              step="0.5"
              style={{ fontSize: '0.8rem' }}
              value={form.geotech_gw_depth || ''}
              onChange={(e) => setF('geotech_gw_depth', e.target.value)}
              placeholder="e.g. 3.5"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date groundwater measured</label>
            <input
              className="form-input"
              type="text"
              style={{ fontSize: '0.8rem' }}
              value={form.geotech_gw_date || ''}
              onChange={(e) => setF('geotech_gw_date', e.target.value)}
              placeholder="e.g. Oct 2024"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Safe bearing capacity (kN/m²)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              max="10000"
              style={{ fontSize: '0.8rem' }}
              value={form.geotech_sbc || ''}
              onChange={(e) => setF('geotech_sbc', e.target.value)}
              placeholder="Must be from borehole report"
            />
          </div>

          <div className="form-group">
            <label className="form-label">SPT N-value (blows)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              max="300"
              style={{ fontSize: '0.8rem' }}
              value={form.geotech_spt || ''}
              onChange={(e) => setF('geotech_spt', e.target.value)}
              placeholder="From borehole report"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Flood or waterlogging history</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8rem' }}
              value={form.geotech_flood || ''}
              onChange={(e) => setF('geotech_flood', e.target.value)}
            >
              <option value="">— select —</option>
              <option value="never">Never</option>
              <option value="once">Once</option>
              <option value="repeatedly">Repeatedly</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Previously a water body / lake bed</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8rem' }}
              value={form.geotech_prev_water || ''}
              onChange={(e) => setF('geotech_prev_water', e.target.value)}
            >
              <option value="">— select —</option>
              <option value="yes">Yes (former lake/tank bed)</option>
              <option value="no">No</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div className="form-group full" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Report date &amp; issuing agency</label>
            <input
              className="form-input"
              type="text"
              style={{ fontSize: '0.8rem' }}
              value={form.geotech_report_agency || ''}
              onChange={(e) => setF('geotech_report_agency', e.target.value)}
              placeholder="e.g. Nov 2023, Madras Geotech Labs"
            />
          </div>
        </div>
      )}
    </div>
  );
};
