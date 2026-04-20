import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card, StatCard } from '../components/common/Stats';

const Profile = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Profile fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading profile...</div>;

  const user = data?.user;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px', paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ 
          width: '100px', 
          height: '100px', 
          borderRadius: '50%', 
          backgroundColor: 'var(--primary)', 
          color: 'white', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: '3rem', 
          fontWeight: 800,
          boxShadow: '0 0 20px rgba(0,58,143,0.2)'
        }}>
          {user?.username[0].toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{user?.username}</h1>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
              {user?.role.toUpperCase()}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Member since {new Date(user?.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <StatCard icon="📤" label="Approved Uploads" value={data?.stats?.contributions || 0} color="#003A8F" />
        <StatCard icon="⬇️" label="Total Downloads" value={data?.stats?.downloads || 0} color="#4FA3D1" />
        <StatCard icon="🔖" label="Saved Bookmarks" value={data?.stats?.bookmarks || 0} color="#F59E0B" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        <Card title="Account Details" subtitle="Managing your personal information on the Course Hub.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <DetailItem label="Full Username" value={user?.username} />
            <DetailItem label="Account Role" value={user?.role} />
            <DetailItem label="Join Date" value={new Date(user?.created_at).toLocaleDateString()} />
          </div>
        </Card>

        <Card title="Quick Actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button style={{ backgroundColor: 'white', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', fontWeight: 600, width: '100%', textAlign: 'left' }}>
              👤 Change Password
            </button>
            <button style={{ backgroundColor: 'white', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', fontWeight: 600, width: '100%', textAlign: 'left' }}>
              🔔 Notification Prefs
            </button>
            <button style={{ border: '1px solid #EF4444', color: '#EF4444', padding: '12px', borderRadius: '8px', fontWeight: 600, width: '100%' }}>
              Logout Session
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f8f8f8' }}>
    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{value}</span>
  </div>
);

export default Profile;
