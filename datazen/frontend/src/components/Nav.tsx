import React from 'react';
import { useAuth } from '../state/AuthContext';

export interface NavProps {
  page: string;
  setPage: (page: string) => void;
  setShowAuthModal: (show: boolean) => void;
}

export const Nav: React.FC<NavProps> = ({ page, setPage, setShowAuthModal }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="nav" role="navigation" aria-label="Main Navigation">
      <div className="nav-logo" onClick={() => setPage('home')} tabIndex={0} role="button">
        <div className="nav-logo-dot" />
        Data<span>Zen</span>
      </div>

      <div className="nav-links">
        {[
          ['home', 'Home'],
          ['listings', 'Properties'],
          ['predict', 'Predict Price'],
          ['map', 'Map Explorer'],
          ['sell', 'Sell Property'],
        ].map(([p, label]) => (
          <button
            key={p}
            type="button"
            className={`nav-link ${page === p ? 'active' : ''}`}
            onClick={() => setPage(p)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="nav-actions">
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate2)' }}>
              Hi, {user.name.split(' ')[0]}
            </span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={logout}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="nav-cta"
            onClick={() => setShowAuthModal(true)}
          >
            Login / Register
          </button>
        )}
      </div>
    </nav>
  );
};
