import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileWarning, Eye, Edit3, CheckCircle, FileText, GraduationCap, MoveRight } from 'lucide-react';
import { LoadingRow, EmptyRow, btnStyle } from './AdminHelpers';

const REASON_ICONS = {
  name: <FileText size={13} />,
  instructor: <GraduationCap size={13} />,
  page: <MoveRight size={13} />,
};

const TIERS = {
  likely: { label: 'Likely misfiled', hint: 'Two or more signs point to another course.', color: 'var(--danger)', soft: 'var(--danger-soft)' },
  check:  { label: 'Worth a check', hint: 'Only the file name points elsewhere. Codes get reused, so these are often fine.', color: 'var(--warning)', soft: 'var(--warning-soft)' },
};

export const MisfiledTab = ({ isAdmin, showToast, openEditFile, refreshKey }) => {
  const [files, setFiles] = useState([]);
  const [canDismiss, setCanDismiss] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/misfiled')
      .then(r => { setFiles(r.data.files || []); setCanDismiss(!!r.data.can_dismiss); })
      .catch(() => showToast('Could not load the list.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, refreshKey]);

  const dismiss = async (f) => {
    try {
      await api.post(`/admin/misfiled/${f.file_id}/dismiss`);
      setFiles(list => list.filter(x => x.file_id !== f.file_id));
      showToast('Marked as correctly filed');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update.', 'error');
    }
  };

  const groups = ['likely', 'check'].map(k => [k, files.filter(f => f.confidence === k)]).filter(([, l]) => l.length);

  return (
    <div>
      <div style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', padding: '24px 28px', marginBottom: '24px' }}>
        <h3 style={{ fontWeight: 950, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileWarning size={18} /> Possibly misfiled
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
          Uploads that may be under the wrong course. A file shows up here when its file name carries another course's code,
          or when its instructor and the page it was first uploaded from both point to another course. An instructor teaching
          other courses is never enough on its own. Use <strong>Edit</strong> to move a file, or mark it as fine to hide it.
        </p>
        {!canDismiss && (
          <p style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 700, margin: '12px 0 0' }}>
            Run migration 031 to be able to mark files as fine.
          </p>
        )}
      </div>

      {loading ? (
        <div style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)' }}><LoadingRow /></div>
      ) : groups.length === 0 ? (
        <div style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)' }}>
          <EmptyRow icon={<CheckCircle size={48} color="var(--success)" />} msg="Nothing looks misfiled." />
        </div>
      ) : groups.map(([tier, list]) => (
        <div key={tier} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', margin: '0 4px 10px' }}>
            <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800, background: TIERS[tier].soft, color: TIERS[tier].color }}>
              {TIERS[tier].label} · {list.length}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{TIERS[tier].hint}</span>
          </div>
          <div style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {list.map(f => (
              <div key={f.file_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{f.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Under {f.course_code}{f.course_name ? ` · ${f.course_name}` : ''}{f.status !== 'approved' ? ` · ${f.status}` : ''}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {f.reasons.map((r, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', color: 'var(--text)', overflowWrap: 'anywhere' }}>
                        <span style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }}>{REASON_ICONS[r.kind]}</span>
                        {r.text}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="admin-file-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {f.file_url && <a href={f.file_url} target="_blank" rel="noreferrer" style={btnStyle('var(--primary)')}><Eye size={14} style={{ marginRight: '4px' }} /> View</a>}
                  <button onClick={() => openEditFile(f)} style={btnStyle('var(--text)')}><Edit3 size={14} /> Edit</button>
                  {canDismiss && <button onClick={() => dismiss(f)} style={btnStyle('neutral')}><CheckCircle size={14} /> Looks fine</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
