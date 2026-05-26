import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import FileViewer from '../components/FileViewer';
import CopyLinkButton, { useCopyLink } from '../components/CopyLinkButton';

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
  const { copiedId, msg, copyLink } = useCopyLink();
  const uploadRef = useRef(null);

  const [course, setCourse]           = useState(null);
  const [filesByCategory, setFiles]   = useState({});
  const [categories, setCategories]   = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [courseInstructors, setCourseInstructors] = useState([]);
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


  // Upload state — supports both single and bulk
  const [uploadQueue, setUploadQueue]   = useState([]);  // [{file, title, category_id, instructor_id, status, progress, error, file_id}]
  const [sharedCatId, setSharedCatId]   = useState('');
  const [sharedInstructorId, setSharedInstructorId] = useState('');
  const [uploading, setUploading]       = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError]   = useState('');
  const [uploadSummary, setUploadSummary] = useState(null);

  const ALLOWED_EXTS = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'zip', 'png', 'jpg', 'jpeg'];
  const isAdmin = user?.role === 'admin';
  const MAX_FILES = isAdmin ? 1000 : 10;
  const DEFAULT_MAX_MB = isAdmin ? 10000 : 10;
  const REFERENCE_MAX_MB = isAdmin ? 10000 : 50;

  const getCatNameById = (catId) => {
    const c = categories.find(c => String(c.id) === String(catId));
    return c ? c.name : '';
  };

  const getMaxSizeMB = (catId) => {
    const name = getCatNameById(catId);
    return name && name.toLowerCase() === 'reference' ? REFERENCE_MAX_MB : DEFAULT_MAX_MB;
  };

  const addFilesToQueue = (fileList) => {
    const newFiles = Array.from(fileList);
    setUploadError('');

    const current = uploadQueue.length;
    if (current + newFiles.length > MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} files per upload. You already have ${current} queued.`);
      return;
    }

    const validated = [];
    for (const f of newFiles) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        setUploadError(`"${f.name}" — .${ext} files are not allowed.`);
        continue;
      }
      const title = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
      validated.push({
        file: f,
        title,
        category_id: sharedCatId || '',
        instructor_id: sharedInstructorId || '',
        status: 'queued',
        progress: 0,
        error: '',
        file_id: null,
      });
    }
    setUploadQueue(prev => [...prev, ...validated]);
  };

  const removeFromQueue = (idx) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQueueItem = (idx, updates) => {
    setUploadQueue(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  const applySharedMeta = (field, value) => {
    if (field === 'category_id') {
      setSharedCatId(value);
      setUploadQueue(prev => prev.map(item => item.status === 'queued' ? { ...item, category_id: value } : item));
    }
    if (field === 'instructor_id') {
      setSharedInstructorId(value);
      setUploadQueue(prev => prev.map(item => item.status === 'queued' ? { ...item, instructor_id: value } : item));
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
        }
      });
      alert('File updated successfully! ✨');
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed.');
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!user) { onSignIn(); return; }

    const ready = uploadQueue.filter(f => f.status === 'queued');
    const missing = ready.filter(f => !f.category_id || !f.title.trim());
    if (missing.length > 0) {
      setUploadError('All files need a title and category.');
      return;
    }
    if (ready.length === 0) {
      setUploadError('Add at least one file to upload.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSummary(null);

    try {
      // Single file: use the simpler endpoint
      if (ready.length === 1) {
        const f = ready[0];
        const qIdx = uploadQueue.indexOf(f);
        updateQueueItem(qIdx, { status: 'uploading', progress: 0 });

        const form = new FormData();
        form.append('title', f.title);
        form.append('category_id', f.category_id);
        if (f.instructor_id) form.append('instructor_id', f.instructor_id);
        form.append('file', f.file);

        try {
          const res = await api.post(`/courses/${id}/upload`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (evt) => {
              if (evt.lengthComputable) updateQueueItem(qIdx, { progress: Math.round((evt.loaded * 100) / evt.total) });
            }
          });
          if (res.data.success) {
            updateQueueItem(qIdx, { status: 'done', progress: 100, file_id: res.data.file_id });
            setUploadSuccess(true);
            setUploadSummary({ total_uploaded: 1, total_accepted: 1, total_skipped: 0 });
          } else {
            updateQueueItem(qIdx, { status: 'error', error: res.data.message });
            setUploadError(res.data.message);
          }
        } catch (err) {
          const msg = err.response?.data?.message || 'Upload failed';
          updateQueueItem(qIdx, { status: 'error', error: msg });
          setUploadError(msg);
        }

        try { const r = await api.get(`/courses/${id}`); if (r.data.success) setFiles(r.data.files_by_category); } catch {}
        setUploading(false);
        return;
      }

      // Multi-file: bulk pipeline
      const manifest = ready.map(f => ({
        name: f.file.name, size: f.file.size, title: f.title,
        category_id: parseInt(f.category_id),
        instructor_id: f.instructor_id ? parseInt(f.instructor_id) : null,
      }));

      const initRes = await api.post(`/courses/${id}/bulk-upload/init`, { files: manifest });
      if (!initRes.data.success) {
        setUploadError(initRes.data.message || 'Failed to initialize bulk upload.');
        setUploading(false);
        return;
      }

      const { batch_id, accepted, rejected } = initRes.data;

      // Mark rejected
      for (const rej of (rejected || [])) {
        const globalIdx = uploadQueue.indexOf(ready[rej.index]);
        if (globalIdx >= 0) updateQueueItem(globalIdx, { status: 'error', error: rej.reason });
      }

      // Upload each accepted file sequentially
      for (const acc of accepted) {
        const readyFile = ready[acc.index];
        if (!readyFile) continue;
        const globalIdx = uploadQueue.indexOf(readyFile);
        updateQueueItem(globalIdx, { status: 'uploading', progress: 0 });

        const form = new FormData();
        form.append('file', readyFile.file);
        form.append('file_index', acc.index);
        form.append('title', readyFile.title);
        form.append('category_id', readyFile.category_id);
        if (readyFile.instructor_id) form.append('instructor_id', readyFile.instructor_id);

        try {
          const fileRes = await api.post(`/courses/${id}/bulk-upload/${batch_id}/file`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (evt) => {
              if (evt.lengthComputable) updateQueueItem(globalIdx, { progress: Math.round((evt.loaded * 100) / evt.total) });
            }
          });
          if (fileRes.data.success) {
            updateQueueItem(globalIdx, { status: 'done', progress: 100, file_id: fileRes.data.file_id });
          } else {
            updateQueueItem(globalIdx, { status: fileRes.data.skipped ? 'skipped' : 'error', error: fileRes.data.message });
          }
        } catch (err) {
          const msg = err.response?.data?.message || 'Upload failed';
          updateQueueItem(globalIdx, { status: err.response?.data?.skipped ? 'skipped' : 'error', error: msg });
        }
      }

      // Finalize
      try {
        const doneRes = await api.post(`/courses/${id}/bulk-upload/${batch_id}/done`);
        if (doneRes.data.success) { setUploadSummary(doneRes.data.summary); setUploadSuccess(true); }
      } catch {}

      try { const r = await api.get(`/courses/${id}`); if (r.data.success) setFiles(r.data.files_by_category); } catch {}

    } catch (err) {
      console.error('Bulk upload error:', err);
      setUploadError(err.response?.data?.message || 'Bulk upload failed. Please try again.');
    } finally {
      setUploading(false);
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                    {isAdmin && (
                      <button
                        onClick={() => openEditFile(file)}
                        style={{
                          background: 'var(--bg-white)',
                          border: '2px solid var(--text)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}
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
                      textAlign: 'center'
                      }}
                    >
                      {bookmarks.has(file.file_id ?? file.id) ? '✓ Saved' : '+ Bookmark'}
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
                        textAlign: 'center'
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
                  <p style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.2rem', marginBottom: '8px' }}>
                    {uploadSummary && uploadSummary.total_uploaded > 1 ? `${uploadSummary.total_uploaded} files submitted!` : 'Material submitted!'}
                  </p>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Your contribution is pending admin review and will go live once approved.</p>
                  {uploadSummary && uploadSummary.total_skipped > 0 && (
                    <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>⚠️ {uploadSummary.total_skipped} file(s) were skipped (duplicates or errors).</p>
                  )}
                  <button className="btn-primary" onClick={() => { setUploadSuccess(false); setUploadQueue([]); setUploadSummary(null); }}>Upload More</button>
                </div>
              ) : (
                <form onSubmit={handleBulkUpload} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {uploadError && (
                    <div style={{ padding: '14px', background: 'rgba(185,28,28,0.1)', color: 'var(--accent, #B91C1C)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: 600, border: '1px solid rgba(185,28,28,0.3)' }}>
                      {uploadError}
                    </div>
                  )}

                  {/* Drag & Drop Zone */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      Files * <span style={{ fontWeight: 500, textTransform: 'none', color: 'var(--text-muted)' }}>— up to {MAX_FILES} files</span>
                    </label>
                    <div
                      className="upload-zone"
                      onClick={() => document.getElementById('file-input-bulk').click()}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(37,99,235,0.04)'; }}
                      onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
                      onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; addFilesToQueue(e.dataTransfer.files); }}
                      style={{ border: '2px dashed var(--border)', transition: 'all 0.2s', cursor: 'pointer' }}
                      onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div>
                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>☁️</div>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>Drop files here or click to browse</div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                          PDF, DOCX, PPTX, TXT, ZIP, images · {isAdmin ? 'No size limits for Admin' : 'Max 10MB per file (50MB for Reference)'}
                        </p>
                      </div>
                      <input
                        id="file-input-bulk"
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.zip,.png,.jpg,.jpeg"
                        onChange={e => { addFilesToQueue(e.target.files); e.target.value = ''; }}
                      />
                    </div>
                  </div>

                  {/* Shared metadata */}
                  {uploadQueue.length > 0 && (
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                          Category for all *
                        </label>
                        <select
                          value={sharedCatId}
                          onChange={e => applySharedMeta('category_id', e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '2px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-white)' }}
                        >
                          <option value="">Select category…</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{CATEGORY_ICONS[c.name] || '📁'} {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                          Instructor for all
                        </label>
                        <select
                          value={sharedInstructorId}
                          onChange={e => applySharedMeta('instructor_id', e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '2px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-white)' }}
                        >
                          <option value="">None / General</option>
                          {courseInstructors.length > 0 && (
                            <optgroup label={`Teaches ${course.code}`}>
                              {courseInstructors.map(i => <option key={`ci-${i.id}`} value={i.id}>{i.name}</option>)}
                            </optgroup>
                          )}
                          {otherInstructorsGrouped.map(group => (
                            <optgroup key={`group-${group.name}`} label={`${group.name} Instructors`}>
                              {group.list.map(i => <option key={`i-${i.id}`} value={i.id}>{i.name}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* File Queue */}
                  {uploadQueue.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Upload Queue ({uploadQueue.length}/{MAX_FILES})
                      </label>
                      {uploadQueue.map((item, idx) => {
                        const statusIcon = { queued: '⏳', uploading: '⬆️', done: '✅', error: '❌', skipped: '⚠️' }[item.status] || '⏳';
                        const isEditable = item.status === 'queued';
                        const sizeMB = (item.file.size / 1024 / 1024).toFixed(1);
                        const catName = getCatNameById(item.category_id);
                        const maxMB = getMaxSizeMB(item.category_id);
                        const isTooLarge = item.file.size > maxMB * 1024 * 1024;

                        return (
                          <div key={idx} style={{
                            padding: '14px 16px', borderRadius: 'var(--radius-md)',
                            border: `1px solid ${item.status === 'error' ? '#FCA5A5' : item.status === 'done' ? '#86EFAC' : item.status === 'skipped' ? '#FDE68A' : 'var(--border)'}`,
                            background: item.status === 'error' ? 'rgba(239, 68, 68, 0.1)' : item.status === 'done' ? 'rgba(34, 197, 94, 0.1)' : item.status === 'skipped' ? 'rgba(234, 179, 8, 0.1)' : 'var(--bg-white)',
                            transition: 'all 0.2s',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{statusIcon}</span>

                              {/* Title input */}
                              {isEditable ? (
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={e => updateQueueItem(idx, { title: e.target.value })}
                                  placeholder="File title"
                                  style={{ flex: '1 1 180px', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-subtle)', color: 'var(--text)', minWidth: 0 }}
                                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                />
                              ) : (
                                <span style={{ flex: '1 1 180px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.title}
                                </span>
                              )}

                              {/* File size */}
                              <span style={{ fontSize: '0.8rem', color: isTooLarge ? '#DC2626' : 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                                {sizeMB} MB {isTooLarge && `(>${maxMB}MB)`}
                              </span>

                              {/* Per-file category override */}
                              {isEditable && (
                                <select
                                  value={item.category_id}
                                  onChange={e => updateQueueItem(idx, { category_id: e.target.value })}
                                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '0.8rem', outline: 'none', background: 'var(--bg-subtle)', color: 'var(--text)', maxWidth: '140px' }}
                                >
                                  <option value="">Category…</option>
                                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              )}

                              {/* Remove button */}
                              {isEditable && (
                                <button
                                  type="button"
                                  onClick={() => removeFromQueue(idx)}
                                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}
                                  title="Remove from queue"
                                >✕</button>
                              )}
                            </div>

                            {/* Progress bar for uploading */}
                            {item.status === 'uploading' && (
                              <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                                  <span>Uploading…</span>
                                  <span>{item.progress}%</span>
                                </div>
                                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${item.progress}%`, height: '100%', background: 'linear-gradient(90deg, #7C3AED, #EC4899)', transition: 'width 0.2s', borderRadius: '3px' }} />
                                </div>
                              </div>
                            )}

                            {/* Error message */}
                            {item.error && (
                              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: item.status === 'skipped' ? '#92400E' : '#DC2626', fontWeight: 500 }}>
                                {item.error}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Submit */}
                  {uploadQueue.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={uploading || uploadQueue.filter(f => f.status === 'queued').length === 0}
                        style={{ opacity: uploading ? 0.7 : 1, position: 'relative' }}
                      >
                        {uploading ? (
                          <>Uploading {uploadQueue.filter(f => f.status === 'done').length}/{uploadQueue.filter(f => f.status !== 'error').length}…</>
                        ) : (
                          <>Upload {uploadQueue.filter(f => f.status === 'queued').length} file{uploadQueue.filter(f => f.status === 'queued').length !== 1 ? 's' : ''}</>
                        )}
                      </button>
                      {!uploading && (
                        <button
                          type="button"
                          onClick={() => { setUploadQueue([]); setUploadError(''); }}
                          style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.9rem' }}
                        >Clear All</button>
                      )}
                    </div>
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
    {/* Edit File Modal (Admins only) */}
    {editFileModal && (
      <div onClick={() => setEditFileModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '16px', border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)', padding: '32px', width: '100%', maxWidth: '500px' }}>
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
