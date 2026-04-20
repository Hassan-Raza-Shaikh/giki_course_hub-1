import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card, StatCard } from '../components/common/Stats';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [topFiles, setTopFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      if (res.data.success) {
        setStats(res.data.stats);
        setTopFiles(res.data.top_files);
      }
    } catch (err) {
      console.error("Admin stats fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading admin dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <StatCard icon="👥" label="Total Users" value={stats?.total_users || 0} color="#003A8F" />
        <StatCard icon="📁" label="Total Files" value={stats?.total_files || 0} color="#4FA3D1" />
        <StatCard icon="⏳" label="Pending" value={stats?.pending_files || 0} color="#F59E0B" />
        <StatCard icon="🚩" label="Open Reports" value={stats?.open_reports || 0} color="#EF4444" />
      </div>

      <div className="admin-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        <Card title="🔥 Most Popular Resources" subtitle="Files with the highest download counts across the platform.">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '12px', fontSize: '0.85rem' }}>RANK</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem' }}>FILE TITLE</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', textAlign: 'right' }}>DOWNLOADS</th>
                </tr>
              </thead>
              <tbody>
                {topFiles.map((f, i) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 12px', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '14px 12px', fontWeight: 600 }}>{f.title}</td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      <span style={{ backgroundColor: 'var(--bg-subtle)', padding: '4px 12px', borderRadius: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                        {f.downloads}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 600, width: '100%' }}>
                📊 Summary Report
              </button>
              <button style={{ backgroundColor: 'white', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', fontWeight: 600, width: '100%' }}>
                🧹 Clean Logs
              </button>
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .admin-layout {
            grid-template-columns: 1fr !important;
          }
          table {
            min-width: 600px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminPanel;
