import React from 'react';

export const Card = ({ children, title, subtitle, footer, icon, style }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    transition: 'var(--transition)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-md)',
    ...style
  }}>
    {(title || subtitle) && (
      <div style={{ padding: '32px 32px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {icon && <div style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{icon}</div>}
        <div>
          {title && <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>{title}</h3>}
          {subtitle && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>{subtitle}</p>}
        </div>
      </div>
    )}
    <div style={{ padding: (title || subtitle) ? '0 32px 32px' : '32px', flex: 1 }}>{children}</div>
    {footer && (
      <div style={{ padding: '20px 32px', backgroundColor: 'var(--bg-subtle)', borderTop: '1px solid var(--border)' }}>
        {footer}
      </div>
    )}
  </div>
);

export const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    padding: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    transition: 'var(--transition)',
    boxShadow: 'var(--shadow-md)',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      borderRadius: '16px',
      backgroundColor: `${color}15`,
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.8rem',
      fontWeight: 800
    }}>
      {icon}
    </div>
    <div style={{ zIndex: 1 }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit', letterSpacing: '-0.03em' }}>{value}</p>
    </div>
    <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '5rem', opacity: 0.03, color: color, zIndex: 0 }}>{icon}</div>
  </div>
);
