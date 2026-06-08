import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Navigate, Link } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { UploadCloud, CheckCircle, Clock, XCircle, AlertCircle, FileText } from 'lucide-react';
import '../styles/global.css';

const MyUploads = ({ user }) => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user) {
      setLoading(true);
      api.get('/files/my-uploads', { params: { page, limit: 50 } })
        .then(res => {
          if (res.data.success) {
            setUploads(res.data.files || []);
            setTotalPages(res.data.pages || 1);
            setTotalCount(res.data.total || 0);
          }
        })
        .catch(err => console.error("Error fetching my uploads:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, page]);

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', color: 'var(--electric)', border: '1.5px solid var(--electric)', padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800 }}><CheckCircle size={14} /> Approved</span>;
      case 'rejected':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', color: 'var(--accent)', border: '1.5px solid var(--accent)', padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800 }}><XCircle size={14} /> Rejected</span>;
      case 'pending':
      default:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', color: 'var(--secondary)', border: '1.5px solid var(--secondary)', padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800 }}><Clock size={14} /> Pending</span>;
    }
  };

  return (
    <>
      {/* Background blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
      
      <div className="page-container" style={{ padding: '120px 24px 60px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <UploadCloud size={36} color="var(--primary)" />
          My Uploads
        </h1>
        <p className="hero-subtitle" style={{ fontSize: '1rem', marginBottom: '12px' }}>
          Track the status of the materials you've contributed to GIKI Course Hub.
        </p>
        
        {user && totalCount > 0 && (
          <div style={{ marginBottom: '24px', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {totalCount} total upload{totalCount !== 1 ? 's' : ''} · Page {page} of {totalPages}
          </div>
        )}

        {!user ? (
          <div style={{ background: 'var(--bg-white)', borderRadius: 'var(--radius-xl)', border: '2px solid var(--border)', padding: '80px 32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>Account Required</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Please sign in to view your uploads.</p>
          </div>
        ) : loading ? (
          <LoadingSpinner />
        ) : uploads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', background: 'var(--card-bg)', borderRadius: '16px', border: '2px solid var(--border)' }}>
            <FileText size={48} color="var(--primary)" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>No uploads yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>You haven't contributed any materials to the platform yet.</p>
            <Link to="/upload" className="btn-primary" style={{ display: 'inline-flex' }}>Upload Material</Link>
          </div>
        ) : (
          <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '2px solid var(--border)', overflow: 'hidden' }}>
            {uploads.map(file => (
              <div key={file.file_id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '280px', wordBreak: 'break-word' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{file.title}</h3>
                    {getStatusBadge(file.status)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <strong>Course:</strong> {file.course_code} · <strong>Category:</strong> {file.category_name || 'General'} · <strong>Uploaded:</strong> {fmtDate(file.upload_date)}
                  </div>
                  {file.admin_note && (
                    <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span><strong>Admin Note:</strong> {file.admin_note}</span>
                    </div>
                  )}
                </div>
                {file.status === 'approved' && file.file_url && (
                  <a 
                    href={file.file_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn-primary" 
                    style={{ fontSize: '0.8rem', padding: '8px 16px', background: 'var(--bg-subtle)', color: 'var(--text)' }}
                  >
                    View File
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
            <button
              disabled={page <= 1}
              onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
              style={{ padding: '8px 20px', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}
            >← Prev</button>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Page {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
              style={{ padding: '8px 20px', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}
            >Next →</button>
          </div>
        )}
      </div>
    </>
  );
};

export default MyUploads;
