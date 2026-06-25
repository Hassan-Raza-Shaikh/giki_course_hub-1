import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import IconMapper from '../components/IconMapper';
import {
  FileText, FileEdit, Presentation, HelpCircle,
  ClipboardList, FlaskConical, Terminal, Library, Search, ChevronDown
} from 'lucide-react';

const RESOURCE_TYPES = [
  { icon: <FileText size={16} strokeWidth={1.5} />, label: 'Outline',         desc: 'Course outlines and curriculum details.' },
  { icon: <FileEdit size={16} strokeWidth={1.5} />, label: 'Notes',           desc: 'Lecture notes and student-made summaries.' },
  { icon: <Presentation size={16} strokeWidth={1.5} />, label: 'Slides',          desc: 'Official lecture presentations and slides.' },
  { icon: <HelpCircle size={16} strokeWidth={1.5} />, label: 'Quizzes',         desc: 'Past quizzes and practice questions.' },
  { icon: <ClipboardList size={16} strokeWidth={1.5} />, label: 'Assignments',     desc: 'Assignment tasks and reference solutions.' },
  { icon: <FlaskConical size={16} strokeWidth={1.5} />, label: 'Lab Manuals',     desc: 'Lab instructions and manual documents.' },
  { icon: <Terminal size={16} strokeWidth={1.5} />, label: 'Lab Tasks',       desc: 'Specific lab exercises and task sheets.' },
  { icon: <Library size={16} strokeWidth={1.5} />, label: 'Reference',       desc: 'Recommended textbooks and study guides.' },
];

const YEAR_LABELS = { 1: 'Year 1', 2: 'Year 2', 3: 'Year 3', 4: 'Year 4' };

// ── Single course row inside a year ──────────────────────────────────────────
const CourseRow = ({ course, onClick }) => (
  <div
    onClick={() => onClick(course.course_id || course.id || course.code)}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 20px',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'background 0.15s',
    }}
    onMouseOver={e => e.currentTarget.style.background = '#FAF5FF'}
    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
  >
    <div style={{
      minWidth: '48px', fontSize: '0.72rem', fontWeight: 800,
      color: 'var(--secondary)', border: '1px solid var(--border)', background: 'var(--bg-subtle)',
      padding: '4px 8px', borderRadius: '6px', textAlign: 'center',
      letterSpacing: '0.02em', lineHeight: 1.2,
    }}>
      {course.code}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem', lineHeight: 1.3 }}>
        {course.name}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
        Semester {course.semester}
      </div>
    </div>
    <span style={{ color: 'var(--electric)', flexShrink: 0, fontSize: '1rem' }}>→</span>
  </div>
);

