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
            color: 'rgba(255,255,255,0.75)',
            fontSize: '0.95rem',
            fontWeight: 600,
            transition: 'color 0.2s',
            padding: '8px 4px',
          }}
          onMouseOver={e => e.target.style.color = '#F0ABFC'}
          onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.75)'}
        >
          Courses
        </button>

        {user ? (
          <div style={{
            background: 'rgba(240,171,252,0.12)',
            color: 'white',
            padding: '8px 18px',
            borderRadius: '100px',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: '1px solid rgba(240,171,252,0.25)',
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
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '100px',
              fontSize: '0.9rem',
              fontWeight: 800,
              boxShadow: '0 4px 18px rgba(124,58,237,0.45)',
              transition: 'all 0.2s ease',
              letterSpacing: '0.01em',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(124,58,237,0.65)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(124,58,237,0.45)'; }}
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
