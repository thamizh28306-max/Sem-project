import { useState, useEffect, Suspense, lazy } from 'react';
import { Nav } from './components/Nav';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { AuthModal } from './features/auth/AuthModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Spinner } from './components/common/Spinner';

import { HomePage } from './features/home/HomePage';
import { ListingsPage } from './features/properties/ListingsPage';
import { PredictPage } from './features/predict/PredictPage';
import { SellPage } from './features/sell/SellPage';

// Code splitting: Lazy-load the Leaflet-heavy Map Explorer view
const MapExplorerView = lazy(() =>
  import('./features/map-explorer/MapExplorerView').then((m) => ({
    default: m.MapExplorerView,
  }))
);

export function App() {
  const getInitialPage = (): string => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    return ['home', 'listings', 'predict', 'map', 'sell'].includes(hash) ? hash : 'home';
  };

  const [page, setPageState] = useState<string>(getInitialPage());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [predictionDistances, setPredictionDistances] = useState<{
    school: number;
    metro: number;
  } | null>(null);

  // Sync state with URL hash
  const setPage = (newPage: string) => {
    setPageState(newPage);
    window.location.hash = `#/${newPage}`;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (['home', 'listings', 'predict', 'map', 'sell'].includes(hash)) {
        setPageState(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handleUseDistances = (school: number, metro: number) => {
    setPredictionDistances({ school, metro });
    setPage('predict');
  };

  return (
    <div>
      <Nav page={page} setPage={setPage} setShowAuthModal={setShowAuthModal} />

      <main>
        {page === 'home' && (
          <ErrorBoundary fallbackTitle="Could not load Home Page">
            <HomePage setPage={setPage} onToast={setToastMsg} />
          </ErrorBoundary>
        )}

        {page === 'listings' && (
          <ErrorBoundary fallbackTitle="Could not load Properties">
            <ListingsPage onToast={setToastMsg} setShowAuthModal={setShowAuthModal} />
          </ErrorBoundary>
        )}

        {page === 'predict' && (
          <ErrorBoundary fallbackTitle="Could not load Price Predictor">
            <PredictPage predictionDistances={predictionDistances} />
          </ErrorBoundary>
        )}

        {page === 'map' && (
          <ErrorBoundary fallbackTitle="Could not load Map Explorer">
            <Suspense
              fallback={
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 500,
                    gap: 16,
                    color: 'var(--muted)',
                  }}
                >
                  <Spinner size={36} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading Map Explorer &amp; GIS Layers...</span>
                </div>
              }
            >
              <MapExplorerView onUseDistances={handleUseDistances} />
            </Suspense>
          </ErrorBoundary>
        )}

        {page === 'sell' && (
          <ErrorBoundary fallbackTitle="Could not load Sell Property">
            <SellPage setPage={setPage} onToast={setToastMsg} setShowAuthModal={setShowAuthModal} />
          </ErrorBoundary>
        )}
      </main>

      <Footer setPage={setPage} />

      <Toast msg={toastMsg} onClose={() => setToastMsg(null)} />

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

export default App;
