import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      style={{
        position: 'fixed',
        /* 80px on mobile to clear the bottom tab bar, 32px on desktop */
        bottom: 'var(--btt-bottom, 32px)',
        right: 'clamp(16px, 3vw, 24px)',
        zIndex: 900,
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: 'var(--primary)',
        color: 'white',
        border: '2px solid var(--text)',
        boxShadow: '3px 3px 0 var(--text)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.8)',
        transition: 'opacity 0.3s ease, transform 0.3s ease, box-shadow 0.15s ease',
      }}
      onMouseOver={e => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1)';
        e.currentTarget.style.boxShadow = '5px 5px 0 var(--text)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.transform = visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.8)';
        e.currentTarget.style.boxShadow = '3px 3px 0 var(--text)';
      }}
    >
      <ChevronUp size={22} strokeWidth={3} />
      <style>{`
        @media (max-width: 768px) {
          :root { --btt-bottom: 80px; }
        }
        @media (min-width: 769px) {
          :root { --btt-bottom: 32px; }
        }
      `}</style>
    </button>
  );
};

export default BackToTop;
