import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  BarChart3,
  Calendar,
  Users,
  Ticket,
  PlusCircle,
  FileSpreadsheet,
  Printer,
  QrCode,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  MapPin
} from 'lucide-react';
import '../index.css';

export default function AdminDashboard() {
  const { user, isAdmin, loginAsAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // overview, exhibitions, daily, entries, manage, reports
  const [stats, setStats] = useState(null);
  const [exhibitionStats, setExhibitionStats] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [liveEntries, setLiveEntries] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Exhibition Creation Form State
  const [newExh, setNewExh] = useState({
    name: '',
    category: 'Fine Art',
    description: '',
    location: 'Main Pavilion',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    imageUrl: ''
  });
  const [createExhStatus, setCreateExhStatus] = useState('');

  // Schedule Creation Form State
  const [newSlot, setNewSlot] = useState({
    exhibitionId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    capacity: 30
  });
  const [createSlotStatus, setCreateSlotStatus] = useState('');

  const fetchDashboardData = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const [dashRes, exhRes, dailyRes, entriesRes, repRes] = await Promise.all([
        api.getAdminDashboard(),
        api.getExhibitionStats(),
        api.getDailyStats(),
        api.getLiveEntries(),
        api.getReports()
      ]);

      setStats(dashRes.data);
      setExhibitionStats(exhRes.data || []);
      setDailyStats(dailyRes.data || []);
      setLiveEntries(entriesRes.data || []);
      setReports(repRes.data);

      if (exhRes.data?.length > 0 && !newSlot.exhibitionId) {
        setNewSlot(prev => ({ ...prev, exhibitionId: exhRes.data[0].exhibitionId }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data. Ensure Admin session is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Live gate feed polling every 8 seconds, pausing if document hidden (Feature 17)
    const interval = setInterval(() => {
      if (!document.hidden && isAdmin) {
        api.getLiveEntries().then(res => setLiveEntries(res.data || [])).catch(() => {});
        api.getAdminDashboard().then(res => setStats(res.data)).catch(() => {});
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleCreateExhibition = async (e) => {
    e.preventDefault();
    setCreateExhStatus('Creating exhibition in DynamoDB...');
    try {
      await api.createExhibition(newExh);
      setCreateExhStatus('✓ Exhibition registered successfully!');
      setNewExh({
        name: '',
        category: 'Fine Art',
        description: '',
        location: 'Main Pavilion',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        imageUrl: ''
      });
      fetchDashboardData();
    } catch (err) {
      setCreateExhStatus('Error: ' + (err.response?.data?.error || 'Failed to create exhibition'));
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!newSlot.exhibitionId) {
      setCreateSlotStatus('Please select an exhibition.');
      return;
    }
    setCreateSlotStatus('Saving schedule slot in DynamoDB...');
    try {
      await api.createSchedule(newSlot.exhibitionId, {
        date: newSlot.date,
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        capacity: newSlot.capacity
      });
      setCreateSlotStatus('✓ Schedule slot created successfully!');
      fetchDashboardData();
    } catch (err) {
      setCreateSlotStatus('Error: ' + (err.response?.data?.error || 'Failed to create slot'));
    }
  };

  const exportCSVReport = () => {
    if (!exhibitionStats || exhibitionStats.length === 0) return;
    const headers = ['Exhibition ID', 'Exhibition Name', 'Category', 'Total Capacity', 'Booked Spots', 'Fill Rate %', 'Total Bookings', 'Total Entries'];
    const rows = exhibitionStats.map(e => [
      e.exhibitionId,
      `"${e.name.replace(/"/g, '""')}"`,
      e.category,
      e.totalCapacity,
      e.bookedCount,
      e.fillRate,
      e.totalBookings,
      e.totalEntries
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `museum_analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) {
    return (
      <div className="animate-fade-in" style={{ padding: '5rem 2rem', background: 'var(--bg-primary)', minHeight: '80vh', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '520px', margin: '0 auto', padding: '3rem 2rem' }}>
          <ShieldCheck size={50} color="var(--accent-gold)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Curator Admin Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            This command center provides real-time access to capacity analytics, gate admissions, and exhibition registration.
          </p>
          <button onClick={loginAsAdmin} className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
            🏛️ 1-Click Login as Curator Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '3rem 2rem', background: 'var(--bg-primary)', minHeight: '85vh' }}>
      <div className="container" style={{ maxWidth: '1240px' }}>

        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-gold)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>
              <ShieldCheck size={16} /> AWS Cloud Control Center
            </div>
            <h1 style={{ fontSize: '2.4rem' }}>Admin Control Center</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Real-time monitoring backed by Amazon DynamoDB, Lambda, and SNS.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/admin/validate" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <QrCode size={18} /> Open Gate Scanner
            </Link>
            <button onClick={fetchDashboardData} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={16} /> Refresh Data
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '2.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem'
        }}>
          {[
            { id: 'overview', label: 'Overview & KPIs', icon: BarChart3 },
            { id: 'exhibitions', label: 'Exhibition Statistics', icon: TrendingUp },
            { id: 'daily', label: 'Daily Visitor Trends', icon: Calendar },
            { id: 'entries', label: `Live Gate Feed (${liveEntries.length})`, icon: Clock },
            { id: 'manage', label: '+ Add Exhibition / Slot', icon: PlusCircle },
            { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet }
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.1rem',
                  background: isSel ? 'var(--accent-dark)' : 'transparent',
                  color: isSel ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '30px',
                  fontWeight: isSel ? 600 : 400,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} color={isSel ? 'var(--accent-gold)' : 'currentColor'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading && <div className="loading-state">Synchronizing analytics from DynamoDB...</div>}
        {error && <div className="status-badge status-soldout" style={{ padding: '1.5rem', display: 'block', marginBottom: '2rem' }}>{error}</div>}

        {/* --- TAB 1: OVERVIEW & KPIS --- */}
        {!loading && stats && activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--accent-gold)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Entries Today</span>
                <div style={{ fontSize: '2.4rem', fontWeight: 700, marginTop: '0.4rem', fontFamily: 'Outfit' }}>
                  {stats.visitorsToday}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--status-available)' }}>Gate scanners live</span>
              </div>

              <div className="card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--accent-dark)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Bookings Created</span>
                <div style={{ fontSize: '2.4rem', fontWeight: 700, marginTop: '0.4rem', fontFamily: 'Outfit' }}>
                  {stats.totalBookings}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Historic bookings</span>
              </div>

              <div className="card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--status-available)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Expected Total Visitors</span>
                <div style={{ fontSize: '2.4rem', fontWeight: 700, marginTop: '0.4rem', fontFamily: 'Outfit' }}>
                  {stats.totalExpectedVisitors}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registered attendees</span>
              </div>

              <div className="card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--status-soldout)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Cancellations</span>
                <div style={{ fontSize: '2.4rem', fontWeight: 700, marginTop: '0.4rem', fontFamily: 'Outfit' }}>
                  {stats.cancelledBookings}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--status-soldout)' }}>Spots released</span>
              </div>
            </div>

            {/* Capacity Utilization Gauge */}
            <div className="card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem' }}>Overall Museum Capacity Utilization</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Aggregate booked slots vs total scheduled capacity across all active exhibitions.
                  </p>
                </div>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-gold)', fontFamily: 'Outfit' }}>
                  {stats.capacityUtilization}%
                </span>
              </div>

              <div style={{ width: '100%', height: '12px', background: '#eee', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, stats.capacityUtilization)}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-dark))' }} />
              </div>

              <div className="flex-between" style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Total Booked: <strong>{stats.totalBooked} spots</strong></span>
                <span>Total Capacity: <strong>{stats.totalCapacity} spots</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: EXHIBITION-WISE STATISTICS (Feature 14) --- */}
        {!loading && activeTab === 'exhibitions' && (
          <div className="card" style={{ padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem' }}>Exhibition-Wise Booking Breakdown</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Individual attendance rates, capacity allocations, and reservations per exhibition.
                </p>
              </div>
              <button onClick={exportCSVReport} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                <FileSpreadsheet size={16} /> Export CSV
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Exhibition</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Capacity</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Booked Spots</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Fill Rate</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Admitted Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {exhibitionStats.map((exh, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {exh.name}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{exh.location}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: '#eee', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                          {exh.category}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>{exh.totalCapacity}</td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{exh.bookedCount}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '60px', height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, exh.fillRate)}%`, height: '100%', background: exh.fillRate >= 80 ? 'var(--status-filling)' : 'var(--status-available)' }} />
                          </div>
                          <span>{exh.fillRate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--status-available)' }}>
                        {exh.totalEntries}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 3: DAILY VISITOR TRENDS (Feature 15) --- */}
        {!loading && activeTab === 'daily' && (
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Daily Visitor & Booking Counts</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Historical trends tracking daily reservations created and actual visitors verified at the gates.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Bookings Created</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Expected Attendees</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Gate Entries Admitted</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Cancellations</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.map((d, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        <Calendar size={14} style={{ display: 'inline', marginRight: '0.4rem', color: 'var(--accent-gold)' }} />
                        {d.date}
                      </td>
                      <td style={{ padding: '1rem' }}>{d.totalBookings}</td>
                      <td style={{ padding: '1rem' }}>{d.expectedVisitors}</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--status-available)' }}>
                        {d.totalEntries}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--status-soldout)' }}>
                        {d.cancelledBookings}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 4: LIVE GATE ENTRY FEED (Feature 17) --- */}
        {!loading && activeTab === 'entries' && (
          <div className="card" style={{ padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem' }}>Live Gate Entry Monitoring Feed</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Polling every 8 seconds for real-time QR scans at museum gates.
                </p>
              </div>
              <span className="status-badge status-available">
                Live Turnstiles Connected
              </span>
            </div>

            {liveEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                No entry scans logged yet today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {liveEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem 1.25rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.9rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <CheckCircle2 size={16} color="var(--status-available)" />
                        <strong>{entry.visitorName || 'Visitor'}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          admitted ({entry.numberOfVisitors} {entry.numberOfVisitors === 1 ? 'person' : 'people'})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Exhibition: <strong>{entry.exhibitionName || entry.exhibitionId}</strong> | Pass: {entry.ticketId}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div>{new Date(entry.enteredAt || entry.entryTime).toLocaleTimeString()}</div>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>Staff: {entry.validatedByName || 'Curator'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 5: EXHIBITIONS & SCHEDULES MANAGER (Features 2 & 4) --- */}
        {!loading && activeTab === 'manage' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '2.5rem' }}>
            {/* Form: Register Exhibition */}
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>Register New Exhibition</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                Publish a new exhibition into Amazon DynamoDB.
              </p>

              {createExhStatus && (
                <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: '6px', background: createExhStatus.includes('✓') ? 'rgba(40,167,69,0.1)' : '#f8f8f8', color: createExhStatus.includes('✓') ? 'var(--status-available)' : 'var(--text-primary)', fontSize: '0.85rem' }}>
                  {createExhStatus}
                </div>
              )}

              <form onSubmit={handleCreateExhibition}>
                <div className="form-group">
                  <label className="form-label">Exhibition Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Silk Road Caravans & Dynasties"
                    value={newExh.name}
                    onChange={(e) => setNewExh({ ...newExh, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={newExh.category}
                    onChange={(e) => setNewExh({ ...newExh, category: e.target.value })}
                  >
                    <option value="Archaeology">Archaeology</option>
                    <option value="Fine Art">Fine Art</option>
                    <option value="Science & Space">Science & Space</option>
                    <option value="History">History</option>
                    <option value="Contemporary">Contemporary</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Gallery / Hall Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. South Pavilion, Gallery 3"
                    value={newExh.location}
                    onChange={(e) => setNewExh({ ...newExh, location: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={newExh.startDate}
                      onChange={(e) => setNewExh({ ...newExh, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={newExh.endDate}
                      onChange={(e) => setNewExh({ ...newExh, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Curatorial overview of the collection..."
                    value={newExh.description}
                    onChange={(e) => setNewExh({ ...newExh, description: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={newExh.imageUrl}
                    onChange={(e) => setNewExh({ ...newExh, imageUrl: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
                  Publish Exhibition
                </button>
              </form>
            </div>

            {/* Form: Add Schedule Slot */}
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>Add Schedule Slot</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                Allocate capacity and time windows for visitors.
              </p>

              {createSlotStatus && (
                <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: '6px', background: createSlotStatus.includes('✓') ? 'rgba(40,167,69,0.1)' : '#f8f8f8', color: createSlotStatus.includes('✓') ? 'var(--status-available)' : 'var(--text-primary)', fontSize: '0.85rem' }}>
                  {createSlotStatus}
                </div>
              )}

              <form onSubmit={handleCreateSchedule}>
                <div className="form-group">
                  <label className="form-label">Select Exhibition</label>
                  <select
                    className="form-input"
                    value={newSlot.exhibitionId}
                    onChange={(e) => setNewSlot({ ...newSlot, exhibitionId: e.target.value })}
                    required
                  >
                    {exhibitionStats.map(e => (
                      <option key={e.exhibitionId} value={e.exhibitionId}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newSlot.date}
                    onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 10:00 AM"
                      value={newSlot.startTime}
                      onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 12:00 PM"
                      value={newSlot.endTime}
                      onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Maximum Slot Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    className="form-input"
                    value={newSlot.capacity}
                    onChange={(e) => setNewSlot({ ...newSlot, capacity: parseInt(e.target.value, 10) })}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
                  Add Schedule Window
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- TAB 6: REPORTS & ANALYTICS (Feature 20) --- */}
        {!loading && activeTab === 'reports' && reports && (
          <div className="card" style={{ padding: '2.5rem' }}>
            <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Executive Analytics & Reports</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Generated on {new Date(reports.generatedAt).toLocaleString()}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={exportCSVReport} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileSpreadsheet size={16} /> Download CSV
                </button>
                <button onClick={() => window.print()} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Printer size={16} /> Print Report
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Attendance Rate</span>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--status-available)', marginTop: '0.3rem' }}>
                  {reports.kpis.attendanceRate}%
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scanned vs Expected</span>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cancellation Rate</span>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--status-soldout)', marginTop: '0.3rem' }}>
                  {reports.kpis.cancellationRate}%
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cancelled vs Booked</span>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Exhibitions</span>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '0.3rem' }}>
                  {reports.kpis.totalExhibitions}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Across all galleries</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Active Exhibitions Catalog Summary</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {reports.topExhibitions.map(ex => (
                  <div key={ex.id} className="flex-between" style={{ padding: '0.75rem', background: '#fafafa', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <span><strong>{ex.name}</strong> ({ex.category})</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{ex.location}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
