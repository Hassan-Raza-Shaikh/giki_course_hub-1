import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FileText, FileEdit, Presentation, HelpCircle, 
  ClipboardList, FlaskConical, Terminal, Library, 
  Download, Clock, ArrowLeft, Layers, Search 
} from 'lucide-react';
import api from '../services/api';

const fmtSize = (b) => b ? `${(b / (1024 * 1024)).toFixed(2)} MB` : '—';
const fmtDate = (ds) => new Date(ds).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const CATEGORY_ICONS = {
  'outline':     <FileText size={48} />,
  'notes':       <FileEdit size={48} />,
  'slides':      <Presentation size={48} />,
  'quizzes':     <HelpCircle size={48} />,
  'assignments': <ClipboardList size={48} />,
  'lab-manuals': <FlaskConical size={48} />,
  'lab-tasks':   <Terminal size={48} />,
  'reference':   <Library size={48} />
};

const CATEGORY_COLORS = {
  'outline':     'var(--tertiary)',
  'notes':       'var(--secondary)',
  'slides':      'color-mix(in srgb, var(--primary) 50%, var(--tertiary) 50%)',
  'quizzes':     'var(--accent)',
  'assignments': 'var(--primary)',
  'lab-manuals': 'var(--electric)',
  'lab-tasks':   'color-mix(in srgb, var(--secondary) 50%, var(--electric) 50%)',
  'reference':   'color-mix(in srgb, var(--accent) 50%, var(--tertiary) 50%)'
};

const CategoryView = () => {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const icon = CATEGORY_ICONS[categorySlug] || <Layers size={48} />;
  const themeColor = CATEGORY_COLORS[categorySlug] || 'var(--primary)';

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    api.get(`/categories/${categorySlug}/files`, { params: { page, limit: 16, q: debouncedSearch } })
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
  }, [categorySlug, page, debouncedSearch]);

  const handleDownload = (file) => {
    api.post(`/files/${file.id}/download`).catch(() => {});
    window.open(file.file_url, '_blank');
  };

  return (
    <div style={{ 
      minHeight: '100vh', background: 'var(--bg-subtle)', paddingBottom: '120px', paddingTop: '70px', overflowX: 'hidden',
      '--category-primary': themeColor
    }}>
      
      {/* ── Standard Hero Header ───────────────────────────────── */}
      <div style={{
        background: 'var(--bg-hero)',
        padding: 'clamp(40px, 6vw, 60px) 0 clamp(40px, 6vw, 60px)', 
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 2 }}>
          <button
            onClick={() => navigate('/courses')}
            className="btn-nav hover-opacity"
            style={{ 
              textDecoration: 'none', background: 'var(--bg-white)', color: 'var(--text)', 
              marginBottom: '32px', display: 'inline-flex', padding: '8px 16px', borderRadius: '100px',
              border: '1px solid var(--border)', fontWeight: 600, fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
          >
            <ArrowLeft size={16} strokeWidth={2.5} style={{ marginRight: '6px' }} /> Back to Courses
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Massive Icon Box */}
            <div style={{
              width: 'clamp(70px, 15vw, 100px)', height: 'clamp(70px, 15vw, 100px)', borderRadius: '24px',
              background: 'var(--bg-white)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--category-primary)',
              border: '1px solid var(--border)',
              boxShadow: `0 20px 40px rgba(0,0,0,0.1)`,
              transform: 'rotate(-5deg)',
              animation: 'float 3s ease-in-out infinite'
            }}>
              {icon}
            </div>

            <div style={{ flex: 1, minWidth: '280px' }}>
              <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, fontFamily: 'var(--font-primary)' }}>
                {categoryName || categorySlug.replace('-', ' ')}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0, fontWeight: 500 }}>
                Found {totalCount} public {categoryName?.toLowerCase() || 'materials'} across all courses.
              </p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div style={{ marginTop: '40px', position: 'relative', maxWidth: '480px' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder={`Search in ${categoryName || 'this category'}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '16px 16px 16px 48px', margin: 0,
                borderRadius: '16px', border: '1px solid var(--border)', outline: 'none',
                fontSize: '0.95rem', background: 'var(--bg-card)',
                color: 'var(--text)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', transition: 'all 0.3s',
                fontFamily: 'inherit', boxSizing: 'border-box', WebkitAppearance: 'none'
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.05)'; }}
            />
          </div>
        </div>
      </div>

      {/* ── Content Area ────────────────────────────────────────── */}
      <div className="container" style={{ maxWidth: '1200px', margin: '40px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid var(--category-primary)`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        ) : error ? (
          <div style={{ padding: '80px 24px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <h2 style={{ color: 'var(--text)', marginBottom: '16px' }}>Oops!</h2>
            <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
            <div style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '16px' }}>{icon}</div>
            <h3 style={{ color: 'var(--text)', marginBottom: '8px', fontFamily: 'var(--font-primary)' }}>No materials found</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>There are currently no matching {categoryName?.toLowerCase()} available.</p>
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
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 12px 24px rgba(0,0,0,0.1)`;
                    e.currentTarget.style.borderColor = 'var(--category-primary)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '14px', color: 'var(--category-primary)', flexShrink: 0 }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-primary)' }} title={f.title}>
                        {f.title}
                      </h4>
                      <Link 
                        to={`/course/${f.course_id || f.course_code}`} 
                        style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', 
                          background: 'var(--bg-white)', padding: '4px 10px', borderRadius: '100px', fontWeight: 700,
                          border: '1px solid var(--border)', transition: 'color 0.2s, border-color 0.2s'
                        }}
                        onMouseOver={e => { e.currentTarget.style.color = 'var(--category-primary)'; e.currentTarget.style.borderColor = 'var(--category-primary)'; }}
                        onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                      >
                        {f.course_code}
                      </Link>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={12}/> {fmtSize(f.file_size)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12}/> {fmtDate(f.date)}</span>
                    </div>
                    
                    <button
                      onClick={() => handleDownload(f)}
                      className="btn-nav hover-opacity"
                      style={{ background: 'var(--category-primary)', color: '#fff', padding: '8px 16px', fontSize: '0.85rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'all 0.2s' }}
                    >
                      <Download size={14} strokeWidth={2.5} /> Open
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
                    background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)',
                    padding: '10px 20px', borderRadius: '100px', fontWeight: 700, fontSize: '0.9rem',
                    opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer',
                    boxShadow: page === 1 ? 'none' : '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s'
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
                    background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)',
                    padding: '10px 20px', borderRadius: '100px', fontWeight: 700, fontSize: '0.9rem',
                    opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    boxShadow: page === totalPages ? 'none' : '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s'
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
