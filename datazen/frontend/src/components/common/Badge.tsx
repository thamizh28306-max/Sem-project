import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'amber' | 'red' | 'slate' | 'neutral';
  style?: React.CSSProperties;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  style,
  className = '',
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    green: {
      background: 'var(--g50, #f0fdf4)',
      color: 'var(--g700, #15803d)',
      border: '1px solid var(--g200, #bbf7d0)',
    },
    amber: {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fde68a',
    },
    red: {
      background: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fecaca',
    },
    slate: {
      background: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
    },
    neutral: {
      background: '#f8fafc',
      color: '#334155',
      border: '1px solid #e2e8f0',
    },
  };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
};
