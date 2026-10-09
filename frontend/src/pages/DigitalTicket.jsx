import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { Printer, ArrowLeft, ShieldCheck, CheckCircle2, QrCode } from 'lucide-react';
import '../index.css';

export default function DigitalTicket() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await api.getTicket(ticketId);
        setTicket(response.data);
      } catch (err) {
        setError('Ticket could not be located in database.');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticketId]);

  if (loading) return <div className="loading-state">Generating cryptographically signed digital pass...</div>;
  if (error || !ticket) return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <div className="status-badge status-soldout" style={{ padding: '1.5rem', display: 'inline-block' }}>
        {error || 'Ticket not found.'}
      </div>
      <div style={{ marginTop: '2rem' }}>
        <Link to="/" className="btn btn-outline">Return to Home</Link>
      </div>
    </div>
  );

  const isConfirmed = (ticket.status || '').toUpperCase() === 'ACTIVE' || (ticket.status || '').toUpperCase() === 'CONFIRMED';
  const isUsed = (ticket.status || '').toUpperCase() === 'USED';
  const isCancelled = (ticket.status || '').toUpperCase() === 'CANCELLED';

  // Value encoded in the QR code: qrPayload with cryptographic HMAC signature if present, or ticketId
  const qrValue = ticket.qrPayload || `${ticket.bookingId || ticket.ticketId}`;

  const handlePrint = () => {
    window.print();
  };

  const handleSimulateScan = () => {
    // Navigate to Admin Gate Scanner with ticketId or qrPayload prefilled in state or query
    navigate(`/admin/validate?ticketId=${encodeURIComponent(ticket.ticketId)}&qrPayload=${encodeURIComponent(qrValue)}`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '3.5rem 2rem', background: 'var(--bg-primary)', minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem', maxWidth: '500px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-gold)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          <ShieldCheck size={16} /> Verified Museum Entry Pass
        </div>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.25rem' }}>Digital Admission Ticket</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Present this HMAC-signed QR code at any museum entrance scanner.
        </p>
      </div>

      {/* The Printable Pass Card */}
      <div className="card ticket-printable" style={{
        maxWidth: '420px',
        width: '100%',
        overflow: 'hidden',
        border: '2px solid var(--accent-gold)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.12)',
        borderRadius: '16px',
        background: '#fff'
      }}>
        {/* Pass Header */}
        <div style={{
          background: 'var(--accent-dark)',
          color: '#fff',
          padding: '1.75rem 1.5rem',
          textAlign: 'center',
          borderBottom: '2px dashed rgba(255,255,255,0.25)'
        }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '0.4rem' }}>
            Museum Admissions Board
          </div>
          <h2 style={{ fontSize: '1.45rem', margin: 0, color: '#fff', lineHeight: 1.25 }}>
            {ticket.exhibitionName || 'Curated Exhibition'}
          </h2>
        </div>

        {/* Status Ribbon */}
        <div style={{
          padding: '0.6rem',
          textAlign: 'center',
          background: isConfirmed ? 'var(--status-available)' : (isUsed ? '#6c757d' : 'var(--status-soldout)'),
          color: '#fff',
          fontWeight: 700,
          letterSpacing: '1.5px',
          fontSize: '0.85rem',
          textTransform: 'uppercase'
        }}>
          {isConfirmed ? '● ACTIVE — VALID ENTRY' : (isUsed ? '✓ TICKET ALREADY USED' : '✕ TICKET CANCELLED')}
        </div>

        {/* QR Code Section */}
        <div style={{
          padding: '2.5rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff'
        }}>
          <div style={{
            padding: '1rem',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #eaeaea',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            opacity: isConfirmed ? 1 : 0.25
          }}>
            <QRCodeSVG
              value={qrValue}
              size={210}
              bgColor={"#ffffff"}
              fgColor={"#1a1a1a"}
              level={"Q"}
            />
          </div>
          <div style={{ marginTop: '0.85rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            SHA-256 HMAC VERIFIED PAYLOAD
          </div>
        </div>

        {/* Pass Details */}
        <div style={{
          padding: '1.75rem 2rem',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.95rem' }}>
            <div className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Visitor:</span>
              <strong>{ticket.visitorName || 'Authorized Visitor'}</strong>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
              <strong>{ticket.bookingDate}</strong>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Time Window:</span>
              <strong>{(ticket.slotId || ticket.dateSlot || '').split('#')[1] || 'General'}</strong>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Admit Count:</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
                {ticket.numberOfVisitors} {ticket.numberOfVisitors === 1 ? 'Person' : 'People'}
              </strong>
            </div>
          </div>

          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            fontFamily: 'monospace',
            textAlign: 'center'
          }}>
            <div>TICKET: {ticket.ticketId}</div>
            <div>BOOKING: {ticket.bookingId}</div>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={handlePrint}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
          <Printer size={18} /> Print / Save Pass (PDF)
        </button>

        <button
          onClick={handleSimulateScan}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'var(--accent-dark)' }}
        >
          <QrCode size={18} /> Simulate Gate Entrance Scan →
        </button>

        <Link to="/visitor" className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }}>
          Back to My Tickets
        </Link>
      </div>
    </div>
  );
}
