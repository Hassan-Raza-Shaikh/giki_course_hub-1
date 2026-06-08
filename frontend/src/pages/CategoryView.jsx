import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FileText, FileEdit, Presentation, HelpCircle, 
  ClipboardList, FlaskConical, Terminal, Library, 
  Download, Clock, ArrowLeft, Layers 
} from 'lucide-react';
import api from '../services/api';

const fmtSize = (b) => b ? `${(b / (1024 * 1024)).toFixed(2)} MB` : '—';
const fmtDate = (ds) => new Date(ds).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Map categories to distinct icons and theme colors
const CATEGORY_STYLES = {
  'outline':     { icon: <FileText size={48} />,      color: 'var(--primary)',   glow: 'rgba(124,58,237,0.15)', title: 'Course Outlines' },
  'notes':       { icon: <FileEdit size={48} />,      color: 'var(--accent)',    glow: 'rgba(236,72,153,0.15)', title: 'Student Notes' },
  'slides':      { icon: <Presentation size={48} />,  color: '#F59E0B',          glow: 'rgba(245,158,11,0.15)', title: 'Lecture Slides' },
  'quizzes':     { icon: <HelpCircle size={48} />,    color: '#EF4444',          glow: 'rgba(239,68,68,0.15)',  title: 'Past Quizzes' },
  'assignments': { icon: <ClipboardList size={48} />, color: 'var(--secondary)', glow: 'rgba(16,185,129,0.15)', title: 'Assignments' },
  'lab-manuals': { icon: <FlaskConical size={48} />,  color: '#06B6D4',          glow: 'rgba(6,182,212,0.15)',  title: 'Lab Manuals' },
  'lab-tasks':   { icon: <Terminal size={48} />,      color: '#8B5CF6',          glow: 'rgba(139,92,246,0.15)', title: 'Lab Tasks' },
  'reference':   { icon: <Library size={48} />,       color: '#6366F1',          glow: 'rgba(99,102,241,0.15)', title: 'Reference Material' }
};

