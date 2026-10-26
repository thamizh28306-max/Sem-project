import React from 'react';

export interface NoticeProps {
  children: React.ReactNode;
  variant?: 'info' | 'warning' | 'error' | 'success';
  style?: React.CSSProperties;
}

export const Notice: React.FC<NoticeProps> = ({ children, variant = 'info', style }) => {
  const styles: Record<string, React.CSSProperties> = {
    info: {
      background: '#f0f9ff',
      color: '#0369a1',
      border: '1px solid #bae6fd',
    },
    warning: {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fde68a',
    },
    error: {
      background: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fecaca',
    },
    success: {
      background: 'var(--g50, #f0fdf4)',
      color: 'var(--g700, #15803d)',
      border: '1px solid var(--g200, #bbf7d0)',
    },
  };

  return (
    <div
      style={{
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: '0.78rem',
        lineHeight: 1.5,
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </div>
  );
};
