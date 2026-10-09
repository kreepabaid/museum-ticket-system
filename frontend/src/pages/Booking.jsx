import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Calendar, Clock, Users, ArrowLeft, ShieldCheck, Ticket, CheckCircle } from 'lucide-react';
import '../index.css';

export default function Booking() {
  const { exhibitionId, dateSlot } = useParams();
  const decodedDateSlot = decodeURIComponent(dateSlot);
  const [date, time] = decodedDateSlot.split('#');

  const navigate = useNavigate();
  const { user, isAuthenticated, openLoginModal, loginAsVisitor } = useAuth();

  const [exhibition, setExhibition] = useState(null);
  const [visitors, setVisitors] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    const fetchExhibition = async () => {
      try {
        const res = await api.getExhibition(exhibitionId);
        setExhibition(res.data);
      } catch (err) {
        console.error('Could not fetch exhibition details:', err);
      }
    };
    fetchExhibition();
  }, [exhibitionId]);

  const ticketPrice = 15; // $15 per visitor
  const totalAmount = visitors * ticketPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Please sign in or use 1-click demo login below to complete your booking.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.createBooking({
        exhibitionId,
        dateSlot: decodedDateSlot,
        numberOfVisitors: visitors
      });

      setConfirmedBooking(response.data.booking);
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Overbooking Prevented: Sorry, this time slot does not have enough remaining capacity for your group.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Your session has expired. Please sign in again.');
      } else {
        setError(err.response?.data?.error || 'Unable to complete booking. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLoginAndBook = async () => {
    try {
      await loginAsVisitor();
      setError('');
    } catch (err) {
      setError('Quick login failed');
    }
  };

  // If confirmed, render Booking Confirmation Receipt (Feature 19)
  if (confirmedBooking) {
    return (
      <div className="animate-fade-in" style={{ padding: '4rem 2rem', minHeight: '80vh', background: 'var(--bg-primary)' }}>
        <div className="card" style={{ maxWidth: '580px', margin: '0 auto', padding: '3rem 2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(40, 167, 69, 0.15)', color: 'var(--status-available)', marginBottom: '1.25rem' }}>
            <CheckCircle size={48} />
          </div>

          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Booking Confirmed!</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem' }}>
            Your digital pass has been atomically registered in Amazon DynamoDB. A notification was published to Amazon SNS.
          </p>

          {/* Receipt details */}
          <div style={{
            background: 'var(--bg-primary)',
            padding: '1.75rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            textAlign: 'left',
            marginBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            fontSize: '0.95rem'
          }}>
            <div className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Booking Reference:</span>
              <strong style={{ fontFamily: 'monospace' }}>{confirmedBooking.bookingId}</strong>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Ticket Reference:</span>
              <strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{confirmedBooking.ticketId}</strong>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Exhibition:</span>
              <strong>{confirmedBooking.exhibitionName || exhibition?.name}</strong>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Date & Time:</span>
              <strong>{date} @ {time}</strong>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Party Size:</span>
              <strong>{confirmedBooking.numberOfVisitors} {confirmedBooking.numberOfVisitors === 1 ? 'Visitor' : 'Visitors'}</strong>
            </div>
            <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
              <span className="status-badge status-available" style={{ fontSize: '0.75rem' }}>
                {confirmedBooking.status}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to={`/ticket/${confirmedBooking.ticketId}`} className="btn btn-primary" style={{ padding: '0.85rem 2rem' }}>
              View & Print Digital Pass →
            </Link>
            <Link to="/visitor" className="btn btn-outline" style={{ padding: '0.85rem 1.5rem' }}>
              My Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '4rem 2rem', background: 'var(--bg-primary)', minHeight: '80vh' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <Link to={`/exhibitions/${exhibitionId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to exhibition schedule
        </Link>

        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Confirm Reservation</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Review your chosen visit slot and reserve your museum entry pass.
        </p>

        <div className="card" style={{ padding: '2.5rem' }}>
          {/* Reservation Summary */}
          <div style={{
            background: 'var(--bg-primary)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              {exhibition?.name || 'Curated Exhibition'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={16} /> Date:
                </span>
                <strong>{date}</strong>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} /> Time Window:
                </span>
                <strong>{time}</strong>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)' }}>Venue:</span>
                <span>{exhibition?.location || 'Main Gallery'}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="status-badge status-soldout" style={{
              width: '100%',
              marginBottom: '1.5rem',
              padding: '1rem',
              display: 'block',
              borderRadius: '8px'
            }}>
              {error}
            </div>
          )}

          {/* User Sign-In Notice if unauthenticated */}
          {!isAuthenticated && (
            <div style={{
              background: 'rgba(197, 160, 89, 0.1)',
              border: '1px solid var(--accent-gold)',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                You must be signed in as a visitor to complete this booking.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleQuickLoginAndBook}
                  className="btn btn-outline"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', borderColor: 'var(--accent-gold)' }}
                >
                  ⚡ 1-Click Demo Login (Alice)
                </button>
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                >
                  Sign In / Register
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Number of Visitors Selector */}
            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Number of Visitors (Max 10 per party)</label>
              <select
                className="form-input"
                value={visitors}
                onChange={(e) => setVisitors(parseInt(e.target.value, 10))}
                style={{ fontSize: '1rem' }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Visitor' : 'Visitors'}
                  </option>
                ))}
              </select>
            </div>

            {/* Price breakdown */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Admission: {visitors} × ${ticketPrice}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--status-available)' }}>Academic Demo Pass (Complimentary)</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Outfit' }}>
                ${totalAmount} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>(Mocked)</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Atomically Reserving via DynamoDB...' : 'Confirm Reservation & Generate Ticket'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
              Protected by DynamoDB conditional ACID transactions to prevent capacity race conditions.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
