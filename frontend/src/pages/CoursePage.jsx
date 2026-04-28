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
  const [activeTab, setActiveTab]     = useState('');
  const [loading, setLoading]         = useState(true);
  const [bookmarks, setBookmarks]     = useState([]);

  useEffect(() => {
    if (user) {
      const storageKey = `gh_bookmarks_${user.uid || user.id || user.username}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setBookmarks(saved.map(b => b.id));
    } else {
      setBookmarks([]);
    }
  }, [user]);

  const toggleBookmark = (file) => {
    if (!user) {
      onSignIn();
      return;
    }
    const storageKey = `gh_bookmarks_${user.uid || user.id || user.username}`;
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const exists = saved.find(b => b.id === file.id);
    let updated;
    if (exists) {
      updated = saved.filter(b => b.id !== file.id);
    } else {
      updated = [...saved, {
        id: file.id,
        title: file.title,
        file_url: file.file_url,
        category: file.category,
        file_size: file.file_size ? (file.file_size / (1024 * 1024)).toFixed(2) : null,
        course_id: id,
        course_name: course.name,
        icon: CATEGORY_ICONS[file.category] || '📄'
      }];
    }
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setBookmarks(updated.map(b => b.id));
  };

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
        background: 'var(--bg-hero)',
        padding: '60px 0 60px',
        borderBottom: '2px solid var(--border)',
        position: 'relative'
      }}>
        <div className="page-container" style={{ position: 'relative', zIndex: 2 }}>
          <button
            onClick={() => navigate('/courses')}
            style={{ 
              background: 'white', border: '2px solid var(--border)', color: 'var(--text)', 
              padding: '8px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 700, 
              marginBottom: 32, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '2px 2px 0px var(--border)'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '4px 4px 0px var(--border)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '2px 2px 0px var(--border)'; }}
          >
            ← Back to Courses
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '28px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '4rem', filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.1))' }}>{course.icon || '📘'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 800,
                  background: 'var(--accent)', color: 'var(--text)', border: '2px solid var(--text)' }}>
                  Sem {course.semester}
                </span>
                <span style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 800,
                  background: 'var(--hot-pink)', color: 'white', border: '2px solid var(--text)' }}>
                  {course.program}
                </span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.9rem', padding: '6px 14px', borderRadius: '100px', border: '2px solid var(--border)', background: 'white' }}>{course.code}</span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '16px' }}>
                {course.name}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px', lineHeight: 1.7, fontWeight: 500 }}>
                {course.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Materials Section ──────────────────────────────── */}
      <div className="page-container" style={{ padding: '64px 24px' }}>

        <style>{`
          .course-grid {
            display: grid;
            grid-template-columns: 260px 1fr;
            gap: 48px;
            align-items: start;
          }
          .sidebar-tabs {
            display: flex;
            flex-direction: column;
            gap: 8px;
            position: sticky;
            top: 100px;
          }
          .sidebar-tabs .tab-btn {
            justify-content: flex-start;
            padding: 14px 20px;
            border-radius: var(--radius-md);
            background: transparent;
            border: 2px solid transparent;
            color: var(--text-muted);
            font-weight: 800;
            font-family: inherit;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .sidebar-tabs .tab-btn:hover {
            background: var(--bg-subtle);
            color: var(--text);
          }
          .sidebar-tabs .tab-btn.active {
            background: var(--primary);
            color: white;
            border: 2px solid var(--text);
            box-shadow: 4px 4px 0px var(--text);
            transform: translateY(-2px);
          }
          @media (max-width: 900px) {
            .course-grid { grid-template-columns: 1fr; gap: 32px; }
            .sidebar-tabs { position: relative; top: 0; flex-direction: row; flex-wrap: wrap; }
          }
        `}</style>

        <div className="course-grid">
          {/* Left Sidebar */}
          <div className="sidebar-tabs">
            {allTabs.map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {CATEGORY_ICONS[tab] || '📁'} {tab}
              </button>
            ))}
            <button 
              onClick={() => {
                 setTimeout(() => uploadRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              }}
              style={{
                marginTop: '16px', background: 'var(--hot-pink)', color: 'white', border: '2px solid var(--text)',
                boxShadow: '4px 4px 0px var(--text)', padding: '14px 20px', borderRadius: 'var(--radius-md)',
                fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}
            >
              📤 Upload File
            </button>
          </div>

          {/* Right Content Area */}
          <div>
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
                        {file.file_size && ` · ${(file.file_size / (1024 * 1024)).toFixed(2)} MB`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      onClick={() => toggleBookmark(file)}
                      style={{ 
                        background: 'white', border: '2px solid var(--text)', borderRadius: '8px', 
                        width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: bookmarks.includes(file.id) ? 'inset 2px 2px 4px rgba(0,0,0,0.1)' : '2px 2px 0px var(--text)'
                      }}
                      title={bookmarks.includes(file.id) ? 'Remove from Library' : 'Add to Library'}
                    >
                      {bookmarks.includes(file.id) ? '🔖' : '📑'}
                    </button>
                    {file.file_url && (
                      <button
                        onClick={() => {
                          if (user) {
                            window.open(file.file_url, '_blank');
                          } else {
                            onSignIn();
                          }
                        }}
                        style={{ 
                          background: 'var(--primary)', color: 'white', padding: '8px 18px', 
                          borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, 
                          border: '2px solid var(--text)', boxShadow: '2px 2px 0px var(--text)', 
                          transition: 'all 0.15s', cursor: 'pointer' 
                        }}
                      >
                        Download
                      </button>
                    )}
                  </div>
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
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'Outfit', marginBottom: '8px',
                color: 'var(--text)' }}>
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
                      style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border)', fontSize: '0.95rem', outline: 'none', background: 'white', transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                      onFocus={e => e.target.style.borderColor = 'var(--text)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      Category *
                    </label>
                    <select
                      required
                      value={uploadCatId}
                      onChange={e => setUploadCatId(e.target.value)}
                      style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border)', fontSize: '0.95rem', outline: 'none', background: 'white', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                    >
                      <option value="">Select material type…</option>
                      {categories.filter(c => {
                        const isLabReport = c.name === 'Lab Reports';
                        const isLabCourse = course?.name?.toLowerCase().includes('lab') || course?.code?.toLowerCase().endsWith('l');
                        return !isLabReport || isLabCourse;
                      }).map(c => (
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
        </div> {/* End right content */}
        </div> {/* End course grid */}
      </div>
    </div>
  );
};

export default CoursePage;
