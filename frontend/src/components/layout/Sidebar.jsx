import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ user, isOpen, onClose }) => {
  const isAdmin = user?.role === 'admin';

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        onClick={onClose}
        style={{
          display: isOpen ? 'block' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 99,
          backdropFilter: 'blur(4px)'
        }} 
        className="mobile-only"
      />

      <aside style={{
        width: '260px',
        height: '100vh',
        background: 'linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%)',
        color: 'white',
        padding: '32px 24px',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '10px 0 30px rgba(0, 0, 0, 0.15)',
        zIndex: 100,
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'Outfit' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📚
            </div>
            <span style={{ letterSpacing: '-0.02em' }}>COURSE HUB</span>
          </div>
          <button 
            onClick={onClose} 
            className="mobile-only"
            style={{ color: 'white', fontSize: '1.5rem', opacity: 0.8 }}
          >
            ✕
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto' }} className="hide-scrollbar">
          <p style={{ fontSize: '0.7rem', opacity: 0.5, letterSpacing: '0.1em', marginBottom: '20px', fontWeight: 700, textTransform: 'uppercase' }}>General</p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><SidebarLink to="/dashboard" icon="🏠" label="Dashboard" onClick={onClose} /></li>
            <li><SidebarLink to="/files" icon="📁" label="Browse Files" onClick={onClose} /></li>
            <li><SidebarLink to="/upload" icon="⬆️" label="Upload Content" onClick={onClose} /></li>
            <li><SidebarLink to="/bookmarks" icon="🔖" label="My Library" onClick={onClose} /></li>
            <li><SidebarLink to="/profile" icon="👤" label="Account" onClick={onClose} /></li>
          </ul>

          {(isAdmin || !user) && (
            <>
              <p style={{ fontSize: '0.7rem', opacity: 0.5, letterSpacing: '0.1em', margin: '32px 0 20px', fontWeight: 700, textTransform: 'uppercase' }}>Admin Console</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><SidebarLink to="/admin" icon="⚙️" label="Overview" onClick={onClose} /></li>
                <li><SidebarLink to="/admin/pending" icon="⏳" label="Approvals" onClick={onClose} /></li>
                <li><SidebarLink to="/admin/reports" icon="🚩" label="Disputes" onClick={onClose} /></li>
              </ul>
            </>
          )}
        </nav>

        <div style={{ marginTop: 'auto', padding: '20px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--secondary) 0%, var(--secondary-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                {user.username[0].toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.role}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', textAlign: 'center' }}>
              <p style={{ marginBottom: '12px', opacity: 0.7 }}>Not logged in</p>
              <NavLink to="/login" onClick={onClose} style={{ display: 'block', backgroundColor: 'white', color: 'var(--primary)', padding: '10px', borderRadius: '10px', fontWeight: 700 }}>Sign In Now</NavLink>
            </div>
          )}
        </div>
      </aside>

      {/* Desktop Helper: Hidden on Mobile, ensures transform starts at 0 on desktop if we ever use media queries for transform */}
      <style>{`
        @media (min-width: 769px) {
          aside { transform: translateX(0) !important; }
        }
      `}</style>
    </>
  );
};

const SidebarLink = ({ to, icon, label, onClick }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '0.9rem',
      fontWeight: 500,
      backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
      color: 'white',
      transition: '0.2s'
    })}
  >
    <span>{icon}</span>
    <span>{label}</span>
  </NavLink>
);

export default Sidebar;
