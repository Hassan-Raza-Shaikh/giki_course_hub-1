import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Calendar, BookOpen, FileText, Download, Clock, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const fmtSize = (b) => b ? `${(b / (1024 * 1024)).toFixed(2)} MB` : '—';
const fmtDate = (ds) => new Date(ds).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const UserProfile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [files, setFiles] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState(null);

  // Pagination for files
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Fetch profile
    setLoadingProfile(true);
    setError(null);
    api.get(`/users/${username}`)
      .then(res => {
        setProfile(res.data.user);
        setLoadingProfile(false);
      })
      .catch(err => {
        if (err.response && err.response.status === 404) {
          setError("User not found.");
        } else {
          setError("Failed to load user profile.");
        }
        setLoadingProfile(false);
      });
  }, [username]);

  useEffect(() => {
    // Fetch files
    if (error) return;
    setLoadingFiles(true);
    api.get(`/users/${username}/uploads`, { params: { page, limit: 12 } })
      .then(res => {
        setFiles(res.data.files || []);
        setTotalPages(res.data.total_pages || 1);
        setTotalCount(res.data.total_count || 0);
        setLoadingFiles(false);
      })
      .catch(() => {
        setLoadingFiles(false);
      });
  }, [username, page, error]);

  const handleDownload = (file) => {
    api.post(`/files/${file.file_id}/download`).catch(() => {});
    window.open(file.file_url, '_blank');
  };

  if (loadingProfile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-hero)', paddingTop: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--electric)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-hero)', paddingTop: '100px' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ padding: '60px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 16px', color: 'var(--text)' }}>User Not Found</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>The user @{username} does not exist or has been removed.</p>
            <Link
              to="/leaderboard"
              className="btn-nav"
              style={{ textDecoration: 'none', background: 'var(--electric)', color: 'var(--nav-btn-text)' }}
            >
              Go to Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-hero)', paddingTop: '100px', paddingBottom: '80px' }}>
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* Back Link */}
        <Link
          to="/leaderboard"
          className="btn-nav"
          style={{ textDecoration: 'none', background: 'var(--bg-white)', color: 'var(--text)', marginBottom: '24px', display: 'inline-flex' }}
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Back to Leaderboard
        </Link>

        {/* Profile Header */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', padding: '40px', marginBottom: '32px', display: 'flex', gap: '32px', alignItems: 'center', animation: 'fadeUp 0.4s ease-out', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-subtle)', flexShrink: 0, overflow: 'hidden', border: '4px solid var(--bg-hero)', boxShadow: '0 0 0 1px var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={48} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            <h1 style={{ margin: '0 0 8px', fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
              {profile.display_name}
            </h1>
            <div style={{ fontSize: '1.1rem', color: 'var(--electric)', fontWeight: 600, marginBottom: '16px' }}>
              @{profile.username}
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {profile.program && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={18} /> {profile.program}
                </div>
              )}
              {profile.batch_year && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} /> Batch of {profile.batch_year}
                </div>
              )}
              {profile.role === 'admin' && (
                <div style={{ display: 'inline-block', padding: '2px 8px', background: 'var(--electric-muted)', color: 'var(--electric)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Admin
                </div>
              )}
            </div>
          </div>

          {/* Stats Box */}
          <div style={{ padding: '24px', background: 'var(--bg-subtle)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center', minWidth: '150px' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
              {profile.upload_count}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginTop: '8px' }}>
              Contributions
            </div>
          </div>
        </div>

        {/* Uploads Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
            Uploaded Files <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>({totalCount})</span>
          </h2>
        </div>

        {loadingFiles ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
             <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid var(--electric)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
            <FileText size={32} style={{ color: 'var(--border)', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>This user hasn't uploaded any public files yet.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {files.map(f => (
                <div key={f.file_id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', animation: 'fadeUp 0.3s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '12px', color: 'var(--electric)' }}>
                      <FileText size={24} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.title}>
                        {f.title}
                      </h4>
                      <Link to={`/course/${f.course_code}`} style={{ display: 'inline-block', fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none', background: 'var(--bg-hero)', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                        {f.course_code}
                      </Link>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={14}/> {fmtSize(f.file_size)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> {fmtDate(f.upload_date)}</span>
                    </div>
                    
                    <button
                      onClick={() => handleDownload(f)}
                      className="btn-nav"
                      style={{ background: 'var(--electric)', color: 'var(--nav-btn-text)', padding: '6px 14px', fontSize: '0.85rem' }}
                    >
                      <Download size={14} /> Open
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '40px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-nav"
                  style={{ background: 'var(--bg-white)', color: 'var(--text)', opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-nav"
                  style={{ background: 'var(--bg-white)', color: 'var(--text)', opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .hover-electric:hover { color: var(--electric) !important; }
        .hover-opacity:hover { opacity: 0.8; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UserProfile;
