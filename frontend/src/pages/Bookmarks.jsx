import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { Card } from '../components/common/Stats';

const Bookmarks = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const res = await api.get('/bookmarks');
      if (res.data.success) {
        setFiles(res.data.files);
      }
    } catch (err) {
      console.error("Bookmarks fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (id) => {
    try {
      const res = await api.post(`/files/${id}/bookmark`);
      if (res.data.success) {
        setFiles(files.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error("Remove bookmark failed", err);
    }
  };

  if (loading) return <div>Loading bookmarks...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>🔖 My Bookmarks</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>All resources you've saved for quick access.</p>
        </div>
        <NavLink to="/files" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>+ Browse More</NavLink>
      </div>

      {files.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {files.map(f => (
            <Card key={f.id} title={f.title} subtitle={`${f.subject} · ${f.category}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Save your favorite resources for efficient studying.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ flex: 1, backgroundColor: 'var(--primary)', color: 'white', padding: '10px', borderRadius: '6px', fontWeight: 600 }}>Download</button>
                  <button 
                    onClick={() => removeBookmark(f.id)}
                    style={{ border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px', borderRadius: '6px' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', border: '1px dotted var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔖</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No bookmarks yet</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>You haven't saved any resources to your library.</p>
          <NavLink to="/files" className="btn btn-primary" style={{ padding: '10px 24px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '8px', fontWeight: 700 }}>Browse Resources</NavLink>
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
