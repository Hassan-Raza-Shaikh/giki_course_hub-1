import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { CheckCircle, XCircle, Eye, Edit3, PartyPopper } from 'lucide-react';
import { LoadingRow, EmptyRow, btnStyle, fmtDate, fmtSize } from './AdminHelpers';

export const PendingTab = ({ isAdmin, showToast, loadStats, openEditFile, refreshKey }) => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPending, setSelectedPending] = useState(new Set());
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadPending = () => {
    setLoading(true);
    api.get('/admin/files/pending')
      .then(r => setPending(r.data.files || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadPending();
  }, [isAdmin, refreshKey]);

  const approve = async (id) => {
    try {
      await api.post(`/admin/files/${id}/approve`);
      showToast('File approved');
      setPending(p => p.filter(f => f.file_id !== id));
      loadStats();
    } catch (err) {
      showToast('Error approving file', 'error');
    }
  };

  const bulkApprove = async () => {
    const ids = Array.from(selectedPending);
    if (!ids.length) return;
    try {
      await api.post('/admin/files/bulk-approve', { file_ids: ids });
      showToast(`${ids.length} files approved`);
      setPending(p => p.filter(f => !selectedPending.has(f.file_id)));
      setSelectedPending(new Set());
      loadStats();
    } catch (err) {
      showToast('Error bulk approving files', 'error');
    }
  };

  const openReject = (file) => {
    setRejectTarget(file);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    try {
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
    } catch (err) {
      showToast('Error rejecting files', 'error');
    }
  };

  return (
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
      <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
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

      {/* Reject modal */}
      {rejectTarget && (
        <div onClick={() => setRejectTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', color: 'var(--text)', borderRadius: '14px', border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>Reject File</h3>
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
              <button onClick={() => setRejectTarget(null)} style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmReject} style={{ padding: '10px 20px', border: '2px solid #DC2626', borderRadius: '8px', background: '#DC2626', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
