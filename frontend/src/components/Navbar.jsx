import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const Navbar = ({ onSignIn, onSignOut, user }) => {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [stats, setStats]         = useState(null);
  const [isAdmin, setIsAdmin]     = useState(false);
  const navigate = useNavigate();
  const menuRef  = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch stats whenever the dashboard is opened
  useEffect(() => {
    if (menuOpen && user) {
      api.get('/me/stats')
        .then(res => { if (res.data.success) setStats(res.data); })
        .catch(() => {});
    }
  }, [menuOpen, user]);

  // Check admin status whenever user changes
  useEffect(() => {
    if (user) {
      api.get('/admin/check')
        .then(res => setIsAdmin(res.data.is_admin))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const { theme, toggleTheme } = useTheme();

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-logo" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          background: 'var(--primary)', color: 'white', 
          padding: '4px 10px', borderRadius: '6px', 
          border: '2px solid var(--text)', boxShadow: '2px 2px 0px var(--accent)',
          lineHeight: 1, letterSpacing: '0.02em'
        }}>
          GIKI
        </div>
        <span style={{ color: 'var(--text)', fontWeight: 900 }}>HUB</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Creative Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Electric Ember' : 'Vibrant Light'} Mode`}
          style={{
            background: 'var(--bg-white)',
            border: '2px solid var(--border)',
            borderRadius: '50px',
            padding: '4px 12px',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-sm)',
            transition: 'var(--transition)',
            transform: 'scale(1)',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {theme === 'light' ? '🌞' : '🌙'}
          <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text)' }}>
            {theme === 'light' ? 'Light' : 'Ember'}
          </span>
        </button>

        <button
          className="hide-mobile"
          onClick={() => navigate('/courses')}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '0.95rem',
            fontWeight: 800,
            transition: 'color 0.2s',
            padding: '8px 4px',
          }}
          onMouseOver={e => e.target.style.color = 'var(--primary)'}
          onMouseOut={e => e.target.style.color = 'var(--text-muted)'}
        >
          Courses
        </button>

        <button
          className="hide-mobile"
          onClick={() => navigate('/search')}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '0.95rem',
            fontWeight: 800,
            transition: 'color 0.2s',
            padding: '8px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseOver={e => e.target.style.color = 'var(--primary)'}
          onMouseOut={e => e.target.style.color = 'var(--text-muted)'}
        >
          <span>🔍</span> Search
        </button>

        <button
          className="hide-mobile"
          onClick={() => navigate('/bookmarks')}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '0.95rem',
            fontWeight: 800,
            transition: 'color 0.2s',
            padding: '8px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseOver={e => e.target.style.color = 'var(--primary)'}
          onMouseOut={e => e.target.style.color = 'var(--text-muted)'}
        >
          <span>🔖</span> Bookmarks
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin && (
            <button
              className="show-mobile-flex"
              onClick={() => navigate('/admin')}
              style={{
                background: '#EDE9FE', color: '#5B21B6',
                width: '38px', height: '38px', borderRadius: '10px',
                border: '2px solid var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', cursor: 'pointer', boxShadow: '2px 2px 0px var(--text)'
              }}
            >
              🛡️
            </button>
          )}

          {user ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            {/* Trigger pill */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                background: menuOpen ? 'var(--primary)' : 'white',
                color: menuOpen ? 'white' : 'var(--text)',
                padding: '8px 18px',
                borderRadius: '100px',
                fontSize: '0.9rem',
                fontWeight: 700,
                border: '2px solid var(--text)',
                boxShadow: menuOpen ? 'none' : '3px 3px 0px var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid currentColor' }} />
              ) : (
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent)', border: '1.5px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                  {(user.displayName || user.username || '?')[0].toUpperCase()}
                </span>
              )}
              {(user.displayName || user.username)?.split(' ')[0]}
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{menuOpen ? '▲' : '▼'}</span>
            </button>

            {/* Dashboard panel */}
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                background: 'white', border: '2px solid var(--text)',
                borderRadius: '16px', boxShadow: '5px 5px 0px var(--text)',
                width: '280px', overflow: 'hidden', zIndex: 9999,
              }}>
                {/* Top accent */}
                <div style={{ height: '5px', background: 'var(--primary)' }} />

                {/* Profile header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" style={{ width: '44px', height: '44px', borderRadius: '12px', border: '2px solid var(--text)' }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--accent)', border: '2px solid var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 900, color: 'var(--text)', flexShrink: 0 }}>
                        {(user.displayName || user.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.displayName || user.username}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.email}
                      </div>
                      {user.program && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.program}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Batch/Student ID badges */}
                  {(user.batchYear || user.studentId) && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {user.batchYear && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', background: '#EEF2FF', color: '#4338CA', borderRadius: '100px', border: '1px solid #C7D2FE' }}>
                          Batch '{String(user.batchYear).slice(-2)}
                        </span>
                      )}
                      {user.studentId && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', background: '#F0FDF4', color: '#15803D', borderRadius: '100px', border: '1px solid #BBF7D0' }}>
                          #{user.studentId}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { icon: '📤', label: 'Uploads',   val: stats?.uploads   ?? '—' },
                    { icon: '🔖', label: 'Bookmarks', val: stats?.bookmarks ?? '—' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '12px 16px', textAlign: 'center', borderRight: s.label === 'Uploads' ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize: '1.1rem' }}>{s.icon}</div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text)', lineHeight: 1.2 }}>{s.val}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Quick links */}
                {[
                  { icon: '🔖', label: 'My Bookmarks',    action: () => { setMenuOpen(false); navigate('/bookmarks'); } },
                  { icon: '🔍', label: 'Global Search', action: () => { setMenuOpen(false); navigate('/search'); } },
                  { icon: '📚', label: 'All Courses', action: () => { setMenuOpen(false); navigate('/courses'); } },
                  { icon: '🚩', label: 'Report an Issue', action: () => { setMenuOpen(false); navigate('/report-issue'); } },
                ].map(link => (
                  <button key={link.label} onClick={link.action}
                    style={{ width: '100%', padding: '11px 20px', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s', borderBottom: '1px solid var(--border)' }}
                    onMouseOver={e => e.currentTarget.style.background = '#F8F7FF'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '1rem' }}>{link.icon}</span>
                    {link.label}
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
                  </button>
                ))}

                {/* Admin panel link — only for admins */}
                {isAdmin && (
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/admin'); }}
                    style={{ width: '100%', padding: '12px 20px', background: 'none', border: 'none', borderTop: '1px solid var(--border)', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700, color: '#7C3AED', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.background = '#EDE9FE'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                  >
                    <span>🛡️</span> Admin Panel
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
                  </button>
                )}

                {/* Sign out */}
                <button
                  onClick={() => { setMenuOpen(false); onSignOut(); }}
                  style={{ width: '100%', padding: '12px 20px', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#FEF2F2'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                >
                  <span>🚪</span> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onSignIn}
            style={{
              background: 'var(--primary)',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '100px',
              fontSize: '0.9rem',
              fontWeight: 800,
              boxShadow: '4px 4px 0px var(--text)',
              border: '2px solid var(--text)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px) translateX(-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px var(--text)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px var(--text)'; }}
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  </nav>
  );
};

export default Navbar;