const CategoryView = () => {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const styleConfig = CATEGORY_STYLES[categorySlug] || { 
    icon: <Layers size={48} />, color: 'var(--text)', glow: 'rgba(0,0,0,0.1)', title: categorySlug.replace('-', ' ')
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    api.get(`/categories/${categorySlug}/files`, { params: { page, limit: 16 } })
      .then(res => {
        if (res.data.success) {
          setFiles(res.data.files || []);
          setCategoryName(res.data.category);
          setTotalPages(res.data.pages || 1);
          setTotalCount(res.data.total || 0);
        } else {
          setError(res.data.message || 'Failed to load category.');
        }
      })
      .catch(err => {
        setError(err?.response?.data?.message || 'Failed to load category. It may not exist.');
      })
      .finally(() => setLoading(false));
  }, [categorySlug, page]);

  const handleDownload = (file) => {
    api.post(`/files/${file.id}/download`).catch(() => {});
    window.open(file.file_url, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-subtle)', paddingBottom: '80px', paddingTop: '70px', overflowX: 'hidden' }}>
      
      {/* ── Immersive Hero Header ───────────────────────────────── */}
      <div style={{
        background: 'var(--bg-hero)',
        padding: 'clamp(40px, 6vw, 60px) 0 clamp(60px, 8vw, 80px)', 
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Dynamic Glow Orbs based on category color */}
        <div style={{ position: 'absolute', width: '600px', height: '600px', background: styleConfig.glow, top: '-200px', left: '-200px', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', width: '400px', height: '400px', background: styleConfig.glow, bottom: '-100px', right: '-100px', borderRadius: '50%', filter: 'blur(60px)' }} />

        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 2 }}>
          <button
            onClick={() => navigate('/courses')}
            className="btn-nav hover-opacity"
            style={{ 
              textDecoration: 'none', background: 'var(--bg-white)', color: 'var(--text)', 
              marginBottom: '32px', display: 'inline-flex', padding: '8px 16px', borderRadius: '100px',
              border: '1px solid var(--border)', fontWeight: 600, fontSize: '0.85rem'
            }}
          >
            <ArrowLeft size={16} strokeWidth={2.5} style={{ marginRight: '6px' }} /> Back to Courses
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Massive Icon Box */}
            <div style={{
              width: '100px', height: '100px', borderRadius: '24px',
              background: 'var(--bg-white)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: styleConfig.color,
              boxShadow: `0 20px 40px ${styleConfig.glow}, 0 0 0 1px var(--border)`,
              transform: 'rotate(-5deg)',
              animation: 'float 3s ease-in-out infinite'
            }}>
              {styleConfig.icon}
            </div>

            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: styleConfig.color, fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', padding: '4px 12px', background: styleConfig.glow, borderRadius: '100px' }}>
                <Layers size={14} /> Category
              </div>
              <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                {categoryName || styleConfig.title}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0, fontWeight: 500 }}>
                {loading ? 'Counting materials...' : `Found ${totalCount} public ${categoryName?.toLowerCase() || 'materials'} across all courses.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content Area ────────────────────────────────────────── */}
      <div className="container" style={{ maxWidth: '1200px', margin: '-40px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${styleConfig.color}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        ) : error ? (
          <div style={{ padding: '80px 24px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <h2 style={{ color: 'var(--text)', marginBottom: '16px' }}>Oops!</h2>
            <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
            <div style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '16px' }}>{styleConfig.icon}</div>
            <h3 style={{ color: 'var(--text)', marginBottom: '8px' }}>No materials found</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>There are currently no {categoryName?.toLowerCase()} available.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {files.map((f, i) => (
                <div 
                  key={f.id} 
                  style={{ 
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', 
                    padding: '24px', display: 'flex', flexDirection: 'column', 
                    animation: `fadeUp 0.4s ease-out forwards`,
                    animationDelay: `${i * 0.05}s`,
                    opacity: 0,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 12px 24px ${styleConfig.glow}`;
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ padding: '12px', background: styleConfig.glow, borderRadius: '14px', color: styleConfig.color, flexShrink: 0 }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.title}>
                        {f.title}
                      </h4>
                      <Link 
                        to={`/course/${f.course_id || f.course_code}`} 
                        style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', 
                          background: 'var(--bg-body)', padding: '4px 10px', borderRadius: '100px', fontWeight: 600,
                          border: '1px solid var(--border)', transition: 'color 0.2s, border-color 0.2s'
                        }}
                        onMouseOver={e => { e.currentTarget.style.color = styleConfig.color; e.currentTarget.style.borderColor = styleConfig.color; }}
                        onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                      >
                        {f.course_code}
                      </Link>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={12}/> {fmtSize(f.file_size)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12}/> {fmtDate(f.date)}</span>
                    </div>
                    
                    <button
                      onClick={() => handleDownload(f)}
                      className="btn-nav hover-opacity"
                      style={{ background: styleConfig.color, color: '#fff', padding: '8px 16px', fontSize: '0.85rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                    >
                      <Download size={14} /> Open
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '48px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ 
                    background: 'var(--bg-white)', color: 'var(--text)', border: '2px solid var(--text)',
                    padding: '10px 20px', borderRadius: '100px', fontWeight: 700, fontSize: '0.9rem',
                    opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer',
                    boxShadow: page === 1 ? 'none' : '2px 2px 0px var(--text)'
                  }}
                >
                  ← Prev
                </button>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--border)' }}>
                  Page {page} of {totalPages}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ 
                    background: 'var(--bg-white)', color: 'var(--text)', border: '2px solid var(--text)',
                    padding: '10px 20px', borderRadius: '100px', fontWeight: 700, fontSize: '0.9rem',
                    opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    boxShadow: page === totalPages ? 'none' : '2px 2px 0px var(--text)'
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-10px) rotate(-2deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CategoryView;
