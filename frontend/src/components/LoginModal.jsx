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
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const res = await api.post('/auth/firebase', {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
      });
      if (res.data.success) {
        onSuccess({
          ...res.data.user,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        });
        onClose();
      }
    } catch (err) {
      setError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📚</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'Outfit', marginBottom: '8px' }}>
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
            border: '1px solid var(--border)',
            background: 'white',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--text)',
            cursor: 'pointer',
            transition: 'var(--transition)',
            boxShadow: 'var(--shadow-sm)',
            opacity: loading ? 0.7 : 1,
          }}
          onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
          onMouseOut={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
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
  );
};

export default LoginModal;
