import { BookOpen, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import api from './services/api';

import Navbar      from './components/Navbar';
import LoginModal  from './components/LoginModal';
import ProfileCompleteModal from './components/ProfileCompleteModal';
import { ToastProvider } from './components/Toast';
import BackToTop from './components/BackToTop';
import ThemeEffects from './components/ThemeEffects';

// Lazy loaded heavy routes to reduce initial bundle size
const Landing      = lazy(() => import('./pages/Landing'));
const Courses      = lazy(() => import('./pages/Courses'));
const CoursePage   = lazy(() => import('./pages/CoursePage'));
const Bookmarks    = lazy(() => import('./pages/Bookmarks'));
const GlobalSearch = lazy(() => import('./pages/GlobalSearch'));
const AdminPanel   = lazy(() => import('./pages/AdminPanel'));
const ReportIssue  = lazy(() => import('./pages/ReportIssue'));
const Leaderboard  = lazy(() => import('./pages/Leaderboard'));
const UserProfile  = lazy(() => import('./pages/UserProfile'));
const UploadPage   = lazy(() => import('./pages/UploadPage'));
const MyUploads    = lazy(() => import('./pages/MyUploads'));
const CategoryView = lazy(() => import('./pages/CategoryView'));
const Calculator   = lazy(() => import('./pages/GpaCalculator'));

const App = () => {
  const [user, setUser]           = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading]     = useState(true);

  // Restore session on mount
  useEffect(() => {
    let mountTime = Date.now();
    let hiddenTime = 0;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenTime = Date.now();
      } else if (document.visibilityState === 'visible') {
        // If coming back from background and we're stuck in loading state
        if (loading) {
          // If we were hidden for more than 60 seconds, or it's been loading for >60s total, force reload
          const timeSinceHidden = hiddenTime ? Date.now() - hiddenTime : 0;
          const totalLoadTime = Date.now() - mountTime;
          
          if (timeSinceHidden > 60000 || totalLoadTime > 60000) {
            console.log("App focused while stuck loading, forcing reload to prevent hang...");
            window.location.reload();
          }
        } else {
          // Normal background return, just ping auth to ensure session is active
          if (auth.currentUser) {
            auth.currentUser.getIdToken(true).catch(() => {}); // silent refresh
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          // Wrap getIdToken in a timeout so it doesn't hang indefinitely on bad mobile connections
          const idToken = await Promise.race([
            fbUser.getIdToken(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Token timeout")), 10000))
          ]);
          
          let attempts = 0;
          const maxAttempts = 15; // Max ~45 seconds of retries

          const syncAuth = async () => {
            try {
              // Add a 12s timeout to the boot-up sync to prevent indefinite hanging
              const res = await api.post('/auth/firebase', {
                idToken, uid: fbUser.uid, email: fbUser.email,
                displayName: fbUser.displayName, photoURL: fbUser.photoURL,
              }, { timeout: 12000 });

              if (res.data.success) {
                setUser({ ...res.data.user, displayName: res.data.user.displayName || fbUser.displayName, photoURL: res.data.user.photoURL || fbUser.photoURL, email: fbUser.email });
                setLoading(false);
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(syncAuth, 2500);
              } else {
                setLoading(false);
              }
            } catch (err) {
              if (attempts < maxAttempts) {
                attempts++;
                // Exponential-ish backoff or just steady retries
                const delay = Math.min(1000 + (attempts * 500), 5000);
                setTimeout(syncAuth, delay);
              } else {
                console.error("Auth sync failed:", err);
                setUser(null);
                setLoading(false);
              }
            }
          };
          syncAuth();
        } catch (err) {
          console.error("Auth initialization failed:", err);
          setUser(null);
          setLoading(false);
        }
      } else {
        api.get('/me', { timeout: 15000 }) // Faster timeout for unauthenticated check
          .then(res => {
            if (res.data.is_logged_in) {
              setUser(res.data.user);
            } else {
              setUser(null);
            }
          })
          .catch(() => setUser(null))
          .finally(() => setLoading(false));
      }
    });

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleSignIn = () => setShowLogin(true);
  const handleSignOut = async () => {
    try { 
      await signOut(auth); 
      await api.post('/logout').catch(() => {});
    } catch (e) { 
      console.error(e); 
    }
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '4.5rem', animation: 'float 2s ease-in-out infinite', marginBottom: '28px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }}><BookOpen size={64} color="var(--primary)" /></div>
          <h2 style={{ fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-primary)', fontSize: '1.6rem', marginBottom: '14px', letterSpacing: '-0.02em' }}>Initializing GIKI Hub...</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            Waking up the server. This may take up to 30 seconds if the site hasn't been visited in a while.
          </p>
          
          <div style={{ marginTop: '32px', height: '6px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', background: 'var(--electric)', borderRadius: '10px', animation: 'loading-bar 2s infinite ease-in-out' }} />
          </div>

          <div style={{ marginTop: '40px' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 800,
                color: 'var(--text)',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.08)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
            >
              <span><RefreshCw size={16} /></span> Refresh Page
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '16px', fontWeight: 600 }}>
              Stuck? Click refresh to try again.
            </p>
          </div>

          <style>{`
            @keyframes loading-bar {
              0% { left: -40%; width: 40%; }
              50% { width: 60%; }
              100% { left: 100%; width: 40%; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Router>
        <AppContent
          user={user}
          showLogin={showLogin}
          setShowLogin={setShowLogin}
          setUser={setUser}
          handleSignIn={handleSignIn}
          handleSignOut={handleSignOut}
        />
      </Router>
    </ToastProvider>
  );
};

// Inner component that lives inside <Router> so useNavigate works
const AppContent = ({ user, showLogin, setShowLogin, setUser, handleSignIn, handleSignOut }) => {
  const navigate = useNavigate();

  // Global '/' keyboard shortcut → navigate to search and auto-focus input
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const tag = document.activeElement?.tagName;
      const isEditable = document.activeElement?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;
      // Ignore if any modifier key is held
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        navigate('/search');
        // Small delay to let the page mount before focusing the input
        setTimeout(() => {
          const input = document.getElementById('global-search-input');
          if (input) input.focus();
        }, 80);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <>
      <ThemeEffects />
      <Navbar user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />
      <BackToTop />

      {/* Profile completion gate — shown to ALL users until program/batch is set */}
      {user && user.profileComplete === false && (
        <ProfileCompleteModal
          user={user}
          onComplete={(fields) => setUser(u => ({ ...u, ...fields, profileComplete: true }))}
        />
      )}

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(u) => { setUser(u); setShowLogin(false); }}
        />
      )}

      <Suspense fallback={
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hero)' }}>
          <div style={{ width: '200px', height: '4px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ width: '50%', height: '100%', background: 'var(--electric)', animation: 'slide 1.5s infinite ease-in-out', borderRadius: '4px' }} />
          </div>
          <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>LOADING GIKI HUB...</div>
        </div>
      }>
        <Routes>
          <Route path="/"           element={<Landing user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />} />
          <Route path="/courses"    element={<Courses />} />
          <Route path="/course/:id" element={<CoursePage user={user} onSignIn={handleSignIn} />} />
          <Route path="/upload"     element={<UploadPage user={user} onSignIn={handleSignIn} />} />
          <Route path="/my-uploads" element={<MyUploads user={user} />} />
          <Route path="/bookmarks"  element={<Bookmarks user={user} onSignIn={handleSignIn} />} />
          <Route path="/search"     element={<GlobalSearch user={user} onSignIn={handleSignIn} />} />
          <Route path="/calculator" element={<Calculator user={user} />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/u/:username" element={<UserProfile user={user} setUser={setUser} />} />
          <Route path="/category/:categorySlug" element={<CategoryView />} />
          <Route path="/admin"      element={<AdminPanel user={user} />} />
          <Route path="/report-issue" element={<ReportIssue user={user} />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
