import React from 'react';

export interface FooterProps {
  setPage: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setPage }) => {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <div className="footer-logo">
              Data<span>Zen</span>
            </div>
            <p className="footer-desc">
              AI-assisted property intelligence (demo) for real estate exploration in Chennai.
            </p>
          </div>
          <div className="footer-links">
            <div>
              <div className="footer-col-title">Platform</div>
              {[
                ['listings', 'Properties'],
                ['predict', 'Price Predictor'],
                ['map', 'Map Explorer'],
              ].map(([p, label]) => (
                <div
                  key={p}
                  className="footer-link"
                  onClick={() => setPage(p)}
                  tabIndex={0}
                  role="button"
                >
                  {label}
                </div>
              ))}
            </div>
            <div>
              <div className="footer-col-title">Company</div>
              {['About', 'Careers', 'Blog', 'Contact'].map((l) => (
                <div key={l} className="footer-link" tabIndex={0} role="button">
                  {l}
                </div>
              ))}
            </div>
            <div>
              <div className="footer-col-title">Legal</div>
              {['Privacy Policy', 'Terms of Use', 'Cookie Policy'].map((l) => (
                <div key={l} className="footer-link" tabIndex={0} role="button">
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 DataZen. Built for smarter property decisions.</span>
          <span>Made with 💚 in Chennai</span>
        </div>
      </div>
    </footer>
  );
};
