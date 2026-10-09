import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import ExhibitionDetails from './pages/ExhibitionDetails';
import Booking from './pages/Booking';
import VisitorDashboard from './pages/VisitorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DigitalTicket from './pages/DigitalTicket';
import TicketValidation from './pages/TicketValidation';
import AuthModal from './components/AuthModal';
import NotificationToast from './components/NotificationToast';
import { Compass, User, LogOut, ShieldCheck, QrCode } from 'lucide-react';

function Navigation() {
  const { user, isAuthenticated, isAdmin, logout, openLoginModal } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand flex-between" style={{ gap: '0.6rem' }}>
        <Compass size={28} color="var(--accent-gold)" />
        <span>MUSEUM <span style={{ fontWeight: 300, color: 'var(--text-secondary)' }}>EXHIBITIONS</span></span>
      </Link>

      <div className="nav-links">
        <Link to="/" className="nav-link">Exhibitions</Link>
        <Link to="/visitor" className="nav-link">My Tickets</Link>

        {isAdmin && (
          <>
            <Link to="/admin" className="nav-link" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
              Admin Control
            </Link>
            <Link to="/admin/validate" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <QrCode size={16} /> Gate Scanner
            </Link>
          </>
        )}

        {/* Amazon SNS Notification Stream Bell */}
        <NotificationToast />

        {/* User Session Chip */}
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-primary)',
              padding: '0.4rem 0.8rem',
              borderRadius: '30px',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem'
            }}>
              <User size={16} color="var(--accent-gold)" />
              <span style={{ fontWeight: 600 }}>{user.name || user.email}</span>
              <span style={{
                fontSize: '0.7rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                background: isAdmin ? 'var(--accent-dark)' : 'rgba(40, 167, 69, 0.15)',
                color: isAdmin ? '#fff' : 'var(--status-available)',
                fontWeight: 700,
                letterSpacing: '0.5px'
              }}>
                {user.role}
              </span>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.85rem'
              }}
              title="Sign Out"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={openLoginModal}
              className="btn btn-outline"
              style={{ padding: '0.45rem 1rem', fontSize: '0.9rem' }}
            >
              Sign In
            </button>
            <Link
              to="/admin"
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.9rem' }}
            >
              Admin Portal
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/exhibitions/:id" element={<ExhibitionDetails />} />
            <Route path="/book/:exhibitionId/:dateSlot" element={<Booking />} />
            <Route path="/visitor" element={<VisitorDashboard />} />
            <Route path="/ticket/:ticketId" element={<DigitalTicket />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/validate" element={<TicketValidation />} />
          </Routes>
        </main>
        <AuthModal />
      </Router>
    </AuthProvider>
  );
}

export default App;
