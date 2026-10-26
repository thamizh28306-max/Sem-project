import React from 'react';

export interface SpinnerProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 16, className = '', style }) => {
  return (
    <div
      className={`spinner ${className}`}
      style={{
        width: size,
        height: size,
        ...style,
      }}
      role="status"
      aria-label="Loading"
    />
  );
};
