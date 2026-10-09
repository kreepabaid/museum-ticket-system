import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Calendar, Clock, MapPin, Users, ArrowLeft, CheckCircle2 } from 'lucide-react';
import '../index.css';

export default function ExhibitionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exhibition, setExhibition] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [exResponse, schedResponse] = await Promise.all([
          api.getExhibition(id),
          api.getSchedules(id)
        ]);
        setExhibition(exResponse.data);
        const fetchedSchedules = schedResponse.data || [];
        setSchedules(fetchedSchedules);

        const dates = [...new Set(fetchedSchedules.map(s => s.date))].sort();
        if (dates.length > 0) setSelectedDate(dates[0]);
      } catch (err) {
        setError('Exhibition details could not be loaded from server.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return <div className="loading-state">Loading exhibition & schedule availability from DynamoDB...</div>;
  if (error || !exhibition) return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <div className="status-badge status-soldout" style={{ padding: '1.5rem', display: 'inline-block' }}>
        {error || 'Exhibition not found.'}
      </div>
      <div style={{ marginTop: '2rem' }}>
        <Link to="/" className="btn btn-outline">Back to Exhibitions</Link>
      </div>
    </div>
  );

  const availableDates = [...new Set(schedules.map(s => s.date))].sort();
  const slotsForDate = schedules
    .filter(s => s.date === selectedDate)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const getSlotAvailability = (capacity, bookedCount) => {
    const remaining = Math.max(0, capacity - bookedCount);
    const percent = capacity > 0 ? (bookedCount / capacity) * 100 : 0;

    if (remaining <= 0) {
      return { label: 'Sold Out', className: 'status-soldout', remaining: 0, percent: 100 };
    }
    if (percent >= 80) {
      return { label: 'Filling Fast', className: 'status-filling', remaining, percent };
    }
    return { label: 'Available', className: 'status-available', remaining, percent };
  };

  const handleBookSlot = (slotId) => {
    const encodedSlot = encodeURIComponent(slotId);
    navigate(`/book/${id}/${encodedSlot}`);
  };

  return (
    <div className="animate-fade-in">
      {/* Banner */}
      <div style={{
        height: '45vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img
          src={exhibition.imageUrl || 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=1400'}
          alt={exhibition.name}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.35)' }}
        />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff', padding: '0 2rem', maxWidth: '900px' }}>
          <span style={{
            fontSize: '0.85rem',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'var(--accent-gold)',
            fontWeight: 600,
            background: 'rgba(0,0,0,0.5)',
            padding: '0.3rem 1rem',
            borderRadius: '20px'
          }}>
            {exhibition.category}
          </span>
          <h1 style={{ fontSize: '3.2rem', margin: '0.75rem 0', color: '#fff', lineHeight: 1.15 }}>{exhibition.name}</h1>
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', fontSize: '0.95rem', color: '#e0e0e0', marginTop: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={16} color="var(--accent-gold)" /> {exhibition.location}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={16} color="var(--accent-gold)" /> {exhibition.startDate} – {exhibition.endDate}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container" style={{ padding: '3.5rem 2rem' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '2rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to all exhibitions
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '4rem', alignItems: 'start' }}>
          {/* Left Column: Exhibition Overview */}
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1.25rem' }}>About this Exhibition</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.8' }}>
              {exhibition.description}
            </p>

            <div className="card" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-gold)', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Curatorial Highlights</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--status-available)" /> Reserved admission includes complete gallery access.
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--status-available)" /> High-capacity acoustic audio guides available on entry.
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--status-available)" /> Real-time capacity monitoring ensures uncrowded visitor comfort.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Date Selection & Schedules */}
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Reserve Tickets</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Select an available visit date and time window.
            </p>

            {/* Date Picker Strip */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>1. Choose Date</label>
              {availableDates.length === 0 ? (
                <div className="form-input" style={{ background: '#f5f5f5', color: '#888' }}>
                  No scheduled slots found for this exhibition yet.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {availableDates.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      style={{
                        padding: '0.6rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid ' + (selectedDate === d ? 'var(--accent-gold)' : 'var(--border-color)'),
                        background: selectedDate === d ? 'var(--accent-dark)' : 'var(--bg-secondary)',
                        color: selectedDate === d ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: selectedDate === d ? 600 : 400,
                        fontSize: '0.9rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: '100px'
                      }}
                    >
                      <span>{new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</span>
                      <strong style={{ fontSize: '1rem' }}>{d}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Time Slots Grid */}
            <div style={{ marginTop: '2rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>2. Select Time Window & Capacity</label>

              {slotsForDate.length === 0 ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No time slots available for this specific date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {slotsForDate.map((slot, idx) => {
                    const info = getSlotAvailability(slot.capacity, slot.bookedCount);
                    const isSoldOut = info.remaining === 0;

                    return (
                      <div
                        key={idx}
                        className="card"
                        style={{
                          padding: '1.25rem 1.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: isSoldOut ? '1px solid #ddd' : '1px solid var(--border-color)',
                          background: isSoldOut ? '#fafafa' : '#fff'
                        }}
                      >
                        <div style={{ flex: 1, marginRight: '1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                            <Clock size={16} color="var(--accent-gold)" />
                            <h4 style={{ fontSize: '1.15rem' }}>{slot.startTime} – {slot.endTime}</h4>
                            <span className={`status-badge ${info.className}`} style={{ fontSize: '0.75rem' }}>
                              {info.label}
                            </span>
                          </div>

                          {/* Capacity Progress Bar */}
                          <div style={{ width: '100%', maxWidth: '240px', height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden', margin: '0.4rem 0' }}>
                            <div style={{
                              width: `${Math.min(100, info.percent)}%`,
                              height: '100%',
                              background: isSoldOut ? 'var(--status-soldout)' : (info.percent >= 80 ? 'var(--status-filling)' : 'var(--status-available)')
                            }} />
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {isSoldOut ? (
                              <span>0 spots available</span>
                            ) : (
                              <span><strong>{info.remaining}</strong> spots left of {slot.capacity} capacity</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => handleBookSlot(slot.dateSlot || slot.slotId)}
                            disabled={isSoldOut}
                            className={isSoldOut ? 'btn' : 'btn btn-primary'}
                            style={{
                              padding: '0.65rem 1.25rem',
                              fontSize: '0.9rem',
                              background: isSoldOut ? '#e0e0e0' : 'var(--accent-dark)',
                              color: isSoldOut ? '#999' : '#fff',
                              cursor: isSoldOut ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isSoldOut ? 'Sold Out' : 'Book Tickets →'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
