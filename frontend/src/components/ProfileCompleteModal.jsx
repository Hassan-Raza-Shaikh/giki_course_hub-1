import React, { useState, useEffect } from 'react';
import { User, GraduationCap, BookOpen, Users, Globe } from 'lucide-react';
import api from '../services/api';

const USER_TYPES = [
  { value: 'student',  label: 'Student',          icon: <GraduationCap size={20} />, needsBatch: true  },
  { value: 'graduate', label: 'Graduate',          icon: <BookOpen size={20} />,      needsBatch: true  },
  { value: 'faculty',  label: 'Faculty / Teacher', icon: <Users size={20} />,         needsBatch: false },
  { value: 'external', label: 'External / Other',  icon: <Globe size={20} />,         needsBatch: false },
];

const currentYear = new Date().getFullYear();
// Batch years: 2000 → current year + 1 (for incoming batch)
const BATCH_YEARS = Array.from({ length: currentYear - 1999 + 1 }, (_, i) => currentYear + 1 - i);

const ProfileCompleteModal = ({ user, onComplete, onClose, mode = 'complete' }) => {
  const [faculties, setFaculties] = useState([]);
  const [userType, setUserType]   = useState(user?.userType || 'student');
  const [program,  setProgram]    = useState(user?.program || '');
  const [batchYear, setBatchYear] = useState(user?.batchYear || '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const needsBatch = USER_TYPES.find(t => t.value === userType)?.needsBatch ?? true;

  // Fetch faculties + programs for the dropdown
  useEffect(() => {
    api.get('/faculties-programs')
      .then(res => { if (res.data.success) setFaculties(res.data.faculties || []); })
      .catch(() => {});
  }, []);

  // All programs flattened
  const allPrograms = faculties.flatMap(f =>
    f.programs.map(p => ({ label: `${f.abbr} — ${p.name}`, value: p.name, faculty: f.abbr }))
  );

  // When user_type switches to faculty/external, clear batch year
  useEffect(() => {
    if (!needsBatch) setBatchYear('');
  }, [userType, needsBatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!userType) { setError('Please select who you are.'); return; }
    if (!program)  { setError('Please select your program or department.'); return; }
    if (needsBatch && !batchYear) { setError('Please select your batch year.'); return; }

    setSaving(true);
    try {
      await api.patch('/me/profile', {
        userType,
        program,
        batchYear: needsBatch ? parseInt(batchYear, 10) : null,
      });
      onComplete({ userType, program, batchYear: needsBatch ? parseInt(batchYear, 10) : null });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // --- Styles (no hardcoded colours — all CSS variables) ---
  const overlay = {
    position: 'fixed', inset: 0, zIndex: 99999,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
    backdropFilter: 'blur(4px)',
  };
  const card = {
    background: 'var(--bg-white)',
    border: '2px solid var(--text)',
    borderRadius: '20px',
    boxShadow: '6px 6px 0px var(--text)',
    padding: 'clamp(24px, 5vw, 40px)',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    animation: 'fadeUp 0.3s ease-out',
  };
  const label = {
    display: 'block',
    fontWeight: 700,
    fontSize: '0.85rem',
    color: 'var(--text)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
  const selectStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '100px',
    border: '1.5px solid var(--text)',
    background: 'var(--bg-body)',
    color: 'var(--text)',
    fontFamily: 'var(--font-primary)',
    fontWeight: 600,
    fontSize: '0.9rem',
    boxShadow: '2px 2px 0px var(--text)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'auto',
  };

  return (
    <div style={overlay}>
      <div style={{ ...card, position: 'relative' }}>
        {/* Close Button if onClose is provided */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>&times;</span>
          </button>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'color-mix(in srgb, var(--primary) 85%, var(--accent))', color: 'var(--nav-btn-text)',
            marginBottom: '14px',
            border: '2px solid var(--text)', boxShadow: '3px 3px 0px var(--text)',
          }}>
            <User size={24} />
          </div>
          <h2 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 'clamp(1.2rem,4vw,1.5rem)', color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {mode === 'edit' ? 'Edit Profile' : 'Complete Your Profile'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {mode === 'edit' 
              ? 'Update your faculty, program, and batch year details.' 
              : 'Help us personalise your experience and keep the leaderboard meaningful.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Who are you? */}
          <div>
            <label style={label}>Who are you?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {USER_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setUserType(t.value)}
                  className="btn-nav"
                  style={{
                    background:  userType === t.value ? 'var(--primary)' : 'var(--bg-body)',
                    color:       userType === t.value ? 'var(--nav-btn-text)' : 'var(--text)',
                    boxShadow:   userType === t.value ? 'inset 2px 2px 4px rgba(0,0,0,0.2)' : '2px 2px 0px var(--text)',
                    transform:   userType === t.value ? 'translate(1px,1px)' : 'none',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700,
                    transition: 'all 0.15s',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Program */}
          <div>
            <label style={label}>Program / Department</label>
            {allPrograms.length > 0 ? (
              <select value={program} onChange={e => setProgram(e.target.value)} style={selectStyle} required>
                <option value="">— Select —</option>
                {allPrograms.map(p => (
                  <option key={`${p.faculty}-${p.value}`} value={p.value}>{p.label}</option>
                ))}
                <option value="Other">Other / Not Listed</option>
              </select>
            ) : (
              <input
                type="text"
                value={program}
                onChange={e => setProgram(e.target.value)}
                placeholder="e.g. BS Computer Engineering"
                style={{ ...selectStyle, borderRadius: '12px' }}
                required
              />
            )}
          </div>

          {/* Entrance Year — only for students/graduates */}
          {needsBatch && (
            <div>
              <label style={label}>Entrance Year</label>
              <select value={batchYear} onChange={e => setBatchYear(e.target.value)} style={selectStyle} required>
                <option value="">— Select entrance year —</option>
                {BATCH_YEARS.map(y => (
                  <option key={y} value={y}>{y} (Batch {y - 1990})</option>
                ))}
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px',
              background: 'var(--bg-subtle)', border: '1.5px solid var(--accent)',
              color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-nav"
            style={{
              background: 'color-mix(in srgb, var(--primary) 85%, var(--accent))',
              color: 'var(--nav-btn-text)',
              padding: '12px 24px',
              fontSize: '1rem',
              width: '100%',
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
              borderRadius: '100px',
            }}
          >
            {saving ? 'Saving…' : (mode === 'edit' ? 'Save Changes' : 'Save & Continue')}
          </button>
        </form>
      </div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ProfileCompleteModal;
