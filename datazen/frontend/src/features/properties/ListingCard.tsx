import React, { useState } from 'react';
import { Listing } from '../../types/listing';
import { formatINR } from '../../utils/format';
import { toggleSaveListingApi } from '../../api/listings';
import { useAuth } from '../../state/AuthContext';

export interface ListingCardProps {
  listing: Listing;
  onContact?: (listing: Listing) => void;
  onToast?: (msg: string) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onContact, onToast }) => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const displaySqft = (listing.sqft || 0).toLocaleString('en-IN');
  const displayAge = listing.age_years != null ? listing.age_years : (listing.age != null ? listing.age : 0);
  const typeEmoji = listing.type === 'rent' ? '🏢' : (listing.type === 'plot' ? '🌿' : '🏠');
  const displayEmoji = listing.emoji || typeEmoji;

  const handleSave = async () => {
    if (!user) {
      onToast?.('Please login to save properties');
      return;
    }
    setSaving(true);
    try {
      const res = await toggleSaveListingApi(listing.id);
      setSaved(res.saved);
      onToast?.(res.saved ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch {
      onToast?.('Failed to update bookmark');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="listing-card">
      <div className="listing-img">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span style={{ fontSize: '3rem' }}>{displayEmoji}</span>
        )}
        <div className="listing-badge">
          {listing.type === 'rent' ? '🔑 For Rent' : '🏷️ For Sale'}
        </div>
        <div className="listing-price-tag">{formatINR(listing.price)}</div>
      </div>

      <div className="listing-body">
        <div className="listing-name">{listing.title}</div>
        <div className="listing-loc">📍 {listing.locality}</div>

        <div className="listing-meta">
          {listing.bhk > 0 && (
            <span className="listing-meta-item">🛏️ {listing.bhk} BHK</span>
          )}
          <span className="listing-meta-item">📐 {displaySqft} sqft</span>
          {displayAge > 0 && (
            <span className="listing-meta-item">⏳ {displayAge} yrs old</span>
          )}
        </div>

        <div className="listing-actions">
          <button
            type="button"
            className="listing-btn listing-btn-primary"
            onClick={() => onContact?.(listing)}
          >
            Contact
          </button>
          <button
            type="button"
            className={`listing-btn listing-btn-outline ${saved ? 'active' : ''}`}
            onClick={handleSave}
            disabled={saving}
            title={saved ? 'Remove bookmark' : 'Save listing'}
          >
            {saved ? '❤️ Saved' : '🤍 Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
