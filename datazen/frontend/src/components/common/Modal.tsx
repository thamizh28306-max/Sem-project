import React, { useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidth?: number;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = 440,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth }}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        {(title || subtitle) && (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            {title && (
              <div
                style={{
                  fontFamily: 'var(--font-head)',
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  color: 'var(--slate)',
                  marginBottom: 4,
                }}
              >
                {title}
              </div>
            )}
            {subtitle && (
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{subtitle}</p>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
