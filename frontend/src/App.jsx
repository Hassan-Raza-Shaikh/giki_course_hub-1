import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


import Navbar      from './components/Navbar';
import LoginModal  from './components/LoginModal';
import Landing     from './pages/Landing';
import Courses     from './pages/Courses';
import CoursePage  from './pages/CoursePage';
import Bookmarks   from './pages/Bookmarks';
import GlobalSearch from './pages/GlobalSearch';

const App = () => {
  const [user, setUser]           = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  const handleSignIn = () => setShowLogin(true);
  const handleSignOut = () => setUser(null);

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
        <Route path="/"           element={<Landing     onSignIn={handleSignIn} />} />
        <Route path="/courses"    element={<Courses />} />
        <Route path="/course/:id" element={<CoursePage user={user} onSignIn={handleSignIn} />} />
        <Route path="/bookmarks"  element={<Bookmarks user={user} onSignIn={handleSignIn} />} />
        <Route path="/search"     element={<GlobalSearch user={user} onSignIn={handleSignIn} />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
