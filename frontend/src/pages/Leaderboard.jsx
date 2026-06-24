import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award, ChevronRight, User } from 'lucide-react';
import api from '../services/api';

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/leaderboard')
      .then(res => {
        setUsers(res.data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load leaderboard. Please try again.");
        setLoading(false);
      });
  }, []);

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy size={20} style={{ color: '#F59E0B' }} />;
    if (index === 1) return <Medal size={20} style={{ color: '#9CA3AF' }} />;
    if (index === 2) return <Award size={20} style={{ color: '#D97706' }} />;
    return <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', minWidth: '20px', textAlign: 'center' }}>{index + 1}</span>;
  };

  const avatarBorder = (i) => {
    if (i === 0) return '2px solid #F59E0B';
    if (i === 1) return '2px solid #9CA3AF';
    if (i === 2) return '2px solid #D97706';
    return '1px solid var(--border)';
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
            <Trophy size={40} strokeWidth={2.5} color="#F59E0B" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px 0', lineHeight: 1.1 }}>
              Top Contributors
            </h1>
            <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              Celebrating the students who make learning easier for everyone by sharing their notes and resources.
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid var(--electric)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '14px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--accent)' }}>{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)' }}>No contributors found yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map((user, index) => (
              <Link
                key={user.user_id}
                to={`/u/${user.username}`}
                className="lb-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: index < 3 ? 'var(--bg-elevated, var(--bg-card))' : 'var(--bg-card)',
                  borderRadius: '14px',
                  border: `1px solid ${index < 3 ? 'var(--primary)' : 'var(--border)'}`,
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  animation: `fadeUp 0.4s ease-out ${index * 0.04}s both`,
                  opacity: index < 3 ? 1 : 0.92,
                }}
              >
                {/* Rank — fixed width so it never squishes */}
                <div style={{ width: '24px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {getRankIcon(index)}
                </div>

                {/* Avatar — fixed size */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, border: avatarBorder(index),
                }}>
                  {user.photo_url ? (
                    <img src={user.photo_url} alt={user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={20} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                {/* Info — flex: 1, minWidth: 0 is the key to preventing overflow */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{
                    fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                  }}>
                    {user.display_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--electric)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
                      @{user.username}
                    </span>
                    {user.program && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 2 }}>
                        · {user.program}
                      </span>
                    )}
                  </div>
                </div>

                {/* Upload count — fixed, never wraps */}
                <div style={{ flexShrink: 0, textAlign: 'right', marginLeft: '6px' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                    {user.upload_count}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                    Uploads
                  </div>
                </div>

                {/* Chevron */}
                <div className="lb-chevron" style={{ flexShrink: 0, color: 'var(--border)', transition: 'all 0.2s' }}>
                  <ChevronRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .lb-card:hover {
          border-color: var(--electric) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(0,0,0,0.15);
        }
        .lb-card:hover .lb-chevron {
          color: var(--electric) !important;
          transform: translateX(3px);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;
