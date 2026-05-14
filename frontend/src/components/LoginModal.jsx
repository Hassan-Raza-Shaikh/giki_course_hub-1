import React, { useState } from 'react';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import api from '../services/api';

const PROGRAMS = [
  { faculty: 'Faculty of Computer Science & Engineering (FCSE)', programs: [
    'BS Artificial Intelligence',
    'BS Computer Science',
    'BS Computer Engineering',
    'BS Cyber Security',
    'BS Data Science',
    'BS Software Engineering',
  ]},
  { faculty: 'Faculty of Electrical Engineering (FEE)', programs: [
    'BS Electrical Engineering (Robotics & Autonomous Systems)',
    'BS Electrical Engineering (Digital Design & Embedded Systems)',
    'BS Electrical Engineering (Smart Communication & Signal Processing)',
    'BS Electrical Engineering (Smart Grid)',
  ]},
  { faculty: 'Faculty of Mechanical & Chemical Engineering (FMCE)', programs: [
    'BS Chemical Engineering',
    'BS Chemical Engineering (Oil and Gas Engineering)',
  ]},
  { faculty: 'Faculty of Mechanical Engineering (FME)', programs: [
    'BS Mechanical Engineering',
  ]},
  { faculty: 'Faculty of Civil Engineering', programs: [
    'BS Civil Engineering',
  ]},
  { faculty: 'Faculty of Management & Social Sciences (MGS)', programs: [
    'BS Management Sciences',
  ]},
];

const InputField = ({ label, type = 'text', value, onChange, placeholder, required }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
      {label}{required && ' *'}
    </label>
    <input
      type={type}
      required={required}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: '8px',
        border: '2px solid #CBD5E1', fontSize: '0.9rem',
        background: 'var(--bg-white)', outline: 'none', transition: 'all 0.2s',
        boxSizing: 'border-box',
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)'; }}
      onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none'; }}
    />
  </div>
);

