import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { BookOpen } from 'lucide-react';
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
      const idToken = await user.getIdToken();
      
      const res = await api.post('/auth/firebase', {
        idToken,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });

      if (res.data.success) {
        window.location.href = res.data.user.role === 'admin' ? '/admin' : '/dashboard';
      } else {
        setError(res.data.message || 'Google Sign-In failed.');
      }
    } catch (err) {
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
      } else {
        setError(res.data.message || 'Login failed.');
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
      background: 'var(--bg-hero)',
      padding: '24px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '420px', 
        backgroundColor: 'var(--bg-card)', 
        borderRadius: '24px', 
        padding: '48px 40px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><BookOpen size={48} strokeWidth={1.5} color="var(--primary)" /></div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-primary)' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px', fontWeight: 500 }}>Access your GIKI Student Hub</p>
        </div>

        {error && (
          <div style={{ padding: '14px', background: 'rgba(185,28,28,0.1)', color: 'var(--accent)', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '24px', textAlign: 'center', fontWeight: 600, border: '1px solid rgba(185,28,28,0.3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username or Email</label>
            <input 
              type="text" 
              required
              placeholder="Your username or email"
              style={{ padding: '14px', borderRadius: '12px', border: '2px solid var(--border)', outline: 'none', background: 'var(--bg-subtle)', color: 'var(--text)', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              style={{ padding: '14px', borderRadius: '12px', border: '2px solid var(--border)', outline: 'none', background: 'var(--bg-subtle)', color: 'var(--text)', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign In to Hub'}
          </button>
        </form>

        <div style={{ margin: '28px 0', position: 'relative', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', background: 'var(--border)', opacity: 0.4, zIndex: 1 }}></div>
          <span style={{ position: 'relative', zIndex: 2, background: 'var(--bg-white)', padding: '0 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>OR CONTINUE WITH</span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="btn-outline"
          style={{ 
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            opacity: loading ? 0.7 : 1
          }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '20px' }} />
          Log in with Google
        </button>

        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.95rem' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>New to Course Hub? </span>
          <NavLink to="/signup" style={{ color: 'var(--primary)', fontWeight: 800 }}>Create Account</NavLink>
        </div>
      </div>
    </div>
  );
};

export default Login;
