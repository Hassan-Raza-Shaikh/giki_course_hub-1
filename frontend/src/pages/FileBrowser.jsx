import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card } from '../components/common/Stats';

const FileBrowser = () => {
  const [files, setFiles] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ q: '', subject: '', category: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, [filters]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/files', {
        params: {
          q: filters.q,
          subject_id: filters.subject,
          category_id: filters.category
        }
      });
      if (res.data.success) {
        setFiles(res.data.files);
        if (subjects.length === 0) setSubjects(res.data.subjects);
        if (categories.length === 0) setCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Files fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="filter-header" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: 'white', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <input 
          type="text" 
          name="q"
          placeholder="Search resources..." 
          value={filters.q}
          onChange={handleFilterChange}
          style={{ flex: 1, minWidth: '240px', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
        />
        <select name="subject" value={filters.subject} onChange={handleFilterChange} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="category" value={filters.category} onChange={handleFilterChange} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading files...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {files.map(f => (
            <Card key={f.id} title={f.title} subtitle={`${f.subject} · ${f.category}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Uploaded by <strong>{f.uploader}</strong> on {new Date(f.date).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button style={{ flex: 1, backgroundColor: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '6px', fontWeight: 600 }}>View Details</button>
                  <button style={{ width: '40px', height: '40px', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔖</button>
                </div>
              </div>
            </Card>
          ))}
          {files.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', border: '1px dotted var(--border)' }}>
              <span style={{ fontSize: '3rem' }}>🔍</span>
              <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>No resources found matching your search.</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .filter-header {
            flex-direction: column;
            gap: 16px;
          }
          .filter-header > * {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FileBrowser;
