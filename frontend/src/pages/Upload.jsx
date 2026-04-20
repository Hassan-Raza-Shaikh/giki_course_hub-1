import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card } from '../components/common/Stats';

const Upload = () => {
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({ title: '', subject_id: '', category_id: '', file: null });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const res = await api.get('/files');
      if (res.data.success) {
        setSubjects(res.data.subjects);
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Metadata fetch failed", err);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      alert("Please select a file to upload.");
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('subject_id', formData.subject_id);
    data.append('category_id', formData.category_id);
    data.append('file', formData.file);

    try {
      const res = await api.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>⬆️ Contribute Resource</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Share your notes and study materials with the GIKI community.</p>
      </header>

      {success ? (
        <Card style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>Upload Successful!</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Your file is now pending admin approval. Redirecting...</p>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card title="Resource Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Resource Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. CS102 Final Prep Notes"
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Subject</label>
                  <select 
                    required
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                    onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Category</label>
                  <select 
                    required
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <Card title="File Upload">
            <div 
              style={{ 
                border: '2px dashed var(--border)', 
                borderRadius: '12px', 
                padding: '40px', 
                textAlign: 'center',
                backgroundColor: '#fdfdfd',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('file-input').click()}
            >
              {formData.file ? (
                <div>
                  <div style={{ fontSize: '2rem' }}>📄</div>
                  <div style={{ fontWeight: 600, marginTop: '8px' }}>{formData.file.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(formData.file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>☁️</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>Click to upload or drag & drop</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>PDF, PPTX, DOCX (Max 50MB)</p>
                </div>
              )}
              <input 
                id="file-input"
                type="file" 
                style={{ display: 'none' }} 
                onChange={handleFileChange}
              />
            </div>
          </Card>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              backgroundColor: 'var(--primary)', 
              color: 'white', 
              padding: '16px', 
              borderRadius: '12px', 
              fontWeight: 800, 
              fontSize: '1.1rem',
              transition: 'var(--transition)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Uploading...' : 'Publish to community'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Upload;
