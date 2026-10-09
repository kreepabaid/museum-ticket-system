import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Lock, Mail, Phone, ShieldCheck } from 'lucide-react';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    closeAuthModal,
    login,
    register,
    loginAsVisitor,
    loginAsAdmin
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (authModalMode === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, phone, password });
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickVisitor = async () => {
    setLoading(true);
    setError('');
    try {
      await loginAsVisitor();
    } catch (err) {
      setError('Quick visitor login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginAsAdmin();
    } catch (err) {
      setError('Quick admin login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="card" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '2.5rem',
        position: 'relative',
        background: '#fff',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        borderRadius: '16px'
      }}>
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)'
          }}
        >
          <X size={22} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'rgba(197, 160, 89, 0.15)', color: 'var(--accent-gold)', marginBottom: '0.75rem' }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
            {authModalMode === 'login' ? 'Visitor Portal Sign In' : 'Create Visitor Account'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {authModalMode === 'login'
              ? 'Access your tickets and exhibition reservations'
              : 'Register for instant digital pass booking'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.75rem'
        }}>
          <button
            type="button"
            onClick={() => { setAuthModalMode('login'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              borderBottom: authModalMode === 'login' ? '2px solid var(--accent-gold)' : '2px solid transparent',
              fontWeight: authModalMode === 'login' ? 600 : 400,
              color: authModalMode === 'login' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthModalMode('register'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              borderBottom: authModalMode === 'register' ? '2px solid var(--accent-gold)' : '2px solid transparent',
              fontWeight: authModalMode === 'register' ? 600 : 400,
              color: authModalMode === 'register' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="status-badge status-soldout" style={{
            width: '100%',
            marginBottom: '1.25rem',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {authModalMode === 'register' && (
            <>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alice Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +1 555-0142"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="visitor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (authModalMode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* 1-Click Quick Demo Login shortcuts */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚡ 1-Click Demo Evaluation Logins
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleQuickVisitor}
              disabled={loading}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.5rem', borderColor: 'var(--accent-gold)' }}
            >
              👤 Demo Visitor
            </button>
            <button
              type="button"
              onClick={handleQuickAdmin}
              disabled={loading}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.5rem', borderColor: 'var(--accent-dark)' }}
            >
              🏛️ Curator Admin
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
