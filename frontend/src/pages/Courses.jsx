import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';

const RESOURCE_TYPES = [
  { icon: '📋', label: 'Outline',         desc: 'Course outlines and curriculum details.' },
  { icon: '📓', label: 'Notes',           desc: 'Lecture notes and student-made summaries.' },
  { icon: '🖥️', label: 'Slides',          desc: 'Official lecture presentations and slides.' },
  { icon: '📝', label: 'Quizzes',         desc: 'Past quizzes and practice questions.' },
  { icon: '📌', label: 'Assignments',     desc: 'Assignment tasks and reference solutions.' },
  { icon: '🔬', label: 'Lab Manuals',     desc: 'Lab instructions and manual documents.' },
  { icon: '🧪', label: 'Lab Tasks',       desc: 'Specific lab exercises and task sheets.' },
  { icon: '📚', label: 'Reference Books', desc: 'Recommended textbooks and study guides.' },
];

const YEAR_LABELS = { 1: 'Year 1', 2: 'Year 2', 3: 'Year 3', 4: 'Year 4' };

// ── Single course row inside a year ──────────────────────────────────────────
const CourseRow = ({ course, onClick }) => (
  <div
    onClick={() => onClick(course.id)}
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
      color: 'var(--secondary)', border: '1px solid var(--secondary)', background: 'white',
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
    <span style={{ color: 'var(--hot-pink)', flexShrink: 0, fontSize: '1rem' }}>→</span>
  </div>
);

