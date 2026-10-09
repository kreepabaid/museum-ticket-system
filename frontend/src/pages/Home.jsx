import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Search, Calendar, MapPin, Sparkles, Filter } from 'lucide-react';
import '../index.css';

export default function Home() {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    const fetchExhibitions = async () => {
      try {
        const response = await api.getExhibitions();
        setExhibitions(response.data || []);
      } catch (err) {
        setError('Failed to load exhibitions from server.');
      } finally {
        setLoading(false);
      }
    };
    fetchExhibitions();
  }, []);

  const categories = ['ALL', ...new Set(exhibitions.map(e => e.category).filter(Boolean))];

  const filteredExhibitions = exhibitions.filter(ex => {
    const matchesCategory = selectedCategory === 'ALL' || ex.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      ex.name.toLowerCase().includes(query) ||
      (ex.description && ex.description.toLowerCase().includes(query)) ||
      (ex.location && ex.location.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div style={{
        height: '65vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img
          src="https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=1600"
          alt="Museum Grand Gallery"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.38)'
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff', padding: '0 2rem', maxWidth: '850px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(197, 160, 89, 0.25)',
            border: '1px solid var(--accent-gold)',
            color: 'var(--accent-gold)',
            padding: '0.4rem 1.2rem',
            borderRadius: '50px',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '1.25rem'
          }}>
            <Sparkles size={16} /> Official Cloud Reservation System
          </div>
          <h1 style={{ fontSize: '4.2rem', marginBottom: '1rem', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            Discover the Extraordinary
          </h1>
          <p style={{ fontSize: '1.3rem', color: '#e0e0e0', margin: '0 auto 2.5rem auto', lineHeight: 1.6 }}>
            Reserve verified digital tickets and explore world-class collections, curated exhibitions, and timeless artifacts.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="#exhibitions-grid" className="btn btn-primary" style={{ padding: '0.9rem 2.2rem', fontSize: '1.05rem', background: 'var(--accent-gold)', borderColor: 'var(--accent-gold)' }}>
              Explore Exhibitions
            </a>
            <Link to="/visitor" className="btn btn-outline" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem', color: '#fff', borderColor: '#fff' }}>
              Access My Passes
            </Link>
          </div>
        </div>
      </div>

      {/* Main Exhibitions Catalog */}
      <div id="exhibitions-grid" className="container" style={{ padding: '4.5rem 2rem' }}>
        <div className="flex-between" style={{ marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '2.3rem', marginBottom: '0.4rem' }}>Featured Exhibitions</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Select an exhibition to view schedule slots, ticket capacity, and secure entry.</p>
          </div>

          {/* Search Box */}
          <div style={{
            position: 'relative',
            minWidth: '280px',
            maxWidth: '380px',
            flex: 1
          }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input
              type="text"
              placeholder="Search exhibitions or galleries..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.8rem' }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '3rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Filter size={14} /> Categories:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? 'var(--accent-dark)' : 'var(--bg-secondary)',
                color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
                border: '1px solid ' + (selectedCategory === cat ? 'var(--accent-dark)' : 'var(--border-color)'),
                padding: '0.4rem 1rem',
                borderRadius: '30px',
                fontSize: '0.85rem',
                fontWeight: selectedCategory === cat ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && <div className="loading-state">Loading curated collections from DynamoDB...</div>}
        {error && <div className="status-badge status-soldout" style={{ textAlign: 'center', display: 'block', padding: '1.5rem', margin: '0 auto', maxWidth: '600px' }}>{error}</div>}

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2.5rem' }}>
          {!loading && !error && filteredExhibitions.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No exhibitions matched your criteria.</p>
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }} className="btn btn-outline" style={{ marginTop: '0.5rem' }}>
                Reset Filters
              </button>
            </div>
          )}

          {filteredExhibitions.map(ex => (
            <Link to={`/exhibitions/${ex.exhibitionId}`} key={ex.exhibitionId} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '230px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={ex.imageUrl || 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=800'}
                    alt={ex.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    background: 'rgba(0, 0, 0, 0.75)',
                    color: 'var(--accent-gold)',
                    backdropFilter: 'blur(4px)',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {ex.category}
                  </div>
                </div>

                <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.45rem', marginBottom: '0.75rem', lineHeight: 1.3 }}>{ex.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                      {ex.description ? (ex.description.length > 130 ? ex.description.substring(0, 130) + '...' : ex.description) : ''}
                    </p>
                  </div>

                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={15} color="var(--accent-gold)" />
                        <span>{ex.startDate} to {ex.endDate}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={15} color="var(--accent-gold)" />
                        <span>{ex.location}</span>
                      </div>
                    </div>

                    <div className="flex-between">
                      <span className="status-badge status-available" style={{ fontSize: '0.75rem' }}>
                        Booking Open
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-dark)', fontSize: '0.95rem' }}>
                        Select Slots →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
