import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Self-hosted fonts
import '@fontsource/syne/400.css';
import '@fontsource/syne/600.css';
import '@fontsource/syne/700.css';
import '@fontsource/syne/800.css';
import '@fontsource/dm-sans/300.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/400-italic.css';

// Global stylesheet & CSS tokens
import './styles/global.css';

import { AuthProvider } from './state/AuthContext';
import { CoverageProvider } from './state/CoverageContext';
import { IS_CONFIG_VALID, API_BASE_URL } from './config/env';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Fatal: #root container element missing from DOM.');
}

if (!IS_CONFIG_VALID) {
  ReactDOM.createRoot(rootElement).render(
    <div
      style={{
        padding: 40,
        fontFamily: 'sans-serif',
        maxWidth: 600,
        margin: '60px auto',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 12,
        color: '#991b1b',
      }}
    >
      <h2 style={{ marginBottom: 8 }}>Configuration Error</h2>
      <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
        The environment variable <code>VITE_API_BASE_URL</code> is malformed: <strong>{API_BASE_URL}</strong>.
      </p>
      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
        Please check your <code>.env</code> file and specify a valid HTTP or HTTPS origin (e.g.{' '}
        <code>http://localhost:3000</code>).
      </p>
    </div>
  );
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <CoverageProvider>
          <App />
        </CoverageProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}
