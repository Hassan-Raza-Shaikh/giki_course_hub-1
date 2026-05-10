import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import api from './services/api';

import Navbar      from './components/Navbar';
import LoginModal  from './components/LoginModal';
import Landing     from './pages/Landing';
import Courses     from './pages/Courses';
import CoursePage  from './pages/CoursePage';
import Bookmarks   from './pages/Bookmarks';
import GlobalSearch from './pages/GlobalSearch';
import AdminPanel  from './pages/AdminPanel';
import ReportIssue from './pages/ReportIssue';
import { ThemeProvider } from './context/ThemeContext';


const App = () => {
  const [user, setUser]           = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading]     = useState(true);

  // Restore session on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          let attempts = 0;
          const maxAttempts = 20;

          const syncAuth = async () => {
            try {
              const res = await api.post('/auth/firebase', {
                idToken, uid: fbUser.uid, email: fbUser.email,
                displayName: fbUser.displayName, photoURL: fbUser.photoURL,
              });
              if (res.data.success) {
                setUser({ ...res.data.user, displayName: res.data.user.displayName || fbUser.displayName, photoURL: res.data.user.photoURL || fbUser.photoURL, email: fbUser.email });
                setLoading(false);
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(syncAuth, 3000);
              } else {
                setLoading(false);
              }
            } catch (err) {
              if (attempts < maxAttempts) {
                attempts++;
                setTimeout(syncAuth, 3000);
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
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = () => setShowLogin(true);
  const handleSignOut = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '4rem', animation: 'float 2s ease-in-out infinite', marginBottom: '24px' }}>📚</div>
          <h2 style={{ fontWeight: 900, color: 'var(--primary)', fontFamily: 'Outfit', fontSize: '1.5rem', marginBottom: '12px' }}>Initializing GIKI Hub...</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Waking up the server. This may take up to 30 seconds if the site hasn't been visited in a while.
          </p>
          <div style={{ marginTop: '32px', height: '6px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', background: 'var(--primary)', borderRadius: '10px', animation: 'loading-bar 2s infinite ease-in-out' }} />
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
    <ThemeProvider>
      <Router>
        <Navbar user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />

        {showLogin && (
          <LoginModal
            onClose={() => setShowLogin(false)}
            onSuccess={(u) => { setUser(u); setShowLogin(false); }}
          />
        )}

        <Routes>
          <Route path="/"           element={<Landing user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />} />
          <Route path="/courses"    element={<Courses />} />
          <Route path="/course/:id" element={<CoursePage user={user} onSignIn={handleSignIn} />} />
          <Route path="/bookmarks"  element={<Bookmarks user={user} onSignIn={handleSignIn} />} />
          <Route path="/search"     element={<GlobalSearch user={user} onSignIn={handleSignIn} />} />
          <Route path="/admin"      element={user?.role === 'admin' ? <AdminPanel user={user} /> : <Navigate to="/" replace />} />
          <Route path="/report-issue" element={<ReportIssue user={user} />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
