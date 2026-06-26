import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, XCircle, Trash2, Shield, Ban, BookOpen, Edit3, Flag, Play, Clock, Wrench, RefreshCw, Sparkles, Activity, Flame, Info, Users, Bookmark, Gem, Folder, Pin, Plus, PieChart, GraduationCap, Link, FlaskConical, Archive, PartyPopper, BarChart3, Eye, Download } from 'lucide-react';

import { PendingTab } from '../components/admin/PendingTab';
import { ReportsTab } from '../components/admin/ReportsTab';
import { IssuesTab } from '../components/admin/IssuesTab';
import { CoursesTab } from '../components/admin/CoursesTab';
import { FilesTab } from '../components/admin/FilesTab';
import { UsersTab } from '../components/admin/UsersTab';
import { AdminsTab } from '../components/admin/AdminsTab';
import { LogsTab } from '../components/admin/LogsTab';
import { CourseLinksTab } from '../components/admin/CourseLinksTab';
import { InstructorsTab } from '../components/admin/InstructorsTab';
import { StatsTab } from '../components/admin/StatsTab';

const AdminPanel = ({ user }) => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(null);
  const [tab, setTab] = useState('pending');
  const [stats, setStats] = useState(null);
  const [reportCounts, setReportCounts] = useState({});
  const [issueCounts, setIssueCounts] = useState({});
  
  const [faculties, setFaculties] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editCourses, setEditCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);

  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [confirmModal, setConfirmModal] = useState(null);
  const [editFileModal, setEditFileModal] = useState(null);
  const [editFileForm, setEditFileForm] = useState({ title: '', category_id: '', instructor_id: '', course_code: '' });
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [linkModal, setLinkModal] = useState(null);
  const [linkForm, setLinkForm] = useState({ course_id: '', category_id: '', custom_title: '' });
  const [existingLinks, setExistingLinks] = useState([]);

  const showToast = (msg, type = 'success') => {
    let finalMsg = msg;
    if (type === 'error') {
      finalMsg = `${msg} Please report this issue so the developers can get on it—your reporting helps us improve the app experience!`;
    }
    setToast({ msg: finalMsg, type: type });
    setTimeout(() => setToast(null), type === 'error' ? 6000 : 3500);
  };

  const triggerRefresh = () => {
    setRefreshKey(k => k + 1);
    loadStats();
  };

  useEffect(() => {
    if (!user) return navigate('/login');
    api.get('/admin/check')
      .then(res => {
        if (!res.data.is_admin) throw new Error('Not admin');
        setIsAdmin(true);
      })
      .catch(() => navigate('/'));
  }, [user, navigate]);

  const loadStats = useCallback(() => {
    api.get('/admin/stats').then(r => setStats(r.data.stats || {}));
    api.get('/admin/reports').then(r => setReportCounts(r.data.counts || {}));
    api.get('/admin/issues').then(r => setIssueCounts(r.data.counts || {}));
  }, []);

  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin, loadStats]);

  useEffect(() => {
    if ((tab === 'courses' || tab === 'instructors' || tab === 'pending' || tab === 'files' || tab === 'reports') && isAdmin) {
      api.get('/admin/faculties-programs').then(r => {
        setFaculties(r.data.faculties || []);
        setPrograms(r.data.programs || []);
        setCategories(r.data.categories || []);
      });
    }
  }, [tab, isAdmin]);

  const deleteFile = async (id, title) => {
    setConfirmModal({
      title: <><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete File</>,
      body: `Permanently delete "${title}"? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        await api.delete(`/admin/files/${id}`);
        showToast('File deleted');
        triggerRefresh();
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
    api.get('/admin/courses/codes').then(r => setEditCourses(r.data.courses || [])).catch(() => {});
    api.get('/instructors').then(r => setInstructors(r.data.instructors || [])).catch(() => {});
  };

  const saveEditFile = async () => {
    if (!editFileModal) return;
    try {
      await api.put(`/admin/files/${editFileModal.file_id}`, editFileForm);
      showToast('File details updated');
      setEditFileModal(null);
      triggerRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed.', 'error');
    }
  };

  const openNoteModal = (file) => {
    setNoteModal(file);
    setNoteText(file.note_text || file.admin_note || file.file_admin_note || '');
  };

  const saveNote = async () => {
    if (!noteModal || !noteText.trim()) return;
    await api.post(`/admin/files/${noteModal.file_id ?? noteModal.id}/note`, { note: noteText });
    showToast('Note saved');
    setNoteModal(null);
    triggerRefresh();
  };

  const deleteNote = async () => {
    if (!noteModal) return;
    await api.delete(`/admin/files/${noteModal.file_id ?? noteModal.id}/note`);
    showToast('Note removed');
    setNoteModal(null);
    triggerRefresh();
  };

  const openLinkModal = async (file) => {
    setLinkModal(file);
    setLinkForm({ course_id: '', category_id: '', custom_title: file.title });
    setExistingLinks([]);
    
    api.get('/admin/courses/codes').then(r => setEditCourses(r.data.courses || [])).catch(() => {});
    
    try {
      const res = await api.get(`/files/${file.file_id || file.id}/links`);
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
      const res = await api.post(`/files/${linkModal.file_id || linkModal.id}/links`, linkForm);
      showToast(res.data.message || 'File linked successfully!');
      const linksRes = await api.get(`/files/${linkModal.file_id || linkModal.id}/links`);
      setExistingLinks(linksRes.data.links || []);
      setLinkForm({ course_id: '', category_id: '', custom_title: linkModal.title });
      triggerRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to link file.', 'error');
    }
  };

  const removeLink = async (courseId) => {
    try {
      await api.delete(`/files/${linkModal.file_id || linkModal.id}/links/${courseId}`);
      showToast('Link removed.');
      setExistingLinks(existingLinks.filter(l => l.course_id !== courseId));
      triggerRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove link.', 'error');
    }
  };

  if (isAdmin === null) return (
    <div style={{ paddingTop: '120px', textAlign: 'center', color: 'var(--text-muted)' }}>
      Checking admin access…
    </div>
  );

  const TABS = [
    { key: 'pending', icon: <Clock size={18} strokeWidth={2.5} />, label: 'Pending', count: stats?.pending_files, color: 'var(--primary)' },
    { key: 'reports', icon: <Flag size={18} strokeWidth={2.5} />, label: 'Flags', count: reportCounts.pending, color: 'var(--secondary)' },
    { key: 'issues',  icon: <Wrench size={18} strokeWidth={2.5} />, label: 'Issues', count: issueCounts.open, color: 'var(--accent)' },
    
    { key: 'courses', icon: <BookOpen size={18} strokeWidth={2.5} />, label: 'Courses', color: 'var(--electric)' },
    { key: 'links',   icon: <Link size={18} strokeWidth={2.5} />, label: 'Shared Links', color: 'var(--tertiary)' },

    { key: 'instructors', icon: <GraduationCap size={18} strokeWidth={2.5} />, label: 'Instructors', color: 'var(--primary)' },
    { key: 'stats_detailed', icon: <BarChart3 size={18} strokeWidth={2.5} />, label: 'Stats', color: 'var(--secondary)' },
    { key: 'files',   icon: <Folder size={18} strokeWidth={2.5} />, label: 'All Files', color: 'var(--accent)' },
    { key: 'users',   icon: <Users size={18} strokeWidth={2.5} />, label: 'Users', count: stats?.total_users, color: 'var(--electric)' },
    { key: 'admins',  icon: <Shield size={18} strokeWidth={2.5} />, label: 'Admins', count: stats?.total_admins, color: 'var(--tertiary)' },
    { key: 'logs',    icon: <Activity size={18} strokeWidth={2.5} />, label: 'Activity', color: 'var(--primary)' },
  ];

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--bg-hero)' }}>
      <div className="page-container" style={{ maxWidth: '1400px' }}>
      {toast && (
        <div className="admin-toast" style={{
          background: toast.type === 'error' ? '#FEE2E2' : '#D1FAE5',
          color: toast.type === 'error' ? '#991B1B' : '#065F46',
          padding: '14px 22px', borderRadius: '100px',
          border: '1px solid currentColor', fontWeight: 700, fontSize: '0.9rem',
          position: 'fixed', top: '100px', right: '24px', zIndex: 11000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          {toast.msg}
        </div>
      )}

      {confirmModal && (
        <div onClick={() => setConfirmModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '28px', width: '100%', maxWidth: '440px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '12px' }}>{confirmModal.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>{confirmModal.body}</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '100px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmModal.onConfirm} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '100px', background: confirmModal.danger ? '#DC2626' : '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {editFileModal && (
        <div onClick={() => setEditFileModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '12px' }}><Edit3 size={24} /> Edit File Details</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>File Title</label>
              <input 
                type="text" 
                value={editFileForm.title} 
                onChange={e => setEditFileForm({ ...editFileForm, title: e.target.value })}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '100px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Category</label>
              <select 
                value={editFileForm.category_id}
                onChange={e => setEditFileForm({ ...editFileForm, category_id: e.target.value })}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '100px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
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
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '100px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
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
                placeholder={`Current: ${editFileModal?.course_code || '—'}`}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '100px', padding: '10px 12px', fontSize: '0.9rem', boxSizing: 'border-box', background: 'var(--bg-white)', color: 'var(--text)' }}
              />
              <datalist id="edit-course-list">
                {editCourses.map(c => (
                  <option key={c.code} value={c.code}>{c.icon} {c.code} — {c.name}</option>
                ))}
              </datalist>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Type or select a course code. Leave blank to keep current.</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditFileModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '100px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={saveEditFile} style={{ padding: '10px 20px', border: '2px solid var(--primary)', background: 'var(--primary)', color: 'white', borderRadius: '100px', cursor: 'pointer', fontWeight: 700, boxShadow: '3px 3px 0 var(--text)' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {linkModal && (
        <div onClick={() => setLinkModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontWeight: 900, fontSize: '1.4rem' }}><Link size={24} /> Cross-Link File</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Make <strong>"{linkModal.title}"</strong> available in other courses without re-uploading.
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '100px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Target Course</label>
                <select 
                  value={linkForm.course_id}
                  onChange={e => setLinkForm({ ...linkForm, course_id: e.target.value })}
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '100px', padding: '10px 12px', fontSize: '0.9rem', background: 'var(--bg-white)' }}
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
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '100px', padding: '10px 12px', fontSize: '0.9rem', background: 'var(--bg-white)' }}
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
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '100px', padding: '10px 12px', fontSize: '0.9rem', background: 'var(--bg-white)', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={submitLink} style={{ width: '100%', padding: '10px', background: '#6366F1', color: 'white', border: 'none', borderRadius: '100px', fontWeight: 700, cursor: 'pointer' }}>
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
                    <div key={l.link_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border)', borderRadius: '100px' }}>
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
              <button onClick={() => setLinkModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '100px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {noteModal && (
        <div onClick={() => setNoteModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid #D97706', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '28px', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '6px', color: '#B45309' }}><Pin size={24} /> Add Public Note</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              This note will be visible to everyone viewing <strong>{noteModal.title}</strong>.
            </p>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. 'Questions 4 and 5 are out of syllabus for 2024.'"
              rows={4}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '100px', padding: '10px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', background: '#FFFBEB' }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              {(noteModal.note_text || noteModal.admin_note || noteModal.file_admin_note) && (
                <button onClick={deleteNote} style={{ padding: '10px 20px', border: '1px solid #EF4444', borderRadius: '100px', background: 'white', color: '#EF4444', cursor: 'pointer', fontWeight: 700, marginRight: 'auto' }}>Remove Note</button>
              )}
              <button onClick={() => setNoteModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '100px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={saveNote} style={{ padding: '10px 20px', border: '1px solid #D97706', borderRadius: '100px', background: '#D97706', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-layout">
        {/* Sidebar (Desktop) */}
        <aside className="admin-sidebar">
          <div style={{
            marginBottom: '32px', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '100px', padding: '16px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
          }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.03em', fontFamily: 'var(--font-primary)', margin: 0 }}>
              Admin<span className="gradient-text">Panel</span>
            </h1>
            <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} className="gradient-text" style={{ color: 'var(--primary)' }} />
            </div>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                onMouseOver={e => {
                  if (tab !== t.key) {
                    e.currentTarget.style.background = `color-mix(in srgb, ${t.color} 10%, transparent)`;
                  }
                }}
                onMouseOut={e => {
                  if (tab !== t.key) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
                style={{
                  padding: '12px 16px', borderRadius: '100px',
                  fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  background: tab === t.key ? `color-mix(in srgb, ${t.color} 15%, transparent)` : 'transparent',
                  color: tab === t.key ? t.color : 'var(--text-muted)',
                  border: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: t.color }}>{t.icon}</span> 
                  {t.label}
                </div>
                {t.count != null && (
                  <span style={{
                    background: tab === t.key ? t.color : `color-mix(in srgb, ${t.color} 10%, var(--bg-subtle))`,
                    color: tab === t.key ? 'var(--bg-hero)' : t.color,
                    padding: '2px 10px',
                    borderRadius: '100px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    border: tab !== t.key ? `1px solid color-mix(in srgb, ${t.color} 20%, transparent)` : 'none',
                    boxShadow: tab === t.key ? `0 4px 12px color-mix(in srgb, ${t.color} 40%, transparent)` : 'none'
                  }}>
                    {t.count ?? '…'}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ minWidth: 0 }}>
          {/* Mobile Header + Nav */}
          <div className="admin-mobile-nav" style={{ flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '100px',
              padding: '12px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '6px', background: 'var(--bg-subtle)', borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={16} className="gradient-text" style={{ color: 'var(--primary)' }} />
                </div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 950, letterSpacing: '-0.03em', fontFamily: 'var(--font-primary)', margin: 0 }}>
                  Admin<span className="gradient-text">Panel</span>
                </h1>
              </div>
              <button onClick={() => {
                loadStats();
                setRefreshKey(k => k + 1);
                showToast('Data refreshed');
              }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <RefreshCw size={18} />
              </button>
            </div>
            
            <select
              value={tab}
              onChange={e => setTab(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '100px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontWeight: 800, fontSize: '0.9rem', outline: 'none' }}
            >
              {TABS.map(t => (
                <option key={t.key} value={t.key}>{t.label} {t.count != null ? `(${t.count})` : ''}</option>
              ))}
            </select>
          </div>
          
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }} className="admin-desktop-refresh">
            <button onClick={() => {
              loadStats();
              setRefreshKey(k => k + 1);
              showToast('Data refreshed');
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '100px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
              <RefreshCw size={16} /> Refresh Data
            </button>
          </div>

          <div style={{ width: '100%' }}>
            {tab === 'pending' && <PendingTab isAdmin={isAdmin} showToast={showToast} loadStats={loadStats} openEditFile={openEditFile} refreshKey={refreshKey} />}
            {tab === 'reports' && <ReportsTab isAdmin={isAdmin} showToast={showToast} loadStats={loadStats} openLinkModal={openLinkModal} openEditFile={openEditFile} openNoteModal={openNoteModal} deleteFile={deleteFile} refreshKey={refreshKey} />}
            {tab === 'issues' && <IssuesTab isAdmin={isAdmin} showToast={showToast} setConfirmModal={setConfirmModal} />}
            {tab === 'courses' && <CoursesTab isAdmin={isAdmin} showToast={showToast} setConfirmModal={setConfirmModal} faculties={faculties} programs={programs} />}
            {tab === 'links' && <CourseLinksTab isAdmin={isAdmin} showToast={showToast} setConfirmModal={setConfirmModal} refreshKey={refreshKey} />}
            {tab === 'instructors' && <InstructorsTab isAdmin={isAdmin} showToast={showToast} setConfirmModal={setConfirmModal} faculties={faculties} />}
            {tab === 'stats_detailed' && <StatsTab isAdmin={isAdmin} />}
            {tab === 'files' && <FilesTab isAdmin={isAdmin} showToast={showToast} categories={categories} openLinkModal={openLinkModal} openEditFile={openEditFile} openNoteModal={openNoteModal} deleteFile={deleteFile} refreshKey={refreshKey} />}
            {tab === 'users' && <UsersTab isAdmin={isAdmin} showToast={showToast} setConfirmModal={setConfirmModal} loadStats={loadStats} />}
            {tab === 'admins' && <AdminsTab isAdmin={isAdmin} showToast={showToast} setConfirmModal={setConfirmModal} loadStats={loadStats} />}
            {tab === 'logs' && <LogsTab isAdmin={isAdmin} />}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
};

export default AdminPanel;
