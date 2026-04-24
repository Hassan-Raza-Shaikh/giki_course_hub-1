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
      <div className="navbar-logo" onClick={() => navigate('/')}>
        GIKI <span>COURSE HUB</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button
          onClick={() => navigate('/courses')}
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.95rem',
            fontWeight: 600,
            transition: 'color 0.2s',
            padding: '8px 4px',
          }}
          onMouseOver={e => e.target.style.color = '#fff'}
          onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
        >
          Courses
        </button>

        {user ? (
          <div style={{
            background: 'rgba(255,255,255,0.12)',
            color: 'white',
            padding: '8px 18px',
            borderRadius: '100px',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.2)',
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
              background: 'white',
              color: 'var(--primary)',
              padding: '10px 24px',
              borderRadius: '100px',
              fontSize: '0.9rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
              letterSpacing: '0.01em',
            }}
            onMouseOver={e => { e.target.style.transform = 'scale(1.04)'; }}
            onMouseOut={e => { e.target.style.transform = 'scale(1)'; }}
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
