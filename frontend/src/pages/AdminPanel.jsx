import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

/* ── tiny helpers ──────────────────────────────────────────────────── */
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtSize = (b) => b ? `${(b / (1024 * 1024)).toFixed(2)} MB` : '—';

const STATUS_COLORS = {
  approved: { bg: '#D1FAE5', color: '#065F46' },
  pending:  { bg: '#FEF3C7', color: '#92400E' },
  rejected: { bg: '#FEE2E2', color: '#991B1B' },
  resolved: { bg: '#DBEAFE', color: '#1E40AF' },
  dismissed: { bg: '#F3F4F6', color: '#374151' },
};

const ACTION_ICONS = {
  approve_file:  '✅', reject_file: '❌', delete_file: '🗑️',
  grant_admin:   '🛡️', revoke_admin: '🚫',
  create_course: '📚', update_course: '✏️', delete_course: '🗑️',
  resolve_report: '🏁', dismiss_report: '💤'
};

/* ── main component ─────────────────────────────────────────────────── */
const AdminPanel = ({ user }) => {
  const navigate = useNavigate();
  const [isAdmin,  setIsAdmin]  = useState(null);   // null = checking
  const [tab,      setTab]      = useState('pending');
  const [stats,    setStats]    = useState(null);
  const [detailedStats, setDetailedStats] = useState(null);
  
  const [pending,  setPending]  = useState([]);
  const [selectedPending, setSelectedPending] = useState(new Set());
  
  const [reports,  setReports]  = useState([]);
  const [reportCounts, setReportCounts] = useState({});

  const [issues,   setIssues]   = useState([]);
  const [issueCounts, setIssueCounts] = useState({});
  
  const [courses,  setCourses]  = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [instructorForm, setInstructorForm] = useState({ name: '', faculty_name: '' });
  const [courseSearch, setCourseSearch] = useState('');
  const [faculties, setFaculties] = useState([]);
  const [programs,  setPrograms]  = useState([]);
  
  const [allFiles, setAllFiles] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [admins,   setAdmins]   = useState([]);
  const [logs,     setLogs]     = useState([]);
  
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);

  // Course Form
  const [courseForm, setCourseForm] = useState({
    name: '', code: '', description: '', year: '', semester: '', 
    is_lab: false, icon: '📘', faculty_id: '', program_id: ''
  });
  const [editingCourse, setEditingCourse] = useState(null);
  const [isExistingCode, setIsExistingCode] = useState(false);

  // Admin management form
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminNotes, setNewAdminNotes] = useState('');

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Resolve Content Flag modal
  const [resolveModal, setResolveModal] = useState(null); // full report object
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveDeleteFile, setResolveDeleteFile] = useState(false);
  const [resolveLeaveNote, setResolveLeaveNote] = useState('');

  // Resolve Platform Issue modal
  const [issueResolveModal, setIssueResolveModal] = useState(null); // full issue object
  const [issueResolveNotes, setIssueResolveNotes] = useState('');

  // Note modal (for All Files tab)
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText] = useState('');

  // Edit file modal
  const [editFileModal, setEditFileModal] = useState(null); // full file object
  const [editFileForm, setEditFileForm] = useState({ title: '', category_id: '', instructor_id: '' });

  // Generic confirm modal (replaces window.confirm)
  // shape: { title, body, onConfirm, danger? }
  const [confirmModal, setConfirmModal] = useState(null);

  // File list filter
  const [fileFilter, setFileFilter] = useState('');

  const showToast = (msg, type = 'success') => {
    let finalMsg = msg;
    if (type === 'error') {
      finalMsg = `${msg} Please report this issue so the developers can get on it—your reporting helps us improve the app experience!`;
    }
    setToast({ msg: finalMsg, type: type });
    setTimeout(() => setToast(null), type === 'error' ? 6000 : 3500);
  };

  /* ── auth check ── */
  useEffect(() => {
    api.get('/admin/check').then(res => {
      setIsAdmin(res.data.is_admin);
      if (!res.data.is_admin) navigate('/');
    }).catch(() => navigate('/'));
  }, [navigate]);

  /* ── load stats ── */
  const loadStats = useCallback(() => {
    api.get('/admin/stats').then(r => setStats(r.data.stats)).catch(() => {});
    // Eagerly fetch counts for tab labels so they show immediately
    api.get('/admin/reports').then(r => setReportCounts(r.data.counts || {})).catch(() => {});
    api.get('/admin/issues').then(r => setIssueCounts(r.data.counts || {})).catch(() => {});
  }, []);

  /* ── load per-tab data ── */
  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
    setLoading(true);
    const loaders = {
      pending: () => api.get('/admin/files/pending').then(r => setPending(r.data.files || [])),
      reports: () => api.get('/admin/reports').then(r => { setReports(r.data.reports || []); setReportCounts(r.data.counts || {}); }),
      issues:  () => api.get('/admin/issues').then(r => { setIssues(r.data.issues || []); setIssueCounts(r.data.counts || {}); }),
      courses: () => api.get('/admin/courses').then(r => setCourses(r.data.courses || [])),
      instructors: () => api.get('/instructors').then(r => setInstructors(r.data.instructors || [])),
      stats_detailed: () => api.get('/admin/stats/detailed').then(r => setDetailedStats(r.data)),
      files:   () => api.get('/admin/files/all').then(r => setAllFiles(r.data.files || [])),
      users:   () => api.get('/admin/users').then(r => setUsers(r.data.users || [])),
      admins:  () => api.get('/admin/admins').then(r => setAdmins(r.data.admins || [])),
      logs:    () => api.get('/admin/logs').then(r => setLogs(r.data.logs || [])),
    };
    const loader = loaders[tab];
    if (loader) loader().catch(() => {}).finally(() => setLoading(false));
    else setLoading(false);
  }, [tab, isAdmin, loadStats]);
  
  /* ── course code autofill ── */
  useEffect(() => {
    // Only autofill when adding a NEW course, and code is long enough
    if (tab !== 'courses' || editingCourse || !courseForm.code || courseForm.code.length < 3) {
      if (isExistingCode) setIsExistingCode(false);
      return;
    }

    const timer = setTimeout(() => {
      api.get(`/admin/courses/by-code/${courseForm.code}`)
        .then(res => {
          if (res.data.success && res.data.course) {
            const c = res.data.course;
            setIsExistingCode(true);
            setCourseForm(prev => ({
              ...prev,
              name: c.name,
              description: c.description || '',
              icon: c.icon || prev.icon,
              is_lab: c.is_lab || false
            }));
            showToast(`Course ${courseForm.code.toUpperCase()} exists. Details autofilled!`, 'success');
          } else {
            setIsExistingCode(false);
          }
        })
        .catch(() => setIsExistingCode(false));
    }, 600);

    return () => clearTimeout(timer);
  }, [courseForm.code, tab, editingCourse]);

  // Sync icon when faculty changes (only if not editing/autofilled)
  useEffect(() => {
    if (editingCourse || isExistingCode || !courseForm.faculty_id) return;
    const fac = faculties.find(f => f.id == courseForm.faculty_id);
    if (fac && fac.icon) {
      setCourseForm(prev => ({ ...prev, icon: fac.icon }));
    }
  }, [courseForm.faculty_id, faculties, editingCourse, isExistingCode]);

  // Load faculty/program metadata if on courses tab
  useEffect(() => {
    if ((tab === 'courses' || tab === 'instructors' || tab === 'pending' || tab === 'files') && isAdmin) {
      api.get('/admin/faculties-programs').then(r => {
        setFaculties(r.data.faculties || []);
        setPrograms(r.data.programs || []);
        setCategories(r.data.categories || []);
      });
    }
  }, [tab, isAdmin]);

  /* ── actions: Files ── */
  const approve = async (id) => {
    await api.post(`/admin/files/${id}/approve`);
    showToast('File approved ✅');
    setPending(p => p.filter(f => f.file_id !== id));
    loadStats();
  };

  const bulkApprove = async () => {
    const ids = Array.from(selectedPending);
    if (!ids.length) return;
    await api.post('/admin/files/bulk-approve', { file_ids: ids });
    showToast(`${ids.length} files approved ✅`);
    setPending(p => p.filter(f => !selectedPending.has(f.file_id)));
    setSelectedPending(new Set());
    loadStats();
  };

  const openReject = (file) => {
    setRejectTarget(file);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (rejectTarget.file_id === '__bulk__') {
      await api.post('/admin/files/bulk-reject', { file_ids: Array.from(selectedPending), reason: rejectReason || 'No reason provided.' });
      showToast('Files rejected ❌');
      setPending(p => p.filter(f => !selectedPending.has(f.file_id)));
      setSelectedPending(new Set());
    } else {
      await api.post(`/admin/files/${rejectTarget.file_id}/reject`, { reason: rejectReason || 'No reason provided.' });
      showToast('File rejected ❌');
      setPending(p => p.filter(f => f.file_id !== rejectTarget.file_id));
    }
    setRejectTarget(null);
    loadStats();
  };

  const deleteFile = async (id, title) => {
    setConfirmModal({
      title: '🗑 Delete File',
      body: `Permanently delete "${title}"? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        await api.delete(`/admin/files/${id}`);
        showToast('File deleted 🗑️');
        setAllFiles(f => f.filter(x => x.file_id !== id));
        loadStats();
        setConfirmModal(null);
      }
    });
  };

  const openEditFile = (file) => {
    setEditFileModal(file);
    setEditFileForm({
      title: file.title || '',
      category_id: file.category_id || '',
      instructor_id: file.instructor_id || ''
    });
  };

  const saveEditFile = async () => {
    if (!editFileModal) return;
    try {
      await api.put(`/admin/files/${editFileModal.file_id}`, editFileForm);
      showToast('File details updated ✨');
      setEditFileModal(null);
      // Refresh current tab data
      if (tab === 'pending') {
        api.get('/admin/files/pending').then(r => setPending(r.data.files || []));
      } else if (tab === 'files') {
        api.get('/admin/files/all').then(r => setAllFiles(r.data.files || []));
      }
      loadStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed.', 'error');
    }
  };

  /* ── actions: Reports ── */
  const openResolveModal = (report) => {
    setResolveModal(report);
    setResolveNotes('');
    setResolveDeleteFile(false);
    setResolveLeaveNote('');
  };

  const confirmResolveReport = async () => {
    if (!resolveModal) return;
    await api.post(`/admin/reports/${resolveModal.report_id}/resolve`, { notes: resolveNotes });
    if (resolveDeleteFile) {
      await api.delete(`/admin/files/${resolveModal.file_id}`);
    }
    if (resolveLeaveNote.trim()) {
      await api.post(`/admin/files/${resolveModal.file_id}/note`, { note: resolveLeaveNote });
    }
    const msg = [
      'Report resolved 🏁',
      resolveDeleteFile && 'file deleted 🗑️',
      resolveLeaveNote.trim() && 'note left 📌',
    ].filter(Boolean).join(' · ');
    showToast(msg);
    setReports(r => r.filter(x => x.report_id !== resolveModal.report_id));
    setResolveModal(null);
  };

  const dismissReport = async (id) => {
    await api.post(`/admin/reports/${id}/dismiss`);
    showToast('Report dismissed 💤');
    setReports(r => r.filter(x => x.report_id !== id));
  };

  /* ── actions: File Notes ── */
  const openNoteModal = (file) => {
    setNoteModal(file);
    setNoteText(file.note_text || file.admin_note || '');
  };

  const saveNote = async () => {
    if (!noteModal || !noteText.trim()) return;
    await api.post(`/admin/files/${noteModal.file_id ?? noteModal.id}/note`, { note: noteText });
    showToast('Note saved 📝');
    setAllFiles(fs => fs.map(f =>
      (f.file_id === (noteModal.file_id ?? noteModal.id))
        ? { ...f, admin_note: noteText } : f
    ));
    setNoteModal(null);
  };

  const deleteNote = async () => {
    if (!noteModal) return;
    await api.delete(`/admin/files/${noteModal.file_id ?? noteModal.id}/note`);
    showToast('Note removed 🗑️');
    setAllFiles(fs => fs.map(f =>
      (f.file_id === (noteModal.file_id ?? noteModal.id))
        ? { ...f, admin_note: null } : f
    ));
    setNoteModal(null);
  };

  /* ── actions: Issues ── */
  const openIssueResolveModal = (issue) => {
    setIssueResolveModal(issue);
    setIssueResolveNotes('');
  };

  const confirmResolveIssue = async () => {
    if (!issueResolveModal) return;
    await api.post(`/admin/issues/${issueResolveModal.issue_id}/resolve`, { notes: issueResolveNotes });
    showToast('Issue resolved ✅');
    setIssues(i => i.filter(x => x.issue_id !== issueResolveModal.issue_id));
    setIssueResolveModal(null);
    setIssueResolveNotes('');
  };

  const deleteIssue = async (id, title) => {
    setConfirmModal({
      title: '🗑 Delete Issue Report',
      body: `Permanently delete the report "${title}"?`,
      danger: true,
      onConfirm: async () => {
        await api.delete(`/admin/issues/${id}`);
        showToast('Issue deleted 🗑️');
        setIssues(i => i.filter(x => x.issue_id !== id));
        setConfirmModal(null);
      }
    });
  };

  /* ── actions: Courses ── */
  const saveCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await api.put(`/admin/courses/${editingCourse.course_id}`, courseForm);
        showToast('Course updated ✏️');
      } else {
        await api.post('/admin/courses', courseForm);
        showToast('Course created 📚');
      }
      setCourseForm({ name: '', code: '', description: '', year: '', semester: '', is_lab: false, icon: '📘', faculty_id: '', program_id: '' });
      setEditingCourse(null);
      api.get('/admin/courses').then(r => setCourses(r.data.courses || []));
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving course', 'error');
    }
  };

  const deleteCourse = async (id, name) => {
    setConfirmModal({
      title: '🗑 Delete Course',
      body: `Delete course "${name}" and all associated metadata? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        await api.delete(`/admin/courses/${id}`);
        showToast('Course deleted 🗑️');
        setCourses(c => c.filter(x => x.course_id !== id));
        setConfirmModal(null);
      }
    });
  };

  const editCourse = (c) => {
    setEditingCourse(c);
    setCourseForm({
      name: c.name || '', code: c.code || '', description: c.description || '',
      year: c.year || '', semester: c.semester || '', is_lab: !!c.is_lab,
      icon: c.icon || '📘', faculty_id: c.faculty_id || '', program_id: c.program_id || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveInstructor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/instructors', instructorForm);
      showToast('Instructor added 🧑‍🏫');
      setInstructorForm({ name: '', faculty_name: '' });
      api.get('/instructors').then(r => setInstructors(r.data.instructors || []));
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving instructor', 'error');
    }
  };

  const grantAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    const res = await api.post('/admin/admins', { email: newAdminEmail, notes: newAdminNotes });
    if (res.data.success) {
      showToast(`Admin granted to ${newAdminEmail} 🛡️`);
      setNewAdminEmail(''); setNewAdminNotes('');
      api.get('/admin/admins').then(r => setAdmins(r.data.admins || []));
      loadStats();
    }
  };

  const revokeAdmin = async (email) => {
    setConfirmModal({
      title: '🚫 Revoke Admin',
      body: `Remove admin privileges from ${email}? They will lose access to this panel immediately.`,
      danger: true,
      onConfirm: async () => {
        await api.delete(`/admin/admins/${email}`);
        showToast(`Admin revoked from ${email} 🚫`);
        setAdmins(a => a.filter(x => x.email !== email));
        loadStats();
        setConfirmModal(null);
      }
    });
  };

  /* ── loading / access guard ── */
  if (isAdmin === null) return (
    <div style={{ paddingTop: '120px', textAlign: 'center', color: 'var(--text-muted)' }}>
      Checking admin access…
    </div>
  );

  const TABS = [
    { key: 'pending', label: `⏳ Pending (${stats?.pending_files ?? '…'})` },
    { key: 'reports', label: `🚩 Content Flags (${reportCounts.pending ?? 0})` },
    { key: 'issues',  label: `🛠️ Platform Issues (${issueCounts.open ?? 0})` },
    { key: 'courses', label: '📚 Courses' },
    { key: 'instructors', label: '🧑‍🏫 Instructors' },
    { key: 'stats_detailed', label: '📈 Stats' },
    { key: 'files',   label: '📁 All Files' },
    { key: 'users',   label: `👥 Users (${stats?.total_users ?? '…'})` },
    { key: 'admins',  label: `🛡️ Admins (${stats?.total_admins ?? '…'})` },
    { key: 'logs',    label: '📋 Activity' },
  ];

  const filteredAll = allFiles.filter(f =>
    !fileFilter ||
    f.title?.toLowerCase().includes(fileFilter.toLowerCase()) ||
    f.course_code?.toLowerCase().includes(fileFilter.toLowerCase())
  );


  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--bg-subtle)' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
          background: toast.type === 'error' ? '#FEE2E2' : '#D1FAE5',
          color: toast.type === 'error' ? '#991B1B' : '#065F46',
          padding: '14px 22px', borderRadius: '12px',
          border: '2px solid currentColor', fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '4px 4px 0 rgba(0,0,0,0.15)',
          animation: 'fadeSlideUp 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div onClick={() => setRejectTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)', padding: '32px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '8px' }}>Reject File</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Rejecting: <strong>{rejectTarget.title}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              rows={4}
              style={{ width: '100%', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectTarget(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmReject} style={{ padding: '10px 20px', border: '2px solid #DC2626', borderRadius: '8px', background: '#DC2626', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Content Flag modal */}
      {resolveModal && (
        <div onClick={() => setResolveModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '16px', border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)', padding: '32px', width: '100%', maxWidth: '540px' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '6px' }}>🏁 Resolve Content Flag</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Flagged file: <strong>{resolveModal.file_title}</strong>
            </p>

            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Resolution Notes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(internal, not shown to users)</span></label>
            <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)}
              placeholder="What action was taken? e.g. 'Content verified — no issue found'"
              rows={3} style={{ width: '100%', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '16px' }}
            />

            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>📌 Leave a note on this file <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(visible to all users)</span></label>
            <textarea value={resolveLeaveNote} onChange={e => setResolveLeaveNote(e.target.value)}
              placeholder="Optional: e.g. 'Question 3 contains an error — please ignore it.'"
              rows={3} style={{ width: '100%', border: '2px solid #FCD34D', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: '#FFFBEB', marginBottom: '16px' }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, color: '#DC2626' }}>
              <input type="checkbox" checked={resolveDeleteFile} onChange={e => setResolveDeleteFile(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              Also permanently delete the flagged file
            </label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setResolveModal(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmResolveReport} style={{ padding: '10px 20px', border: '2px solid #10B981', borderRadius: '8px', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700 }}>✅ Confirm Resolve</button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Issue Resolve modal */}
      {issueResolveModal && (
        <div onClick={() => setIssueResolveModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '16px', border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '6px' }}>✅ Resolve Platform Issue</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.9rem' }}>
              <strong>{issueResolveModal.title}</strong>
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.8rem' }}>
              Reported by {issueResolveModal.reporter} · {issueResolveModal.type}
            </p>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Resolution notes</label>
            <textarea value={issueResolveNotes} onChange={e => setIssueResolveNotes(e.target.value)}
              placeholder="e.g. 'Fixed in latest deploy — search button now works on mobile.'"
              rows={4} style={{ width: '100%', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIssueResolveModal(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmResolveIssue} style={{ padding: '10px 20px', border: '2px solid #10B981', borderRadius: '8px', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700 }}>✅ Mark Resolved</button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirm modal */}
      {confirmModal && (
        <div onClick={() => setConfirmModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '16px', border: `2px solid ${confirmModal.danger ? '#DC2626' : 'var(--text)'}`, boxShadow: `6px 6px 0 ${confirmModal.danger ? '#DC2626' : 'var(--text)'}`, padding: '32px', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '12px' }}>{confirmModal.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>{confirmModal.body}</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmModal.onConfirm} style={{ padding: '10px 20px', border: `2px solid ${confirmModal.danger ? '#DC2626' : '#10B981'}`, borderRadius: '8px', background: confirmModal.danger ? '#DC2626' : '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit File Modal */}
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
                {faculties.length > 0 && categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                {/* Fallback if categories not loaded yet (categories usually fetched per course, but admin gets global list or from some tab) */}
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

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditFileModal(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={saveEditFile} style={{ padding: '10px 20px', border: '2px solid var(--text)', background: 'var(--text)', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* File Note modal */}
      {noteModal && (
        <div onClick={() => setNoteModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '16px', border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '6px' }}>📌 Admin Note</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              File: <strong>{noteModal.title}</strong><br/>
              <span style={{ fontSize: '0.8rem' }}>This note will appear on the file card for all users.</span>
            </p>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. 'Question 3 in this assignment contains an error — ignore it.'"
              rows={5} style={{ width: '100%', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'space-between' }}>
              <div>
                {noteModal.admin_note && (
                  <button onClick={deleteNote} style={{ padding: '10px 16px', border: '2px solid #EF4444', borderRadius: '8px', background: 'var(--bg-white)', color: '#EF4444', cursor: 'pointer', fontWeight: 700 }}>🗑 Remove Note</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setNoteModal(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                <button onClick={saveNote} disabled={!noteText.trim()} style={{ padding: '10px 20px', border: '2px solid #F59E0B', borderRadius: '8px', background: '#F59E0B', color: 'white', cursor: 'pointer', fontWeight: 700, opacity: noteText.trim() ? 1 : 0.5 }}>Save Note</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="page-container">
        {/* Header */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 950, letterSpacing: '-0.03em', fontFamily: 'Outfit' }}>
              🛡️ Admin <span className="gradient-text">Panel</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>Command center for GIKI Hub.</p>
          </div>
          <button onClick={loadStats} style={{ background: 'var(--bg-white)', border: '2px solid var(--text)', padding: '8px 12px', borderRadius: '10px', boxShadow: '3px 3px 0 var(--text)', cursor: 'pointer' }}>
            🔄
          </button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {[
              { label: 'Pending',   value: stats.pending_files,  emoji: '⏳', accent: '#F59E0B', key: 'pending' },
              { label: 'Flags',     value: reportCounts.pending ?? 0, emoji: '🚩', accent: '#DC2626', key: 'reports' },
              { label: 'Issues',    value: issueCounts.open ?? 0, emoji: '🛠️', accent: '#6366F1', key: 'issues' },
              { label: 'Admins',    value: stats.total_admins,   emoji: '🛡️', accent: '#8B5CF6', key: 'admins' },
            ].map(s => (
              <div 
                key={s.label} 
                onClick={() => setTab(s.key)}
                style={{ 
                  background: 'var(--bg-white)', border: `2px solid var(--text)`, 
                  borderRadius: '14px', padding: '20px', textAlign: 'center',
                  boxShadow: `4px 4px 0px ${s.accent}`, cursor: 'pointer',
                  transition: 'transform 0.1s'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{s.emoji}</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 950, color: 'var(--text)', fontFamily: 'Outfit' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="scroll-x" style={{ marginBottom: '24px', paddingBottom: '12px' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedPending(new Set()); }}
              style={{
                padding: '10px 18px', borderRadius: '100px',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                border: '2px solid var(--text)',
                background: tab === t.key ? 'var(--text)' : 'var(--bg-white)',
                color: tab === t.key ? 'var(--bg-hero)' : 'var(--text)',
                boxShadow: tab === t.key ? 'none' : '2px 2px 0 var(--text)',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Pending tab (with Bulk Actions) ── */}
        {tab === 'pending' && (
          <div>
            {pending.length > 0 && (
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-white)', padding: '12px 20px', borderRadius: '12px', border: '2px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedPending.size} selected</span>
                  <button 
                    onClick={() => {
                      if (selectedPending.size === pending.length) setSelectedPending(new Set());
                      else setSelectedPending(new Set(pending.map(f => f.file_id)));
                    }}
                    style={{ background: 'none', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {selectedPending.size === pending.length ? 'Deselect' : 'Select All'}
                  </button>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    disabled={!selectedPending.size} 
                    onClick={bulkApprove}
                    style={{ ...btnStyle('#10B981'), opacity: selectedPending.size ? 1 : 0.5, flex: 1 }}
                  >
                    ✅ Bulk Approve
                  </button>
                  <button
                    disabled={!selectedPending.size}
                    onClick={() => {
                      setRejectTarget({ file_id: '__bulk__', title: `${selectedPending.size} selected file(s)` });
                      setRejectReason('');
                    }}
                    style={{ ...btnStyle('#EF4444'), opacity: selectedPending.size ? 1 : 0.5, flex: 1 }}
                  >
                    ❌ Bulk Reject
                  </button>
                </div>
              </div>
            )}
            <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
              {loading ? <LoadingRow /> : pending.length === 0 ? (
                <EmptyRow icon="🎉" msg="No files pending review — all caught up!" />
              ) : pending.map(f => (
                <div key={f.file_id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: selectedPending.has(f.file_id) ? '#F9FAFB' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedPending.has(f.file_id)}
                      onChange={() => {
                        const next = new Set(selectedPending);
                        if (next.has(f.file_id)) next.delete(f.file_id);
                        else next.add(f.file_id);
                        setSelectedPending(next);
                      }}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>{f.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {f.course_code} · {f.category}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    by <strong>{f.uploader || f.uploader_email}</strong> · {fmtDate(f.upload_date)}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a href={f.file_url} target="_blank" rel="noreferrer" style={{ ...btnStyle('#6366F1'), flex: 1, textAlign: 'center' }}>👁 Preview</a>
                    <button onClick={() => openEditFile(f)} style={{ ...btnStyle('var(--text)'), flex: 1 }}>✏️ Edit</button>
                    <button onClick={() => approve(f.file_id)} style={{ ...btnStyle('var(--electric)'), flex: 1 }}>✅ Approve</button>
                    <button onClick={() => openReject(f)} style={{ ...btnStyle('#EF4444'), flex: 1 }}>❌ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Reports tab ── */}
        {tab === 'reports' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
            {loading ? <LoadingRow /> : reports.length === 0 ? (
              <EmptyRow icon="🛡️" msg="No active reports. The platform is clean!" />
            ) : reports.map(r => (
              <div key={r.report_id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ color: '#DC2626', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Flagged: {r.file_title} ({r.course_code})
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>Reason: "{r.reason}"</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Reported by <strong>{r.reporter}</strong> ({r.reporter_email}) · {fmtDate(r.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={r.file_url} target="_blank" rel="noreferrer" style={{ ...btnStyle('var(--primary)'), flex: 1, textAlign: 'center' }}>👁 View File</a>
                  <button onClick={() => openResolveModal(r)} style={{ ...btnStyle('var(--electric)'), flex: 1 }}>🏁 Resolve</button>
                  <button onClick={() => dismissReport(r.report_id)} style={{ ...btnStyle('#9CA3AF'), flex: 1 }}>💤 Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Issues tab ── */}
        {tab === 'issues' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
            {loading ? <LoadingRow /> : issues.length === 0 ? (
              <EmptyRow icon="✨" msg="No open issues reported. Everything is running smoothly!" />
            ) : issues.map(i => (
              <div key={i.issue_id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 900, background: '#EDE9FE', color: '#5B21B6', textTransform: 'uppercase' }}>
                      {i.type}
                    </span>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 900, ...STATUS_COLORS[i.status], textTransform: 'uppercase' }}>
                      {i.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '6px' }}>{i.title}</div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{i.description}</p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Reported by <strong>{i.reporter}</strong> ({i.reporter_email}) · {fmtDate(i.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => openIssueResolveModal(i)} style={{ ...btnStyle('#10B981'), flex: 1 }}>✅ Mark Resolved</button>
                  <button onClick={() => deleteIssue(i.issue_id, i.title)} style={{ ...btnStyle('#EF4444'), flex: 1 }}>🗑 Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Courses tab ── */}
        {tab === 'courses' && (
          <div>
            {/* Course Form */}
            <form onSubmit={saveCourse} style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--text)', padding: '28px', marginBottom: '32px', boxShadow: '6px 6px 0 var(--border)' }}>
              <h3 style={{ fontWeight: 950, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Outfit' }}>
                {editingCourse ? '✏️ Edit Course' : '📚 Add New Course'}
                {editingCourse && <button type="button" onClick={() => { setEditingCourse(null); setCourseForm({ name: '', code: '', description: '', year: '', semester: '', is_lab: false, icon: '📘', faculty_id: '', program_id: '' }); }} style={{ marginLeft: 'auto', fontSize: '0.8rem', background: 'none', border: '2px solid var(--border)', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}>Cancel</button>}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Course Name * {isExistingCode && <span style={{ color: 'var(--primary)', textTransform: 'none', marginLeft: '5px', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px' }}>🔗 (Shared)</span>}
                  </label>
                  <input 
                    value={courseForm.name} 
                    onChange={e => setCourseForm({...courseForm, name: e.target.value})} 
                    placeholder="Object Oriented Programming" 
                    required 
                    readOnly={isExistingCode}
                    style={{ ...inputStyle, background: isExistingCode ? '#F3F4F6' : 'white', cursor: isExistingCode ? 'not-allowed' : 'text' }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Course Code *</label>
                  <input value={courseForm.code} onChange={e => setCourseForm({...courseForm, code: e.target.value})} placeholder="CS112" required style={inputStyle} />
                </div>
                {/* Icon field removed as per request - automated based on faculty */}
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Year</label>
                  <input type="number" value={courseForm.year} onChange={e => setCourseForm({...courseForm, year: e.target.value})} placeholder="1" style={inputStyle} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Semester</label>
                  <input type="number" value={courseForm.semester} onChange={e => setCourseForm({...courseForm, semester: e.target.value})} placeholder="2" style={inputStyle} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Faculty</label>
                  <select value={courseForm.faculty_id} onChange={e => setCourseForm({...courseForm, faculty_id: e.target.value})} style={inputStyle}>
                    <option value="">Select Faculty</option>
                    {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Program</label>
                  <select value={courseForm.program_id} onChange={e => setCourseForm({...courseForm, program_id: e.target.value})} style={inputStyle}>
                    <option value="">Select Program</option>
                    {programs.filter(p => !courseForm.faculty_id || p.faculty_id == courseForm.faculty_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
                  <input type="checkbox" checked={courseForm.is_lab} onChange={e => setCourseForm({...courseForm, is_lab: e.target.checked})} id="is_lab" style={{ width: '20px', height: '20px' }} />
                  <label htmlFor="is_lab" style={{ fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>Lab Course</label>
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Description</label>
                <textarea 
                  value={courseForm.description} 
                  onChange={e => setCourseForm({...courseForm, description: e.target.value})} 
                  placeholder="Brief course overview…" 
                  rows={3} 
                  readOnly={isExistingCode}
                  style={{ ...inputStyle, background: isExistingCode ? '#F3F4F6' : 'white', cursor: isExistingCode ? 'not-allowed' : 'text' }} 
                />
              </div>
              <button type="submit" style={{ ...btnStyle('var(--primary)'), width: '100%', marginTop: '24px', padding: '16px', fontSize: '1rem', boxShadow: '4px 4px 0 var(--text)' }}>
                {editingCourse ? 'Update Course Details' : 'Create Course'}
              </button>
            </form>

            {/* Course List */}
            <div style={{ marginBottom: '16px' }}>
              <input value={courseSearch} onChange={e => setCourseSearch(e.target.value)} placeholder="Search courses by name or code…" style={inputStyle} />
            </div>
            <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
              {loading ? <LoadingRow /> : courses.filter(c => !courseSearch || c.name.toLowerCase().includes(courseSearch.toLowerCase()) || c.code.toLowerCase().includes(courseSearch.toLowerCase())).map(c => (
                <div key={c.course_id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.5rem' }}>{c.icon || '📘'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{c.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({c.code})</span></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.faculty_name} · {c.program_name} · Year {c.year} Sem {c.semester} {c.is_lab && '· 🔬 Lab'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => editCourse(c)} style={btnStyle('#6366F1')}>Edit</button>
                    <button onClick={() => deleteCourse(c.course_id, c.name)} style={btnStyle('#EF4444')}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Instructors tab ── */}
        {tab === 'instructors' && (
          <div>
            <form onSubmit={saveInstructor} style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', padding: '28px', marginBottom: '32px' }}>
              <h3 style={{ fontWeight: 900, marginBottom: '20px' }}>🧑‍🏫 Add New Instructor</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '6px' }}>Full Name *</label>
                  <input value={instructorForm.name} onChange={e => setInstructorForm({...instructorForm, name: e.target.value})} placeholder="e.g. Dr. Ali" required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '6px' }}>Faculty *</label>
                  <select 
                    value={instructorForm.faculty_name} 
                    onChange={e => setInstructorForm({...instructorForm, faculty_name: e.target.value})} 
                    required
                    style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-white)' }}
                  >
                    <option value="">Select Faculty</option>
                    {faculties.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, width: '100%', padding: '14px', marginTop: '24px', cursor: 'pointer' }}>
                Create Instructor
              </button>
            </form>

            <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
              {loading ? <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div> : instructors.map(i => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{i.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i.faculty || 'General Faculty'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Detailed Stats tab ── */}
        {tab === 'stats_detailed' && detailedStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>🔥 Most Downloaded</h3>
              {detailedStats.most_downloaded.map((f, i) => (
                <div key={f.file_id} style={statRowStyle}>
                  <span style={statBadgeStyle}>{i+1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.course_code}</div>
                  </div>
                  <div style={{ fontWeight: 900, color: 'var(--primary)' }}>{f.count} ⬇</div>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>💎 Most Bookmarked</h3>
              {detailedStats.most_bookmarked.map((f, i) => (
                <div key={f.file_id} style={statRowStyle}>
                  <span style={statBadgeStyle}>{i+1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.course_code}</div>
                  </div>
                  <div style={{ fontWeight: 900, color: '#EC4899' }}>{f.count} 🔖</div>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>📂 Top Courses (by Files)</h3>
              {detailedStats.per_course.map((c, i) => (
                <div key={c.course_code} style={statRowStyle}>
                  <div style={{ flex: 1, fontWeight: 700 }}>{c.course_code}</div>
                  <div style={{ fontWeight: 900 }}>{c.count} files</div>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>📊 Content Breakdown</h3>
              {detailedStats.per_category.map((c) => (
                <div key={c.category} style={statRowStyle}>
                  <div style={{ flex: 1, fontWeight: 700 }}>{c.category}</div>
                  <div style={{ fontWeight: 900, color: 'var(--text-muted)' }}>{c.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── All Files tab ── */}
        {tab === 'files' && (
          <div>
            <input
              value={fileFilter}
              onChange={e => setFileFilter(e.target.value)}
              placeholder="Filter by title or course code…"
              style={{ width: '100%', maxWidth: '400px', padding: '10px 16px', border: '2px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
              {loading ? <LoadingRow /> : filteredAll.length === 0 ? <EmptyRow icon="📂" msg="No files found." /> : filteredAll.map(f => (
                <div key={f.file_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{f.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {f.course_code} · {f.category} · {fmtSize(f.file_size)} · {fmtDate(f.upload_date)}
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, ...STATUS_COLORS[f.status] }}>
                    {f.status}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a href={f.file_url} target="_blank" rel="noreferrer" style={btnStyle('#6366F1')}>👁 View</a>
                    <button onClick={() => openEditFile(f)} style={btnStyle('var(--text)')}>✏️ Edit</button>
                    <button onClick={() => openNoteModal(f)} style={{ ...btnStyle(f.admin_note ? '#D97706' : '#9CA3AF') }}>📌 {f.admin_note ? 'Edit Note' : 'Add Note'}</button>
                    <button onClick={() => deleteFile(f.file_id, f.title)} style={btnStyle('#EF4444')}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Users tab ── */}
        {tab === 'users' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
            {loading ? <LoadingRow /> : users.length === 0 ? <EmptyRow icon="👥" msg="No users yet." /> : users.map(u => (
              <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                  {(u.username || u.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{u.username} {u.is_admin && <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#EDE9FE', color: '#5B21B6', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>🛡️ admin</span>}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email} · joined {fmtDate(u.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Admins tab ── */}
        {tab === 'admins' && (
          <div>
            <form onSubmit={grantAdmin} style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>🛡️ Grant Admin Access</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} type="email" placeholder="user@example.com" required style={{ flex: 2, minWidth: '200px', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }} />
                <input value={newAdminNotes} onChange={e => setNewAdminNotes(e.target.value)} placeholder="Role / notes (optional)" style={{ flex: 3, minWidth: '160px', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }} />
                <button type="submit" style={btnStyle('#6366F1')}>Grant</button>
              </div>
            </form>
            <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
              {loading ? <LoadingRow /> : admins.length === 0 ? <EmptyRow icon="🛡️" msg="No admins configured yet." /> : admins.map(a => (
                <div key={a.email} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{a.email}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{a.notes || 'No role specified'} · granted by <strong>{a.granted_by}</strong> · {fmtDate(a.granted_at)}</div>
                  </div>
                  <button onClick={() => revokeAdmin(a.email)} style={btnStyle('#EF4444')}>Revoke</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Activity Log tab ── */}
        {tab === 'logs' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
            {loading ? <LoadingRow /> : logs.length === 0 ? <EmptyRow icon="📋" msg="No admin activity yet." /> : logs.map(l => (
              <div key={l.log_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{ACTION_ICONS[l.action] || '•'}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700 }}>{l.admin_email}</span>
                  <span style={{ color: 'var(--text-muted)' }}> · {l.action.replace(/_/g, ' ')}</span>
                  {l.target_desc && <span style={{ color: 'var(--text-muted)' }}> → <strong>{l.target_desc}</strong></span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>{fmtDate(l.performed_at)}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: '80px' }} />

      </div>
    </div>
  );
};

/* ── shared micro-components ─────────────────────────────────────────── */
const LoadingRow = () => (
  <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
);
const EmptyRow = ({ icon, msg }) => (
  <div style={{ padding: '60px', textAlign: 'center' }}>
    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{icon}</div>
    <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{msg}</p>
  </div>
);

const btnStyle = (bg) => ({
  background: bg, 
  color: (bg === 'var(--electric)' || bg === 'var(--primary)' || bg === 'var(--tertiary)' || bg === 'var(--text)') ? 'var(--bg-hero)' : 'white', 
  border: `2px solid ${bg}`,
  borderRadius: '8px', padding: '7px 14px', fontWeight: 700,
  fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap',
});

const inputStyle = {
  width: '100%', padding: '12px 14px', border: '2px solid var(--border)',
  borderRadius: '10px', fontSize: '0.9rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  background: 'var(--bg-white)', color: 'var(--text)'
};

const cardStyle = {
  background: 'var(--bg-white)', padding: '24px', borderRadius: '16px',
  border: '2px solid var(--border)', boxShadow: '4px 4px 0 var(--border)'
};

const cardTitleStyle = { 
  fontSize: '1.1rem', fontWeight: 900, marginBottom: '20px', 
  paddingBottom: '12px', borderBottom: '1px solid var(--border)' 
};

const statRowStyle = { 
  display: 'flex', alignItems: 'center', gap: '12px', 
  padding: '12px 0', borderBottom: '1px solid var(--border)' 
};

const statBadgeStyle = { 
  width: '24px', height: '24px', borderRadius: '50%', 
  background: 'var(--bg-subtle)', display: 'flex', 
  alignItems: 'center', justifyContent: 'center', 
  fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' 
};

export default AdminPanel;