// ── Year sub-section inside a program ─────────────────────────────────────────
const YearSection = ({ year, semesters, onCourseClick, programId }) => {
  const storageKey = `courses_year_${programId}_${year}`;
  const [open, setOpen] = useState(() => {
    try { return sessionStorage.getItem(storageKey) === 'true'; }
    catch { return false; }
  });

  const toggle = () => setOpen(o => {
    const next = !o;
    try { sessionStorage.setItem(storageKey, next); } catch {}
    return next;
  });
  const allCourses = semesters.flatMap(s => s.courses || []);
  const bySem = semesters.reduce((acc, s) => { acc[s.semester] = s.courses || []; return acc; }, {});

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <div
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 28px', cursor: 'pointer',
          background: open ? 'var(--bg-subtle)' : 'transparent',
          transition: 'background 0.2s',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-primary)', fontWeight: 900, color: 'var(--text)', fontSize: '0.85rem',
            border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            Y{year}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
              {YEAR_LABELS[year]} &mdash; <span style={{ whiteSpace: 'nowrap' }}>Semesters {semesters[0].semester} & {semesters[semesters.length - 1].semester}</span>
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {allCourses.length} courses
            </span>
          </div>
        </div>
        <span style={{ transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'none', color: 'var(--electric)', display: 'flex', alignItems: 'center' }}><ChevronDown size={20} strokeWidth={2.5} /></span>
      </div>

      {open && (
        <div style={{ padding: '8px 16px 16px' }}>
          {semesters.map(sem => (
            <div key={sem.semester}>
              <div style={{
                padding: '8px 16px',
                fontSize: '0.72rem', fontWeight: 800,
                color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.1em',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <div style={{ height: 1, flex: 1, background: 'rgba(124,58,237,0.15)' }} />
                Semester {sem.semester}
                <div style={{ height: 1, flex: 1, background: 'rgba(124,58,237,0.15)' }} />
              </div>
              {sem.courses.map(course => (
                <CourseRow key={course.course_id || course.id || course.code} course={course} onClick={onCourseClick} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Program accordion inside a faculty ────────────────────────────────────────
const ProgramAccordion = ({ program, onCourseClick }) => {
  const storageKey = `courses_prog_${program.id}`;
  const [open, setOpen] = useState(() => {
    try { return sessionStorage.getItem(storageKey) === 'true'; }
    catch { return false; }
  });

  const toggle = () => setOpen(o => {
    const next = !o;
    try { sessionStorage.setItem(storageKey, next); } catch {}
    return next;
  });
  const totalCourses = program.years.reduce((acc, y) => acc + y.semesters.reduce((a, s) => a + (s.courses ? s.courses.length : 0), 0), 0);

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--bg-white)',
    }}>
      <div
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', cursor: 'pointer',
          background: open ? 'var(--bg-subtle)' : 'var(--bg-white)',
          transition: 'background 0.2s',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = 'var(--bg-white)'; }}
      >
        <div>
          <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem', fontFamily: 'var(--font-primary)' }}>
            {program.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            {program.years.length} years · {totalCourses} courses
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
            color: open ? 'white' : 'var(--text)',
            background: open ? 'var(--primary)' : 'var(--bg-white)', border: '1px solid var(--border)',
            padding: '4px 12px', borderRadius: '100px', transition: 'all 0.2s',
          }}>
            {open ? 'Collapse' : 'Expand'}
          </span>
          <span style={{ color: open ? 'white' : 'var(--electric)', transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'none', display: 'flex', alignItems: 'center' }}><ChevronDown size={20} strokeWidth={2.5} /></span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {program.years.map(yr => (
            <YearSection
              key={yr.year}
              year={yr.year}
              programId={program.id}
              semesters={yr.semesters}
              onCourseClick={onCourseClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Faculty top-level accordion ───────────────────────────────────────────────
const FacultyAccordion = ({ faculty, onCourseClick, defaultOpen }) => {
  const storageKey = `courses_fac_${faculty.id}`;
  const [open, setOpen] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved !== null ? saved === 'true' : (defaultOpen || false);
    } catch { return defaultOpen || false; }
  });

  const toggle = () => setOpen(o => {
    const next = !o;
    try { sessionStorage.setItem(storageKey, next); } catch {}
    return next;
  });
  const totalCourses = faculty.programs.reduce(
    (acc, p) => acc + p.years.reduce((a, y) => a + y.semesters.reduce((x, s) => x + (s.courses ? s.courses.length : 0), 0), 0), 0
  );

  return (
    <div style={{
      border: '2px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--bg-white)',
      boxShadow: open ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      transition: 'box-shadow 0.3s',
    }}>
      {/* Faculty Header */}
      <div
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'clamp(16px, 4vw, 28px) clamp(16px, 4vw, 32px)', cursor: 'pointer',
          background: open ? 'var(--primary)' : 'var(--bg-white)',
          transition: 'background 0.3s',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = 'var(--bg-white)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: 54, height: 54, borderRadius: '14px',
            background: 'var(--bg-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', transition: 'all 0.3s',
            border: '1px solid var(--border)',
            boxShadow: open ? '0 6px 16px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}><IconMapper emoji={faculty.icon} size={28} /></div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-primary)', fontWeight: 900, fontSize: '1.25rem', color: open ? 'white' : 'var(--primary)' }}>
              {faculty.name}
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px', color: open ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}>
              {faculty.full_name}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.75rem', fontWeight: 700,
                color: open ? 'rgba(255,255,255,0.9)' : '#06B6D4',
                background: open ? 'rgba(255,255,255,0.15)' : 'rgba(6,182,212,0.1)',
                padding: '3px 10px', borderRadius: '100px',
              }}>
                {faculty.programs.length} Programs
              </span>
              <span style={{
                fontSize: '0.75rem', fontWeight: 700,
                color: open ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)',
                background: open ? 'rgba(255,255,255,0.15)' : 'var(--bg-subtle)',
                padding: '3px 10px', borderRadius: '100px',
              }}>
                {totalCourses} Courses
              </span>
            </div>
          </div>
        </div>

        <div style={{
          width: 36, height: 36, borderRadius: '10px',
          background: open ? 'rgba(255,255,255,0.18)' : 'var(--bg-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', transition: 'all 0.3s', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none',
          color: open ? 'white' : 'var(--electric)',
        }}>
          <ChevronDown size={20} strokeWidth={2.5} />
        </div>
      </div>

      {/* Programs list */}
      {open && (
        <div style={{ padding: '24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-white)' }}>
          {faculty.programs.map(prog => (
            <ProgramAccordion key={prog.id} program={prog} onCourseClick={onCourseClick} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Courses Page ─────────────────────────────────────────────────────────
const Courses = () => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // Wait up to 60 seconds (20 * 3s)

    const fetchWithRetry = () => {
      attempts++;
      api.get('/courses')
        .then(res => {
          if (res.data.success) {
            setFaculties(res.data.faculties || []);
            setLoading(false);
          } else if (attempts < maxAttempts) {
            setTimeout(fetchWithRetry, 3000);
          } else {
            setLoading(false);
          }
        })
        .catch(() => {
          if (attempts < maxAttempts) {
            setTimeout(fetchWithRetry, 3000);
          } else {
            setLoading(false);
          }
        });
    };

    fetchWithRetry();
  }, []);

  const handleCourseClick = (courseId) => navigate(`/course/${courseId}`);

  // Simple search filter — flatten all courses and show matched ones
  const searchResults = search.trim().length > 1
    ? faculties.flatMap(f =>
        f.programs.flatMap(p =>
          p.years.flatMap(y =>
            y.semesters.flatMap(s =>
              s.courses
                .filter(c =>
                  c.name.toLowerCase().includes(search.toLowerCase()) ||
                  c.code.toLowerCase().includes(search.toLowerCase())
                )
                .map(c => ({ ...c, faculty: f.name, program: p.name }))
            )
          )
        )
      )
    : null;

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
            <Library size={40} strokeWidth={2.5} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px 0', lineHeight: 1.1 }}>
              All Courses by Faculty
            </h1>
            <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              Browse the complete GIKI course catalog organized by faculty, program, and year.
            </p>
          </div>
        </div>
            <div style={{ position: 'relative', maxWidth: '480px' }}>
              <span style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--text-muted)' }}><Search size={18} /></span>
              <input
                type="text"
                placeholder="Search by course name or code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '16px 16px 16px 56px',
                  borderRadius: '100px', border: '1px solid var(--border)', outline: 'none',
                  fontSize: '0.95rem', background: 'var(--bg-card)',
                  color: 'var(--text)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', transition: 'all 0.3s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.05)'; }}
              />
              <style>{`input::placeholder { color: var(--text-muted); }`}</style>
            </div>


          {/* Resource type chips */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '36px', flexWrap: 'wrap' }}>
            {RESOURCE_TYPES.map(rt => {
              const slug = rt.label.toLowerCase().replace(' ', '-');
              return (
                <Link to={`/category/${slug}`} key={rt.label} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  padding: '8px 16px', borderRadius: '100px',
                  fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'transform 0.15s, box-shadow 0.15s'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--primary)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text)';
                }}
                >
                  {rt.icon} {rt.label}
                </Link>
              );
            })}
          </div>
        </div>

      {/* ── Search Results ──────────────────────────────────────── */}
      {searchResults && (
        <div className="page-container" style={{ padding: '40px 24px 0' }}>
          <div style={{ background: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontFamily: 'var(--font-primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} /> {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
            </div>
            {searchResults.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No courses found.</div>
            ) : (
              searchResults.map(course => (
                <div key={`${course.course_id || course.id || course.code}-${course.program}`} style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px' }}>
                  <CourseRow course={course} onClick={handleCourseClick} />
                  <div style={{ paddingLeft: '62px', fontSize: '0.75rem', color: 'var(--tertiary)', fontWeight: 600, marginTop: '-6px', marginBottom: '4px' }}>
                    {course.faculty} · {course.program}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Faculty Accordions ──────────────────────────────────── */}
      {!searchResults && (
        <div className="page-container" style={{ padding: '64px 24px 80px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <LoadingSpinner message="Loading Courses..." />
          ) : (
            faculties.map((faculty, i) => (
              <ScrollReveal key={faculty.id} delay={`reveal-delay-${Math.min((i % 3) + 1, 3)}`}>
                <FacultyAccordion
                  faculty={faculty}
                  onCourseClick={handleCourseClick}
                  defaultOpen={i === 0}
                />
              </ScrollReveal>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Courses;
