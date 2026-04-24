import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';

const RESOURCE_TYPES = [
  { icon: '📄', label: 'Past Papers',  desc: 'Previous exams and quizzes for exam prep.' },
  { icon: '📓', label: 'Notes',        desc: 'Condensed lecture notes from top students.' },
  { icon: '🖥️', label: 'Slides',      desc: 'Lecture presentations from professors.' },
  { icon: '📋', label: 'Assignments',  desc: 'Solved assignments for reference.' },
  { icon: '🧪', label: 'Lab Reports',  desc: 'Complete lab reports and data sheets.' },
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
      color: '#06B6D4', background: 'rgba(6,182,212,0.1)',
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
          background: open ? '#FAF5FF' : 'transparent',
          transition: 'background 0.2s',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = '#FAF5FF'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Outfit', fontWeight: 900, color: 'white', fontSize: '0.85rem',
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
          background: open ? 'linear-gradient(90deg, rgba(124,58,237,0.05), transparent)' : 'white',
          transition: 'background 0.2s',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = '#FAF5FF'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = open ? 'linear-gradient(90deg, rgba(124,58,237,0.05), transparent)' : 'white'; }}
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
            color: open ? 'white' : 'var(--primary)',
            background: open ? 'linear-gradient(135deg,#7C3AED,#EC4899)' : 'rgba(124,58,237,0.08)',
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
          background: open
            ? 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 40%, #EC4899 100%)'
            : 'white',
          transition: 'background 0.3s',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = '#FAF5FF'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = 'white'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: 54, height: 54, borderRadius: '14px',
            background: open ? 'rgba(255,255,255,0.18)' : 'rgba(124,58,237,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', transition: 'all 0.3s',
            border: open ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(124,58,237,0.12)',
            boxShadow: open ? '0 0 20px rgba(240,171,252,0.25)' : 'none',
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
        <div style={{ padding: '24px', borderTop: '1px solid rgba(124,58,237,0.15)', display: 'flex', flexDirection: 'column', gap: '12px', background: '#FAF5FF' }}>
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
    api.get('/courses')
      .then(res => { if (res.data.success) setFaculties(res.data.faculties); })
      .catch(console.error)
      .finally(() => setLoading(false));
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
        background: 'linear-gradient(145deg, #0F0325 0%, #1E0A4E 50%, #2D0A6E 100%)',
        padding: '80px 0 100px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 600, height: 600, background: 'radial-gradient(circle, rgba(124,58,237,0.35), transparent 70%)', top: -200, right: -100, borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, background: 'radial-gradient(circle, rgba(236,72,153,0.2), transparent 70%)', bottom: -100, left: -80, borderRadius: '50%', filter: 'blur(60px)' }} />

        <div className="page-container" style={{ position: 'relative', zIndex: 2 }}>
          <ScrollReveal>
            <p style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px',
                background: 'linear-gradient(90deg,#F0ABFC,#06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Academic Resources
              </p>
              <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '20px' }}>
                All Courses by Faculty
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', maxWidth: '560px', lineHeight: 1.7, marginBottom: '40px' }}>
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
                  borderRadius: 'var(--radius-md)', border: '1px solid rgba(240,171,252,0.2)', outline: 'none',
                  fontSize: '0.95rem', background: 'rgba(240,171,252,0.08)',
                  color: 'white', backdropFilter: 'blur(8px)',
                }}
              />
              <style>{`input::placeholder { color: rgba(240,171,252,0.4); }`}</style>
            </div>
          </ScrollReveal>

          {/* Resource type chips */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '36px', flexWrap: 'wrap' }}>
            {RESOURCE_TYPES.map(rt => (
              <div key={rt.label} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(240,171,252,0.08)', border: '1px solid rgba(240,171,252,0.15)',
                padding: '8px 16px', borderRadius: '100px',
                fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)',
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
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontFamily: 'Outfit',
              background: 'linear-gradient(135deg,#7C3AED,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
            [1,2,3,4].map(i => (
              <div key={i} style={{ height: 100, background: 'linear-gradient(90deg, #EDE9FE 25%, #F5F0FF 50%, #EDE9FE 75%)', backgroundSize: '200%', animation: 'shimmer 1.5s infinite', borderRadius: 'var(--radius-lg)' }} />
            ))
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
