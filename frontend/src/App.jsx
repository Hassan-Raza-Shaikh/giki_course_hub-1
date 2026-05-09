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
          // Sync with backend to get our custom user object (role, student info, etc.)
          const res = await api.post('/auth/firebase', {
            idToken,
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
          });
          if (res.data.success) {
            setUser({
              ...res.data.user,
              displayName: res.data.user.displayName || fbUser.displayName,
              photoURL: res.data.user.photoURL || fbUser.photoURL,
              email: fbUser.email
            });
          }
        } catch (err) {
          console.error("Auth sync failed:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
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
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', animation: 'float 2s ease-in-out infinite' }}>📚</div>
          <p style={{ marginTop: '16px', fontWeight: 700, color: 'var(--text-muted)' }}>Initializing Hub...</p>
        </div>
      </div>
    );
  }

  return (
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
  );
};

export default App;
