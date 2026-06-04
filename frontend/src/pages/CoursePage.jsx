import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import FileViewer from '../components/FileViewer';
import CopyLinkButton, { useCopyLink } from '../components/CopyLinkButton';
import BulkUploader from '../components/BulkUploader';

const CATEGORY_ICONS = {
  'Outline':         '📋',
  'Notes':           '📝',
  'Slides':          '📊',
  'Quizzes':         '📝',
  'Assignments':     '📄',
  'Past Papers':     '🗂️',
  'Lab Manuals':     '🧪',
  'Lab Tasks':       '⚗️',
  'Lab Reports':     '📋',
  'Reference':       '📚',
};

const CoursePage = ({ user, onSignIn }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { copiedId, msg, copyLink } = useCopyLink();
  const uploadRef = useRef(null);
  const isAdmin = user?.role === 'admin';

  const [course, setCourse]           = useState(null);
  const [filesByCategory, setFiles]   = useState({});
  const [categories, setCategories]   = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [courseInstructors, setCourseInstructors] = useState([]);
  const [fileInstructors, setFileInstructors] = useState([]); // instructors with actual files in this course
  const [instructorFilter, setInstructorFilter] = useState('');
  const [sortBy, setSortBy]           = useState('name-asc');
  const [activeTab, setActiveTab]     = useState('');
  const [loading, setLoading]         = useState(true);
  const [viewerFile, setViewerFile]   = useState(null);
  const [reportModal, setReportModal] = useState(null); // file being reported
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent]   = useState(false);
  // bookmarks = Set of file_ids the user has bookmarked
  const [bookmarks, setBookmarks] = useState(new Set());

  // Admin Edit File state
  const [editFileModal, setEditFileModal] = useState(null);
  const [editFileForm, setEditFileForm] = useState({ title: '', category_id: '', instructor_id: '', course_code: '' });
  const [editCourses, setEditCourses] = useState([]);
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
          setFileInstructors(res.data.file_instructors || []);
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

    // Note: all_instructors and course_instructors are now provided by the main course detail call above.
  }, [id]);

  const openEditFile = (file) => {
    setEditFileModal(file);
    setEditFileForm({
      title: file.title || '',
      category_id: file.category_id || '',
      instructor_id: file.instructor_id || '',
      course_code: file.course_code || course?.code || '',
    });
    if (isAdmin) {
      api.get('/admin/courses/codes').then(r => setEditCourses(r.data.courses || [])).catch(() => {});
      if (instructors.length === 0) {
          api.get('/instructors').then(r => setInstructors(r.data.instructors || [])).catch(() => {});
      }
    }
  };

  const saveEditFile = async () => {
    if (!editFileModal) return;
    try {
      await api.put(`/admin/files/${editFileModal.file_id ?? editFileModal.id}`, editFileForm);
      setEditFileModal(null);
      // Reload current course
      api.get(`/courses/${id}`).then(res => {
        if (res.data.success) {
          setFiles(res.data.files_by_category);
          setCourseInstructors(res.data.course_instructors || []);
          setFileInstructors(res.data.file_instructors || []);
        }
      });
      alert('File updated successfully! ✨');
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed.');
    }
  };



  // ── Derived data — MUST be above any early returns (Rules of Hooks) ──────
  const allTabs = categories.map(c => c.name);
  const currentFiles = React.useMemo(() => {
    const rawFiles = (filesByCategory[activeTab] || []).filter(
      f => !instructorFilter || (instructorFilter === 'general' ? !f.instructor_name : f.instructor_name === instructorFilter)
    );

    return [...rawFiles].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortBy === 'name-desc') {
        return b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortBy === 'date-desc') {
        return new Date(b.date || 0) - new Date(a.date || 0);
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date || 0) - new Date(b.date || 0);
      }
      return 0;
    });
  }, [filesByCategory, activeTab, instructorFilter, sortBy]);

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

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '3.5rem', filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.1))', lineHeight: 1 }}>{course.icon || '📘'}</div>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800,
                  background: 'var(--accent)', color: 'var(--text)', border: '2px solid var(--text)' }}>
                  Sem {course.semester}
                </span>
                <span style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800,
                  background: 'var(--tertiary)', color: 'white', border: '2px solid var(--text)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {course.program}
                </span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.85rem', padding: '4px 12px', borderRadius: '100px', border: '2px solid var(--border)', background: 'var(--bg-white)' }}>{course.code}</span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.8rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '16px' }}>
                {course.name}
              </h1>
              {fileInstructors.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>INSTRUCTORS:</span>
                  {fileInstructors.map(inst => (
                    <span key={inst.id} style={{ background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 600, border: '1px solid var(--border)' }}>
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
          .sidebar-container { 
            position: sticky; 
            top: 100px; 
            height: fit-content; 
            z-index: 10;
          }
          .sidebar-tabs {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-top: 4px; /* Room for active tab transform */
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
               top: 59px;
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
                  const filteredCount = tab === activeTab && instructorFilter
                    ? (filesByCategory[tab] || []).filter(
                        f => instructorFilter === 'general' ? !f.instructor_name : f.instructor_name === instructorFilter
                      ).length
                    : count;
                  return (
                    <button
                      key={tab}
                      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => { setActiveTab(tab); setInstructorFilter(''); }}
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
                          {tab === activeTab && instructorFilter && filteredCount !== count
                            ? `${filteredCount}/${count}`
                            : count}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {fileInstructors.length > 0 && (
                  <select
                    value={instructorFilter}
                    onChange={e => setInstructorFilter(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '0.85rem', fontWeight: 700, outline: 'none', background: 'var(--bg-subtle)', cursor: 'pointer' }}
                  >
                    <option value="">All Instructors</option>
                    <option value="general">General Material</option>
                    {fileInstructors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                  </select>
                )}
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '0.85rem', fontWeight: 700, outline: 'none', background: 'var(--bg-subtle)', cursor: 'pointer' }}
                >
                  <option value="name-asc">🔤 Sort by Name (A-Z)</option>
                  <option value="name-desc">🔤 Sort by Name (Z-A)</option>
                  <option value="date-desc">📅 Sort by Date (Newest)</option>
                  <option value="date-asc">📅 Sort by Date (Oldest)</option>
                </select>
              </div>
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
                      <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem', wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                  <div className="file-actions-row" onClick={e => e.stopPropagation()}>
                    {isAdmin && (
                      <button
                        onClick={() => openEditFile(file)}
                        title="Edit file (Admin only)"
                        style={{
                          background: 'var(--primary)',
                          color: 'var(--bg-hero)',
                          border: '2px solid var(--text)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          boxShadow: '2px 2px 0 var(--text)',
                          transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '3px 3px 0 var(--text)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '2px 2px 0 var(--text)'; }}
                      >
                        ✏️ Edit
                      </button>
                    )}
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
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {bookmarks.has(file.file_id ?? file.id) ? '✓ Saved' : '+ Save'}
                    </button>
                    {/* Copy Link */}
                    <CopyLinkButton
                      id={file.file_id ?? file.id}
                      url={file.file_url}
                      copyLink={copyLink}
                      copiedId={copiedId}
                      msg={msg}
                    />
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
                          padding: '8px 14px', borderRadius: 8,
                          fontWeight: 700, fontSize: '0.82rem',
                          border: '2px solid var(--text)', boxShadow: '2px 2px 0px var(--text)',
                          textDecoration: 'none', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
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
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                Share your notes, past papers, or slides with the GIKI community. {isAdmin ? 'Admin bulk upload unlocked (up to 1,000 files).' : 'You can upload up to 10 files at once.'}
              </p>
            </div>

            <div style={{ padding: '28px 24px' }}>
              <BulkUploader 
                user={user}
                onSignIn={onSignIn}
                categories={categories}
                instructors={instructors}
                courseInstructors={courseInstructors}
                fixedCourseId={course.id}
                fixedCourseCode={course.code}
                onUploadComplete={() => {
                  api.get(`/courses/${id}`).then(res => {
                    if (res.data.success) {
                      setFiles(res.data.files_by_category);
                      setCourseInstructors(res.data.course_instructors || []);
                      setFileInstructors(res.data.file_instructors || []);
                    }
                  }).catch(() => {});
                }}
              />
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
    {/* Edit File Modal (Admins only) */}
    {editFileModal && (
      <div onClick={() => setEditFileModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '16px', border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90dvh', overflowY: 'auto' }}>
          <h3 style={{ fontWeight: 900, marginBottom: '12px' }}>✏️ Edit File Details</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>File Title</label>
            <input 
              type="text" 
              value={editFileForm.title} 
              onChange={e => setEditFileForm({ ...editFileForm, title: e.target.value })}
              style={{ width: '100%', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Category</label>
            <select 
              value={editFileForm.category_id}
              onChange={e => setEditFileForm({ ...editFileForm, category_id: e.target.value })}
              style={{ width: '100%', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            >
              <option value="">Select Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Instructor (Optional)</label>
            <select 
              value={editFileForm.instructor_id}
              onChange={e => setEditFileForm({ ...editFileForm, instructor_id: e.target.value })}
              style={{ width: '100%', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            >
              <option value="">None / General</option>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Move to Course</label>
            <input
              type="text"
              list="edit-course-list"
              value={editFileForm.course_code}
              onChange={e => setEditFileForm({ ...editFileForm, course_code: e.target.value.toUpperCase() })}
              placeholder={`Current: ${editFileModal?.course_code || course?.code || '—'}`}
              style={{ width: '100%', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box', background: 'var(--bg-white)', color: 'var(--text)' }}
            />
            <datalist id="edit-course-list">
              {editCourses.map(c => (
                <option key={c.code} value={c.code}>{c.icon} {c.code} — {c.name}</option>
              ))}
            </datalist>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Type or select a course code. Leave blank to keep current.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setEditFileModal(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
            <button onClick={saveEditFile} style={{ padding: '10px 20px', border: '2px solid var(--primary)', background: 'var(--primary)', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, boxShadow: '3px 3px 0 var(--text)' }}>Save Changes</button>
          </div>
        </div>
      </div>
    )}

    {reportModal && (
      <div
        onClick={() => setReportModal(null)}
        style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      >
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)', padding: '28px', width: '100%', maxWidth: '460px', maxHeight: '90dvh', overflowY: 'auto' }}>
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
                <button onClick={() => setReportModal(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
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
