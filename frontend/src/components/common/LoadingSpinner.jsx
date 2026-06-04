import React from 'react';

const LoadingSpinner = ({ 
  message = "Loading...", 
  subMessage = "The server is waking up — this may take up to 30 seconds on the first visit." 
}) => {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>⏳</div>
      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '10px', fontFamily: 'var(--font-primary)' }}>
        {message}
      </div>
      {subMessage && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>
          {subMessage}
        </div>
      )}
      <div style={{ marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--primary)',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
};

export default LoadingSpinner;
