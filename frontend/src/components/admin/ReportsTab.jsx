import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Shield, Flag, Archive, Eye, Link, Edit3, Pin, CheckCircle, Trash2 } from 'lucide-react';
import { LoadingRow, EmptyRow, btnStyle, fmtDate } from './AdminHelpers';

export const ReportsTab = ({ isAdmin, showToast, loadStats, openLinkModal, openEditFile, openNoteModal, deleteFile, refreshKey }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveDeleteFile, setResolveDeleteFile] = useState(false);
  const [resolveLeaveNote, setResolveLeaveNote] = useState('');

  const loadReports = () => {
    setLoading(true);
    api.get('/admin/reports')
      .then(r => setReports(r.data.reports || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadReports();
  }, [isAdmin, refreshKey]);

  const openResolveModal = (report) => {
    setResolveModal(report);
    setResolveNotes('');
    setResolveDeleteFile(false);
    setResolveLeaveNote('');
  };

  const confirmResolveReport = async () => {
    if (!resolveModal) return;
    try {
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
      loadStats();
    } catch (err) {
      showToast('Error resolving report', 'error');
    }
  };

  const dismissReport = async (id) => {
    try {
      await api.post(`/admin/reports/${id}/dismiss`);
      showToast('Report dismissed');
      setReports(r => r.filter(x => x.report_id !== id));
      loadStats();
    } catch (err) {
      showToast('Error dismissing report', 'error');
    }
  };

  return (
    <div>
      <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
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

      {/* Resolve Content Flag modal */}
      {resolveModal && (
        <div onClick={() => setResolveModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '16px', border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)', padding: '28px', width: '100%', maxWidth: '540px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '6px' }}><Flag size={24} color="var(--accent)" /> Resolve Content Flag</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Flagged file: <strong>{resolveModal.file_title}</strong>
            </p>

            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Resolution Notes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(internal, not shown to users)</span></label>
            <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)}
              placeholder="What action was taken? e.g. 'Content verified — no issue found'"
              rows={3} style={{ width: '100%', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '16px' }}
            />

            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}><Pin size={14} /> Leave a note on this file <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(visible to all users)</span></label>
            <textarea value={resolveLeaveNote} onChange={e => setResolveLeaveNote(e.target.value)}
              placeholder="Optional: e.g. 'Question 3 contains an error — please ignore it.'"
              rows={3} style={{ width: '100%', border: '2px solid #FCD34D', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: '#FFFBEB', marginBottom: '16px' }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, color: '#DC2626' }}>
              <input type="checkbox" checked={resolveDeleteFile} onChange={e => setResolveDeleteFile(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              Also permanently delete the flagged file
            </label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setResolveModal(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmResolveReport} style={{ padding: '10px 20px', border: '2px solid #10B981', borderRadius: '8px', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700 }}><CheckCircle size={16} /> Confirm Resolve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
