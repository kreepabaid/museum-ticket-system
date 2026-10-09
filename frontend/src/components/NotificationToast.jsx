import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Bell, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function NotificationToast() {
  const [notifications, setNotifications] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const seenIds = useRef(new Set());

  const fetchNotifications = async () => {
    // Only poll when tab is visible
    if (document.hidden) return;

    try {
      const res = await api.getNotifications();
      const list = res.data || [];
      setNotifications(list);

      // Check for any new notification not seen yet
      if (list.length > 0) {
        const newest = list[0];
        if (newest && !seenIds.current.has(newest.id)) {
          seenIds.current.add(newest.id);
          // Show toast alert
          setActiveToast(newest);
          setTimeout(() => {
            setActiveToast(null);
          }, 6000);
        }
      }
    } catch (err) {
      // Ignore polling errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-secondary)'
        }}
        title="Amazon SNS Notification Stream"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: 'var(--accent-gold)',
            color: '#fff',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {notifications.length}
          </span>
        )}
      </button>

      {/* Floating Active Toast */}
      {activeToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          maxWidth: '380px',
          background: '#fff',
          border: '1px solid var(--accent-gold)',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          padding: '1.25rem',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.85rem' }}>
              <CheckCircle size={16} />
              <span>AMAZON SNS ALERT</span>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
            {activeToast.subject}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
            {activeToast.message}
          </div>
        </div>
      )}

      {/* Notification Dropdown Log */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          width: '340px',
          maxHeight: '400px',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          border: '1px solid var(--border-color)',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>SNS Notification Feed</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 600 }}>TOPIC: MuseumNotifications</span>
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                  {n.subject}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'pre-line', marginBottom: '0.3rem' }}>
                  {n.message}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#999' }}>
                  {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
