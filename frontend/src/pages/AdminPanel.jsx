import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, XCircle, Trash2, Shield, Ban, BookOpen, Edit3, Flag, Play, Clock, Wrench, RefreshCw, Sparkles, Activity, Flame, Info, Users, Bookmark, Gem, Folder, Pin, Plus, PieChart, GraduationCap, Link, FlaskConical, Archive, PartyPopper, BarChart3, Eye, Download } from 'lucide-react';
import IconMapper from '../components/IconMapper';


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
  approve_file:  <CheckCircle size={18} strokeWidth={1.5} />, reject_file: <XCircle size={18} strokeWidth={1.5} />, delete_file: <Trash2 size={18} strokeWidth={1.5} />,
  grant_admin:   <Shield size={18} strokeWidth={1.5} />, revoke_admin: <Ban size={18} strokeWidth={1.5} />,
  create_course: <BookOpen size={18} strokeWidth={1.5} />, update_course: <Edit3 size={18} strokeWidth={1.5} />, delete_course: <Trash2 size={18} strokeWidth={1.5} />,
  resolve_report: <Flag size={18} strokeWidth={1.5} />, dismiss_report: <Play size={18} strokeWidth={1.5} />
};

/* ── main component ─────────────────────────────────────────────────── */
const AdminPanel = ({ user }) => {
  const navigate = useNavigate();
  const [isAdmin,  setIsAdmin]  = useState(null);   // null = checking
  const [tab,      setTab]      = useState('pending');
  const [stats,    setStats]    = useState(null);
  const [detailedStats, setDetailedStats] = useState(null);
  
  // Pagination pages for detailed stats
  const [pageDL, setPageDL] = useState(1);
  const [pageBM, setPageBM] = useState(1);
  const [pageC,  setPageC]  = useState(1);
  const STATS_PER_PAGE = 10;
  
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
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesTotalPages, setCoursesTotalPages] = useState(1);
  const [coursesTotalCount, setCoursesTotalCount] = useState(0);
  const [faculties, setFaculties] = useState([]);
  const [programs,  setPrograms]  = useState([]);
  const [categories, setCategories] = useState([]);
  const [editCourses, setEditCourses] = useState([]); // flat list for the edit modal picker
  
  const [allFiles, setAllFiles] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  
  const [issuesPage, setIssuesPage] = useState(1);
  const [issuesTotalPages, setIssuesTotalPages] = useState(1);
  const [admins,   setAdmins]   = useState([]);
  const [logs,     setLogs]     = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  

  const [courseLinks, setCourseLinks] = useState([]);
  const [courseLinkForm, setCourseLinkForm] = useState({ course_code_1: '', course_code_2: '' });
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);

  // Course Form
  const [courseForm, setCourseForm] = useState({
    name: '', code: '', year: '', semester: '', 
    is_lab: false, icon: '', faculty_id: '', program_id: ''
  });
  const [editingCourse, setEditingCourse] = useState(null);
  const [isExistingCode, setIsExistingCode] = useState(false);
  const [existingProgramIds, setExistingProgramIds] = useState([]); // programs that already have this code
  const [bulkCourseMode, setBulkCourseMode] = useState(false);   // add to multiple programs at once
  const [selectedPrograms, setSelectedPrograms] = useState([]);   // program_ids for bulk mode
  const courseListRef = React.useRef(null);

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

  // Cross-link file modal
  const [linkModal, setLinkModal] = useState(null);
  const [linkForm, setLinkForm] = useState({ course_id: '', category_id: '', custom_title: '' });
  const [existingLinks, setExistingLinks] = useState([]);

  // Generic confirm modal (replaces window.confirm)
  // shape: { title, body, onConfirm, danger? }
  const [confirmModal, setConfirmModal] = useState(null);

  // File list filter + pagination
  const [fileFilter, setFileFilter] = useState('');
  const [filesPage, setFilesPage] = useState(1);
  const [filesTotalPages, setFilesTotalPages] = useState(1);
  const [filesTotalCount, setFilesTotalCount] = useState(0);
  const [filesStatusFilter, setFilesStatusFilter] = useState('');
  const [filesCategoryFilter, setFilesCategoryFilter] = useState('');

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
    if (tab !== 'links' || !isAdmin) return;
    setLoading(true);
    api.get('/admin/course-links').then(r => {
      setCourseLinks(r.data.links || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tab, isAdmin]);

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
      issues:  () => api.get('/admin/issues', { params: { page: issuesPage } }).then(r => { setIssues(r.data.issues || []); setIssueCounts(r.data.counts || {}); setIssuesTotalPages(r.data.pages || 1); }),
      courses: () => api.get('/admin/courses', { params: { page: coursesPage, q: courseSearch } }).then(r => {
        setCourses(r.data.courses || []);
        setCoursesTotalPages(r.data.pages || 1);
        setCoursesTotalCount(r.data.total || 0);
      }),
      instructors: () => api.get('/instructors').then(r => setInstructors(r.data.instructors || [])),
      stats_detailed: () => api.get('/admin/stats/detailed').then(r => setDetailedStats(r.data)),
      files: () => api.get('/admin/files/all', { params: { page: filesPage, status: filesStatusFilter, category: filesCategoryFilter } }).then(r => {
        setAllFiles(r.data.files || []);
        setFilesTotalPages(r.data.pages || 1);
        setFilesTotalCount(r.data.total || 0);
      }),
      users:   () => api.get('/admin/users', { params: { page: usersPage } }).then(r => { setUsers(r.data.users || []); setUsersTotalPages(r.data.pages || 1); }),
      admins:  () => api.get('/admin/admins').then(r => setAdmins(r.data.admins || [])),
      logs:    () => api.get('/admin/logs', { params: { page: logsPage } }).then(r => { setLogs(r.data.logs || []); setLogsTotalPages(r.data.pages || 1); }),
    };
    const loader = loaders[tab];
    if (loader) loader().catch(() => {}).finally(() => setLoading(false));
    else setLoading(false);
  }, [tab, isAdmin, loadStats]);

  // Re-fetch users when page changes
  useEffect(() => {
    if (tab !== 'users' || !isAdmin) return;
    setLoading(true);
    api.get('/admin/users', { params: { page: usersPage } })
      .then(r => {
        setUsers(r.data.users || []);
        setUsersTotalPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [usersPage, tab, isAdmin]);

  // Re-fetch logs when page changes
  useEffect(() => {
    if (tab !== 'logs' || !isAdmin) return;
    setLoading(true);
    api.get('/admin/logs', { params: { page: logsPage } })
      .then(r => {
        setLogs(r.data.logs || []);
        setLogsTotalPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [logsPage, tab, isAdmin]);

  // Re-fetch issues when page changes
  useEffect(() => {
    if (tab !== 'issues' || !isAdmin) return;
    setLoading(true);
    api.get('/admin/issues', { params: { page: issuesPage } })
      .then(r => {
        setIssues(r.data.issues || []);
        setIssueCounts(r.data.counts || {});
        setIssuesTotalPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [issuesPage, tab, isAdmin]);

  // Re-fetch files when page or status filter changes
  useEffect(() => {
    if (tab !== 'files' || !isAdmin) return;
    setLoading(true);
    api.get('/admin/files/all', { params: { page: filesPage, status: filesStatusFilter, category: filesCategoryFilter } })
      .then(r => {
        setAllFiles(r.data.files || []);
        setFilesTotalPages(r.data.pages || 1);
        setFilesTotalCount(r.data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filesPage, filesStatusFilter, filesCategoryFilter]);
  // Re-fetch courses when page or search changes
  useEffect(() => {
    if (tab !== 'courses' || !isAdmin) return;
    const timer = setTimeout(() => {
      setLoading(true);
      api.get('/admin/courses', { params: { page: coursesPage, q: courseSearch } })
        .then(r => {
          setCourses(r.data.courses || []);
          setCoursesTotalPages(r.data.pages || 1);
          setCoursesTotalCount(r.data.total || 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, courseSearch ? 400 : 0); // debounce search
    return () => clearTimeout(timer);
  }, [coursesPage, courseSearch]);


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
            setExistingProgramIds(res.data.existing_program_ids || []);
            setCourseForm(prev => ({
              ...prev,
              name:        c.name,
              icon:        c.icon || prev.icon,
              is_lab:      c.is_lab || false,
              year:        c.year     != null ? String(c.year)     : prev.year,
              semester:    c.semester != null ? String(c.semester) : prev.semester,
            }));
            const n = res.data.existing_count || 0;
            showToast(`${courseForm.code.toUpperCase()} already exists in ${n} program${n !== 1 ? 's' : ''} — details autofilled!`, 'success');
          } else {
            setIsExistingCode(false);
            setExistingProgramIds([]);
          }
        })
        .catch(() => { setIsExistingCode(false); setExistingProgramIds([]); });
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
    showToast('File approved');
    setPending(p => p.filter(f => f.file_id !== id));
    loadStats();
  };

  const bulkApprove = async () => {
    const ids = Array.from(selectedPending);
    if (!ids.length) return;
    await api.post('/admin/files/bulk-approve', { file_ids: ids });
    showToast(`${ids.length} files approved`);
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
      showToast('Files rejected');
      setPending(p => p.filter(f => !selectedPending.has(f.file_id)));
      setSelectedPending(new Set());
    } else {
      await api.post(`/admin/files/${rejectTarget.file_id}/reject`, { reason: rejectReason || 'No reason provided.' });
      showToast('File rejected');
      setPending(p => p.filter(f => f.file_id !== rejectTarget.file_id));
    }
    setRejectTarget(null);
    loadStats();
  };

  const deleteFile = async (id, title) => {
    setConfirmModal({
      title: <><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete File</>,
      body: `Permanently delete "${title}"? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        await api.delete(`/admin/files/${id}`);
        showToast('File deleted');
        // Refresh current page with current filters
        api.get('/admin/files/all', { params: { page: filesPage, status: filesStatusFilter, category: filesCategoryFilter } })
          .then(r => {
            setAllFiles(r.data.files || []);
            setFilesTotalPages(r.data.pages || 1);
            setFilesTotalCount(r.data.total || 0);
          });
        loadStats();
        setReports(rs => rs.filter(r => r.file_id !== id));
        setConfirmModal(null);
      }
    });
  };

  const openEditFile = (file) => {
    setEditFileModal(file);
    setEditFileForm({
      title: file.title || '',
      category_id: file.category_id || '',
      instructor_id: file.instructor_id || '',
      course_code: file.course_code || '',
    });
    // Load all course codes for the course picker (use dedicated unpaginated endpoint)
    api.get('/admin/courses/codes').then(r => setEditCourses(r.data.courses || [])).catch(() => {});
    // Load instructors (only fetched normally on the instructors tab, so always refresh here)
    api.get('/instructors').then(r => setInstructors(r.data.instructors || [])).catch(() => {});
  };

  const saveEditFile = async () => {
    if (!editFileModal) return;
    try {
      await api.put(`/admin/files/${editFileModal.file_id}`, editFileForm);
      showToast('File details updated');
      setEditFileModal(null);
      // Refresh current tab data
      if (tab === 'pending') {
        api.get('/admin/files/pending').then(r => setPending(r.data.files || []));
      } else if (tab === 'files') {
        api.get('/admin/files/all', { params: { page: filesPage, status: filesStatusFilter, category: filesCategoryFilter } })
          .then(r => {
            setAllFiles(r.data.files || []);
            setFilesTotalPages(r.data.pages || 1);
            setFilesTotalCount(r.data.total || 0);
          });
      }
      setReports(rs => rs.map(r => r.file_id === editFileModal.file_id ? { ...r, file_title: editFileForm.title, course_code: editFileForm.course_code } : r));
      loadStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed.', 'error');
    }
  };

  /* ── actions: File Links ── */
  const openLinkModal = async (file) => {
    setLinkModal(file);
    setLinkForm({ course_id: '', category_id: '', custom_title: file.title });
    setExistingLinks([]);
    
    api.get('/admin/courses/codes').then(r => setEditCourses(r.data.courses || [])).catch(() => {});
    
    try {
      const res = await api.get(`/files/${file.file_id}/links`);
      setExistingLinks(res.data.links || []);
    } catch (err) {
      console.error("Failed to load existing links", err);
    }
  };

  const submitLink = async () => {
    if (!linkForm.course_id || !linkForm.category_id) {
      return showToast('Course and Category are required.', 'error');
    }
    try {
      const res = await api.post(`/files/${linkModal.file_id}/links`, linkForm);
      showToast(res.data.message || 'File linked successfully!');
      // refresh existing links
      const linksRes = await api.get(`/files/${linkModal.file_id}/links`);
      setExistingLinks(linksRes.data.links || []);
      setLinkForm({ course_id: '', category_id: '', custom_title: linkModal.title });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to link file.', 'error');
    }
  };

  const removeLink = async (courseId) => {
    try {
      await api.delete(`/files/${linkModal.file_id}/links/${courseId}`);
      showToast('Link removed.');
      setExistingLinks(existingLinks.filter(l => l.course_id !== courseId));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove link.', 'error');
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
      'Report resolved',
      resolveDeleteFile && 'file deleted',
      resolveLeaveNote.trim() && 'note left',
    ].filter(Boolean).join(' · ');
    showToast(msg);
    setReports(r => r.filter(x => x.report_id !== resolveModal.report_id));
    setResolveModal(null);
  };

  const dismissReport = async (id) => {
    await api.post(`/admin/reports/${id}/dismiss`);
    showToast('Report dismissed');
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
    showToast('Note saved');
    setAllFiles(fs => fs.map(f =>
      (f.file_id === (noteModal.file_id ?? noteModal.id))
        ? { ...f, admin_note: noteText } : f
    ));
    setReports(rs => rs.map(r => 
      r.file_id === (noteModal.file_id ?? noteModal.id) ? { ...r, file_admin_note: noteText } : r
    ));
    setNoteModal(null);
  };

  const deleteNote = async () => {
    if (!noteModal) return;
    await api.delete(`/admin/files/${noteModal.file_id ?? noteModal.id}/note`);
    showToast('Note removed');
    setAllFiles(fs => fs.map(f =>
      (f.file_id === (noteModal.file_id ?? noteModal.id))
        ? { ...f, admin_note: null } : f
    ));
    setReports(rs => rs.map(r => 
      r.file_id === (noteModal.file_id ?? noteModal.id) ? { ...r, file_admin_note: null } : r
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
    showToast('Issue resolved');
    setIssues(i => i.filter(x => x.issue_id !== issueResolveModal.issue_id));
    setIssueResolveModal(null);
    setIssueResolveNotes('');
  };

  const deleteIssue = async (id, title) => {
    setConfirmModal({
      title: <><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete Issue Report</>,
      body: `Permanently delete the report "${title}"?`,
      danger: true,
      onConfirm: async () => {
        await api.delete(`/admin/issues/${id}`);
        showToast('Issue deleted');
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
        showToast('Course updated');
      } else if (bulkCourseMode) {
        if (selectedPrograms.length === 0) { showToast('Select at least one program.', 'error'); return; }
        const r = await api.post('/admin/courses/bulk', { ...courseForm, program_ids: selectedPrograms });
        showToast(r.data.message || `Created for ${selectedPrograms.length} program(s)`);
        setSelectedPrograms([]);
      } else {
        await api.post('/admin/courses', courseForm);
        showToast('Course created');
      }
      setCourseForm({ name: '', code: '', year: '', semester: '', is_lab: false, icon: '', faculty_id: '', program_id: '' });
      setEditingCourse(null);
      setIsExistingCode(false);
      setExistingProgramIds([]);
      // Refresh list then scroll to it
      api.get('/admin/courses', { params: { page: coursesPage, q: courseSearch } }).then(r => {
        setCourses(r.data.courses || []);
        setCoursesTotalPages(r.data.pages || 1);
        setCoursesTotalCount(r.data.total || 0);
        setTimeout(() => courseListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving course', 'error');
    }
  };

  const deleteCourse = async (id, name) => {
    setConfirmModal({
      title: <><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete Course</>,
      body: `Permanently delete "${name}" and ALL its uploaded files (PDFs, slides, etc.) from storage? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        await api.delete(`/admin/courses/${id}`);
        showToast('Course deleted');
        // Refresh current page
        api.get('/admin/courses', { params: { page: coursesPage, q: courseSearch } }).then(r => {
          setCourses(r.data.courses || []);
          setCoursesTotalPages(r.data.pages || 1);
          setCoursesTotalCount(r.data.total || 0);
        });
        setConfirmModal(null);
      }
    });
  };

  const editCourse = (c) => {
    setEditingCourse(c);
    setCourseForm({
      name: c.name || '', code: c.code || '',
      year: c.year || '', semester: c.semester || '', is_lab: !!c.is_lab,
      icon: c.icon || '📘', faculty_id: c.faculty_id || '', program_id: c.program_id || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveInstructor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/instructors', instructorForm);
      showToast('Instructor added');
      setInstructorForm({ name: '', faculty_name: '' });
      api.get('/instructors').then(r => setInstructors(r.data.instructors || []));
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving instructor', 'error');
    }
  };


  const saveCourseLink = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/course-links', courseLinkForm);
      showToast('Course link added');
      setCourseLinkForm({ course_code_1: '', course_code_2: '' });
      api.get('/admin/course-links').then(r => setCourseLinks(r.data.links || []));
    } catch (err) {
      showToast(err.response?.data?.message || 'Error adding course link', 'error');
    }
  };

  const deleteCourseLink = async (link_id) => {
    try {
      await api.delete(`/admin/course-links/${link_id}`);
      showToast('Course link removed');
      setCourseLinks(l => l.filter(x => x.link_id !== link_id));
    } catch (err) {
      showToast('Error removing course link', 'error');
    }
  };

  const grantAdmin = async (e) => {

    e.preventDefault();
    if (!newAdminEmail) return;
    const res = await api.post('/admin/admins', { email: newAdminEmail, notes: newAdminNotes });
    if (res.data.success) {
      showToast(`Admin granted to ${newAdminEmail}`);
      setNewAdminEmail(''); setNewAdminNotes('');
      api.get('/admin/admins').then(r => setAdmins(r.data.admins || []));
      loadStats();
    }
  };

  const revokeAdmin = async (email) => {
    setConfirmModal({
      title: 'Revoke Admin',
      body: `Remove admin privileges from ${email}? They will lose access to this panel immediately.`,
      danger: true,
      onConfirm: async () => {
        await api.delete(`/admin/admins/${email}`);
        showToast(`Admin revoked from ${email}`);
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
    { key: 'pending', label: <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Clock size={16} /> Pending ({stats?.pending_files ?? '…'})</div> },
    { key: 'reports', label: <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Flag size={16} /> Content Flags ({reportCounts.pending ?? 0})</div> },
    { key: 'issues',  label: <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Wrench size={16} /> Platform Issues ({issueCounts.open ?? 0})</div> },
    
    { key: 'courses', label: <><BookOpen size={16} /> Courses</> },
    { key: 'links',   label: <><Link size={16} /> Shared Links</> },

    { key: 'instructors', label: <><GraduationCap size={16} /> Instructors</> },
    { key: 'stats_detailed', label: <><BarChart3 size={16} /> Stats</> },
    { key: 'files',   label: <><Folder size={16} /> All Files</> },
    { key: 'users',   label: <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Users size={16} /> Users ({stats?.total_users ?? '…'})</div> },
    { key: 'admins',  label: <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Shield size={16} /> Admins ({stats?.total_admins ?? '…'})</div> },
    { key: 'logs',    label: <><Activity size={16} /> Activity</> },
  ];

  const filteredAll = allFiles.filter(f =>
    !fileFilter ||
    f.title?.toLowerCase().includes(fileFilter.toLowerCase()) ||
    f.course_code?.toLowerCase().includes(fileFilter.toLowerCase())
  );


  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--bg-hero)' }}>
      <div className="page-container" style={{ maxWidth: '1400px' }}>

      {/* Toast */}
      {toast && (
        <div className="admin-toast" style={{
          background: toast.type === 'error' ? '#FEE2E2' : '#D1FAE5',
          color: toast.type === 'error' ? '#991B1B' : '#065F46',
          padding: '14px 22px', borderRadius: '12px',
          border: '1px solid currentColor', fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          animation: 'fadeSlideUp 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div onClick={() => setRejectTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', color: 'var(--text)', borderRadius: '14px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>Reject File</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Rejecting: <strong>{rejectTarget.title}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              rows={4}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectTarget(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmReject} style={{ padding: '10px 20px', border: '1px solid #DC2626', borderRadius: '8px', background: '#DC2626', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Content Flag modal */}
      {resolveModal && (
        <div onClick={() => setResolveModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '28px', width: '100%', maxWidth: '540px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '6px' }}><Flag size={24} color="var(--accent)" /> Resolve Content Flag</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Flagged file: <strong>{resolveModal.file_title}</strong>
            </p>

            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Resolution Notes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(internal, not shown to users)</span></label>
            <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)}
              placeholder="What action was taken? e.g. 'Content verified — no issue found'"
              rows={3} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '16px' }}
            />

            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}><Pin size={14} /> Leave a note on this file <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(visible to all users)</span></label>
            <textarea value={resolveLeaveNote} onChange={e => setResolveLeaveNote(e.target.value)}
              placeholder="Optional: e.g. 'Question 3 contains an error — please ignore it.'"
              rows={3} style={{ width: '100%', border: '1px solid #FCD34D', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: '#FFFBEB', marginBottom: '16px' }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, color: '#DC2626' }}>
              <input type="checkbox" checked={resolveDeleteFile} onChange={e => setResolveDeleteFile(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              Also permanently delete the flagged file
            </label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setResolveModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmResolveReport} style={{ padding: '10px 20px', border: '1px solid #10B981', borderRadius: '8px', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700 }}><CheckCircle size={16} /> Confirm Resolve</button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Issue Resolve modal */}
      {issueResolveModal && (
        <div onClick={() => setIssueResolveModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '6px' }}><CheckCircle size={24} color="#10B981" /> Resolve Platform Issue</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.9rem' }}>
              <strong>{issueResolveModal.title}</strong>
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.8rem' }}>
              Reported by {issueResolveModal.reporter} · {issueResolveModal.type}
            </p>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Resolution notes</label>
            <textarea value={issueResolveNotes} onChange={e => setIssueResolveNotes(e.target.value)}
              placeholder="e.g. 'Fixed in latest deploy — search button now works on mobile.'"
              rows={4} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIssueResolveModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmResolveIssue} style={{ padding: '10px 20px', border: '1px solid #10B981', borderRadius: '8px', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700 }}><CheckCircle size={16} /> Mark Resolved</button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirm modal */}
      {confirmModal && (
        <div onClick={() => setConfirmModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: `1px solid var(--border)`, boxShadow: `0 10px 40px rgba(0,0,0,0.1)`, padding: '28px', width: '100%', maxWidth: '440px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '12px' }}>{confirmModal.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>{confirmModal.body}</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmModal.onConfirm} style={{ padding: '10px 20px', border: `1px solid ${confirmModal.danger ? '#DC2626' : '#10B981'}`, borderRadius: '8px', background: confirmModal.danger ? '#DC2626' : '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit File Modal */}
      {editFileModal && (
        <div onClick={() => setEditFileModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '12px' }}><Edit3 size={24} /> Edit File Details</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>File Title</label>
              <input 
                type="text" 
                value={editFileForm.title} 
                onChange={e => setEditFileForm({ ...editFileForm, title: e.target.value })}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Category</label>
              <select 
                value={editFileForm.category_id}
                onChange={e => setEditFileForm({ ...editFileForm, category_id: e.target.value })}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
              >
                <option value="">Select Category</option>
                {categories.length > 0 && categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Instructor (Optional)</label>
              <select 
                value={editFileForm.instructor_id}
                onChange={e => setEditFileForm({ ...editFileForm, instructor_id: e.target.value })}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
              >
                <option value="">None / General</option>
                {instructors.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            {/* Course field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Move to Course</label>
              <input
                type="text"
                list="edit-course-list"
                value={editFileForm.course_code}
                onChange={e => setEditFileForm({ ...editFileForm, course_code: e.target.value.toUpperCase() })}
                placeholder={`Current: ${editFileModal?.course_code || '—'}`}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box', background: 'var(--bg-white)', color: 'var(--text)' }}
              />
              <datalist id="edit-course-list">
                {editCourses.map(c => (
                  <option key={c.code} value={c.code}>{c.icon} {c.code} — {c.name}</option>
                ))}
              </datalist>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Type or select a course code. Leave blank to keep current.</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditFileModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={saveEditFile} style={{ padding: '10px 20px', border: '1px solid var(--primary)', background: 'color-mix(in srgb, var(--primary) 85%, var(--accent))', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Link File Modal */}
      {linkModal && (
        <div onClick={() => setLinkModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontWeight: 900, fontSize: '1.4rem' }}><Link size={24} /> Cross-Link File</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Make <strong>"{linkModal.title}"</strong> available in other courses without re-uploading.
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Target Course</label>
                <select 
                  value={linkForm.course_id}
                  onChange={e => setLinkForm({ ...linkForm, course_id: e.target.value })}
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', background: 'var(--bg-white)' }}
                >
                  <option value="">Select Course...</option>
                  {editCourses.map(c => (
                    <option key={c.course_id} value={c.course_id}>{c.icon} {c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Category</label>
                <select 
                  value={linkForm.category_id}
                  onChange={e => setLinkForm({ ...linkForm, category_id: e.target.value })}
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', background: 'var(--bg-white)' }}
                >
                  <option value="">Select Category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Custom Title (Optional)</label>
                <input 
                  type="text" 
                  value={linkForm.custom_title} 
                  onChange={e => setLinkForm({ ...linkForm, custom_title: e.target.value })}
                  placeholder="Override the display title for this course..."
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', background: 'var(--bg-white)', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={submitLink} style={{ width: '100%', padding: '10px', background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                Add Link
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontWeight: 800, marginBottom: '12px', fontSize: '1rem' }}>Active Links</h4>
              {existingLinks.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Not linked anywhere else.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {existingLinks.map(l => (
                    <div key={l.link_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{l.course_code} - {l.course_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>As "{l.custom_title || linkModal.title}" in {l.category}</div>
                      </div>
                      <button onClick={() => removeLink(l.course_id)} style={{ padding: '6px 12px', border: '1px solid #EF4444', color: '#EF4444', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setLinkModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* File Note modal */}
      {noteModal && (
        <div onClick={() => setNoteModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '6px' }}><Pin size={24} /> Admin Note</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              File: <strong>{noteModal.title}</strong><br/>
              <span style={{ fontSize: '0.8rem' }}>This note will appear on the file card for all users.</span>
            </p>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. 'Question 3 in this assignment contains an error — ignore it.'"
              rows={5} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'space-between' }}>
              <div>
                {noteModal.admin_note && (
                  <button onClick={deleteNote} style={{ padding: '10px 16px', border: '1px solid #EF4444', borderRadius: '8px', background: 'var(--bg-white)', color: '#EF4444', cursor: 'pointer', fontWeight: 700 }}><Trash2 size={16} style={{ marginRight: '4px' }} /> Remove Note</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setNoteModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                <button onClick={saveNote} disabled={!noteText.trim()} style={{ padding: '10px 20px', border: '1px solid #F59E0B', borderRadius: '8px', background: '#F59E0B', color: 'white', cursor: 'pointer', fontWeight: 700, opacity: noteText.trim() ? 1 : 0.5 }}>Save Note</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-layout">
        {/* Sidebar (Desktop) */}
        <aside className="admin-sidebar">
          <div style={{ marginBottom: '24px', paddingLeft: '8px' }}>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 950, letterSpacing: '-0.03em', fontFamily: 'var(--font-primary)' }}>
              Admin <span className="gradient-text">Panel</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.85rem' }}>Command center.</p>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelectedPending(new Set()); }}
                style={{
                  padding: '12px 16px', borderRadius: '12px',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  background: tab === t.key ? 'var(--text)' : 'transparent',
                  color: tab === t.key ? 'var(--bg-hero)' : 'var(--text-muted)',
                  border: 'none', textAlign: 'left',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '10px'
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main>
          {/* Mobile Header + Nav */}
          <div className="admin-mobile-nav" style={{ flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 950, letterSpacing: '-0.03em', fontFamily: 'var(--font-primary)' }}>
                  Admin <span className="gradient-text">Panel</span>
                </h1>
              </div>
              <button onClick={loadStats} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                <RefreshCw size={20} />
              </button>
            </div>

            <div className="scroll-x-wrap">
              <div className="scroll-x" style={{ paddingBottom: '12px' }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setSelectedPending(new Set()); }}
                  style={{
                    padding: '10px 18px', borderRadius: '100px',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: tab === t.key ? 'var(--text)' : 'var(--bg-card)',
                    color: tab === t.key ? 'var(--bg-hero)' : 'var(--text)',
                    boxShadow: tab === t.key ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  {t.label}
                </button>
              ))}
              </div>
            </div>
          </div>

          {/* Desktop Refresh Button & Quick Stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }} className="hide-mobile">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)' }}>Overview</h2>
            <button onClick={loadStats} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {/* Stats bar */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {[
                { label: 'Pending',   value: stats.pending_files,  emoji: <Clock size={28} />, accent: '#F59E0B', key: 'pending' },
                { label: 'Flags',     value: reportCounts.pending ?? 0, emoji: <Flag size={28} />, accent: '#DC2626', key: 'reports' },
                { label: 'Issues',    value: issueCounts.open ?? 0, emoji: <Wrench size={28} />, accent: '#6366F1', key: 'issues' },
                { label: 'Admins',    value: stats.total_admins,   emoji: <Shield size={28} />, accent: '#8B5CF6', key: 'admins' },
              ].map(s => (
                <div 
                  key={s.label} 
                  onClick={() => setTab(s.key)}
                  style={{ 
                    background: 'var(--bg-card)', border: `1px solid var(--border)`, 
                    borderRadius: '14px', padding: '16px', textAlign: 'center',
                    boxShadow: `0 8px 32px rgba(0,0,0,0.04)`, cursor: 'pointer',
                    transition: 'transform 0.1s'
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{s.emoji}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--text)', fontFamily: 'var(--font-primary)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

        {/* ── Pending tab (with Bulk Actions) ── */}
        {tab === 'pending' && (
          <div>
            {pending.length > 0 && (
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border)', flexWrap: 'wrap', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedPending.size} selected</span>
                  <button 
                    onClick={() => {
                      if (selectedPending.size === pending.length) setSelectedPending(new Set());
                      else setSelectedPending(new Set(pending.map(f => f.file_id)));
                    }}
                    style={{ 
                      background: 'none', border: '1px solid var(--border)', padding: '4px 10px', 
                      borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      color: 'var(--text)', transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}
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
                    Bulk Approve
                  </button>
                  <button
                    disabled={!selectedPending.size}
                    onClick={() => {
                      setRejectTarget({ file_id: '__bulk__', title: `${selectedPending.size} selected file(s)` });
                      setRejectReason('');
                    }}
                    style={{ ...btnStyle('#EF4444'), opacity: selectedPending.size ? 1 : 0.5, flex: 1 }}
                  >
                    Bulk Reject
                  </button>
                </div>
              </div>
            )}
            <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              {loading ? <LoadingRow /> : pending.length === 0 ? (
                <EmptyRow icon={<PartyPopper size={48} color="var(--primary)" />} msg="No files pending review — all caught up!" />
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
                        {f.course_code} · {f.category} · {fmtSize(f.file_size)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    by <strong>{f.uploader || f.uploader_email}</strong> · {fmtDate(f.upload_date)}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a href={f.file_url} target="_blank" rel="noreferrer" style={{ ...btnStyle('#6366F1'), flex: 1, textAlign: 'center' }}><Eye size={16} style={{ marginRight: '4px' }} /> Preview</a>
                    <button onClick={() => openEditFile(f)} style={{ ...btnStyle('var(--text)'), flex: 1 }}><Edit3 size={14} /> Edit</button>
                    <button onClick={() => approve(f.file_id)} style={{ ...btnStyle('var(--electric)'), flex: 1 }}><CheckCircle size={14} /> Approve</button>
                    <button onClick={() => openReject(f)} style={{ ...btnStyle('#EF4444'), flex: 1 }}><XCircle size={14} /> Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Reports tab ── */}
        {tab === 'reports' && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
            {loading ? <LoadingRow /> : reports.length === 0 ? (
              <EmptyRow icon={<Shield size={48} color="var(--primary)" />} msg="No active reports. The platform is clean!" />
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
                  <a href={r.file_url} target="_blank" rel="noreferrer" style={{ ...btnStyle('var(--primary)'), flex: 1, textAlign: 'center' }}><Eye size={16} style={{ marginRight: '4px' }} /> View File</a>
                  <button onClick={() => openResolveModal(r)} style={{ ...btnStyle('var(--electric)'), flex: 1 }}><Flag size={14} /> Resolve</button>
                  <button onClick={() => dismissReport(r.report_id)} style={{ ...btnStyle('#9CA3AF'), flex: 1 }}><Archive size={14} /> Dismiss</button>
                </div>
                
                <div style={{ marginTop: '4px', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick File Actions</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => openLinkModal({ file_id: r.file_id, title: r.file_title, course_code: r.course_code })} style={btnStyle('#8B5CF6')}><Link size={14} /> Link</button>
                    <button onClick={() => openEditFile({ file_id: r.file_id, title: r.file_title, course_code: r.course_code, category_id: r.category_id, instructor_id: r.instructor_id, status: r.file_status })} style={btnStyle('var(--text)')}><Edit3 size={14} /> Edit</button>
                    <button onClick={() => openNoteModal({ file_id: r.file_id, title: r.file_title, admin_note: r.file_admin_note })} style={{ ...btnStyle(r.file_admin_note ? '#D97706' : '#9CA3AF') }}><Pin size={14} /> {r.file_admin_note ? 'Edit Note' : 'Add Note'}</button>
                    <button onClick={() => deleteFile(r.file_id, r.file_title)} style={btnStyle('#EF4444')}><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Issues tab ── */}
        {tab === 'issues' && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
            {loading ? <LoadingRow /> : issues.length === 0 ? (
              <EmptyRow icon={<Sparkles size={48} color="var(--primary)" />} msg="No open issues reported. Everything is running smoothly!" />
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
                  <button onClick={() => openIssueResolveModal(i)} style={{ ...btnStyle('#10B981'), flex: 1 }}><CheckCircle size={16} /> Mark Resolved</button>
                  <button onClick={() => deleteIssue(i.issue_id, i.title)} style={{ ...btnStyle('#EF4444'), flex: 1 }}><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Courses tab ── */}
        {tab === 'courses' && (
          <div>
            {/* Course Form */}
            <form onSubmit={saveCourse} style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '28px', marginBottom: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontWeight: 950, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-primary)' }}>
                {editingCourse ? <><Edit3 size={14} /> Edit Course</> : <><BookOpen size={16} /> Add New Course</>}
                {editingCourse && <button type="button" onClick={() => {
                  setEditingCourse(null);
                  setCourseForm({ name: '', code: '', year: '', semester: '', is_lab: false, icon: '', faculty_id: '', program_id: '' });
                  setIsExistingCode(false);
                  setExistingProgramIds([]);
                }} style={{ marginLeft: 'auto', fontSize: '0.8rem', background: 'none', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}>Cancel</button>}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Course Name * {isExistingCode && <span style={{ color: 'var(--primary)', textTransform: 'none', marginLeft: '5px', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px' }}><Link size={10} /> Shared</span>}
                  </label>
                  <input
                    value={courseForm.name}
                    onChange={e => setCourseForm({...courseForm, name: e.target.value})}
                    placeholder="Object Oriented Programming"
                    required
                    readOnly={isExistingCode}
                    style={{ ...inputStyle, background: isExistingCode ? 'var(--bg-subtle)' : 'var(--bg-white)', cursor: isExistingCode ? 'not-allowed' : 'text' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Course Code *</label>
                  <input value={courseForm.code} onChange={e => setCourseForm({...courseForm, code: e.target.value.toUpperCase()})} placeholder="CS112" required style={inputStyle} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Year</label>
                  <input type="number" min="1" max="4" value={courseForm.year} onChange={e => setCourseForm({...courseForm, year: e.target.value})} placeholder="1" style={inputStyle} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Semester</label>
                  <input type="number" min="1" max="8" value={courseForm.semester} onChange={e => setCourseForm({...courseForm, semester: e.target.value})} placeholder="2" style={inputStyle} />
                </div>

                {/* Faculty + Program — always visible in single/edit mode */}
                {(!bulkCourseMode || editingCourse) && (
                  <>
                    <div className="form-group">
                      <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Faculty</label>
                      <select value={courseForm.faculty_id} onChange={e => setCourseForm({...courseForm, faculty_id: e.target.value, program_id: ''})} style={inputStyle}>
                        <option value="">Select Faculty</option>
                        {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Program</label>
                      <select value={courseForm.program_id} onChange={e => setCourseForm({...courseForm, program_id: e.target.value})} style={inputStyle}>
                        <option value="">Select Program</option>
                        {programs
                          .filter(p => !courseForm.faculty_id || p.faculty_id == courseForm.faculty_id)
                          .map(p => {
                            const alreadyHas = isExistingCode && existingProgramIds.includes(p.id);
                            return (
                              <option key={p.id} value={p.id} disabled={alreadyHas}>
                                {alreadyHas ? `✓ ${p.name} (already added)` : p.name}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
                  <input type="checkbox" checked={courseForm.is_lab} onChange={e => setCourseForm({...courseForm, is_lab: e.target.checked})} id="is_lab" style={{ width: '20px', height: '20px' }} />
                  <label htmlFor="is_lab" style={{ fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>Lab Course</label>
                </div>
              </div>

              {/* Autofill info banner */}
              {isExistingCode && !editingCourse && (
                <div style={{
                  marginTop: '16px', padding: '12px 16px',
                  background: 'rgba(124,58,237,0.07)', border: '2px solid var(--primary)',
                  borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '10px',
                }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}><Info size={16} /></span>
                  <div style={{ fontSize: '0.83rem', lineHeight: 1.5, color: 'var(--text)' }}>
                    <strong>{courseForm.code}</strong> already exists in <strong>{existingProgramIds.length} program{existingProgramIds.length !== 1 ? 's' : ''}</strong>.
                    {' '}Name is locked to keep resources synced across programs.
                    {' '}Simply pick a program that doesn't have it yet
                    {bulkCourseMode ? ' (greyed-out ones already have it)' : ''} and submit.
                  </div>
                </div>
              )}



              {/* ── Bulk mode toggle (hidden when editing) ── */}
              {!editingCourse && (
                <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                        <GraduationCap size={16} /> {bulkCourseMode ? 'Multi-Program Mode' : 'Single Program Mode'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {bulkCourseMode
                          ? 'Course will be added to every checked program simultaneously.'
                          : 'Enable to add this course to multiple programs at once.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setBulkCourseMode(b => !b); setSelectedPrograms([]); }}
                      style={{
                        padding: '7px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem',
                        border: '1px solid var(--border)', cursor: 'pointer',
                        background: bulkCourseMode ? 'var(--primary)' : 'var(--bg-white)',
                        color: bulkCourseMode ? 'white' : 'var(--text)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      }}
                    >
                      {bulkCourseMode ? '✓ Enabled' : 'Enable'}
                    </button>
                  </div>

                  {/* Multi-program checklist */}
                  {bulkCourseMode && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="button"
                          onClick={() => setSelectedPrograms(programs.filter(p => !existingProgramIds.includes(p.id)).map(p => p.id))}
                          style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-white)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                          ✓ Select All New
                        </button>
                        <button type="button" onClick={() => setSelectedPrograms([])}
                          style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-white)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                          ✕ Clear
                        </button>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {selectedPrograms.length} selected
                          {isExistingCode && existingProgramIds.length > 0 && ` · ${existingProgramIds.length} already added (greyed)`}
                        </span>
                      </div>
                      {faculties.map(fac => {
                        const facProgs = programs.filter(p => p.faculty_id === fac.id);
                        if (!facProgs.length) return null;
                        const availableProgs = facProgs.filter(p => !existingProgramIds.includes(p.id));
                        const allFacSelected = availableProgs.length > 0 && availableProgs.every(p => selectedPrograms.includes(p.id));
                        return (
                          <div key={fac.id} style={{ marginBottom: '14px' }}>
                            {/* Faculty row — click toggles all available progs in this faculty */}
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: availableProgs.length ? 'pointer' : 'default' }}
                              onClick={() => {
                                if (!availableProgs.length) return;
                                const ids = availableProgs.map(p => p.id);
                                setSelectedPrograms(prev =>
                                  allFacSelected
                                    ? prev.filter(id => !ids.includes(id))
                                    : [...new Set([...prev, ...ids])]
                                );
                              }}
                            >
                              <span style={{
                                width: '16px', height: '16px', border: `2px solid ${availableProgs.length ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: '4px', display: 'inline-flex', alignItems: 'center',
                                justifyContent: 'center',
                                background: allFacSelected ? 'var(--primary)' : 'transparent',
                                flexShrink: 0,
                              }}>
                                {allFacSelected && <span style={{ color: 'white', fontSize: '11px', fontWeight: 900 }}>✓</span>}
                              </span>
                              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: availableProgs.length ? 'var(--primary)' : 'var(--text-muted)' }}>{fac.name}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '24px' }}>
                              {facProgs.map(p => {
                                const alreadyHas = existingProgramIds.includes(p.id);
                                const checked = selectedPrograms.includes(p.id);
                                return (
                                  <label key={p.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    cursor: alreadyHas ? 'not-allowed' : 'pointer',
                                    fontSize: '0.83rem',
                                    fontWeight: checked ? 700 : 500,
                                    opacity: alreadyHas ? 0.45 : 1,
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={alreadyHas ? true : checked}
                                      disabled={alreadyHas}
                                      onChange={e => !alreadyHas && setSelectedPrograms(prev =>
                                        e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                                      )}
                                      style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                                    />
                                    {p.name}
                                    {alreadyHas && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>✓ already added</span>}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <button type="submit" style={{ ...btnStyle('var(--primary)'), width: '100%', marginTop: '24px', padding: '16px', fontSize: '1rem', boxShadow: '4px 4px 0 var(--text)' }}>
                {editingCourse
                  ? 'Update Course Details'
                  : bulkCourseMode
                    ? <><Plus size={16} /> Add to {selectedPrograms.length || '…'} Program{selectedPrograms.length !== 1 ? 's' : ''}</>
                    : <><Plus size={16} /> Create Course</>}
              </button>
            </form>

            {/* Course List */}
            {/* Search + count row */}
            <div ref={courseListRef} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <input
                value={courseSearch}
                onChange={e => { setCourseSearch(e.target.value); setCoursesPage(1); }}
                placeholder="Search courses by name or code…"
                style={{ ...inputStyle, flex: 1, minWidth: '200px', maxWidth: '400px', marginBottom: 0 }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {coursesTotalCount} course{coursesTotalCount !== 1 ? 's' : ''} · Page {coursesPage} of {coursesTotalPages}
              </span>
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              {loading ? <LoadingRow /> : courses.map(c => (
                <div key={c.course_id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.5rem' }}><IconMapper emoji={c.icon} size={28} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{c.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({c.code})</span></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.faculty_name} · {c.program_name} · Year {c.year} Sem {c.semester} {c.is_lab && <>· <FlaskConical size={12} /> Lab</>}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => editCourse(c)} style={btnStyle('#6366F1')}>Edit</button>
                    <button onClick={() => deleteCourse(c.course_id, c.name)} style={btnStyle('#EF4444')}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Courses pagination */}
            {coursesTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                <button
                  disabled={coursesPage <= 1}
                  onClick={() => setCoursesPage(p => p - 1)}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700, cursor: coursesPage <= 1 ? 'not-allowed' : 'pointer', opacity: coursesPage <= 1 ? 0.4 : 1, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                >← Prev</button>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>Page {coursesPage} / {coursesTotalPages}</span>
                <button
                  disabled={coursesPage >= coursesTotalPages}
                  onClick={() => setCoursesPage(p => p + 1)}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700, cursor: coursesPage >= coursesTotalPages ? 'not-allowed' : 'pointer', opacity: coursesPage >= coursesTotalPages ? 0.4 : 1, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                >Next →</button>
              </div>
            )}
          </div>
        )}

        
        {/* ── Instructors tab ── */}
        {tab === 'links' && (
          <div>
            <form onSubmit={saveCourseLink} style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '28px', marginBottom: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontWeight: 950, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link size={16} /> Link Two Courses (Resource Sharing)
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
                When two courses are linked, any file uploaded to one will organically appear in the other.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px' }}>First Course Code</label>
                  <input value={courseLinkForm.course_code_1} onChange={e => setCourseLinkForm({...courseLinkForm, course_code_1: e.target.value.toUpperCase()})} placeholder="e.g. CE221" required style={inputStyle} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px' }}>Second Course Code</label>
                  <input value={courseLinkForm.course_code_2} onChange={e => setCourseLinkForm({...courseLinkForm, course_code_2: e.target.value.toUpperCase()})} placeholder="e.g. EE221" required style={inputStyle} />
                </div>
              </div>
              <button type="submit" style={{ ...btnStyle('var(--primary)'), marginTop: '20px' }}>Create Link</button>
            </form>

            <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              {loading ? <LoadingRow /> : courseLinks.length === 0 ? (
                <EmptyRow icon={<Link size={48} color="var(--primary)" />} msg="No manual course links active." />
              ) : courseLinks.map(l => (
                <div key={l.link_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{l.course_code_1} ↔ {l.course_code_2}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Linked on {fmtDate(l.created_at)}</div>
                  </div>
                  <button onClick={() => deleteCourseLink(l.link_id)} style={btnStyle('#EF4444')}><Trash2 size={16} /> Unlink</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Instructors tab ── */}

        {tab === 'instructors' && (
          <div>
            <form onSubmit={saveInstructor} style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '28px', marginBottom: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontWeight: 900, marginBottom: '20px' }}><GraduationCap size={24} /> Add New Instructor</h3>
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
              <button type="submit" style={{ background: 'color-mix(in srgb, var(--primary) 85%, var(--accent))', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, width: '100%', padding: '14px', marginTop: '24px', cursor: 'pointer' }}>
                Create Instructor
              </button>
            </form>

            <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
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
              <h3 style={cardTitleStyle}><Flame size={20} color="var(--accent)" /> Most Downloaded</h3>
              {detailedStats.most_downloaded.slice((pageDL - 1) * STATS_PER_PAGE, pageDL * STATS_PER_PAGE).map((f, i) => (
                <div key={f.file_id} style={statRowStyle}>
                  <span style={statBadgeStyle}>{(pageDL - 1) * STATS_PER_PAGE + i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.course_code}</div>
                  </div>
                  <div style={{ fontWeight: 900, color: 'var(--primary)' }}>{f.count} <Download size={14} style={{ marginLeft: '4px' }} /></div>
                </div>
              ))}
              {Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: 'var(--bg-subtle)', padding: '8px', borderRadius: '10px', border: '1.5px solid var(--border)' }}>
                  <button onClick={() => setPageDL(p => Math.max(1, p - 1))} disabled={pageDL === 1} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: pageDL === 1 ? 'not-allowed' : 'pointer', opacity: pageDL === 1 ? 0.5 : 1 }}>Prev</button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Page {pageDL} of {Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE)}</span>
                  <button onClick={() => setPageDL(p => Math.min(Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE), p + 1))} disabled={pageDL === Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE)} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: pageDL === Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE) ? 'not-allowed' : 'pointer', opacity: pageDL === Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE) ? 0.5 : 1 }}>Next</button>
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h3 style={cardTitleStyle}><Gem size={20} color="var(--electric)" /> Most Bookmarked</h3>
              {detailedStats.most_bookmarked.slice((pageBM - 1) * STATS_PER_PAGE, pageBM * STATS_PER_PAGE).map((f, i) => (
                <div key={f.file_id} style={statRowStyle}>
                  <span style={statBadgeStyle}>{(pageBM - 1) * STATS_PER_PAGE + i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.course_code}</div>
                  </div>
                  <div style={{ fontWeight: 900, color: '#EC4899' }}>{f.count} <Bookmark size={14} /></div>
                </div>
              ))}
              {Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: 'var(--bg-subtle)', padding: '8px', borderRadius: '10px', border: '1.5px solid var(--border)' }}>
                  <button onClick={() => setPageBM(p => Math.max(1, p - 1))} disabled={pageBM === 1} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: pageBM === 1 ? 'not-allowed' : 'pointer', opacity: pageBM === 1 ? 0.5 : 1 }}>Prev</button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Page {pageBM} of {Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE)}</span>
                  <button onClick={() => setPageBM(p => Math.min(Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE), p + 1))} disabled={pageBM === Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE)} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: pageBM === Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE) ? 'not-allowed' : 'pointer', opacity: pageBM === Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE) ? 0.5 : 1 }}>Next</button>
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h3 style={cardTitleStyle}><Folder size={20} /> Top Courses</h3>
              {detailedStats.per_course.slice((pageC - 1) * STATS_PER_PAGE, pageC * STATS_PER_PAGE).map((c, i) => (
                <div key={c.course_code} style={statRowStyle}>
                  <div style={{ flex: 1, fontWeight: 700 }}>{c.course_code}</div>
                  <div style={{ fontWeight: 900 }}>{c.count} files</div>
                </div>
              ))}
              {Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: 'var(--bg-subtle)', padding: '8px', borderRadius: '10px', border: '1.5px solid var(--border)' }}>
                  <button onClick={() => setPageC(p => Math.max(1, p - 1))} disabled={pageC === 1} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: pageC === 1 ? 'not-allowed' : 'pointer', opacity: pageC === 1 ? 0.5 : 1 }}>Prev</button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Page {pageC} of {Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE)}</span>
                  <button onClick={() => setPageC(p => Math.min(Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE), p + 1))} disabled={pageC === Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE)} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: pageC === Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE) ? 'not-allowed' : 'pointer', opacity: pageC === Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE) ? 0.5 : 1 }}>Next</button>
                </div>
              )}
            </div>
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}><PieChart size={20} /> Content Breakdown</h3>
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
            {/* Controls row */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <input
                value={fileFilter}
                onChange={e => setFileFilter(e.target.value)}
                placeholder="Filter by title or course code…"
                style={{ flex: 1, minWidth: '200px', maxWidth: '360px', padding: '10px 16px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', boxSizing: 'border-box', background: 'var(--bg-white)', color: 'var(--text)' }}
              />
              <select
                value={filesStatusFilter}
                onChange={e => { setFilesStatusFilter(e.target.value); setFilesPage(1); }}
                style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer' }}
              >
                <option value="">All Statuses</option>
                <option value="approved"><CheckCircle size={14} /> Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected"><XCircle size={14} /> Rejected</option>
              </select>
              <select
                value={filesCategoryFilter}
                onChange={e => { setFilesCategoryFilter(e.target.value); setFilesPage(1); }}
                style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer' }}
              >
                <option value="">All Categories</option>
                {categories.length > 0 && categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {filesTotalCount} file{filesTotalCount !== 1 ? 's' : ''} · Page {filesPage} of {filesTotalPages}
              </span>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              {loading ? <LoadingRow /> : filteredAll.length === 0 ? <EmptyRow icon={<Folder size={48} color="var(--primary)" />} msg="No files found." /> : filteredAll.map(f => (
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
                  <div className="admin-file-actions">
                    <a href={f.file_url} target="_blank" rel="noreferrer" style={btnStyle('#6366F1')}><Eye size={16} style={{ marginRight: '4px' }} /> View</a>
                    <button onClick={() => openLinkModal(f)} style={btnStyle('#8B5CF6')}><Link size={14} /> Link</button>
                    <button onClick={() => openEditFile(f)} style={btnStyle('var(--text)')}><Edit3 size={14} /> Edit</button>
                    <button onClick={() => openNoteModal(f)} style={{ ...btnStyle(f.admin_note ? '#D97706' : '#9CA3AF') }}><Pin size={14} /> Note</button>
                    <button onClick={() => deleteFile(f.file_id, f.title)} style={btnStyle('#EF4444')}><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            {filesTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                <button
                  disabled={filesPage <= 1}
                  onClick={() => setFilesPage(p => p - 1)}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700, cursor: filesPage <= 1 ? 'not-allowed' : 'pointer', opacity: filesPage <= 1 ? 0.4 : 1 }}
                >← Prev</button>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>Page {filesPage} / {filesTotalPages}</span>
                <button
                  disabled={filesPage >= filesTotalPages}
                  onClick={() => setFilesPage(p => p + 1)}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700, cursor: filesPage >= filesTotalPages ? 'not-allowed' : 'pointer', opacity: filesPage >= filesTotalPages ? 0.4 : 1 }}
                >Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Users tab ── */}
        {tab === 'users' && (
          <>
          <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
            {loading ? <LoadingRow /> : users.length === 0 ? <EmptyRow icon={<Users size={48} color="var(--primary)" />} msg="No users yet." /> : users.map(u => (
              <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                  {(u.username || u.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{u.username} {u.is_admin && <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#EDE9FE', color: '#5B21B6', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}><Shield size={10} /> admin</span>}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email} · joined {fmtDate(u.created_at)}</div>
                </div>
                {u.cgpa != null && (
                  <div style={{ background: 'var(--bg-hero)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CGPA</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--accent)' }}>{u.cgpa}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {usersTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              <button
                disabled={usersPage <= 1}
                onClick={() => setUsersPage(p => p - 1)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--border)',
                  cursor: usersPage <= 1 ? 'not-allowed' : 'pointer', opacity: usersPage <= 1 ? 0.5 : 1
                }}
              >
                Prev
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Page {usersPage} of {usersTotalPages}</span>
              <button
                disabled={usersPage >= usersTotalPages}
                onClick={() => setUsersPage(p => p + 1)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--border)',
                  cursor: usersPage >= usersTotalPages ? 'not-allowed' : 'pointer', opacity: usersPage >= usersTotalPages ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          )}
          </>
        )}

        {/* ── Admins tab ── */}
        {tab === 'admins' && (
          <div>
            <form onSubmit={grantAdmin} style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '24px', marginBottom: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontWeight: 800, marginBottom: '16px' }}><Shield size={24} /> Grant Admin Access</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} type="email" placeholder="user@example.com" required style={{ flex: 2, minWidth: '200px', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }} />
                <input value={newAdminNotes} onChange={e => setNewAdminNotes(e.target.value)} placeholder="Role / notes (optional)" style={{ flex: 3, minWidth: '160px', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }} />
                <button type="submit" style={btnStyle('#6366F1')}>Grant</button>
              </div>
            </form>
            <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              {loading ? <LoadingRow /> : admins.length === 0 ? <EmptyRow icon={<Shield size={48} color="var(--primary)" />} msg="No admins configured yet." /> : admins.map(a => (
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
          <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
            {loading ? <LoadingRow /> : logs.length === 0 ? <EmptyRow icon={<Activity size={48} color="var(--primary)" />} msg="No admin activity yet." /> : logs.map(l => (
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
            {!loading && logs.length > 0 && logsTotalPages > 1 && (
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)' }}>
                <button 
                  onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                  disabled={logsPage <= 1}
                  style={{
                    padding: '8px 16px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 700,
                    cursor: logsPage <= 1 ? 'not-allowed' : 'pointer', opacity: logsPage <= 1 ? 0.5 : 1
                  }}>Previous</button>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Page {logsPage} of {logsTotalPages}</span>
                <button 
                  onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
                  disabled={logsPage >= logsTotalPages}
                  style={{
                    padding: '8px 16px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 700,
                    cursor: logsPage >= logsTotalPages ? 'not-allowed' : 'pointer', opacity: logsPage >= logsTotalPages ? 0.5 : 1
                  }}>Next</button>
              </div>
            )}
          </div>
        )}

        <div style={{ height: '80px' }} />
        </main>
      </div>

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
  color: (bg === 'var(--electric)' || bg === 'var(--primary)' || bg === 'var(--tertiary)' || bg === 'var(--text)') ? 'var(--bg-hero)' : 'white', 
  background: bg,  border: `1px solid ${bg}`,
  borderRadius: '8px', padding: '7px 14px', fontWeight: 700,
  fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap',
});

const inputStyle = {
  width: '100%', padding: '12px 14px', border: '1px solid var(--border)',
  borderRadius: '10px', fontSize: '0.9rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  background: 'var(--bg-white)', color: 'var(--text)'
};

const cardStyle = {
  background: 'var(--bg-card)', padding: '24px', borderRadius: '16px',
  border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)'
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
