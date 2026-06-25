import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, FileText, BookOpen, AlertTriangle, User, Sunset } from 'lucide-react';
import api from '../services/api';
import IconMapper from '../components/IconMapper';
import ScrollReveal from '../components/ScrollReveal';
import CopyLinkButton, { useCopyLink } from '../components/CopyLinkButton';
import LoadingSpinner from '../components/common/LoadingSpinner';

const GlobalSearch = ({ user, onSignIn }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery]           = useState(searchParams.get('q') || '');
  const [facultyId, setFacultyId]   = useState(searchParams.get('faculty_id') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '');

  const [results, setResults]       = useState({ files: [], courses: [] });
  const [faculties, setFaculties]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(false);

  const searchInputRef = useRef(null);
  const { copiedId, msg, copyLink } = useCopyLink();

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // Wait up to 60s

    const fetchData = () => {
      attempts++;
      Promise.all([
        api.get('/courses'),
        api.get('/categories')
      ]).then(([courseRes, catRes]) => {
        if (courseRes.data.success) setFaculties(courseRes.data.faculties);
        if (catRes.data.success) setCategories(catRes.data.categories);
        
        // If we got nothing, but success was true, might still be waking up
        if (!courseRes.data.faculties?.length && attempts < maxAttempts) {
          setTimeout(fetchData, 3000);
        }
      }).catch(() => {
        if (attempts < maxAttempts) {
          setTimeout(fetchData, 3000);
        } else {
          // Final fallback for categories if server is completely down
          setCategories([
            {id: 1, name: 'Outline'}, {id: 2, name: 'Notes'}, 
            {id: 3, name: 'Slides'}, {id: 4, name: 'Quizzes'}, 
            {id: 5, name: 'Assignments'}, {id: 6, name: 'Lab Manuals'},
            {id: 7, name: 'Lab Tasks'}, {id: 8, name: 'Reference Books'}
          ]);
        }
      });
    };

    fetchData();
  }, []);

  const [error, setError]           = useState('');

  const performSearch = useCallback(async () => {
    if (!query && !facultyId && !categoryId) {
        setResults({ files: [], courses: [] });
        setError('');
        return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/search', {
        params: { q: query, faculty_id: facultyId, category_id: categoryId }
      });
      if (res.data.success) {
        setResults({ files: res.data.files, courses: res.data.courses });
      }
    } catch (err) {
      console.error(err);
      setError("Search failed. Please report this issue so the developers can get on it—your reporting helps us improve the app experience!");
    } finally {
      setLoading(false);
    }
  }, [query, facultyId, categoryId]);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(), 300);
    return () => clearTimeout(timer);
  }, [performSearch]);

  const updateFilters = (key, val) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) newParams.set(key, val);
    else newParams.delete(key);
    setSearchParams(newParams);
    if (key === 'q') setQuery(val);
    if (key === 'faculty_id') setFacultyId(val);
    if (key === 'category_id') setCategoryId(val);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-hero)', paddingTop: '100px', paddingBottom: '80px' }}>
      <div className="page-container" style={{ maxWidth: '1000px' }}>
        {/* Header */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '32px 40px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          marginBottom: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          color: 'var(--text)',
          flexWrap: 'wrap',
          animation: 'fadeUp 0.4s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
          }}>
            <Search size={40} strokeWidth={2.5} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px 0', lineHeight: 1.1 }}>
              Search Everything
            </h1>
            <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              Find courses, specific files, past exams, or document titles instantly.
            </p>
          </div>
        </div>

            <div className="search-filters" style={{ marginBottom: '40px' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}><Search size={20} color="var(--text-muted)" /></div>
                <input 
                  autoFocus
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search GIKI HUB..."
                  value={query}
                  onChange={(e) => updateFilters('q', e.target.value)}
                  style={{
                    width: '100%', padding: '14px 20px 14px 48px',
                    borderRadius: '100px', border: '1px solid var(--border)',
                    fontSize: '1rem', fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
                    outline: 'none', background: 'var(--bg-card)', color: 'var(--text)', transition: 'all 0.3s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.05)'; }}
                />
                {/* '/' shortcut hint — hides when user has typed something */}
                {!query && (
                  <kbd className="hide-on-touch" style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'var(--bg-subtle)', border: '1.5px solid var(--border)',
                    borderRadius: '6px', padding: '2px 8px', fontSize: '0.8rem',
                    fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-muted)',
                    pointerEvents: 'none', lineHeight: 1.6
                  }}>/</kbd>
                )}
              </div>

              <select 
                className="custom-select"
                value={facultyId}
                onChange={(e) => updateFilters('faculty_id', e.target.value)}
              >
                <option value="">All Faculties</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>

              <select 
                className="custom-select"
                value={categoryId}
                onChange={(e) => updateFilters('category_id', e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEE2E2', border: '2px solid #EF4444', borderRadius: '12px', color: '#B91C1C', fontWeight: 700, fontSize: '0.9rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {loading ? (
          <LoadingSpinner message="Searching GIKI Hub..." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px', paddingBottom: '80px' }}>
            
            {/* Courses Results */}
            {results.courses.length > 0 && (
              <section>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '16px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={24} color="var(--primary)" /> Courses ({results.courses.length})
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {results.courses.map(course => (
                    <div 
                      key={course.course_id || course.id || course.code} 
                      onClick={() => navigate(`/course/${course.course_id || course.id || course.code}`)}
                      style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                        padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center' }}><IconMapper emoji={course.icon} size={28} /></div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>{course.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{course.code} · {course.faculty}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Files Results */}
            {results.files.length > 0 && (
              <section>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '16px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={24} color="var(--primary)" /> Resources ({results.files.length})
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {results.files.map(file => (
                    <div 
                      key={file.id} 
                      style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                        padding: '16px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.08)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>{file.title}</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ padding: '3px 10px', background: 'var(--bg-subtle)', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700 }}>{file.category}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{file.course_name}</span>
                        {file.instructor_name && <span style={{ padding: '3px 10px', background: 'var(--bg-subtle)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {file.instructor_name}</span>}
                      </div>
                      
                      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {file.file_size ? `${(file.file_size / (1024*1024)).toFixed(2)} MB` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <CopyLinkButton
                            id={file.id}
                            url={file.file_url}
                            copyLink={copyLink}
                            copiedId={copiedId}
                            msg={msg}
                          />
                          <button 
                            onClick={() => {
                              if(user) window.open(file.file_url, '_blank');
                              else onSignIn();
                            }}
                            className="btn-primary" 
                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!loading && query && results.files.length === 0 && results.courses.length === 0 && (
              <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}><Sunset size={64} color="var(--text-muted)" /></div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>No results found for "{query}"</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Try a different search term or adjust your filters.</p>
              </div>
            )}
            
            {!query && !facultyId && !categoryId && (
                <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}><Sunset size={64} color="var(--text-muted)" /></div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Search for anything...</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Type a course name, resource title, or course code to begin.</p>
                </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default GlobalSearch;
