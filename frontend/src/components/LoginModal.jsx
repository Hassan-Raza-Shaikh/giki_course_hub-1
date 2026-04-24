import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import api from '../services/api';

const LoginModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const result  = await signInWithPopup(auth, googleProvider);
      const fbUser  = result.user;

      // Get the cryptographically signed JWT — this is what the server verifies
      const idToken = await fbUser.getIdToken();

      const res = await api.post('/auth/firebase', {
        idToken,
        // These are fallbacks used only if the server has no service-account key
        uid:         fbUser.uid,
        email:       fbUser.email,
        displayName: fbUser.displayName,
        photoURL:    fbUser.photoURL,
      });

      if (res.data.success) {
        onSuccess({
          ...res.data.user,
          displayName: fbUser.displayName,
          photoURL:    fbUser.photoURL,
        });
        onClose();
      } else {
        setError(res.data.message || 'Sign-in failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ position: 'relative', overflow: 'hidden', padding: '0' }}>
        {/* Aurora top strip */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #7C3AED, #EC4899, #06B6D4)', width: '100%' }} />

        <div style={{ padding: '48px 40px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '18px', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
            }}>📚</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'Outfit', marginBottom: '8px',
              background: 'linear-gradient(135deg,#7C3AED,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Welcome to GIKI Hub
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Sign in to contribute materials and join the community.
            </p>
          </div>

        {error && (
          <div style={{ padding: '12px', background: '#FEF2F2', color: '#B91C1C', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid rgba(124,58,237,0.15)',
              background: 'white',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--text)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: '0 2px 12px rgba(124,58,237,0.1)',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseOver={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.25)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; }}
            onMouseOut={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(124,58,237,0.1)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.15)'; }}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="G"
              style={{ width: '22px' }}
            />
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            By signing in, you agree to contribute respectfully to the GIKI community.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
