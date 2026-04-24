import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';

const CATEGORY_ICONS = {
  'Past Papers':  '📄',
  'Notes':        '📓',
  'Slides':       '🖥️',
  'Assignments':  '📋',
  'Lab Reports':  '🧪',
};

const CoursePage = ({ user, onSignIn }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const uploadRef = useRef(null);

  const [course, setCourse]           = useState(null);
  const [filesByCategory, setFiles]   = useState({});
  const [categories, setCategories]   = useState([]);
  const [subjectId, setSubjectId]     = useState(null);
  const [activeTab, setActiveTab]     = useState('');
  const [loading, setLoading]         = useState(true);

  // Upload state
  const [uploadTitle, setUploadTitle]     = useState('');
  const [uploadCatId, setUploadCatId]     = useState('');
  const [uploadFile, setUploadFile]       = useState(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);   // 0-100
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError]     = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/courses/${id}`)
      .then(res => {
        if (res.data.success) {
          setCourse(res.data.course);
          setFiles(res.data.files_by_category);
          setCategories(res.data.categories);
          setSubjectId(res.data.subject_id);
          const tabs = Object.keys(res.data.files_by_category);
          setActiveTab(tabs[0] || (res.data.categories[0]?.name || ''));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!user) { onSignIn(); return; }
    if (!uploadTitle || !uploadCatId) {
      setUploadError('Please fill in the title and select a category.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    const form = new FormData();
    form.append('title', uploadTitle);
    form.append('category_id', uploadCatId);
    form.append('subject_id', subjectId);
    if (uploadFile) {
      form.append('file', uploadFile);
    } else {
      setUploadError('Please select a file to upload.');
      setUploading(false);
      return;
    }

    try {
      const res = await api.post(`/courses/${id}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        }
      });

      if (res.data.success) {
        setUploadSuccess(true);
        setUploadTitle('');
        setUploadCatId('');
        setUploadFile(null);
        setUploadProgress(0);
        // Refresh file list
        const refresh = await api.get(`/courses/${id}`);
        if (refresh.data.success) setFiles(refresh.data.files_by_category);
      } else {
        setUploadError(res.data.message || 'Upload failed.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.message || err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 70 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', animation: 'float 2s ease-in-out infinite', marginBottom: 16 }}>📚</div>
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading course materials…</p>
      </div>
    </div>
  );

  if (!course) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 70, flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: '4rem' }}>😕</div>
      <h2 style={{ color: 'var(--primary)' }}>Course not found</h2>
      <button className="btn-primary" onClick={() => navigate('/courses')}>Back to Courses</button>
    </div>
  );

  const allTabs = categories.map(c => c.name);
  const currentFiles = filesByCategory[activeTab] || [];

  return (
    <div style={{ paddingTop: '70px', minHeight: '100vh' }}>

      {/* ── Course Header ──────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(145deg, #0F0325 0%, #1E0A4E 50%, #3D0B8E 100%)',
        padding: '70px 0 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)', top: -100, left: -100, borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, background: 'radial-gradient(circle, rgba(236,72,153,0.25), transparent 70%)', bottom: -80, right: -80, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div className="page-container" style={{ position: 'relative', zIndex: 2 }}>
          <button
            onClick={() => navigate('/courses')}
            style={{ background: 'rgba(240,171,252,0.1)', border: '1px solid rgba(240,171,252,0.25)', color: 'rgba(255,255,255,0.8)', padding: '8px 16px', borderRadius: 100, fontSize: '0.85rem', fontWeight: 600, marginBottom: 32, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(240,171,252,0.2)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(240,171,252,0.1)'; }}
          >
            ← Back to Courses
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '28px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 4px 20px rgba(240,171,252,0.4))' }}>{course.icon || '📘'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700,
                  background: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)' }}>
                  Sem {course.semester}
                </span>
                <span style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700,
                  background: 'rgba(240,171,252,0.12)', color: '#F0ABFC', border: '1px solid rgba(240,171,252,0.25)' }}>
                  {course.program}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.9rem' }}>{course.code}</span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '16px' }}>
                {course.name}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: '560px', lineHeight: 1.7 }}>
                {course.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Materials Section ──────────────────────────────── */}
      <div className="page-container" style={{ padding: '64px 24px' }}>

        {/* Tabs */}
        <ScrollReveal>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '48px', flexWrap: 'wrap' }}>
            <div className="tabs">
              {allTabs.map(tab => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {CATEGORY_ICONS[tab] || '📁'} {tab}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* File List */}
        <ScrollReveal>
          <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', marginBottom: '64px' }}>
            <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit' }}>
                  {CATEGORY_ICONS[activeTab] || '📁'} {activeTab}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {currentFiles.length} {currentFiles.length === 1 ? 'resource' : 'resources'} available
                </p>
              </div>
            </div>

            {currentFiles.length > 0 ? (
              currentFiles.map((file, i) => (
                <div key={file.id} className="file-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 44, height: 44, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0
                    }}>
                      {CATEGORY_ICONS[file.category] || '📁'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Contributed by <strong>{file.uploader || 'Anonymous'}</strong> · {file.date ? new Date(file.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                  </div>
                  {file.file_url && (
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: 'white', padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
                    >
                      Download
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '80px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '8px' }}>No materials yet</p>
                <p style={{ color: 'var(--text-muted)' }}>Be the first to contribute {activeTab} for this course!</p>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Upload Section */}
        <ScrollReveal>
          <div ref={uploadRef} style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, #FAF5FF 0%, white 100%)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'Outfit', marginBottom: '8px',
                background: 'linear-gradient(135deg,#7C3AED,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                📤 Contribute Materials
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Share your notes, past papers, or slides with the GIKI community.
              </p>
            </div>

            <div style={{ padding: '40px 32px' }}>
              {!user ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔐</div>
                  <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '16px' }}>Sign in to upload materials</p>
                  <button className="btn-primary" onClick={onSignIn}>Sign In with Google</button>
                </div>
              ) : uploadSuccess ? (
                <div style={{ textAlign: 'center', padding: '32px 0', animation: 'scaleIn 0.3s ease' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                  <p style={{ fontWeight: 800, color: '#059669', fontSize: '1.2rem', marginBottom: '8px' }}>Material uploaded!</p>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Your contribution is now live and visible to all students.</p>
                  <button className="btn-primary" onClick={() => setUploadSuccess(false)}>Upload Another</button>
                </div>
              ) : (
                <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 600 }}>
                  {uploadError && (
                    <div style={{ padding: '14px', background: '#FEF2F2', color: '#B91C1C', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: 600, border: '1px solid #FCA5A5' }}>
                      {uploadError}
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS-302 Mid Term 2023"
                      value={uploadTitle}
                      onChange={e => setUploadTitle(e.target.value)}
                      style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.95rem', outline: 'none', background: '#FAF5FF', transition: 'border-color 0.2s' }}
                      onFocus={e => e.target.style.borderColor = '#7C3AED'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      Category *
                    </label>
                    <select
                      required
                      value={uploadCatId}
                      onChange={e => setUploadCatId(e.target.value)}
                      style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.95rem', outline: 'none', background: '#F8FAFC' }}
                    >
                      <option value="">Select material type…</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{CATEGORY_ICONS[c.name] || '📁'} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      File (optional)
                    </label>
                    <div
                      className="upload-zone"
                      onClick={() => document.getElementById('file-input').click()}
                    >
                      {uploadFile ? (
                        <div>
                          <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📄</div>
                          <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{uploadFile.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                            {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>☁️</div>
                          <div style={{ fontWeight: 700, color: 'var(--primary)' }}>Click to upload</div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>PDF, DOCX, PPTX (max 50 MB)</p>
                        </div>
                      )}
                      <input id="file-input" type="file" style={{ display: 'none' }} onChange={e => setUploadFile(e.target.files[0])} />
                    </div>
                  </div>
                  {uploading ? (
                    <div style={{ alignSelf: 'flex-start', width: '100%', maxWidth: '300px', padding: '8px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                        <span>Uploading to secure storage…</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #7C3AED, #EC4899)', transition: 'width 0.2s', borderRadius: '4px' }} />
                      </div>
                    </div>
                  ) : (
                    <button type="submit" className="btn-primary" disabled={uploading} style={{ alignSelf: 'flex-start', opacity: uploading ? 0.7 : 1 }}>
                      Publish Material
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default CoursePage;
