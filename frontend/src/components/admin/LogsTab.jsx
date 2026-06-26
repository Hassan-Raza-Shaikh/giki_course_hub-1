import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Activity } from 'lucide-react';
import { LoadingRow, EmptyRow, ACTION_ICONS, fmtDate } from './AdminHelpers';

export const LogsTab = ({ isAdmin }) => {
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    api.get('/admin/logs', { params: { page: logsPage } })
      .then(r => {
        setLogs(r.data.logs || []);
        setLogsTotalPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [logsPage, isAdmin]);

  return (
    <div style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
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
  );
};
