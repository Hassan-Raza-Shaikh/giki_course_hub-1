import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div style={{ paddingTop: '120px', minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <div className="grid-bg" />
      
      <div className="page-container" style={{ maxWidth: '600px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '12px' }}>
            🚩 Report an <span className="gradient-text">Issue</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
            Found a bug? UI looking weird? Let us know! Please report this issue so the developers can get on it—your reporting helps us improve the app experience!
          </p>
        </div>

        <div style={{ 
          background: 'var(--bg-white)', borderRadius: '24px', border: '3px solid var(--text)',
          boxShadow: '10px 10px 0 var(--text)', padding: '40px'
        }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🚀</div>
              <h2 style={{ fontWeight: 900, fontSize: '2rem', marginBottom: '12px' }}>Thank You!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Your report has been received. Our team will look into it ASAP.</p>
              <p style={{ marginTop: '24px', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700 }}>Redirecting you home...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '14px', borderRadius: '12px', border: '2px solid #B91C1C', marginBottom: '24px', fontWeight: 700, fontSize: '0.9rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 900, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text)' }}>What's the issue about?</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid var(--text)', fontSize: '1rem', fontWeight: 600, outline: 'none', background: 'var(--bg-subtle)' }}
                >
                  <option value="ui">🎨 UI / Design Glitch</option>
                  <option value="material">📚 Course Material Issue</option>
                  <option value="bug">🐛 Functional Bug</option>
                  <option value="feature">💡 Feature Request</option>
                  <option value="other">❓ Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 900, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text)' }}>Subject</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Search button not working on mobile"
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
                  background: 'var(--primary)', color: 'white', fontWeight: 900, fontSize: '1.1rem',
                  boxShadow: '4px 4px 0 var(--text)', cursor: 'pointer', transition: 'all 0.1s'
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 var(--text)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0 var(--text)'; }}
              >
                {loading ? 'Submitting...' : '🚀 Send Report'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportIssue;
