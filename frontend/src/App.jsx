import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import api from './services/api';

// Layout & Pages
import Sidebar from './components/layout/Sidebar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import FileBrowser from './pages/FileBrowser';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Bookmarks from './pages/Bookmarks';
import Upload from './pages/Upload';

const AppContent = ({ user, loading }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isAuthPage = ['/', '/login', '/signup'].includes(location.pathname);

  // Close sidebar on route change for mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Hub...</div>;

  return (
    <div style={{ display: 'flex' }}>
      {!isAuthPage && (
        <Sidebar 
          user={user} 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      )}
      
      <main style={{ 
        flex: 1, 
        minHeight: '100vh', 
        backgroundColor: isAuthPage ? 'white' : '#fcfcfc',
        width: '100%'
      }} className={isAuthPage ? "" : "main-content"}>
        {!isAuthPage && (
          <header style={{ 
            height: '74px', 
            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button 
                onClick={() => setSidebarOpen(true)}
                className="mobile-only"
                style={{ fontSize: '1.8rem', color: 'var(--primary)', marginTop: '4px' }}
              >
                ≡
              </button>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                GIKI <span style={{ opacity: 0.3, margin: '0 8px' }}>//</span> <span style={{ color: 'var(--primary)' }}>{location.pathname.split('/')[1] || 'Dashboard'}</span>
              </div>
            </div>
            <div className="mobile-only" style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem', fontFamily: 'Outfit' }}>
              COURSE HUB
            </div>
          </header>
        )}
        
        <div style={{ padding: isAuthPage ? 0 : '24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/files" element={<FileBrowser />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/upload" element={<Upload />} />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      </main>

      <style>{`
        @media (min-width: 769px) {
          .main-content {
            margin-left: 260px;
          }
        }
      `}</style>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.get('/me');
      if (res.data.is_logged_in) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error("Auth check failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <AppContent user={user} loading={loading} />
    </Router>
  );
};

export default App;