// ── Year sub-section inside a program ─────────────────────────────────────────
const YearSection = ({ year, semesters, onCourseClick }) => {
  const [open, setOpen] = useState(false);
  const allCourses = semesters.flatMap(s => s.courses);
  const bySem = semesters.reduce((acc, s) => { acc[s.semester] = s.courses; return acc; }, {});

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <div
        onClick={() => setOpen(o => !o)}
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
            fontFamily: 'Outfit', fontWeight: 900, color: 'var(--text)', fontSize: '0.85rem',
            border: '2px solid var(--text)'
          }}>
            Y{year}
          </div>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
              {YEAR_LABELS[year]} &mdash; Semesters {semesters[0].semester} & {semesters[semesters.length - 1].semester}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
              {allCourses.length} courses
            </span>
          </div>
        </div>
        <span style={{ transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'none', color: 'var(--hot-pink)' }}>⌄</span>
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
                <CourseRow key={course.id} course={course} onClick={onCourseClick} />
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
  const [open, setOpen] = useState(false);
  const totalCourses = program.years.reduce((acc, y) => acc + y.semesters.reduce((a, s) => a + s.courses.length, 0), 0);

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'white',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', cursor: 'pointer',
          background: open ? 'var(--bg-subtle)' : 'white',
          transition: 'background 0.2s',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = 'white'; }}
      >
        <div>
          <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem', fontFamily: 'Outfit' }}>
            {program.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            {program.years.length} years · {totalCourses} courses
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: 700,
            color: open ? 'white' : 'var(--text)',
            background: open ? 'var(--primary)' : 'white', border: '1px solid var(--text)',
            padding: '4px 12px', borderRadius: '100px', transition: 'all 0.2s',
          }}>
            {open ? 'Collapse' : 'Expand'}
          </span>
          <span style={{ color: 'var(--hot-pink)', transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'none' }}>⌄</span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {program.years.map(yr => (
            <YearSection
              key={yr.year}
              year={yr.year}
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
  const [open, setOpen] = useState(defaultOpen || false);
  const totalCourses = faculty.programs.reduce(
    (acc, p) => acc + p.years.reduce((a, y) => a + y.semesters.reduce((x, s) => x + s.courses.length, 0), 0), 0
  );

  return (
    <div style={{
      border: '2px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'white',
      boxShadow: open ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      transition: 'box-shadow 0.3s',
    }}>
      {/* Faculty Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '28px 32px', cursor: 'pointer',
          background: open ? 'var(--primary)' : 'white',
          transition: 'background 0.3s',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = 'white'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: 54, height: 54, borderRadius: '14px',
            background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', transition: 'all 0.3s',
            border: '2px solid var(--text)',
            boxShadow: open ? '4px 4px 0px var(--text)' : '2px 2px 0px var(--text)',
          }}>
            {faculty.icon}
          </div>
          <div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.25rem', color: open ? 'white' : 'var(--primary)' }}>
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
          background: open ? 'rgba(255,255,255,0.18)' : '#FAF5FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', transition: 'all 0.3s', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none',
          color: open ? 'white' : 'var(--hot-pink)',
        }}>
          ⌄
        </div>
      </div>

      {/* Programs list */}
      {open && (
        <div style={{ padding: '24px', borderTop: '2px solid var(--text)', display: 'flex', flexDirection: 'column', gap: '12px', background: 'white' }}>
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
          if (res.data.success && res.data.faculties.length > 0) {
            setFaculties(res.data.faculties);
            setLoading(false);
          } else if (attempts < maxAttempts) {
            setTimeout(fetchWithRetry, 3000); // retry after 3s
          } else {
            setLoading(false);
          }
        })
        .catch(() => {
          if (attempts < maxAttempts) {
            setTimeout(fetchWithRetry, 3000); // retry after 3s on error
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
    <div style={{ paddingTop: '70px', minHeight: '100vh', background: 'var(--bg-subtle)' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-hero)',
        padding: '80px 0 100px', borderBottom: '2px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 400, height: 400, background: 'var(--accent)', top: -100, right: -100, borderRadius: '50px', transform: 'rotate(15deg)', opacity: 0.15 }} />
        <div style={{ position: 'absolute', width: 300, height: 300, background: 'var(--secondary)', bottom: -50, left: -50, borderRadius: '100px', transform: 'rotate(-25deg)', opacity: 0.15 }} />

        <div className="page-container" style={{ position: 'relative', zIndex: 2 }}>
          <ScrollReveal>
            <p style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px',
                color: 'var(--primary)' }}>
                Academic Resources
              </p>
              <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '20px' }}>
                All Courses by Faculty
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '560px', lineHeight: 1.7, marginBottom: '40px' }}>
                Browse the complete GIKI course catalog organized by faculty, program, and year.
              </p>

            {/* Search */}
            <div style={{ position: 'relative', maxWidth: '480px' }}>
              <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem' }}>🔍</span>
              <input
                type="text"
                placeholder="Search by course name or code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '16px 16px 16px 48px',
                  borderRadius: 'var(--radius-md)', border: '2px solid var(--text)', outline: 'none',
                  fontSize: '0.95rem', background: 'white',
                  color: 'var(--text)', boxShadow: '4px 4px 0px var(--text)',
                }}
              />
              <style>{`input::placeholder { color: var(--text-muted); }`}</style>
            </div>
          </ScrollReveal>

          {/* Resource type chips */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '36px', flexWrap: 'wrap' }}>
            {RESOURCE_TYPES.map(rt => (
              <div key={rt.label} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'white', border: '1px solid var(--text)',
                padding: '8px 16px', borderRadius: '100px',
                fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)',
                boxShadow: '2px 2px 0px var(--text)'
              }}>
                {rt.icon} {rt.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Search Results ──────────────────────────────────────── */}
      {searchResults && (
        <div className="page-container" style={{ padding: '40px 24px 0' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '2px solid var(--text)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ padding: '20px 28px', borderBottom: '2px solid var(--text)', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--primary)' }}>
              🔍 {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
            </div>
            {searchResults.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No courses found.</div>
            ) : (
              searchResults.map(course => (
                <div key={`${course.id}-${course.program}`} style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px' }}>
                  <CourseRow course={course} onClick={handleCourseClick} />
                  <div style={{ paddingLeft: '62px', fontSize: '0.75rem', color: 'var(--hot-pink)', fontWeight: 600, marginTop: '-6px', marginBottom: '4px' }}>
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
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>⏳</div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '10px', fontFamily: 'Outfit' }}>
                Loading Courses...
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>
                The server is waking up — this may take up to 30 seconds on the first visit.
              </div>
              <div style={{ marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: 'var(--primary)',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
            </div>

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
