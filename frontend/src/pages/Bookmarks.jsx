import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ScrollReveal from '../components/ScrollReveal';

const Bookmarks = ({ user, onSignIn }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const storageKey = `gh_bookmarks_${user.uid || user.id || user.username}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setBookmarks(saved);
    } else {
      setBookmarks([]);
    }
  }, [user]);

  const removeBookmark = (id) => {
    if (!user) return;
    const storageKey = `gh_bookmarks_${user.uid || user.id || user.username}`;
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', background: 'var(--bg-subtle)' }}>
      <div className="page-container">
        <ScrollReveal>
          <div style={{ marginBottom: '48px' }}>
            <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '12px' }}>
              My <span className="gradient-text">Library</span> 🔖
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px' }}>
              Your personally curated collection of study materials and resources.
            </p>
          </div>
        </ScrollReveal>

        {!user ? (
          <ScrollReveal delay="reveal-delay-1">
            <div style={{ 
              background: 'white', 
              borderRadius: 'var(--radius-xl)', 
              border: '2px solid var(--text)', 
              boxShadow: 'var(--shadow-md)', 
              padding: '80px 32px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🔒</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>Account Required</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Please sign in to view and manage your library of saved resources.</p>
              <button 
                className="btn-primary" 
                onClick={onSignIn}
              >
                Sign In Now
              </button>
            </div>
          </ScrollReveal>
        ) : bookmarks.length === 0 ? (
          <ScrollReveal delay="reveal-delay-1">
            <div style={{ 
              background: 'white', 
              borderRadius: 'var(--radius-xl)', 
              border: '2px solid var(--text)', 
              boxShadow: 'var(--shadow-md)', 
              padding: '80px 32px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '24px' }}>📚</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>Your library is empty</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Bookmark useful files while browsing courses to see them here.</p>
              <button 
                className="btn-primary" 
                onClick={() => navigate('/courses')}
              >
                Browse Courses
              </button>
            </div>
          </ScrollReveal>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px', paddingBottom: '80px' }}>
            {bookmarks.map((file, i) => (
              <ScrollReveal key={file.id} delay={`reveal-delay-${(i % 3) + 1}`}>
                <div style={{ 
                  background: 'white', 
                  borderRadius: 'var(--radius-lg)', 
                  border: '2px solid var(--text)', 
                  boxShadow: '4px 4px 0px var(--text)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative'
                }}>
                  <button 
                    onClick={() => removeBookmark(file.id)}
                    style={{ 
                      position: 'absolute', top: '16px', right: '16px', 
                      background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer',
                      opacity: 0.5, transition: '0.2s'
                    }}
                    onMouseOver={e => e.target.style.opacity = 1}
                    onMouseOut={e => e.target.style.opacity = 0.5}
                  >
                    ✕
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: 48, height: 48, background: 'var(--bg-subtle)', borderRadius: '12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                    }}>
                      {file.icon || '📄'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {file.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {file.course_name || 'General Resource'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '4px 10px', background: 'var(--bg-subtle)', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {file.category}
                    </span>
                    {file.file_size && (
                      <span style={{ padding: '4px 10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {file.file_size} MB
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                    <a 
                      href={file.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem', padding: '10px' }}
                    >
                      Download
                    </a>
                    <button 
                      onClick={() => navigate(`/course/${file.course_id}`)}
                      className="btn-outline"
                      style={{ flex: 1, fontSize: '0.85rem', padding: '10px' }}
                    >
                      Go to Course
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookmarks;
