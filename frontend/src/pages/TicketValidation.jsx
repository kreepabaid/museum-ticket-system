import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { QrCode, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import '../index.css';

export default function TicketValidation() {
  const [searchParams] = useSearchParams();
  const { user, isAdmin, loginAsAdmin } = useAuth();

  const [inputCode, setInputCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-fill from query params if directed from ticket pass
  useEffect(() => {
    const paramQr = searchParams.get('qrPayload');
    const paramTicket = searchParams.get('ticketId');
    if (paramQr) {
      setInputCode(paramQr);
    } else if (paramTicket) {
      setInputCode(paramTicket);
    }
  }, [searchParams]);

  const handleValidate = async (e, overrideCode = null) => {
    if (e) e.preventDefault();
    const code = (overrideCode || inputCode || '').trim();
    if (!code) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await api.validateTicket(code, code);
      setResult({
        status: 'success',
        message: response.data.message || 'VALID TICKET — ENTRY ALLOWED',
        details: response.data.bookingDetails || response.data.entryRecord
      });
    } catch (err) {
      const data = err.response?.data;
      const status = err.response?.status;

      if (status === 409) {
        setResult({
          status: 'duplicate',
          title: 'TICKET ALREADY USED',
          message: data?.error || 'This ticket was already scanned for entry.',
          details: data?.details
        });
      } else if (status === 400) {
        setResult({
          status: 'invalid',
          title: data?.error?.includes('CANCELLED') ? 'TICKET CANCELLED' : 'TAMPERED / INVALID QR CODE',
          message: data?.error || 'Validation rejected by gate security.',
          reason: data?.reason
        });
      } else if (status === 404) {
        setResult({
          status: 'not_found',
          title: 'INVALID TICKET: NOT FOUND',
          message: 'No matching booking or ticket reference found in database.'
        });
      } else if (status === 403 || status === 401) {
        setResult({
          status: 'unauthorized',
          title: 'ADMIN ACCESS REQUIRED',
          message: 'Gate scanning requires an authorized Curator Admin account.'
        });
      } else {
        setResult({
          status: 'error',
          title: 'VALIDATION ERROR',
          message: 'Could not communicate with gate validation service.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const runQuickTest = (code) => {
    setInputCode(code);
    handleValidate(null, code);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '3.5rem 2rem', background: 'var(--bg-primary)', minHeight: '85vh' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        <div className="flex-between" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.25rem' }}>Gate Entrance Scanner</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Real-time ticket admission console with HMAC cryptographic validation.
            </p>
          </div>
          <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Admin Dashboard
          </Link>
        </div>

        {/* Admin Guard Notice */}
        {!isAdmin && (
          <div style={{
            background: 'rgba(197, 160, 89, 0.15)',
            border: '1px solid var(--accent-gold)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Admin Privileges Required</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Gate validation is restricted to authorized staff. Switch to Curator Admin to scan tickets.
              </span>
            </div>
            <button
              onClick={loginAsAdmin}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              🏛️ Switch to Curator Admin
            </button>
          </div>
        )}

        <div className="card" style={{ padding: '2.5rem' }}>
          {/* Quick Demo Test Buttons */}
          <div style={{
            background: 'var(--bg-primary)',
            padding: '1.25rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            marginBottom: '2rem'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
              ⚡ Viva / Demo Quick Test Scenarios
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => runQuickTest('TKT-REN-02')}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.5rem', borderColor: 'var(--status-available)', color: 'var(--status-available)' }}
              >
                ✓ Valid Ticket (Active)
              </button>
              <button
                type="button"
                onClick={() => runQuickTest('TKT-EGYPT-01')}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.5rem', borderColor: 'var(--status-soldout)', color: 'var(--status-soldout)' }}
              >
                ⚠ Already Used (Dup)
              </button>
              <button
                type="button"
                onClick={() => runQuickTest('TKT-IMP-04')}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.5rem', borderColor: '#6c757d', color: '#6c757d' }}
              >
                ✕ Cancelled Ticket
              </button>
              <button
                type="button"
                onClick={() => runQuickTest('MUS-2026-FAKE.ffffffffffffffffffffffffffffffff')}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.5rem', borderColor: '#d9534f', color: '#d9534f' }}
              >
                🛡️ Forged HMAC QR
              </button>
            </div>
          </div>

          <form onSubmit={handleValidate}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Scan QR Payload or Enter Ticket ID
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. TKT-EGYPT-01 or MUS-2026-B001.signature"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  style={{
                    fontSize: '1.05rem',
                    fontFamily: 'monospace',
                    padding: '0.85rem 1rem',
                    letterSpacing: '1px'
                  }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={loading || !inputCode.trim()}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" /> Verifying against DynamoDB...
                </>
              ) : (
                <>
                  <QrCode size={18} /> Validate & Admit Visitor
                </>
              )}
            </button>
          </form>

          {/* Validation Feedback Card */}
          {result && (
            <div style={{
              marginTop: '2rem',
              padding: '1.75rem',
              borderRadius: '12px',
              background: result.status === 'success'
                ? 'rgba(40, 167, 69, 0.08)'
                : (result.status === 'duplicate' ? 'rgba(255, 193, 7, 0.12)' : 'rgba(220, 53, 69, 0.08)'),
              border: `2px solid ${
                result.status === 'success'
                  ? 'var(--status-available)'
                  : (result.status === 'duplicate' ? 'var(--status-filling)' : 'var(--status-soldout)')
              }`
            }}>
              <div style={{ textAlign: 'center', marginBottom: result.details ? '1.25rem' : '0' }}>
                <div style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
                  {result.status === 'success' && <CheckCircle2 size={42} color="var(--status-available)" />}
                  {result.status === 'duplicate' && <AlertTriangle size={42} color="#b08600" />}
                  {result.status !== 'success' && result.status !== 'duplicate' && <XCircle size={42} color="var(--status-soldout)" />}
                </div>

                <h3 style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: result.status === 'success'
                    ? 'var(--status-available)'
                    : (result.status === 'duplicate' ? '#8a6800' : 'var(--status-soldout)')
                }}>
                  {result.title || result.message}
                </h3>

                {result.title && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {result.message}
                  </p>
                )}
                {result.reason && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--status-soldout)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                    Reason: {result.reason}
                  </p>
                )}
              </div>

              {/* Success Admission Details */}
              {result.details && typeof result.details === 'object' && (
                <div style={{
                  background: '#fff',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Visitor Name:</span>
                    <strong>{result.details.visitorName || 'Visitor'}</strong>
                  </div>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Exhibition:</span>
                    <strong>{result.details.exhibitionName || result.details.exhibitionId}</strong>
                  </div>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Admitted Visitors:</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--status-available)' }}>
                      {result.details.numberOfVisitors} Visitors
                    </strong>
                  </div>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Admitted Timestamp:</span>
                    <span>{new Date(result.details.admittedAt || result.details.enteredAt || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex-between" style={{ borderTop: '1px solid #f0f0f0', paddingTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#888' }}>
                    <span>REF: {result.details.bookingId}</span>
                    <span>GATE: North Turnstile 1</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
