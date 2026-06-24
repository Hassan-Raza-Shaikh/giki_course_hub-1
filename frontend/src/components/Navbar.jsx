import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Upload, BookOpen, Search, Bookmark, Sun, Moon, Cloud, LogIn, SunDim, Gamepad2, Ghost, Box, Terminal, Palette, Droplet, Flag, Shield, LogOut, Snowflake, Flame, Crown, UploadCloud, Trophy, User, Star, Swords, Github, Square, MessageSquare, Sunset, Coffee, Activity, Tv, Heart, TreePine, Waves, Sparkles, Circle, CircleDot, Calculator } from 'lucide-react';
import { BatIcon, PacmanIcon, PokeballIcon, MushroomIcon, TriforceIcon, MatrixIcon, RingIcon, DonutIcon, BlockIcon } from './ThemeIcons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';


const Navbar = ({ onSignIn, onSignOut, user }) => {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [stats, setStats]         = useState(null);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef(null);
  const navigate = useNavigate();
  const menuRef  = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch stats whenever the dashboard is opened
  useEffect(() => {
    if (menuOpen && user) {
      api.get('/me/stats')
        .then(res => { if (res.data.success) setStats(res.data); })
        .catch(() => {});
    }
  }, [menuOpen, user]);

  // Check admin status whenever user changes
  useEffect(() => {
    if (user) {
      api.get('/admin/check')
        .then(res => setIsAdmin(res.data.is_admin))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'light', name: 'Light', icon: <Sun size={14} /> },
    { id: 'dark', name: 'Dark', icon: <Moon size={14} /> },
    { id: 'mario', name: 'Mario', icon: <MushroomIcon size={14} /> },
    { id: 'batman', name: 'Batman', icon: <BatIcon size={14} /> },
    { id: 'nord', name: 'Nord', icon: <Cloud size={14} /> },
    { id: 'solarized', name: 'Solarized', icon: <SunDim size={14} /> },
    { id: 'dracula', name: 'Dracula', icon: <Droplet size={14} /> },
    { id: 'retro', name: 'Retro', icon: <Gamepad2 size={14} /> },
    { id: 'pacman', name: 'Pac-Man', icon: <PacmanIcon size={14} /> },
    { id: 'minecraft', name: 'Minecraft', icon: <BlockIcon size={14} /> },
    { id: 'matrix', name: 'Matrix', icon: <MatrixIcon size={14} /> },
    { id: 'cyberpunk', name: 'Cyberpunk', icon: <Palette size={14} /> },
    { id: 'zelda', name: 'Zelda', icon: <TriforceIcon size={14} /> },
    { id: 'gh-dark', name: 'Dev Dark', icon: <Github size={14} /> },
    { id: 'minimal', name: 'Minimal', icon: <Square size={14} /> },
    { id: 'discord', name: 'Midnight', icon: <MessageSquare size={14} /> },
    { id: 'vaporwave', name: 'Vaporwave', icon: <Sunset size={14} /> },
    { id: 'gruvbox', name: 'Gruvbox', icon: <Coffee size={14} /> },
    { id: 'space', name: 'Space', icon: <Sparkles size={14} /> },
    { id: 'frozen', name: 'Frozen', icon: <Snowflake size={14} /> },
    { id: 'fire', name: 'Fire', icon: <Flame size={14} /> },
    { id: 'lotr', name: 'LOTR', icon: <RingIcon size={14} /> },
    { id: 'snake', name: 'Snake', icon: <Activity size={14} /> },
    { id: 'simpsons', name: 'Simpsons', icon: <DonutIcon size={14} /> },
    { id: 'barbie', name: 'Barbie', icon: <Heart size={14} /> },
    { id: 'forest', name: 'Forest', icon: <TreePine size={14} /> },
    { id: 'ocean', name: 'Ocean', icon: <Waves size={14} /> },
    { id: 'pokemon', name: 'Pokémon', icon: <PokeballIcon size={14} /> }
  ];

  const currentThemeObj = themes.find(t => t.id === theme) || themes[0];

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-logo" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          background: 'var(--primary)', color: 'var(--nav-btn-text)', 
          padding: '4px 8px', borderRadius: '8px', 
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          lineHeight: 1, letterSpacing: '0.02em', fontSize: '0.9rem'
        }}>
          GIKI
        </div>
        <span style={{ color: 'var(--text)', fontWeight: 900, fontSize: '1rem' }}>HUB</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Creative Theme Toggle */}
        <div ref={themeMenuRef} style={{ position: 'relative' }}>
          <button
            className="btn-nav"
            onClick={() => setThemeMenuOpen(o => !o)}
            style={{ background: 'var(--accent)', color: 'var(--nav-btn-text)', display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            <span className="hide-mobile" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {currentThemeObj.name}
            </span>
            {currentThemeObj.icon}
          </button>

          {themeMenuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 12px)', right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '20px', 
              boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 0 0 1px color-mix(in srgb, var(--primary) 10%, transparent)',
              width: '180px', maxHeight: '75vh', overflowY: 'auto', overflowX: 'hidden',
              zIndex: 9999, display: 'flex', flexDirection: 'column'
            }}>
              {/* Top accent */}
              <div style={{ height: '4px', background: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column' }}>
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setThemeMenuOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '10px 12px',
                    background: theme === t.id ? 'var(--bg-subtle)' : 'transparent',
                    border: 'none', borderRadius: '8px',
                    textAlign: 'left', cursor: 'pointer',
                    color: 'var(--text)', fontWeight: 700, fontSize: '0.85rem',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseOut={e => e.currentTarget.style.background = theme === t.id ? 'var(--bg-subtle)' : 'transparent'}
                >
                  <span style={{ color: 'var(--primary)' }}>{t.icon}</span>
                  {t.name}
                </button>
              ))}
              </div>
            </div>
          )}
        </div>

        <button
          className="hide-mobile btn-nav"
          onClick={() => navigate('/upload')}
          style={{ background: 'color-mix(in srgb, var(--primary) 85%, var(--electric))', color: 'var(--nav-btn-text)' }}
        >
          <Upload size={16} strokeWidth={2.5} /> Upload
        </button>

        <button
          className="hide-mobile btn-nav"
          onClick={() => navigate('/courses')}
          style={{ background: 'color-mix(in srgb, var(--secondary) 85%, var(--primary))', color: 'var(--nav-btn-text)' }}
        >
          <BookOpen size={16} strokeWidth={2.5} /> Courses
        </button>

        <button
          className="hide-mobile btn-nav"
          onClick={() => navigate('/search')}
          style={{ background: 'color-mix(in srgb, var(--electric) 85%, var(--tertiary))', color: 'var(--nav-btn-text)' }}
        >
          <Search size={16} strokeWidth={2.5} /> Search
          <kbd style={{
            background: 'var(--bg-subtle)',
            border: '1.5px solid var(--border)',
            borderRadius: '5px',
            padding: '1px 6px',
            fontSize: '0.72rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: 0,
            lineHeight: 1.6,
            marginLeft: '2px',
          }}>/</kbd>
        </button>

        <button
          className="hide-mobile btn-nav"
          onClick={() => navigate('/bookmarks')}
          style={{ background: 'color-mix(in srgb, var(--tertiary) 85%, var(--accent))', color: 'var(--nav-btn-text)' }}
        >
          <Bookmark size={16} strokeWidth={2.5} /> Bookmarks
        </button>

        <button
          className="hide-mobile btn-nav"
          onClick={() => navigate('/leaderboard')}
          style={{ background: 'color-mix(in srgb, var(--accent) 85%, var(--secondary))', color: 'var(--nav-btn-text)' }}
        >
          <Trophy size={16} strokeWidth={2.5} /> Leaderboard
        </button>

        <button
          className="hide-mobile btn-nav"
          onClick={() => navigate('/calculator')}
          style={{ background: 'color-mix(in srgb, var(--primary) 80%, var(--bg-white))', color: 'var(--nav-btn-text)' }}
        >
          <Calculator size={16} strokeWidth={2.5} /> GPA Calculator
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {user ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            {/* Trigger pill */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                height: 44, padding: '0 12px', gap: '8px', borderRadius: '14px',
                border: '2px solid var(--primary)', background: 'color-mix(in srgb, var(--primary) 10%, var(--bg-card))',
                color: 'var(--text)', fontWeight: 800, fontSize: '0.95rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
              }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
              ) : (
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--nav-btn-text)' }}>
                  {(user.displayName || user.username || '?')[0].toUpperCase()}
                </span>
              )}
              <span className="hide-mobile">
                {(user.displayName || user.username)?.split(' ')[0]}
              </span>
              <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{menuOpen ? '▲' : '▼'}</span>
            </button>

            {/* Dashboard panel */}
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '24px', 
                boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 0 0 1px color-mix(in srgb, var(--primary) 10%, transparent)',
                width: 'min(280px, calc(100vw - 24px))',
                maxHeight: 'calc(100dvh - 160px)',
                overflowY: 'auto',
                zIndex: 9999,
                overflow: 'hidden'
              }}>
                {/* Top accent */}
                <div style={{ height: '5px', background: 'linear-gradient(90deg, var(--primary), var(--electric))' }} />

                {/* Profile header */}
                <div style={{ 
                  padding: '20px 20px 16px', 
                  borderBottom: '1px solid var(--border)',
                  background: 'linear-gradient(to bottom, color-mix(in srgb, var(--primary) 6%, transparent), transparent)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: 'var(--nav-btn-text)', flexShrink: 0 }}>
                        {(user.displayName || user.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.displayName || user.username}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.email}
                      </div>
                      {user.program && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.program}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Batch/Student ID badges */}
                  {(user.batchYear || user.studentId) && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {user.batchYear && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', background: 'var(--bg-subtle)', color: 'var(--primary)', borderRadius: '100px', border: '1px solid var(--border)' }}>
                          Batch '{String(user.batchYear).slice(-2)}
                        </span>
                      )}
                      {user.studentId && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', background: 'var(--bg-subtle)', color: '#10B981', borderRadius: '100px', border: '1px solid var(--border)' }}>
                          #{user.studentId}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { icon: <Upload size={16}/>, label: 'Uploads',   val: stats?.uploads   ?? '—' },
                    { icon: <Bookmark size={16}/>, label: 'Bookmarks', val: stats?.bookmarks ?? '—' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '12px 16px', textAlign: 'center', borderRight: s.label === 'Uploads' ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize: '1.1rem' }}>{s.icon}</div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text)', lineHeight: 1.2 }}>{s.val}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Quick links */}
                {[
                  { icon: <User size={16}/>, label: 'My Profile',   action: () => { setMenuOpen(false); navigate(`/u/${user.username}`); } },
                  { icon: <Trophy size={16}/>, label: 'Leaderboard',   action: () => { setMenuOpen(false); navigate('/leaderboard'); } },
                  { icon: <Cloud size={16}/>, label: 'Global Upload',   action: () => { setMenuOpen(false); navigate('/upload'); } },
                  { icon: <UploadCloud size={16}/>, label: 'My Uploads', action: () => { setMenuOpen(false); navigate('/my-uploads'); } },
                  { icon: <Bookmark size={16}/>, label: 'My Bookmarks',    action: () => { setMenuOpen(false); navigate('/bookmarks'); } },
                  { icon: <Calculator size={16}/>, label: 'GPA Calculator',  action: () => { setMenuOpen(false); navigate('/calculator'); } },
                  { icon: <Search size={16}/>, label: 'Global Search', badge: '/', action: () => { setMenuOpen(false); navigate('/search'); } },
                  { icon: <BookOpen size={16}/>, label: 'All Courses', action: () => { setMenuOpen(false); navigate('/courses'); } },
                  { icon: <Flag size={16}/>, label: 'Report an Issue', action: () => { setMenuOpen(false); navigate('/report-issue'); } },
                ].map(link => (
                  <button key={link.label} onClick={link.action}
                    style={{ width: '100%', padding: '11px 20px', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s', borderBottom: '1px solid var(--border)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '1rem' }}>{link.icon}</span>
                    {link.label}
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {link.badge && (
                        <kbd style={{
                          background: 'var(--bg-subtle)', border: '1.5px solid var(--border)',
                          borderRadius: '5px', padding: '1px 6px', fontSize: '0.72rem',
                          fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.6
                        }}>{link.badge}</kbd>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
                    </span>
                  </button>
                ))}

                {/* Admin panel link — only for admins */}
                {isAdmin && (
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/admin'); }}
                    style={{ width: '100%', padding: '12px 20px', background: 'none', border: 'none', borderTop: '1px solid var(--border)', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                  >
                    <span><Shield size={16}/></span> Admin Panel
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
                  </button>
                )}

                {/* Sign out */}
                <button
                  onClick={() => { setMenuOpen(false); onSignOut(); }}
                  style={{ width: '100%', padding: '12px 20px', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                >
                  <span><LogOut size={16}/></span> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn-nav"
            onClick={onSignIn}
            style={{ background: 'var(--bg-white)', color: 'var(--text)' }}
          >
            <LogIn size={16} strokeWidth={2.5} /> Sign In
          </button>
        )}
      </div>
    </div>
  </nav>
  );
};

/* ─── Mobile Bottom Tab Bar ──────────────────────────────── */
const MobileTabBar = ({ user, onSignIn }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const p = location.pathname;

  const tabs = [
    { label: 'Upload',      icon: <Upload size={20} strokeWidth={2} />,    path: '/upload',      color: 'color-mix(in srgb, var(--primary) 85%, var(--electric))' },
    { label: 'Courses',     icon: <BookOpen size={20} strokeWidth={2} />,  path: '/courses',     color: 'color-mix(in srgb, var(--secondary) 85%, var(--primary))' },
    { label: 'Search',      icon: <Search size={20} strokeWidth={2} />,    path: '/search',      color: 'color-mix(in srgb, var(--electric) 85%, var(--tertiary))' },
    { label: 'Bookmarks',   icon: <Bookmark size={20} strokeWidth={2} />,  path: '/bookmarks',   color: 'color-mix(in srgb, var(--tertiary) 85%, var(--accent))' },
    { label: 'Leaderboard', icon: <Trophy size={20} strokeWidth={2} />,    path: '/leaderboard', color: 'color-mix(in srgb, var(--accent) 85%, var(--secondary))' },
    { label: 'GPA Calc',    icon: <Calculator size={20} strokeWidth={2} />,path: '/calculator',  color: 'color-mix(in srgb, var(--primary) 80%, var(--bg-white))' },
  ];

  return (
    <div className="mobile-tab-bar">
      {tabs.map(tab => {
        const active = p === tab.path || p.startsWith(tab.path + '/');
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="mob-tab-btn"
            style={{
              background: !active ? tab.color : 'var(--bg-card)',
              color: !active ? 'var(--nav-btn-text)' : tab.color,
              border: !active ? '1px solid transparent' : '1px solid var(--border)',
              boxShadow: active ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              transform: active ? 'translateY(-2px)' : 'none',
              opacity: !active ? 0.9 : 1,
              borderRadius: '12px'
            }}
          >
            {tab.icon}
          </button>
        );
      })}
    </div>
  );
};

const NavbarWithTabBar = (props) => (
  <>
    <Navbar {...props} />
    <MobileTabBar user={props.user} onSignIn={props.onSignIn} />
  </>
);

export default NavbarWithTabBar;


