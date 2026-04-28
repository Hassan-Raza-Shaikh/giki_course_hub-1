import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onSignIn, user }) => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        <button
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
          <span>🔖</span> My Library
        </button>

        {user ? (
          <div style={{
            background: 'white',
            color: 'var(--text)',
            padding: '8px 18px',
            borderRadius: '100px',
            fontSize: '0.9rem',
            fontWeight: 700,
            border: '2px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {user.photoURL && (
              <img src={user.photoURL} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            )}
            {user.displayName?.split(' ')[0] || user.username}
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
    </nav>
  );
};

export default Navbar;
