import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, BookOpen, Search, Bookmark, Trophy, Calculator, CalendarDays, MoreHorizontal } from 'lucide-react';

// Desktop navbar links. `primary` links always show on desktop; the rest
// show from 1400px up and fold into the "More" menu between 769px and
// 1399px, where the bar runs out of room. To add a page, add an entry here
// (and to the user menu / MobileTabBar in Navbar.jsx if it belongs there).
export const NAV_LINKS = [
  { to: '/upload',      label: 'Upload',         icon: Upload,     primary: true, color: 'color-mix(in srgb, var(--primary) 85%, var(--electric))' },
  { to: '/courses',     label: 'Courses',        icon: BookOpen,   primary: true, color: 'color-mix(in srgb, var(--secondary) 85%, var(--primary))' },
  { to: '/search',      label: 'Search',         icon: Search,     primary: true, color: 'color-mix(in srgb, var(--electric) 85%, var(--tertiary))' },
  { to: '/bookmarks',   label: 'Bookmarks',      icon: Bookmark,   color: 'color-mix(in srgb, var(--tertiary) 85%, var(--accent))' },
  { to: '/leaderboard', label: 'Leaderboard',    icon: Trophy,     color: 'color-mix(in srgb, var(--accent) 85%, var(--secondary))' },
  { to: '/calculator',  label: 'GPA Calculator', icon: Calculator, color: 'color-mix(in srgb, var(--primary) 80%, var(--bg-white))' },
  { to: '/calendar',    label: 'Calendar',       icon: CalendarDays, color: 'color-mix(in srgb, var(--secondary) 80%, var(--accent))' },
];

const NavLinks = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const secondary = NAV_LINKS.filter(l => !l.primary);

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const close = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  return (
    <>
      {NAV_LINKS.map(({ to, label, icon: Icon, color, primary }) => (
        <button
          key={to}
          className={`hide-mobile btn-nav${primary ? '' : ' nav-link-secondary'}`}
          onClick={() => navigate(to)}
          aria-current={pathname === to ? 'page' : undefined}
          style={{ background: color, color: 'var(--nav-btn-text)' }}
        >
          <Icon size={16} strokeWidth={2.5} /> {label}
        </button>
      ))}

      <div ref={moreRef} className="nav-more" style={{ position: 'relative' }}>
        <button
          className="btn-nav"
          onClick={() => setMoreOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          style={{ background: 'var(--bg-card)', color: 'var(--text)' }}
        >
          <MoreHorizontal size={16} strokeWidth={2.5} /> More
        </button>

        {moreOpen && (
          <div role="menu" className="nav-more__menu">
            {secondary.map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                role="menuitem"
                className={`nav-more__item${pathname === to ? ' is-active' : ''}`}
                onClick={() => navigate(to)}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default NavLinks;