const LoginModal = ({ onClose, onSuccess }) => {
  const [tab, setTab] = useState('login');   // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupStudentId, setSignupStudentId] = useState('');
  const [signupBatch, setSignupBatch] = useState('');
  const [signupProgram, setSignupProgram] = useState('');

  // ── Google ────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true); setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();

      const res = await api.post('/auth/firebase', {
        idToken,
        uid: fbUser.uid, email: fbUser.email,
        displayName: fbUser.displayName, photoURL: fbUser.photoURL,
      });

      if (res.data.success) {
        onSuccess({ ...res.data.user, displayName: fbUser.displayName, photoURL: fbUser.photoURL, email: fbUser.email });
      } else {
        setError(res.data.message || 'Sign-in failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Sign-in failed. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Email Login ───────────────────────────────────────────────────────────
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      // Sign in via Firebase (validates password on Firebase side too)
      const result = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();

      // Then sync with our backend
      const res = await api.post('/auth/firebase', {
        idToken, uid: fbUser.uid, email: fbUser.email,
        displayName: fbUser.displayName, photoURL: fbUser.photoURL,
      });

      if (res.data.success) {
        onSuccess({ ...res.data.user, displayName: res.data.user.displayName || fbUser.displayName, photoURL: res.data.user.photoURL || fbUser.photoURL, email: fbUser.email });
      } else {
        setError(res.data.message || 'Sign-in failed.');
      }
    } catch (err) {
      const code = err.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.response?.data?.message || 'Sign-in failed. Please try again.');
      }
    } finally { setLoading(false); }
  };

  // ── Email Signup ──────────────────────────────────────────────────────────
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (signupPassword !== signupConfirm) { setError('Passwords do not match.'); return; }
    if (signupPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      // 1. Create the Firebase account
      const result = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();

      // 2. Register in our DB — profile fields included in the same call
      const firebaseRes = await api.post('/auth/firebase', {
        idToken,
        uid:         fbUser.uid,
        email:       fbUser.email,
        displayName: signupName || fbUser.email.split('@')[0],
        photoURL:    '',
        // Profile fields — written to user_profiles atomically on the backend
        studentId:   signupStudentId || null,
        batchYear:   signupBatch ? parseInt(signupBatch) : null,
        program:     signupProgram || null,
      });

      if (!firebaseRes.data.success) {
        setError(firebaseRes.data.message || 'Registration failed.');
        setLoading(false);
        return;
      }

      onSuccess({
        ...firebaseRes.data.user,
        displayName: signupName || fbUser.email.split('@')[0],
        email:       fbUser.email,
      });
    } catch (err) {
      const code = err.code;
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.response?.data?.message || 'Sign-up failed. Please try again.');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ position: 'relative', overflow: 'hidden', padding: '0', maxWidth: '520px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Top accent strip */}
        <div style={{ height: '8px', background: 'var(--primary)', width: '100%', borderBottom: '2px solid var(--text)' }} />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--bg-white)', border: '2px solid var(--text)',
            boxShadow: '2px 2px 0px var(--text)',
            fontSize: '1.1rem', lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text)', fontWeight: 900, transition: 'all 0.15s',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'var(--bg-hero)'; e.currentTarget.style.boxShadow = 'none'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-white)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.boxShadow = '2px 2px 0px var(--text)'; }}
        >
          ✕
        </button>

        <div className="modal-content">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: 46, height: 46, borderRadius: '14px', margin: '0 auto 12px',
              background: 'var(--accent)', border: '2px solid var(--text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', boxShadow: '3px 3px 0px var(--text)',
            }}>📚</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'Outfit', marginBottom: '3px', color: 'var(--text)' }}>
              {tab === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
              {tab === 'login' ? 'Sign in to access your GIKI Hub.' : 'Join the GIKI academic community.'}
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', border: '2px solid var(--text)', borderRadius: '10px', marginBottom: '18px', overflow: 'hidden' }}>
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                style={{
                  flex: 1, padding: '10px', fontWeight: 800, fontSize: '0.88rem',
                  background: tab === t ? 'var(--primary)' : 'var(--bg-white)',
                  color: tab === t ? 'var(--bg-hero)' : 'var(--text)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  textTransform: 'capitalize',
                }}
              >
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '18px', fontWeight: 600, border: '1px solid #FCA5A5' }}>
              {error}
            </div>
          )}

          {/* Google button */}
          <button onClick={handleGoogle} disabled={loading} className="btn-outline"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', opacity: loading ? 0.7 : 1 }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '20px' }} />
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--text-light)', opacity: 0.3 }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--text-light)', opacity: 0.3 }} />
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <InputField label="Email" type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" />
              <InputField label="Password" type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" />
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '4px', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── SIGNUP FORM ── */}
          {tab === 'signup' && (
            <form onSubmit={handleEmailSignup} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <InputField label="Full Name" required value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Ali Hassan" />
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Reg No</label>
                  <input
                    type="text"
                    value={signupStudentId}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setSignupStudentId(v);
                    }}
                    placeholder="2021xxxx"
                    minLength={7} maxLength={8}
                    pattern="\d{7,8}"
                    title="Registration number must be 7 or 8 digits"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '2px solid #CBD5E1', fontSize: '0.9rem', background: 'var(--bg-white)', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
              <InputField label="Email" type="email" required value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="you@giki.edu.pk" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <InputField label="Password" type="password" required value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Min 6 chars" />
                <InputField label="Confirm Password" type="password" required value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} placeholder="Repeat password" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <InputField label="Batch Year" type="number" value={signupBatch} onChange={e => setSignupBatch(e.target.value)} placeholder="2021" />
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Program</label>
                  <select value={signupProgram} onChange={e => setSignupProgram(e.target.value)}
                    style={{ width: '100%', padding: '11px 10px', borderRadius: '8px', border: '2px solid #CBD5E1', fontSize: '0.83rem', background: 'var(--bg-white)', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none'; }}
                  >
                    <option value="">Select programme…</option>
                    {PROGRAMS.map(group => (
                      <optgroup key={group.faculty} label={group.faculty}>
                        {group.programs.map(p => <option key={p} value={p}>{p}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '2px', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            By continuing, you agree to contribute respectfully to the GIKI community.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
