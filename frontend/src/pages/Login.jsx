import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import api from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Sync with our backend
      const res = await api.post('/auth/firebase', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });

      if (res.data.success) {
        window.location.href = res.data.user.role === 'admin' ? '/admin' : '/dashboard';
      }
    } catch (err) {
      console.error("Google login failed", err);
      setError('Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/login', formData);
      if (res.data.success) {
        window.location.href = res.data.user.role === 'admin' ? '/admin' : '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #f8faff 0%, #e8f0fe 100%)',
      padding: '24px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px', 
        backgroundColor: 'white', 
        borderRadius: '24px', 
        padding: '48px 40px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📚</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px', fontWeight: 500 }}>Access your GIKI Student Hub</p>
        </div>

        {error && (
          <div style={{ padding: '14px', backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '24px', textAlign: 'center', fontWeight: 600, border: '1px solid #FCA5A5' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
            <input 
              type="text" 
              required
              placeholder="Your username"
              style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', backgroundColor: '#F8FAFC', transition: 'var(--transition)' }}
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', backgroundColor: '#F8FAFC', transition: 'var(--transition)' }}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              backgroundColor: 'var(--primary)', 
              color: 'white', 
              padding: '16px', 
              borderRadius: '12px', 
              fontWeight: 800, 
              fontSize: '1rem',
              marginTop: '12px',
              transition: 'var(--transition)',
              boxShadow: '0 4px 12px rgba(0, 58, 143, 0.2)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Hub'}
          </button>
        </form>

        <div style={{ margin: '32px 0', position: 'relative', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', backgroundColor: 'var(--border)', zIndex: 1 }}></div>
          <span style={{ position: 'relative', zIndex: 2, backgroundColor: 'white', padding: '0 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>OR CONTINUE WITH</span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ 
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            backgroundColor: 'white',
            border: '1px solid var(--border)',
            padding: '14px',
            borderRadius: '12px',
            fontWeight: 700,
            color: 'var(--text)',
            transition: 'var(--transition)',
            opacity: loading ? 0.7 : 1
          }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '20px' }} />
          Log in with Google
        </button>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.95rem' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>New to Course Hub? </span>
          <NavLink to="/signup" style={{ color: 'var(--secondary)', fontWeight: 800 }}>Create Account</NavLink>
        </div>
      </div>
    </div>
  );
};

export default Login;
