import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Wrench, Sparkles, CheckCircle, Trash2 } from 'lucide-react';
import { LoadingRow, EmptyRow, btnStyle, fmtDate, STATUS_COLORS } from './AdminHelpers';

export const IssuesTab = ({ isAdmin, showToast, setConfirmModal }) => {
  const [issues, setIssues] = useState([]);
  const [issuesPage, setIssuesPage] = useState(1);
  const [issuesTotalPages, setIssuesTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [issueResolveModal, setIssueResolveModal] = useState(null);
  const [issueResolveNotes, setIssueResolveNotes] = useState('');

  const loadIssues = () => {
    setLoading(true);
    api.get('/admin/issues', { params: { page: issuesPage } })
      .then(r => {
        setIssues(r.data.issues || []);
        setIssuesTotalPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadIssues();
  }, [issuesPage, isAdmin]);

  const openIssueResolveModal = (issue) => {
    setIssueResolveModal(issue);
    setIssueResolveNotes('');
  };

  const confirmResolveIssue = async () => {
    if (!issueResolveModal) return;
    try {
      await api.post(`/admin/issues/${issueResolveModal.issue_id}/resolve`, { notes: issueResolveNotes });
      showToast('Issue resolved');
      setIssues(i => i.filter(x => x.issue_id !== issueResolveModal.issue_id));
      setIssueResolveModal(null);
      setIssueResolveNotes('');
    } catch (err) {
      showToast('Error resolving issue', 'error');
    }
  };

  const deleteIssue = async (id, title) => {
    setConfirmModal({
      title: <><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete Issue Report</>,
      body: `Permanently delete the report "${title}"?`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/admin/issues/${id}`);
          showToast('Issue deleted');
          setIssues(i => i.filter(x => x.issue_id !== id));
          setConfirmModal(null);
        } catch (err) {
          showToast('Error deleting issue', 'error');
        }
      }
    });
  };

  return (
    <div>
      <div style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? <LoadingRow /> : issues.length === 0 ? (
          <EmptyRow icon={<Sparkles size={48} color="var(--primary)" />} msg="No open issues reported. Everything is running smoothly!" />
        ) : issues.map(i => (
          <div key={i.issue_id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 900, background: '#EDE9FE', color: '#5B21B6', textTransform: 'uppercase' }}>
                  {i.type}
                </span>
                <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 900, ...(STATUS_COLORS[i.status] || STATUS_COLORS.pending), textTransform: 'uppercase' }}>
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

      {issuesTotalPages > 1 && (
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)' }}>
          <button 
            onClick={() => setIssuesPage(p => Math.max(1, p - 1))}
            disabled={issuesPage <= 1}
            style={{
              padding: '8px 16px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 700,
              cursor: issuesPage <= 1 ? 'not-allowed' : 'pointer', opacity: issuesPage <= 1 ? 0.5 : 1
            }}>Previous</button>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Page {issuesPage} of {issuesTotalPages}</span>
          <button 
            onClick={() => setIssuesPage(p => Math.min(issuesTotalPages, p + 1))}
            disabled={issuesPage >= issuesTotalPages}
            style={{
              padding: '8px 16px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 700,
              cursor: issuesPage >= issuesTotalPages ? 'not-allowed' : 'pointer', opacity: issuesPage >= issuesTotalPages ? 0.5 : 1
            }}>Next</button>
        </div>
      )}

      {/* Platform Issue Resolve modal */}
      {issueResolveModal && (
        <div onClick={() => setIssueResolveModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-white)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90dvh', overflowY: 'auto' }}>
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
              rows={4} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '100px', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIssueResolveModal(null)} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '100px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmResolveIssue} style={{ padding: '10px 20px', border: '2px solid #10B981', borderRadius: '100px', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700 }}><CheckCircle size={16} /> Mark Resolved</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
