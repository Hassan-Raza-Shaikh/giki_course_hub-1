import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';

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
    <div style={{ paddingTop: '100px', minHeight: '100vh', background: 'var(--bg-subtle)' }}>
      <div className="page-container">
        
        {/* Search Header */}
        <ScrollReveal>
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '24px' }}>
              Search <span className="gradient-text">Everything</span> 🔍
            </h1>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Search for courses, file titles, or codes..."
                  value={query}
                  onChange={(e) => updateFilters('q', e.target.value)}
                  style={{
                    width: '100%', padding: '16px 16px 16px 48px',
                    borderRadius: 'var(--radius-md)', border: '2px solid var(--text)',
                    fontSize: '1rem', boxShadow: '4px 4px 0px var(--text)',
                    outline: 'none'
                  }}
                />
              </div>

              <select 
                value={facultyId}
                onChange={(e) => updateFilters('faculty_id', e.target.value)}
                style={{
                  padding: '16px', borderRadius: 'var(--radius-md)', border: '2px solid var(--text)',
                  background: 'var(--bg-white)', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '4px 4px 0px var(--text)', outline: 'none'
                }}
              >
                <option value="">All Faculties</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>

              <select 
                value={categoryId}
                onChange={(e) => updateFilters('category_id', e.target.value)}
                style={{
                  padding: '16px', borderRadius: 'var(--radius-md)', border: '2px solid var(--text)',
                  background: 'var(--bg-white)', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '4px 4px 0px var(--text)', outline: 'none'
                }}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </ScrollReveal>

        {error && (
          <div style={{ 
            background: '#FEF2F2', border: '2px solid #EF4444', borderRadius: '12px', 
            padding: '16px 24px', marginBottom: '32px', color: '#B91C1C', fontWeight: 600,
            boxShadow: '4px 4px 0px #EF4444'
          }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>⏳</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>Searching GIKI Hub...</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>The server is waking up — just a moment!</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px', paddingBottom: '80px' }}>
            
            {/* Courses Results */}
            {results.courses.length > 0 && (
              <section>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📚 Courses ({results.courses.length})
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {results.courses.map(course => (
                    <div 
                      key={course.id} 
                      onClick={() => navigate(`/course/${course.id}`)}
                      style={{
                        background: 'var(--bg-white)', border: '2px solid var(--text)', borderRadius: 'var(--radius-lg)',
                        padding: '20px', boxShadow: '4px 4px 0px var(--text)', cursor: 'pointer',
                        transition: '0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'translate(-2px, -2px)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ fontSize: '1.8rem' }}>{course.icon}</div>
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
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📄 Resources ({results.files.length})
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {results.files.map(file => (
                    <div 
                      key={file.id} 
                      style={{
                        background: 'var(--bg-white)', border: '2px solid var(--text)', borderRadius: 'var(--radius-lg)',
                        padding: '16px 20px', boxShadow: '4px 4px 0px var(--text)', display: 'flex', flexDirection: 'column', gap: '8px'
                      }}
                    >
                      <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>{file.title}</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ padding: '3px 10px', background: 'var(--bg-subtle)', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700 }}>{file.category}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{file.course_name}</span>
                        {file.instructor_name && <span style={{ padding: '3px 10px', background: '#FDE68A', color: '#92400E', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700 }}>🧑‍🏫 {file.instructor_name}</span>}
                      </div>
                      
                      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {file.file_size ? `${(file.file_size / (1024*1024)).toFixed(2)} MB` : ''}
                        </div>
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
                  ))}
                </div>
              </section>
            )}

            {!loading && query && results.files.length === 0 && results.courses.length === 0 && (
              <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏜️</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>No results found for "{query}"</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Try a different search term or adjust your filters.</p>
              </div>
            )}
            
            {!query && !facultyId && !categoryId && (
                <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔦</div>
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
