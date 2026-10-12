import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, AlertTriangle, CheckCircle2, BellOff, LogIn, Info } from 'lucide-react';
import api from '../services/api';

const DESCRIPTIONS = {
  my_uploads:   'When your upload is received, approved or not approved.',
  my_reports:   'When an admin acts on a file you reported or an issue you submitted.',
  admin_alerts: 'When new uploads are waiting for review, or a file or issue is reported.',
};

const Toggle = ({ checked, onChange, disabled }) => (
  <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '22px', flexShrink: 0, opacity: disabled ? 0.6 : 1 }}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      style={{ opacity: 0, width: 0, height: 0 }}
    />
    <span style={{
      position: 'absolute', cursor: disabled ? 'default' : 'pointer', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: checked ? 'var(--primary)' : 'var(--border)',
      transition: '.3s', borderRadius: '34px',
      display: 'flex', alignItems: 'center', justifyContent: checked ? 'flex-start' : 'flex-end',
      padding: '0 6px', color: 'white', fontSize: '0.6rem', fontWeight: 800
    }}>
      {checked ? 'ON' : 'OFF'}
      <span style={{
        position: 'absolute', height: '16px', width: '16px', left: '3px', bottom: '3px',
        backgroundColor: 'white', transition: '.3s', borderRadius: '50%',
        transform: checked ? 'translateX(28px)' : 'none'
      }}/>
    </span>
  </label>
);

const EmailSettings = ({ user, onSignIn }) => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const unsubscribeCategory = params.get('unsubscribe');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(null);
  const didUnsubscribe = useRef(false);

  useEffect(() => {
    // Opened from the "Unsubscribe" link in an email: switch that category off straight away
    if (token && unsubscribeCategory) {
      if (didUnsubscribe.current) return;
      didUnsubscribe.current = true;
      setLoading(true);
      api.post('/email/unsubscribe', { token })
        .then(res => {
          setData(res.data);
          const cat = res.data.categories.find(c => c.key === unsubscribeCategory);
          setUnsubscribed(cat ? cat.label : 'these emails');
        })
        .catch(err => setError(err.response?.data?.message || 'Could not update your email settings.'))
        .finally(() => setLoading(false));
      return;
    }

    if (!token && !user) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }

    setNeedsLogin(false);
    setLoading(true);
    api.get('/email/preferences', { params: token ? { token } : {} })
      .then(res => setData(res.data))
      .catch(err => {
        if (err.response?.status === 401) setNeedsLogin(true);
        else setError(err.response?.data?.message || 'Could not load your email settings.');
      })
      .finally(() => setLoading(false));
  }, [token, unsubscribeCategory, user]);

  const update = async (key, value) => {
    const previous = data;
    setData(d => ({ ...d, preferences: { ...d.preferences, [key]: value } }));
    setSaving(key);
    setError('');
    try {
      const res = await api.patch('/email/preferences', { token: token || undefined, preferences: { [key]: value } });
      setData(res.data);
    } catch (err) {
      setData(previous);
      setError(err.response?.data?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const allOff = data && data.categories.every(c => !data.preferences[c.key]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-hero)', paddingTop: '100px', paddingBottom: '80px' }}>
      <div className="page-container" style={{ maxWidth: '800px' }}>

        {/* Header */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px',
          padding: 'clamp(20px, 5vw, 32px) clamp(20px, 5vw, 40px)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', marginBottom: '32px',
          display: 'flex', alignItems: 'center', gap: '24px', color: 'var(--text)', flexWrap: 'wrap',
          animation: 'fadeUp 0.4s ease-out'
        }}>
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <Mail size={40} strokeWidth={2.5} color="var(--primary)" />
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px 0', lineHeight: 1.1 }}>
              Email Settings
            </h1>
            <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              Choose which updates GIKI Course Hub sends to {data?.email ? <strong style={{ color: 'var(--text)' }}>{data.email}</strong> : 'your inbox'}.
            </p>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', padding: 'clamp(20px, 5vw, 32px) clamp(20px, 5vw, 40px)', animation: 'fadeUp 0.4s ease-out' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--electric)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : needsLogin ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <LogIn size={40} color="var(--primary)" style={{ marginBottom: '12px' }} />
              <h2 style={{ fontWeight: 900, fontSize: '1.4rem', margin: '0 0 8px', color: 'var(--text)' }}>Sign in to manage your emails</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 24px' }}>Or use the Email settings link at the bottom of any email we've sent you.</p>
              <button className="btn-nav" onClick={onSignIn} style={{ background: 'var(--primary)', color: 'var(--nav-btn-text)' }}>
                Sign in
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ padding: '12px 16px', background: '#FEE2E2', border: '2px solid #EF4444', borderRadius: '12px', color: '#B91C1C', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <AlertTriangle size={18} /> {error}
                </div>
              )}

              {unsubscribed && (
                <div style={{ padding: '14px 16px', background: 'var(--bg-subtle)', border: '2px solid var(--text)', borderRadius: '12px', color: 'var(--text)', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', boxShadow: '4px 4px 0 var(--text)' }}>
                  <CheckCircle2 size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span>You've been unsubscribed from "{unsubscribed}". You can switch it back on below any time.</span>
                </div>
              )}

              {data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {data.categories.map(cat => (
                    <div key={cat.key} style={{
                      display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px',
                      background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '16px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>{cat.label}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{DESCRIPTIONS[cat.key]}</div>
                      </div>
                      <Toggle
                        checked={!!data.preferences[cat.key]}
                        disabled={saving === cat.key}
                        onChange={(v) => update(cat.key, v)}
                      />
                    </div>
                  ))}

                  {allOff && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <BellOff size={16} /> You won't get any emails from GIKI Course Hub.
                    </div>
                  )}
                </div>
              )}

              {!data && !error && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Nothing to show.</p>
              )}

              <div style={{
                marginTop: '24px', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start',
                background: 'var(--bg-subtle)', border: '1px dashed var(--border)', borderRadius: '12px',
                color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Email notifications are a new feature and may change as we improve them. Delivery isn't guaranteed:
                  messages can occasionally be delayed, land in your spam folder or not arrive. For the latest status of
                  your uploads and reports, check the app directly.
                </span>
              </div>

              <div style={{ marginTop: '28px', textAlign: 'center' }}>
                <Link to="/" style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'none' }}>← Back to GIKI Course Hub</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;
