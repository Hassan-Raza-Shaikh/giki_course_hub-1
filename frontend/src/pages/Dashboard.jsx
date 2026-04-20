import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { StatCard, Card } from '../components/common/Stats';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Dashboard fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <StatCard icon="📤" label="Contributions" value={data?.stats?.contributions || 0} color="#003A8F" />
        <StatCard icon="🔖" label="Bookmarks" value={data?.stats?.bookmarks || 0} color="#4FA3D1" />
        <StatCard icon="🔔" label="New Updates" value={data?.stats?.notifications || 0} color="#F59E0B" />
      </div>

      <Card title="My Recent Uploads" subtitle="Track and manage your shared academic resources." icon="📁">
        {data?.my_files?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '16px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.my_files.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'var(--transition)' }}>
                    <td style={{ padding: '16px 12px', fontWeight: 700, color: 'var(--primary)' }}>{f.title}</td>
                    <td style={{ padding: '16px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>{f.subject}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        backgroundColor: f.status === 'approved' ? '#ECFDF5' : '#FFFBEB',
                        color: f.status === 'approved' ? '#059669' : '#D97706',
                        border: `1px solid ${f.status === 'approved' ? '#A7F3D0' : '#FEF3C7'}`
                      }}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {new Date(f.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-muted)' }}>You haven't uploaded any files yet.</p>
          </div>
        )}
      </Card>

      <style>{`
        @media (max-width: 768px) {
          table {
            min-width: 600px;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
