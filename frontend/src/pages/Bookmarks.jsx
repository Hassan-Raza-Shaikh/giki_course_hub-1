import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import CopyLinkButton, { useCopyLink } from '../components/CopyLinkButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  FileText, FileEdit, Presentation, HelpCircle,
  ClipboardList, Archive, FlaskConical, Terminal,
  ClipboardCheck, Library, Bookmark, Lock
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Outline':         <FileText size={24} strokeWidth={1.5} />,
  'Notes':           <FileEdit size={24} strokeWidth={1.5} />,
  'Slides':          <Presentation size={24} strokeWidth={1.5} />,
  'Quizzes':         <HelpCircle size={24} strokeWidth={1.5} />,
  'Assignments':     <ClipboardList size={24} strokeWidth={1.5} />,
  'Past Papers':     <Archive size={24} strokeWidth={1.5} />,
  'Lab Manuals':     <FlaskConical size={24} strokeWidth={1.5} />,
  'Lab Tasks':       <Terminal size={24} strokeWidth={1.5} />,
  'Lab Reports':     <ClipboardCheck size={24} strokeWidth={1.5} />,
  'Reference':       <Library size={24} strokeWidth={1.5} />,
};

const Bookmarks = ({ user, onSignIn }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();
  const { copiedId, msg, copyLink } = useCopyLink();

  useEffect(() => {
    if (!user) { setBookmarks([]); return; }
    setLoading(true);
    api.get('/bookmarks')
      .then(res => { if (res.data.success) setBookmarks(res.data.bookmarks); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const removeBookmark = async (fileId) => {
    // Optimistic remove
    setBookmarks(prev => prev.filter(b => b.file_id !== fileId));
    try {
      await api.delete(`/bookmarks/${fileId}`);
    } catch {
      // Refetch on failure
      api.get('/bookmarks').then(res => { if (res.data.success) setBookmarks(res.data.bookmarks); });
    }
  };

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', background: 'var(--bg-subtle)' }}>
      <div className="page-container">
        <ScrollReveal>
          <div style={{ marginBottom: '48px' }}>
            <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              My <span className="gradient-text">Bookmarks</span> <Bookmark size={40} color="var(--primary)" />
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px' }}>
              Your personally curated collection of saved resources.
            </p>
          </div>
        </ScrollReveal>

        {!user ? (
          <ScrollReveal delay="reveal-delay-1">
            <div style={{ background: 'var(--bg-white)', borderRadius: 'var(--radius-xl)', border: '2px solid var(--text)', boxShadow: 'var(--shadow-md)', padding: '80px 32px', textAlign: 'center' }}>
              <div style={{ marginBottom: '24px', color: 'var(--text-light)', display: 'flex', justifyContent: 'center' }}><Lock size={64} strokeWidth={1.5} /></div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>Account Required</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Please sign in to view and manage your saved resources.</p>
              <button className="btn-primary" onClick={onSignIn}>Sign In Now</button>
            </div>
          </ScrollReveal>
        ) : loading ? (
          <LoadingSpinner message="Loading your library..." />
        ) : bookmarks.length === 0 ? (
          <ScrollReveal delay="reveal-delay-1">
            <div style={{ background: 'var(--bg-white)', borderRadius: 'var(--radius-xl)', border: '2px solid var(--text)', boxShadow: 'var(--shadow-md)', padding: '60px 32px', textAlign: 'center' }}>
              {/* Open book with bookmark ribbon SVG */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left page */}
                  <path d="M60 20 L60 85 Q40 78 15 80 L15 20 Q40 18 60 20Z" fill="var(--bg-subtle)" stroke="var(--border)" strokeWidth="2.5"/>
                  {/* Right page */}
                  <path d="M60 20 L60 85 Q80 78 105 80 L105 20 Q80 18 60 20Z" fill="var(--bg-subtle)" stroke="var(--border)" strokeWidth="2.5"/>
                  {/* Text lines left */}
                  <line x1="25" y1="35" x2="50" y2="35" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
                  <line x1="25" y1="45" x2="48" y2="45" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
                  <line x1="25" y1="55" x2="45" y2="55" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
                  {/* Bookmark ribbon */}
                  <path d="M78 12 L78 45 L85 38 L92 45 L92 12Z" fill="var(--primary)" stroke="var(--border)" strokeWidth="2" opacity="0.85"/>
                  {/* Spine */}
                  <line x1="60" y1="20" x2="60" y2="85" stroke="var(--border)" strokeWidth="2.5"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>Your bookmarks are empty</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '360px', margin: '0 auto 32px' }}>Bookmark useful files while browsing courses to see them here.</p>
              <button className="btn-primary" onClick={() => navigate('/courses')}>Browse Courses</button>
            </div>
          </ScrollReveal>
        ) : (
          <div className="bookmarks-grid">
            {bookmarks.map((file, i) => (
              <ScrollReveal key={file.file_id} delay={`reveal-delay-${(i % 3) + 1}`}>
                <div style={{ background: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--text)', boxShadow: '4px 4px 0px var(--text)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>

                  {/* Remove button */}
                  <button
                    onClick={() => removeBookmark(file.file_id)}
                    style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5, transition: '0.2s' }}
                    onMouseOver={e => e.target.style.opacity = 1}
                    onMouseOut={e => e.target.style.opacity = 0.5}
                    title="Remove from Library"
                  >✕</button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 48, height: 48, background: 'var(--bg-subtle)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      {CATEGORY_ICONS[file.category] || <FileText size={24} strokeWidth={1.5} />}
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
                        {(file.file_size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem', padding: '10px' }}
                    >
                      Download
                    </a>
                    <CopyLinkButton
                      id={file.file_id}
                      url={file.file_url}
                      copyLink={copyLink}
                      copiedId={copiedId}
                      msg={msg}
                      style={{ flex: 1 }}
                    />
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
