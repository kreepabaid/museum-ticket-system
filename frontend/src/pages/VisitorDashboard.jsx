import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Ticket, Calendar, Clock, Users, AlertCircle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import '../index.css';

export default function VisitorDashboard() {
  const { user, isAuthenticated, loginAsVisitor, openLoginModal } = useAuth();

  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'ACTIVE', 'USED', 'CANCELLED'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);

  const fetchHistory = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.getMyBookings();
      setHistory(response.data || []);
    } catch (err) {
      setError('Could not load your bookings. Please sign in.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isAuthenticated]);

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    setCancellingId(cancelModalBooking.bookingId);
    try {
      await api.cancelBooking(cancelModalBooking.bookingId);
      setCancelModalBooking(null);
      await fetchHistory();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredHistory = history.filter(item => {
    const status = (item.status || '').toUpperCase();
    if (activeTab === 'ACTIVE') return status === 'ACTIVE' || status === 'CONFIRMED';
    if (activeTab === 'USED') return status === 'USED';
    if (activeTab === 'CANCELLED') return status === 'CANCELLED';
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ padding: '4rem 2rem', background: 'var(--bg-primary)', minHeight: '85vh' }}>
      <div className="container" style={{ maxWidth: '950px' }}>
        <div className="flex-between" style={{ marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>My Admission Passes</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Manage your museum reservations, view digital QR tickets, or cancel upcoming visits.
            </p>
          </div>

          <Link to="/" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
            + Book Another Exhibition
          </Link>
        </div>

        {/* Not Logged In Notice */}
        {!isAuthenticated && (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <Ticket size={48} color="var(--accent-gold)" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Sign In to View Your Passes</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
              Sign in with your visitor account to see all your active, past, and cancelled museum passes.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={loginAsVisitor} className="btn btn-primary">
                ⚡ 1-Click Demo Login (Alice)
              </button>
              <button onClick={openLoginModal} className="btn btn-outline">
                Sign In / Register
              </button>
            </div>
          </div>
        )}

        {isAuthenticated && (
          <>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              {[
                { key: 'ALL', label: `All Passes (${history.length})` },
                { key: 'ACTIVE', label: `Active (${history.filter(h => (h.status || '').toUpperCase() === 'ACTIVE' || (h.status || '').toUpperCase() === 'CONFIRMED').length})` },
                { key: 'USED', label: `Admitted (${history.filter(h => (h.status || '').toUpperCase() === 'USED').length})` },
                { key: 'CANCELLED', label: `Cancelled (${history.filter(h => (h.status || '').toUpperCase() === 'CANCELLED').length})` }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid var(--accent-gold)' : '2px solid transparent',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loading && <div className="loading-state">Fetching your passes from DynamoDB...</div>}
            {error && <div className="status-badge status-soldout" style={{ padding: '1.5rem', display: 'block', margin: '0 auto' }}>{error}</div>}

            {!loading && !error && filteredHistory.length === 0 && (
              <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Ticket size={40} color="#bbb" style={{ margin: '0 auto 1rem auto' }} />
                <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No passes found in this category.</p>
                <Link to="/" className="btn btn-outline">Browse Exhibitions</Link>
              </div>
            )}

            {/* Passes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {filteredHistory.map(item => {
                const isConfirmed = (item.status || '').toUpperCase() === 'ACTIVE' || (item.status || '').toUpperCase() === 'CONFIRMED';
                const isUsed = (item.status || '').toUpperCase() === 'USED';
                const isCancelled = (item.status || '').toUpperCase() === 'CANCELLED';

                return (
                  <div key={item.bookingId} className="card" style={{ padding: '1.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <h3 style={{ fontSize: '1.35rem' }}>{item.exhibitionName || item.exhibitionId}</h3>
                        <span className={`status-badge ${isConfirmed ? 'status-available' : (isUsed ? 'status-filling' : 'status-soldout')}`} style={{ fontSize: '0.75rem' }}>
                          {item.status}
                        </span>
                      </div>

                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={15} color="var(--accent-gold)" /> {item.bookingDate}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={15} color="var(--accent-gold)" /> {(item.slotId || item.dateSlot || '').split('#')[1] || 'General'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Users size={15} color="var(--accent-gold)" /> {item.numberOfVisitors} {item.numberOfVisitors === 1 ? 'Visitor' : 'Visitors'}
                        </span>
                      </div>

                      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        BOOKING REF: {item.bookingId} | TICKET: {item.ticketId}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {isConfirmed && (
                        <>
                          <Link to={`/ticket/${item.ticketId}`} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
                            View QR Pass
                          </Link>
                          <button
                            onClick={() => setCancelModalBooking(item)}
                            className="btn btn-outline"
                            style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', borderColor: 'var(--status-soldout)', color: 'var(--status-soldout)' }}
                          >
                            Cancel Pass
                          </button>
                        </>
                      )}

                      {isUsed && (
                        <Link to={`/ticket/${item.ticketId}`} className="btn btn-outline" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
                          Admitted Pass Receipt
                        </Link>
                      )}

                      {isCancelled && (
                        <button disabled className="btn" style={{ padding: '0.6rem 1rem', background: '#f0f0f0', color: '#999', cursor: 'not-allowed', fontSize: '0.85rem' }}>
                          Cancelled & Released
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Cancellation Confirmation Modal */}
        {cancelModalBooking && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem', textAlign: 'center', background: '#fff' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'rgba(220, 53, 69, 0.1)', color: 'var(--status-soldout)', marginBottom: '1rem' }}>
                <AlertCircle size={36} />
              </div>

              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Cancel Reservation?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Are you sure you want to cancel booking <strong>{cancelModalBooking.bookingId}</strong> for <strong>{cancelModalBooking.numberOfVisitors} visitors</strong>? This will immediately release the capacity back to the museum schedule.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setCancelModalBooking(null)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '0.75rem' }}
                  disabled={cancellingId !== null}
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="btn"
                  style={{ flex: 1, padding: '0.75rem', background: 'var(--status-soldout)', color: '#fff' }}
                  disabled={cancellingId !== null}
                >
                  {cancellingId ? 'Releasing Spots...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
