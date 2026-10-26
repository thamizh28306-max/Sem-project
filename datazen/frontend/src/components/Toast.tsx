import React, { useEffect } from 'react';

export interface ToastProps {
  msg: string | null;
  onClose: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({ msg, onClose, durationMs = 3000 }) => {
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [msg, onClose, durationMs]);

  if (!msg) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <div className="toast-dot" />
      <span>{msg}</span>
    </div>
  );
};
