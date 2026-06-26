import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Folder, Eye, Link, Edit3, Pin, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { LoadingRow, EmptyRow, btnStyle, fmtDate, fmtSize, STATUS_COLORS } from './AdminHelpers';

export const FilesTab = ({ isAdmin, showToast, categories, openLinkModal, openEditFile, openNoteModal, deleteFile, refreshKey }) => {
  const [allFiles, setAllFiles] = useState([]);
  const [filesPage, setFilesPage] = useState(1);
  const [filesTotalPages, setFilesTotalPages] = useState(1);
  const [filesTotalCount, setFilesTotalCount] = useState(0);
  const [fileFilter, setFileFilter] = useState('');
  const [filesStatusFilter, setFilesStatusFilter] = useState('');
  const [filesCategoryFilter, setFilesCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const loadFiles = () => {
    setLoading(true);
    api.get('/admin/files/all', { params: { page: filesPage, status: filesStatusFilter, category: filesCategoryFilter } })
      .then(r => {
        setAllFiles(r.data.files || []);
        setFilesTotalPages(r.data.pages || 1);
        setFilesTotalCount(r.data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadFiles();
  }, [filesPage, filesStatusFilter, filesCategoryFilter, isAdmin, refreshKey]);

  const filteredAll = allFiles.filter(f =>
    !fileFilter ||
    f.title?.toLowerCase().includes(fileFilter.toLowerCase()) ||
    f.course_code?.toLowerCase().includes(fileFilter.toLowerCase())
  );

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          value={fileFilter}
          onChange={e => setFileFilter(e.target.value)}
          placeholder="Filter by title or course code…"
          style={{ flex: 1, minWidth: '200px', maxWidth: '360px', padding: '10px 16px', border: '2px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', boxSizing: 'border-box', background: 'var(--bg-white)', color: 'var(--text)' }}
        />
        <select
          value={filesStatusFilter}
          onChange={e => { setFilesStatusFilter(e.target.value); setFilesPage(1); }}
          style={{ padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer' }}
        >
          <option value="">All Statuses</option>
          <option value="approved"><CheckCircle size={14} /> Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected"><XCircle size={14} /> Rejected</option>
        </select>
        <select
          value={filesCategoryFilter}
          onChange={e => { setFilesCategoryFilter(e.target.value); setFilesPage(1); }}
          style={{ padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer' }}
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

      <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
        {loading ? <LoadingRow /> : filteredAll.length === 0 ? <EmptyRow icon={<Folder size={48} color="var(--primary)" />} msg="No files found." /> : filteredAll.map(f => (
          <div key={f.file_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{f.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {f.course_code} · {f.category} · {fmtSize(f.file_size)} · {fmtDate(f.upload_date)}
              </div>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, ...(STATUS_COLORS[f.status] || STATUS_COLORS.pending) }}>
              {f.status}
            </span>
            <div className="admin-file-actions" style={{ display: 'flex', gap: '8px' }}>
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
            style={{ padding: '8px 20px', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700, cursor: filesPage <= 1 ? 'not-allowed' : 'pointer', opacity: filesPage <= 1 ? 0.4 : 1 }}
          >← Prev</button>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>Page {filesPage} / {filesTotalPages}</span>
          <button
            disabled={filesPage >= filesTotalPages}
            onClick={() => setFilesPage(p => p + 1)}
            style={{ padding: '8px 20px', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700, cursor: filesPage >= filesTotalPages ? 'not-allowed' : 'pointer', opacity: filesPage >= filesTotalPages ? 0.4 : 1 }}
          >Next →</button>
        </div>
      )}
    </div>
  );
};
