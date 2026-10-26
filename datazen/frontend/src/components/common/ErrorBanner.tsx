import React from 'react';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  style?: React.CSSProperties;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'An error occurred',
  message,
  onRetry,
  style,
}) => {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        color: '#b91c1c',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: '0.82rem',
        lineHeight: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
        <span>⚠️</span>
        <span>{title}</span>
      </div>
      <div>{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            alignSelf: 'flex-start',
            marginTop: 4,
            padding: '4px 10px',
            fontSize: '0.74rem',
            fontWeight: 600,
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          🔄 Retry
        </button>
      )}
    </div>
  );
};
