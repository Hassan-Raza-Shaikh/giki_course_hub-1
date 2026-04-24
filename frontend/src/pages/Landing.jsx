import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';

const QUOTES = [
  '"Education is the most powerful weapon which you can use to change the world."',
  '"The roots of education are bitter, but the fruit is sweet."',
  '"An investment in knowledge pays the best interest."',
];

const STATS = [
  { val: '923+', label: 'Total Courses', icon: '📚' },
  { val: '16',   label: 'Programs',      icon: '🎓' },
  { val: '6',    label: 'Faculties',     icon: '🏛️' },
  { val: '100%', label: 'Free & Open',   icon: '🔓' },
];

const Landing = ({ onSignIn }) => {
  const [randomCourses, setRandomCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  useEffect(() => {
    api.get('/courses/random?n=3')
      .then(res => { if (res.data.success) setRandomCourses(res.data.courses); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ overflowX: 'hidden' }}>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="hero">
        {/* Aurora Glows */}
        <div className="hero-glow" style={{ width: 800, height: 800, background: 'radial-gradient(circle, rgba(124,58,237,0.45), transparent 65%)', top: -300, left: -200 }} />
        <div className="hero-glow" style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(236,72,153,0.3), transparent 65%)', bottom: -200, right: -100 }} />
        <div className="hero-glow" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.25), transparent 65%)', top: '40%', right: '20%' }} />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${6 + i * 2}px`, height: `${6 + i * 2}px`,
            borderRadius: '50%',
            background: ['#F0ABFC','#06B6D4','#EC4899','#7C3AED','#06B6D4','#F0ABFC'][i],
            opacity: 0.5,
            top: `${15 + i * 15}%`,
            left: `${5 + i * 15}%`,
            animation: `float ${3 + i * 0.5}s ease-in-out ${i * 0.4}s infinite`,
            filter: 'blur(1px)',
          }} />
        ))}

        <div className="page-container" style={{ position: 'relative', zIndex: 2, paddingTop: '80px' }}>
          <div style={{ animation: 'fadeSlideUp 0.9s ease forwards' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(240,171,252,0.08)', border: '1px solid rgba(240,171,252,0.2)',
              padding: '8px 20px', borderRadius: '100px', marginBottom: '40px',
              fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              <span style={{ color: '#F0ABFC' }}>●</span> GIK Institute of Engineering
            </div>

            <h1 style={{
              fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
              fontWeight: 900,
              color: 'white',
              letterSpacing: '-0.04em',
              lineHeight: 1.0,
              marginBottom: '28px',
              fontFamily: 'Outfit, sans-serif',
            }}>
              GIKI<br /><span className="gradient-text">COURSE HUB</span>
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.3rem)',
              color: 'rgba(255,255,255,0.55)',
              fontStyle: 'italic',
              maxWidth: '600px',
              margin: '0 auto 20px',
              lineHeight: 1.7,
            }}>
              {quote}
            </p>

            <p style={{
              fontSize: '1.1rem',
              color: 'rgba(255,255,255,0.4)',
              maxWidth: '520px',
              margin: '0 auto 52px',
              lineHeight: 1.7,
            }}>
              Your one-stop platform for academic materials at GIKI — past papers, lecture notes, slides, and more.
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => navigate('/courses')}
                style={{ fontSize: '1.05rem' }}>
                Explore Courses →
              </button>
              <button className="btn-outline" onClick={onSignIn}>Sign In</button>
            </div>
          </div>

          {/* Scroll hint */}
          <div style={{ marginTop: '80px', animation: 'float 3s ease-in-out infinite' }}>
            <div style={{ width: 1, height: 60, background: 'linear-gradient(to bottom, rgba(240,171,252,0.5), transparent)', margin: '0 auto' }} />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', textAlign: 'center', marginTop: '8px', letterSpacing: '0.1em' }}>SCROLL</p>
          </div>
        </div>
      </section>

      {/* ── Random Courses ─────────────────────────────────── */}
      <section style={{ padding: '120px 0 80px', background: 'var(--bg-subtle)' }}>
        <div className="page-container">
          <ScrollReveal>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <p style={{ color: 'var(--hot-pink)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px' }}>
                Featured This Session
              </p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.03em' }}>
                Discover Your Courses
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '16px', maxWidth: '500px', margin: '16px auto 0' }}>
                Browse study materials contributed by students just like you.
              </p>
            </div>
          </ScrollReveal>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '28px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 220, background: 'linear-gradient(90deg, #EDE9FE 25%, #F5F0FF 50%, #EDE9FE 75%)', backgroundSize: '200%', animation: 'shimmer 1.5s infinite', borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '28px' }}>
              {randomCourses.map((course, i) => (
                <ScrollReveal key={course.id} delay={`reveal-delay-${i+1}`}>
                  <div className="course-card" onClick={() => navigate(`/course/${course.id}`)}>
                    {/* Top gradient banner */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                      background: ['linear-gradient(90deg,#7C3AED,#EC4899)', 'linear-gradient(90deg,#06B6D4,#7C3AED)', 'linear-gradient(90deg,#EC4899,#06B6D4)'][i],
                    }} />
                    <div style={{ fontSize: '2.8rem', marginBottom: '20px' }}>{course.icon || '📘'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700,
                        background: 'rgba(124,58,237,0.1)', color: 'var(--primary)', border: '1px solid rgba(124,58,237,0.2)',
                      }}>Sem {course.semester}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--hot-pink)', fontWeight: 700 }}>{course.code}</span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px', lineHeight: 1.3 }}>{course.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                      {course.faculty} · {course.description?.slice(0, 60)}…
                    </p>
                    <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem',
                      background: 'linear-gradient(90deg,#7C3AED,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      View Materials <span>→</span>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}

          <ScrollReveal>
            <div style={{ textAlign: 'center', marginTop: '64px' }}>
              <button className="btn-primary" onClick={() => navigate('/courses')}>
                Browse All Courses
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── About Us ──────────────────────────────────────── */}
      <section style={{ padding: '120px 0', background: 'linear-gradient(145deg, #0F0325 0%, #1E0A4E 50%, #2D0B6E 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* Background orbs */}
        <div style={{ position: 'absolute', width: 500, height: 500, background: 'radial-gradient(circle, rgba(236,72,153,0.15), transparent 70%)', top: -100, right: -100, borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)', bottom: -50, left: -50, borderRadius: '50%', filter: 'blur(60px)' }} />

        <div className="page-container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
            <ScrollReveal>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px',
                background: 'linear-gradient(90deg,#F0ABFC,#06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                About GIKI Course Hub
              </p>
              <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '24px', lineHeight: 1.1 }}>
                Built by Students, <br />For Students.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '16px' }}>
                GIK Institute of Engineering Sciences and Technology, nestled in the foothills of the Himalayas, is one of Pakistan's top engineering universities.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.8 }}>
                GIKI Course Hub is a community-driven platform where students collaborate by sharing high-quality study materials across all programs — completely free.
              </p>
            </ScrollReveal>

            <ScrollReveal delay="reveal-delay-2">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {STATS.map((s, i) => (
                  <div key={s.label} style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(240,171,252,0.12)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '32px 20px',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.12)'; e.currentTarget.style.borderColor = 'rgba(240,171,252,0.3)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(240,171,252,0.12)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{s.icon}</div>
                    <div style={{
                      fontSize: '2.2rem', fontWeight: 900, fontFamily: 'Outfit', letterSpacing: '-0.04em',
                      background: ['linear-gradient(135deg,#F0ABFC,#7C3AED)', 'linear-gradient(135deg,#06B6D4,#7C3AED)', 'linear-gradient(135deg,#EC4899,#F0ABFC)', 'linear-gradient(135deg,#06B6D4,#EC4899)'][i],
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>{s.val}</div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', fontWeight: 600, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            section > .page-container > div[style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr !important;
              gap: 40px !important;
            }
          }
        `}</style>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{ padding: '48px 24px', background: '#0A0118', textAlign: 'center', borderTop: '1px solid rgba(240,171,252,0.08)' }}>
        <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.2rem', marginBottom: '12px' }}>
          <span style={{ color: 'white' }}>GIKI </span>
          <span style={{ background: 'linear-gradient(90deg,#F0ABFC,#06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>COURSE HUB</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
          © 2024 Ghulam Ishaq Khan Institute. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
