import React, { useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useCoverage } from '../../state/CoverageContext';
import { createListingApi } from '../../api/listings';
import { predictPriceApi } from '../../api/predict';
import { formatINR } from '../../utils/format';
import { Button } from '../../components/common/Button';

export interface SellPageProps {
  setPage: (page: string) => void;
  onToast?: (msg: string) => void;
  setShowAuthModal?: (show: boolean) => void;
}

export const SellPage: React.FC<SellPageProps> = ({ setPage, onToast, setShowAuthModal }) => {
  const { user } = useAuth();
  const { localities } = useCoverage();

  const [form, setForm] = useState({
    title: '',
    listingType: 'sale',
    propertyType: 'Apartment/Flat',
    locality: 'Anna Nagar',
    address: '',
    price: '',
    sqft: '',
    bhk: '2',
    age: '2',
    floor: '1',
    parking: 'yes',
    furnished: '0',
    description: '',
    imageUrl: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  // Suggested estimate state
  const [estimating, setEstimating] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState<{ low: number; high: number } | null>(null);

  const setF = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleGetEstimate = async () => {
    const areaVal = Number(form.sqft);
    if (!areaVal || areaVal <= 0) {
      setSubmitError('Enter property area to get an AI price suggestion.');
      return;
    }

    setEstimating(true);
    setSubmitError('');

    try {
      const pred = await predictPriceApi({
        property_type: form.propertyType,
        locality: form.locality,
        area_sqft: areaVal,
        bhk: Number(form.bhk) || 2,
        age_years: Number(form.age) || 0,
        floor: Number(form.floor) || 0,
        parking: form.parking === 'yes' ? 1 : 0,
        furnished: Number(form.furnished) || 0,
        school_dist_km: 1.0,
        metro_dist_km: 2.0,
      });

      setSuggestedPrice({
        low: pred.range_low,
        high: pred.range_high,
      });
      onToast?.('AI price range computed!');
    } catch {
      setSubmitError('Could not calculate estimate. You can enter your price manually.');
    } finally {
      setEstimating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!form.title.trim()) {
      setSubmitError('Please enter a property title.');
      return;
    }
    if (!(Number(form.price) > 0)) {
      setSubmitError('Please enter a valid price.');
      return;
    }
    if (!(Number(form.sqft) > 0)) {
      setSubmitError('Please enter the property area.');
      return;
    }
    if (form.description.length > 500) {
      setSubmitError('Description must be under 500 characters.');
      return;
    }

    if (!user) {
      setSubmitError('You must be logged in to submit a listing.');
      setShowAuthModal?.(true);
      return;
    }

    setSubmitting(true);
    try {
      await createListingApi({
        title: form.title,
        locality: form.locality,
        address: form.address || undefined,
        type: form.listingType,
        bhk: Number(form.bhk),
        sqft: Number(form.sqft),
        price: Number(form.price),
        age: Number(form.age),
        floor: Number(form.floor),
        parking: form.parking === 'yes',
        furnished: Number(form.furnished),
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
      });

      setSuccess(true);
      onToast?.('Property listed successfully!');
      setTimeout(() => {
        setPage('listings');
      }, 1500);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="section" style={{ paddingTop: 100, textAlign: 'center' }}>
        <div style={{ maxWidth: 440, margin: '60px auto', background: 'white', padding: 36, borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔐</div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.25rem', marginBottom: 8, color: 'var(--slate)' }}>
            Sign In to List Property
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
            To prevent spam and protect buyers, only verified accounts can post properties on DataZen.
          </p>
          <Button
            type="button"
            variant="predict"
            onClick={() => setShowAuthModal?.(true)}
            style={{ width: '100%' }}
          >
            Login or Register
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="section" style={{ paddingTop: 100 }}>
      <div className="section-inner" style={{ maxWidth: 680 }}>
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <span className="section-label">List Your Property</span>
          <h1 className="section-title">Post a Chennai Property</h1>
          <p className="section-sub">
            Reach serious buyers across Chennai with transparent algorithmic valuation benchmarks.
          </p>
        </div>

        {success ? (
          <div
            style={{
              background: 'var(--g50)',
              border: '1px solid var(--g200)',
              borderRadius: 'var(--radius)',
              padding: 40,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--g800)', marginBottom: 6 }}>
              Property Listed Successfully!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Redirecting you to the listings page...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'white',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
              padding: 28,
            }}
          >
            <div className="form-grid">
              <div className="form-group full" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Property Title *</label>
                <input
                  className="form-input"
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setF('title', e.target.value)}
                  placeholder="e.g. Spacious 3 BHK Apartment in Anna Nagar"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Listing Type</label>
                <select
                  className="form-select"
                  value={form.listingType}
                  onChange={(e) => setF('listingType', e.target.value)}
                >
                  <option value="sale">🏷️ For Sale</option>
                  <option value="rent">🔑 For Rent</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Locality *</label>
                <select
                  className="form-select"
                  value={form.locality}
                  onChange={(e) => setF('locality', e.target.value)}
                >
                  {localities.map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Super Built-up Area (sq ft) *</label>
                <input
                  className="form-input"
                  type="number"
                  required
                  min={100}
                  value={form.sqft}
                  onChange={(e) => setF('sqft', e.target.value)}
                  placeholder="e.g. 1250"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Asking Price (₹) *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type="number"
                    required
                    min={1000}
                    value={form.price}
                    onChange={(e) => setF('price', e.target.value)}
                    placeholder="e.g. 8500000"
                  />
                  <button
                    type="button"
                    onClick={handleGetEstimate}
                    disabled={estimating}
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: 6,
                      bottom: 6,
                      background: 'var(--g50)',
                      color: 'var(--g700)',
                      border: '1px solid var(--g200)',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0 8px',
                    }}
                  >
                    {estimating ? 'Estimating...' : '✨ Suggest Price'}
                  </button>
                </div>
              </div>

              {suggestedPrice && (
                <div
                  style={{
                    gridColumn: 'span 2',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    color: '#166534',
                  }}
                >
                  💡 <strong>AI Benchmark:</strong> Similar properties in {form.locality} estimate between{' '}
                  <strong>{formatINR(suggestedPrice.low)}</strong> and{' '}
                  <strong>{formatINR(suggestedPrice.high)}</strong>.
                </div>
              )}

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
                <label className="form-label">Floor</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  value={form.floor}
                  onChange={(e) => setF('floor', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Building Age (years)</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  value={form.age}
                  onChange={(e) => setF('age', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Parking</label>
                <select
                  className="form-select"
                  value={form.parking}
                  onChange={(e) => setF('parking', e.target.value)}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="form-group full" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Property Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setF('description', e.target.value)}
                  placeholder="Mention key highlights, ventilation, nearby landmarks..."
                  maxLength={500}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', float: 'right' }}>
                  {form.description.length}/500
                </span>
              </div>

              <div className="form-group full" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Cover Image URL (Optional)</label>
                <input
                  className="form-input"
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setF('imageUrl', e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>
            </div>

            {submitError && (
              <div
                style={{
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  marginTop: 14,
                  background: '#fef2f2',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #fecaca',
                }}
              >
                {submitError}
              </div>
            )}

            <Button
              type="submit"
              variant="predict"
              isLoading={submitting}
              style={{ width: '100%', marginTop: 20 }}
            >
              Post Property Listing
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
