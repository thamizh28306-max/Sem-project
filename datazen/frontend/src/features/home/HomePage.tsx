import React, { useState, useEffect } from 'react';
import { Listing } from '../../types/listing';
import { fetchListingsApi } from '../../api/listings';
import { ListingCard } from '../properties/ListingCard';

export interface HomePageProps {
  setPage: (page: string) => void;
  onToast?: (msg: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setPage, onToast }) => {
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadFeatured() {
      try {
        const data = await fetchListingsApi();
        if (mounted) setFeatured((data || []).slice(0, 3));
      } catch {
        // Fallback remains clean
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadFeatured();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-grid" />
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
        </div>
        <div className="hero-content">
          <div className="hero-badge fade-up">
            <div className="badge-dot" />
            AI-Assisted Property Intelligence (Demo)
          </div>

          <h1 className="hero-h1 fade-up fade-up-d1">
            Find, Buy &amp; Predict Property Prices{' '}
            <span className="gradient-text">Instantly</span>
          </h1>

          <p className="hero-sub fade-up fade-up-d2">
            Explore verified Chennai real estate with algorithmic price estimates, OpenStreetMap surroundings, and transparent uncertainty intervals.
          </p>

          <div className="hero-actions fade-up fade-up-d3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setPage('predict')}
            >
              🔮 Predict Price Free
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage('listings')}
            >
              Browse Properties →
            </button>
          </div>

          <div className="hero-stats fade-up fade-up-d4">
            {[
              ['2,400+', 'Active Listings'],
              ['80%', 'Interval Coverage'],
              ['20', 'Chennai Localities'],
              ['₹6.8L', 'Avg. Savings Found'],
            ].map(([val, label]) => (
              <div key={label} className="hero-stat">
                <span className="hero-stat-val">{val}</span>
                <span className="hero-stat-lbl">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="section features">
        <div className="section-inner">
          <div className="fade-up">
            <span className="section-label">Platform Features</span>
            <h2 className="section-title">Everything you need to evaluate property</h2>
            <p className="section-sub">
              Combining machine learning benchmarks, geospatial open data, and local market signals.
            </p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: '🔮',
                title: 'ML Price Estimation (Demo)',
                desc: 'Instant valuations with calibrated split-conformal uncertainty intervals, built on Chennai benchmark rates.',
              },
              {
                icon: '🗺️',
                title: 'Map-Based Search',
                desc: 'Explore neighborhood density, transit distances, schools, and essential amenities on an interactive map.',
              },
              {
                icon: '📊',
                title: 'Market Analytics',
                desc: 'Historical trend indicators and per-sqft price tracking across 20 primary Chennai micro-markets.',
              },
              {
                icon: '🏠',
                title: 'Buy & Sell Platform',
                desc: 'Direct contact with property sellers without hidden fees, backed by verified ownership workflows.',
              },
              {
                icon: '🧭',
                title: 'Location Intelligence',
                desc: 'Automated radius proximity scoring measuring walking and transit access to daily needs.',
              },
              {
                icon: '🌱',
                title: 'Land Indicators',
                desc: 'Agricultural topsoil monitoring parameters (pH, moisture, NPK) for residential garden and plot planning.',
              },
            ].map((f) => (
              <div key={f.title} className="feature-card fade-up">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section className="section" style={{ background: '#f8fafc' }}>
        <div className="section-inner">
          <div className="fade-up">
            <span className="section-label">Simple Workflow</span>
            <h2 className="section-title">How DataZen Works</h2>
            <p className="section-sub">From search to transparent estimation in four quick steps.</p>
          </div>

          <div className="steps fade-up fade-up-d1">
            {[
              ['01', 'Pick a Location', 'Select your target Chennai neighborhood or click any location on the map.'],
              ['02', 'Enter Property Details', 'Provide property type, area, floor, age, and approval status.'],
              ['03', 'Get Your Estimate', 'View predicted market rate with transparent 80% conformal interval range.'],
              ['04', 'Review Surroundings', 'Inspect nearby metro stations, schools, and hospitals with verified distances.'],
            ].map(([num, title, desc]) => (
              <div key={num} className="step">
                <div className="step-num">{num}</div>
                <h4 className="step-title">{title}</h4>
                <p className="step-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Listings ───────────────────────────────────────────── */}
      <section className="section">
        <div className="section-inner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
            <div>
              <span className="section-label">Latest Properties</span>
              <h2 className="section-title" style={{ marginBottom: 4 }}>Featured Listings</h2>
              <p className="section-sub" style={{ margin: 0 }}>Fresh properties added this week in Chennai</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage('listings')}
            >
              View All Properties →
            </button>
          </div>

          {loading ? (
            <div className="listings-grid">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="shimmer"
                  style={{ height: 340, borderRadius: 'var(--radius)', background: 'var(--card)' }}
                />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              No listings currently available.{' '}
              <button
                type="button"
                className="btn-primary"
                style={{ marginLeft: 8 }}
                onClick={() => setPage('sell')}
              >
                + List First Property
              </button>
            </div>
          ) : (
            <div className="listings-grid">
              {featured.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  onContact={() => setPage('listings')}
                  onToast={onToast}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Ready to value your Chennai property?</h2>
          <p className="cta-sub">
            Get instant algorithmic estimates, explore neighborhood amenities, and make informed real estate decisions.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-white"
              onClick={() => setPage('predict')}
            >
              Start Predicting Free
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPage('map')}
            >
              Open Map Explorer 🗺️
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
