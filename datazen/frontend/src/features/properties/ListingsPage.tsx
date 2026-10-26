import React, { useState, useEffect } from 'react';
import { Listing } from '../../types/listing';
import { fetchListingsApi, contactSellerApi } from '../../api/listings';
import { ListingCard } from './ListingCard';
import { Modal } from '../../components/common/Modal';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { useAuth } from '../../state/AuthContext';

export interface ListingsPageProps {
  onToast?: (msg: string) => void;
  setShowAuthModal?: (show: boolean) => void;
}

export const ListingsPage: React.FC<ListingsPageProps> = ({ onToast, setShowAuthModal }) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contactModalListing, setContactModalListing] = useState<Listing | null>(null);
  const [sellerContact, setSellerContact] = useState<{ name: string; phone: string | null; email: string } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  const loadListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchListingsApi(filter);
      setListings(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not fetch listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [filter]);

  const handleContactClick = async (listing: Listing) => {
    setContactModalListing(listing);
    setSellerContact(null);
    setContactSent(false);

    if (user) {
      setContactLoading(true);
      try {
        const res = await contactSellerApi(listing.id);
        setSellerContact(res.seller);
      } catch {
        // Fallback to inquiry form
      } finally {
        setContactLoading(false);
      }
    }
  };

  return (
    <div className="section" style={{ paddingTop: 100 }}>
      <div className="section-inner">
        <div className="fade-up">
          <span className="section-label">Verified Listings</span>
          <h1 className="section-title">Explore Chennai Properties</h1>
          <p className="section-sub">
            Browse through apartments, villas, and commercial plots across Chennai's top localities.
          </p>
        </div>

        <div className="filter-bar fade-up fade-up-d1">
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              ['all', 'All Properties'],
              ['sale', '🏷️ Buy'],
              ['rent', '🔑 Rent'],
            ].map(([f, label]) => (
              <button
                key={f}
                type="button"
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f as 'all' | 'sale' | 'rent')}
              >
                {label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
            {loading ? 'Searching...' : `${listings.length} properties found`}
          </span>
        </div>

        {error && (
          <ErrorBanner
            title="Failed to load properties"
            message={error}
            onRetry={loadListings}
            style={{ maxWidth: 600, margin: '20px auto' }}
          />
        )}

        {loading ? (
          <div className="listings-grid">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="shimmer"
                style={{
                  height: 340,
                  borderRadius: 'var(--radius)',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
              />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--muted)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏘️</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 6 }}>
              No properties found in this category
            </div>
            <p style={{ fontSize: '0.9rem' }}>Try switching filters or explore the Map Explorer.</p>
          </div>
        ) : (
          <div className="listings-grid fade-up fade-up-d2">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                onContact={handleContactClick}
                onToast={onToast}
              />
            ))}
          </div>
        )}

        {contactModalListing && (
          <Modal
            isOpen={true}
            onClose={() => setContactModalListing(null)}
            title="Contact Property Seller"
            subtitle={`${contactModalListing.title} · ${contactModalListing.locality}`}
          >
            {contactSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 700, color: 'var(--g700)', fontSize: '1rem', marginBottom: 4 }}>
                  Inquiry Sent!
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                  The seller has been notified and will reach out to you shortly.
                </p>
              </div>
            ) : !user ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--slate2)', marginBottom: 16 }}>
                  Log in to access seller direct phone and email contact details.
                </p>
                <button
                  type="button"
                  className="predict-btn"
                  onClick={() => {
                    setContactModalListing(null);
                    setShowAuthModal?.(true);
                  }}
                >
                  Log In to View Contact
                </button>
              </div>
            ) : contactLoading ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--muted)' }}>
                Loading verified seller contact...
              </div>
            ) : sellerContact ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 2 }}>Seller Name:</div>
                  <div style={{ fontWeight: 700, color: 'var(--slate)' }}>{sellerContact.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 8, marginBottom: 2 }}>Phone:</div>
                  <div style={{ fontWeight: 600, color: 'var(--slate)' }}>
                    {sellerContact.phone ? (
                      <a href={`tel:${sellerContact.phone}`} style={{ color: 'var(--g700)', textDecoration: 'none' }}>
                        📞 {sellerContact.phone}
                      </a>
                    ) : (
                      'Phone not provided'
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 8, marginBottom: 2 }}>Email:</div>
                  <div style={{ fontWeight: 600, color: 'var(--slate)' }}>
                    <a href={`mailto:${sellerContact.email}`} style={{ color: 'var(--g700)', textDecoration: 'none' }}>
                      ✉️ {sellerContact.email}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  className="predict-btn"
                  onClick={() => {
                    setContactSent(true);
                    onToast?.('Seller contacted');
                  }}
                >
                  Send Property Inquiry Note
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setContactSent(true);
                  onToast?.('Inquiry sent to seller');
                }}
              >
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Your Name</label>
                  <input className="form-input" type="text" required defaultValue={user.name} />
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" type="tel" required placeholder="9876543210" />
                </div>
                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    defaultValue={`Hi, I am interested in your property in ${contactModalListing.locality}.`}
                  />
                </div>
                <button type="submit" className="predict-btn">
                  Send Message
                </button>
              </form>
            )}
          </Modal>
        )}
      </div>
    </div>
  );
};
