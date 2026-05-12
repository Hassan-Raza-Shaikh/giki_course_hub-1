import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import FileViewer from '../components/FileViewer';

const CATEGORY_ICONS = {
  'Outline':         '📋',
  'Notes':           '📝',
  'Slides':          '📊',
  'Quizzes':         '📝',
  'Assignments':     '📄',
  'Lab Manuals':     '🧪',
  'Lab Tasks':       '⚗️',
  'Reference':       '📚',
};

const CoursePage = ({ user, onSignIn }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const uploadRef = useRef(null);

  const [course, setCourse]           = useState(null);
  const [filesByCategory, setFiles]   = useState({});
  const [categories, setCategories]   = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [courseInstructors, setCourseInstructors] = useState([]);
  const [instructorFilter, setInstructorFilter] = useState('');
  const [activeTab, setActiveTab]     = useState('');
  const [loading, setLoading]         = useState(true);
  const [viewerFile, setViewerFile]   = useState(null);
  const [reportModal, setReportModal] = useState(null); // file being reported
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent]   = useState(false);
  // bookmarks = Set of file_ids the user has bookmarked
  const [bookmarks, setBookmarks] = useState(new Set());

  useEffect(() => {
    if (!user) { setBookmarks(new Set()); return; }
    api.get('/bookmarks')
      .then(res => {
        if (res.data.success) {
          setBookmarks(new Set(res.data.bookmarks.map(b => b.file_id)));
        }
      })
      .catch(() => {});
  }, [user]);

  const toggleBookmark = async (file) => {
    if (!user) { onSignIn(); return; }
    const fileId   = file.file_id ?? file.id;
    const isMarked = bookmarks.has(fileId);
    // Optimistic update
    setBookmarks(prev => {
      const next = new Set(prev);
      isMarked ? next.delete(fileId) : next.add(fileId);
      return next;
    });
    try {
      if (isMarked) {
        await api.delete(`/bookmarks/${fileId}`);
      } else {
        await api.post(`/bookmarks/${fileId}`);
      }
    } catch {
      // Revert on failure
      setBookmarks(prev => {
        const next = new Set(prev);
        isMarked ? next.add(fileId) : next.delete(fileId);
        return next;
      });
    }
  };


  // Upload state
  const [uploadTitle, setUploadTitle]     = useState('');
  const [uploadCatId, setUploadCatId]     = useState('');
  const [uploadInstructorId, setUploadInstructorId] = useState('');
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
          setInstructors(res.data.all_instructors || []);
          setCourseInstructors(res.data.course_instructors || []);
          // Default to Outline for non-lab, Lab Manuals for lab — fall back to first populated tab
          const courseData = res.data.course;
          const preferred = courseData.is_lab ? 'Lab Manuals' : 'Outline';
          const allCatNames = res.data.categories.map(c => c.name);
          const populated = Object.keys(res.data.files_by_category);
          const defaultTab =
            allCatNames.includes(preferred) ? preferred :
            (populated.length > 0 ? populated[0] : (allCatNames[0] || ''));

          setActiveTab(defaultTab);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    api.get('/instructors').then(res => {
      if (res.data.success) setInstructors(res.data.instructors);
    }).catch(console.error);

    api.get(`/courses/${id}/instructors`).then(res => {
      if (res.data.success) setCourseInstructors(res.data.instructors);
    }).catch(console.error);
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
    if (uploadInstructorId) form.append('instructor_id', uploadInstructorId);
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
        setUploadInstructorId('');
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
      setUploadError(err.response?.data?.message || err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Derived data — MUST be above any early returns (Rules of Hooks) ──────
  const allTabs = categories.map(c => c.name);
  const currentFiles = (filesByCategory[activeTab] || []).filter(
    f => !instructorFilter || (instructorFilter === 'general' ? !f.instructor_name : f.instructor_name === instructorFilter)
  );

  // Group instructors by faculty for organized dropdown
  const otherInstructorsGrouped = React.useMemo(() => {
    const grouped = instructors
      .filter(i => !courseInstructors.find(ci => ci.id === i.id))
      .reduce((acc, i) => {
        const fac = i.faculty || 'Other';
        if (!acc[fac]) acc[fac] = [];
        acc[fac].push(i);
        return acc;
      }, {});

    return Object.keys(grouped)
      .sort((a, b) => {
        const faculty = course?.faculty;
        if (faculty && a === faculty) return -1;
        if (faculty && b === faculty) return 1;
        return a.localeCompare(b);
      })
      .map(fac => ({ name: fac, list: grouped[fac] }));
  }, [instructors, courseInstructors, course]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 70 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', animation: 'float 2s ease-in-out infinite', marginBottom: 16 }}>📚</div>
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading course materials…</p>
      </div>
    </div>
  );

  if (!course) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 70, flexDirection: 'column', gap: 20, textAlign: 'center', padding: '0 20px' }}>
      <div style={{ fontSize: '4rem' }}>😕</div>
      <h2 style={{ color: 'var(--primary)', fontWeight: 900 }}>Course not found</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '500px', lineHeight: 1.6 }}>
        We couldn't find the course you're looking for. Please report this issue so the developers can get on it—your reporting helps us improve the app experience!
      </p>
      <button className="btn-primary" onClick={() => navigate('/courses')} style={{ marginTop: '10px' }}>Back to Courses</button>
    </div>
  );

  return (
    <>
    <div style={{ paddingTop: '70px', minHeight: '100vh', overflowX: 'hidden' }}>

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
              background: 'var(--bg-white)', border: '2px solid var(--border)', color: 'var(--text)', 
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
                  background: 'var(--tertiary)', color: 'white', border: '2px solid var(--text)' }}>
                  {course.program}
                </span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.9rem', padding: '6px 14px', borderRadius: '100px', border: '2px solid var(--border)', background: 'var(--bg-white)' }}>{course.code}</span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '16px' }}>
                {course.name}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px', lineHeight: 1.7, fontWeight: 500 }}>
                {course.description}
              </p>
              {courseInstructors.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>INSTRUCTORS:</span>
                  {courseInstructors.map(inst => (
                    <span key={inst.id} style={{ background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid var(--border)' }}>
                      🧑‍🏫 {inst.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Materials Section ──────────────────────────────── */}
      <div className="page-container" style={{ padding: '40px 24px 64px' }}>

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
          .sidebar-container { 
            position: sticky; 
            top: 100px; 
            height: fit-content; 
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
          @media (max-width: 768px) {
            .course-grid { grid-template-columns: 1fr; gap: 0; }
            .sidebar-container {
               position: sticky;
               top: 60px;
               z-index: 100;
               background: var(--bg-hero);
               margin: 0 -16px;
               border-bottom: 2px solid var(--border);
               padding-bottom: 2px;
               overflow: hidden;
            }
            .category-tabs-container {
              margin: 0;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
            }
            .sidebar-tabs { 
              flex-direction: row; 
              overflow-x: auto; 
              padding: 12px 16px;
              background: transparent;
              -webkit-overflow-scrolling: touch;
              scrollbar-width: none;
              min-width: unset;
            }
            .sidebar-tabs::-webkit-scrollbar { display: none; }
            .sidebar-tabs .tab-btn { 
              white-space: nowrap; 
              padding: 10px 18px; 
              font-size: 0.85rem;
            }
            .upload-trigger-btn { display: none !important; }
          }
        `}</style>

        <div className="course-grid">
          {/* Left Sidebar */}
          <div className="sidebar-container">
            <div className="category-tabs-container">
              <div className="category-tabs-wrapper sidebar-tabs">
                {allTabs.map(tab => {
                  const count = (filesByCategory[tab] || []).length;
                  return (
                    <button
                      key={tab}
                      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {CATEGORY_ICONS[tab] || '📁'} {tab}
                      </span>
                      {count > 0 && (
                        <span style={{
                          background: activeTab === tab ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                          color: activeTab === tab ? 'white' : 'var(--text-muted)',
                          padding: '2px 10px',
                          borderRadius: '100px',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          backdropFilter: 'blur(4px)',
                          border: activeTab === tab ? '1px solid rgba(255,255,255,0.4)' : '1px solid var(--border)',
                          fontFamily: 'Outfit',
                          flexShrink: 0
                        }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <button 
              onClick={() => {
                 setTimeout(() => uploadRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              }}
              className="upload-trigger-btn"
              style={{
                marginTop: '24px', background: 'var(--tertiary)', color: 'var(--bg-hero)', border: '2px solid var(--text)',
                boxShadow: '4px 4px 0px var(--text)', padding: '16px 20px', borderRadius: 'var(--radius-md)',
                fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                width: '100%', transition: 'all 0.2s'
              }}
            >
              📤 Upload File
            </button>
          </div>

          {/* Right Content Area */}
          <div>
            <button 
              className="show-mobile-flex"
              onClick={() => {
                 setTimeout(() => uploadRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              }}
              style={{
                width: '100%', background: 'var(--tertiary)', color: 'var(--bg-hero)', border: '2px solid var(--text)',
                boxShadow: '4px 4px 0px var(--text)', padding: '14px 20px', borderRadius: 'var(--radius-md)',
                fontWeight: 900, marginBottom: '24px', justifyContent: 'center', alignItems: 'center', gap: '12px'
              }}
            >
              📤 Upload Resource
            </button>
            
            {/* File List */}
            <ScrollReveal>
          <div style={{ background: 'var(--bg-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', marginBottom: '64px' }}>
            <div style={{ padding: '20px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit' }}>
                  {CATEGORY_ICONS[activeTab] || '📁'} {activeTab}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {currentFiles.length} {currentFiles.length === 1 ? 'resource' : 'resources'} available
                </p>
              </div>
              {courseInstructors.length > 0 && (
                <select
                  value={instructorFilter}
                  onChange={e => setInstructorFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '0.85rem', fontWeight: 700, outline: 'none', background: 'var(--bg-subtle)', cursor: 'pointer' }}
                >
                  <option value="">All Instructors</option>
                  <option value="general">General Material</option>
                  {courseInstructors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                </select>
              )}
            </div>

            {currentFiles.length > 0 ? (
              currentFiles.map((file, i) => (
                <div
                  key={file.id ?? file.file_id}
                  className="file-item responsive-flex"
                  onClick={() => setViewerFile(file)}
                  style={{ cursor: 'pointer', alignItems: 'flex-start' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 44, height: 44, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {CATEGORY_ICONS[file.category] || '📁'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem', wordBreak: 'break-word' }}>
                        {file.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                        Contributed by <strong>{file.uploader || 'Anonymous'}</strong> · {file.date ? new Date(file.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {file.file_size && <span style={{ background: 'var(--bg-white)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>{(file.file_size / (1024 * 1024)).toFixed(2)} MB</span>}
                          {file.instructor_name && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>🧑‍🏫 {file.instructor_name}</span>}
                        </div>
                      </div>
                      {file.admin_note && (
                        <div style={{
                          marginTop: '8px', padding: '7px 12px',
                          background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                          borderRadius: '8px', fontSize: '0.78rem',
                          color: 'var(--text)', lineHeight: 1.5,
                          display: 'flex', gap: '6px', alignItems: 'flex-start'
                        }}>
                          <span style={{ flexShrink: 0 }}>📌</span>
                          <span><strong>Admin note:</strong> {file.admin_note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                    {/* Bookmark button */}
                    <button
                      onClick={() => toggleBookmark(file)}
                      style={{
                        background: bookmarks.has(file.file_id ?? file.id) ? 'var(--accent)' : 'var(--bg-white)',
                        border: '2px solid var(--text)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: 'var(--text)',
                        boxShadow: bookmarks.has(file.file_id ?? file.id) ? 'inset 1px 1px 3px rgba(0,0,0,0.15)' : '2px 2px 0px var(--text)',
                        whiteSpace: 'nowrap',
                        flex: 1, textAlign: 'center'
                      }}
                    >
                      {bookmarks.has(file.file_id ?? file.id) ? '✓ Saved' : '+ Bookmark'}
                    </button>
                    {/* Download */}
                    {file.file_url && (
                      <a
                        href={file.file_url}
                        download={file.title}
                        onClick={() => {
                          if (user) api.post(`/files/${file.file_id ?? file.id}/download`).catch(() => {});
                        }}
                        style={{
                          background: 'var(--primary)', color: 'white',
                          padding: '10px 18px', borderRadius: 8,
                          fontWeight: 700, fontSize: '0.85rem',
                          border: '2px solid var(--text)', boxShadow: '2px 2px 0px var(--text)',
                          textDecoration: 'none', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          flex: 1.5, textAlign: 'center'
                        }}
                      >
                      ⬇ Download
                      </a>
                    )}
                    {/* Flag button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!user) { onSignIn(); return; }
                        setReportModal(file);
                        setReportReason('');
                        setReportSent(false);
                      }}
                      style={{
                        background: 'var(--bg-white)',
                        border: '2px solid var(--text)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: '#DC2626',
                        boxShadow: '2px 2px 0px var(--text)',
                        whiteSpace: 'nowrap',
                        flex: 1, textAlign: 'center'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-white)'; }}
                    >
                      🚩 Flag
                    </button>
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
          <div ref={uploadRef} style={{ background: 'var(--bg-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
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
                      style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border)', fontSize: '0.95rem', outline: 'none', background: 'var(--bg-white)', transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
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
                      style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border)', fontSize: '0.95rem', outline: 'none', background: 'var(--bg-white)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                    >
                      <option value="">Select material type…</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{CATEGORY_ICONS[c.name] || '📁'} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      Instructor (Optional)
                    </label>
                    <select
                      value={uploadInstructorId}
                      onChange={e => setUploadInstructorId(e.target.value)}
                      style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border)', fontSize: '0.95rem', outline: 'none', background: 'var(--bg-white)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                    >
                      <option value="">None / General Material</option>
                      {courseInstructors.length > 0 && (
                        <optgroup label={`Teaches ${course.code}`}>
                          {courseInstructors.map(i => <option key={`ci-${i.id}`} value={i.id}>{i.name}</option>)}
                        </optgroup>
                      )}
                      {otherInstructorsGrouped.map(group => (
                        <optgroup key={`group-${group.name}`} label={`${group.name} Instructors`}>
                          {group.list.map(i => (
                            <option key={`i-${i.id}`} value={i.id}>{i.name}</option>
                          ))}
                        </optgroup>
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
                      <input 
                        id="file-input" 
                        type="file" 
                        style={{ display: 'none' }} 
                        accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.zip,.png,.jpg,.jpeg"
                        onChange={e => {
                          const f = e.target.files[0];
                          if (!f) return;
                          
                          // Check size
                          if (f.size > 50 * 1024 * 1024) {
                            alert("❌ File is too large! Maximum size allowed is 50MB.");
                            e.target.value = '';
                            return;
                          }

                          // Check extension
                          const ext = f.name.split('.').pop().toLowerCase();
                          const allowed = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'zip', 'png', 'jpg', 'jpeg'];
                          if (!allowed.includes(ext)) {
                            alert(`❌ .${ext} files are not allowed. \nPlease upload PDF, DOCX, PPTX, TXT, ZIP, or common images.`);
                            e.target.value = '';
                            return;
                          }

                          setUploadFile(f);
                        }} 
                      />
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

    {/* File Viewer modal */}
    {viewerFile && (
      <FileViewer file={viewerFile} onClose={() => setViewerFile(null)} />
    )}

    {/* Report modal */}
    {reportModal && (
      <div
        onClick={() => setReportModal(null)}
        style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      >
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)', padding: '32px', width: '100%', maxWidth: '460px' }}>
          {reportSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
              <h3 style={{ fontWeight: 800, marginBottom: '8px' }}>Report submitted</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Thank you for helping keep the platform safe. An admin will review it.</p>
              <button onClick={() => setReportModal(null)} style={{ marginTop: '20px', padding: '10px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>
          ) : (
            <>
              <h3 style={{ fontWeight: 800, marginBottom: '6px' }}>🚩 Report File</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '18px' }}>
                Reporting: <strong>{reportModal.title}</strong>
              </p>
              <textarea
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                placeholder="Describe the issue (wrong content, inappropriate material, duplicate…)"
                rows={4}
                style={{ width: '100%', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button onClick={() => setReportModal(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                <button
                  onClick={async () => {
                    if (!reportReason.trim()) return;
                    try {
                      await api.post(`/reports/${reportModal.file_id ?? reportModal.id}`, { reason: reportReason });
                      setReportSent(true);
                    } catch { /* ignore */ }
                  }}
                  disabled={!reportReason.trim()}
                  style={{ padding: '10px 20px', border: '2px solid #DC2626', borderRadius: '8px', background: '#DC2626', color: 'white', cursor: 'pointer', fontWeight: 700, opacity: reportReason.trim() ? 1 : 0.5 }}
                >
                  Submit Report
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    </>
  );
};

export default CoursePage;
