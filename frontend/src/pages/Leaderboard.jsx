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
      .catch(err => {
        setError("Failed to load leaderboard. Please try again.");
        setLoading(false);
      });
  }, []);

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy size={24} style={{ color: '#F59E0B' }} />; // Gold
    if (index === 1) return <Medal size={24} style={{ color: '#9CA3AF' }} />; // Silver
    if (index === 2) return <Award size={24} style={{ color: '#D97706' }} />; // Bronze
    return <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-muted)' }}>{index + 1}</span>;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-hero)', paddingTop: '100px', paddingBottom: '60px' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'fadeUp 0.5s ease-out' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', marginBottom: '16px' }}>
            <Trophy size={32} />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Top Contributors
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
            Celebrating the students who make learning easier for everyone by sharing their notes and resources.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--electric)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--error)' }}>{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)' }}>No contributors found yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.map((user, index) => (
              <Link 
                key={user.user_id} 
                to={`/u/${user.username}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '16px 24px', 
                  background: index < 3 ? 'var(--bg-elevated)' : 'var(--bg-card)', 
                  borderRadius: '16px', 
                  border: `1px solid ${index < 3 ? 'var(--electric-muted)' : 'var(--border)'}`,
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  animation: `fadeUp 0.5s ease-out ${index * 0.05}s both`
                }}
                className="leaderboard-card hover-lift"
              >
                {/* Rank */}
                <div style={{ width: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '16px' }}>
                  {getRankIcon(index)}
                </div>

                {/* Avatar */}
                <div style={{ 
                  width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', 
                  background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginRight: '16px',
                  border: index === 0 ? '2px solid #F59E0B' : index === 1 ? '2px solid #9CA3AF' : index === 2 ? '2px solid #D97706' : 'none'
                }}>
                  {user.photo_url ? (
                    <img src={user.photo_url} alt={user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={24} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.display_name}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--electric)' }}>@{user.username}</span>
                    {user.program && (
                      <>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border)' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.program}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '16px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
                    {user.upload_count}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Uploads
                  </div>
                </div>

                <div style={{ marginLeft: '20px', color: 'var(--border)' }} className="chevron">
                  <ChevronRight size={20} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .leaderboard-card:hover {
          border-color: var(--electric);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .leaderboard-card:hover .chevron {
          color: var(--electric) !important;
          transform: translateX(4px);
        }
        .chevron {
          transition: all 0.2s;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
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
