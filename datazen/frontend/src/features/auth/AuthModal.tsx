import React, { useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';

export interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', password: '' });

  const switchTab = (t: 'login' | 'register') => {
    setTab(t);
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(loginForm.email, loginForm.password);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regForm.password.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(regForm.name, regForm.email, regForm.password, regForm.phone);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <>
          Data<span style={{ color: 'var(--g600)' }}>Zen</span>
        </>
      }
      subtitle={
        tab === 'login'
          ? 'Welcome back! Sign in to your account.'
          : 'Create a new account to get started.'
      }
    >
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              fontFamily: 'var(--font-body)',
              color: tab === t ? 'var(--g700)' : 'var(--muted)',
              borderBottom: tab === t ? '2px solid var(--g600)' : '2px solid transparent',
              marginBottom: -2,
              transition: 'var(--transition)',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'login' ? (
        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 14, textAlign: 'center' }}>
              {error}
            </p>
          )}
          <Button type="submit" variant="predict" isLoading={loading} style={{ width: '100%' }}>
            Login
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Full Name</label>
            <input
              className="form-input"
              type="text"
              required
              value={regForm.name}
              onChange={(e) => setRegForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Arjun Kumar"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              required
              value={regForm.email}
              onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">
              Phone <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              className="form-input"
              type="tel"
              value={regForm.phone}
              onChange={(e) => setRegForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">
              Password <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(min 10 chars)</span>
            </label>
            <input
              className="form-input"
              type="password"
              required
              minLength={10}
              value={regForm.password}
              onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 14, textAlign: 'center' }}>
              {error}
            </p>
          )}
          <Button type="submit" variant="predict" isLoading={loading} style={{ width: '100%' }}>
            Create Account
          </Button>
        </form>
      )}
    </Modal>
  );
};
