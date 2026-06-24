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
            <Bookmark size={40} strokeWidth={2.5} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px 0', lineHeight: 1.1 }}>
              My Bookmarks
            </h1>
            <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              Your personally curated collection of bookmarked resources.
            </p>
          </div>
        </div>

        {!user ? (
          <ScrollReveal delay="reveal-delay-1">
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', padding: '80px 32px', textAlign: 'center' }}>
              <div style={{ marginBottom: '24px', color: 'var(--text-light)', display: 'flex', justifyContent: 'center' }}><Lock size={64} strokeWidth={1.5} /></div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>Account Required</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Please sign in to view and manage your bookmarked resources.</p>
              <button className="btn-primary" onClick={onSignIn}>Sign In Now</button>
            </div>
          </ScrollReveal>
        ) : loading ? (
          <LoadingSpinner message="Loading your library..." />
        ) : bookmarks.length === 0 ? (
          <ScrollReveal delay="reveal-delay-1">
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', padding: '60px 32px', textAlign: 'center' }}>
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
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>

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
