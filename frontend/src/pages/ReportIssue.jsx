import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Rocket, AlertTriangle, Send } from 'lucide-react';
import api from '../services/api';

const ReportIssue = ({ user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: 'ui',
    title: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return setError('You must be logged in to report an issue.');
    setLoading(true);
    setError('');
    try {
      await api.post('/issues', formData);
      setSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-hero)', paddingTop: '100px', paddingBottom: '80px' }}>
      
      <div className="page-container" style={{ maxWidth: '1000px' }}>
        
        {/* Header */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '32px 40px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          marginBottom: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          color: 'var(--text)',
          flexWrap: 'wrap',
          animation: 'fadeUp 0.4s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
          }}>
            <Flag size={40} strokeWidth={2.5} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px 0', lineHeight: 1.1 }}>
              Report an Issue
            </h1>
            <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              Found a bug? UI looking weird? Let us know! Your reporting helps us improve the app experience.
            </p>
          </div>
        </div>

        <div className="report-issue-card" style={{ 
          background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)', padding: '40px'
        }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}><Rocket size={80} color="var(--primary)" /></div>
              <h2 style={{ fontWeight: 900, fontSize: '2rem', marginBottom: '12px' }}>Thank You!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Your report has been received. Our team will look into it ASAP.</p>
              <p style={{ marginTop: '24px', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700 }}>Redirecting you home...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ padding: '12px 16px', background: '#FEE2E2', border: '2px solid #EF4444', borderRadius: '12px', color: '#B91C1C', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <AlertTriangle size={18} /> {error}
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 900, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text)' }}>What's the issue about?</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid var(--text)', fontSize: '1rem', fontWeight: 600, outline: 'none', background: 'var(--bg-subtle)' }}
                >
                  <option value="ui">UI / Design Glitch</option>
                  <option value="material">Course Material Issue</option>
                  <option value="gpa_calculator">GPA Calculator Issue</option>
                  <option value="profile">User Profile / Bookmarks</option>
                  <option value="leaderboard">Leaderboard / Points</option>
                  <option value="bug">General Functional Bug</option>
                  <option value="feature">Feature Request</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 900, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text)' }}>Subject</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. GPA Calculator crashes or Search broken"
                  required
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid var(--text)', fontSize: '1rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontWeight: 900, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text)' }}>Details</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Tell us exactly what happened..."
                  required
                  rows={6}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid var(--text)', fontSize: '1rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                style={{ 
                  width: '100%', padding: '18px', borderRadius: '14px', border: '3px solid var(--text)',
                  background: 'color-mix(in srgb, var(--primary) 85%, var(--accent))', color: 'white', fontWeight: 900, fontSize: '1.1rem',
                  boxShadow: '4px 4px 0 var(--text)', cursor: 'pointer', transition: 'all 0.1s'
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 var(--text)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0 var(--text)'; }}
              >
                {loading ? 'Submitting...' : <><Send size={18} /> Send Report</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportIssue;
