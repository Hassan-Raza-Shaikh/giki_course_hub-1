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
  { val: '923',  label: 'Total Courses', icon: '📚' },
  { val: '50+',  label: 'Programs',      icon: '🎓' },
  { val: '7',    label: 'Faculties',     icon: '🏛️' },
  { val: '100%', label: 'Free & Open',   icon: '🔓' },
];

const Landing = ({ user, onSignIn, onSignOut }) => {
  const [randomCourses, setRandomCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // Wait up to 60s

    const fetchFeatured = () => {
      attempts++;
      api.get('/courses/random?n=3')
        .then(res => {
          if (res.data.success && res.data.courses.length > 0) {
            setRandomCourses(res.data.courses);
            setLoading(false);
          } else if (attempts < maxAttempts) {
            setTimeout(fetchFeatured, 3000);
          } else {
            setLoading(false);
          }
        })
        .catch(() => {
          if (attempts < maxAttempts) {
            setTimeout(fetchFeatured, 3000);
          } else {
            setLoading(false);
          }
        });
    };

    fetchFeatured();
  }, []);

  return (
    <div style={{ overflowX: 'hidden' }}>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="hero">
        {/* Fun Neo-brutalist geometric shapes instead of Aurora gradients */}
        <div className="hero-glow" style={{ width: 400, height: 400, background: 'var(--accent)', top: -100, left: -100, borderRadius: '50px', filter: 'none', transform: 'rotate(15deg)', opacity: 0.2 }} />
        <div className="hero-glow" style={{ width: 300, height: 300, background: 'var(--secondary)', bottom: -50, right: -100, borderRadius: '100px', filter: 'none', transform: 'rotate(-25deg)', opacity: 0.15 }} />
        <div className="hero-glow" style={{ width: 150, height: 150, background: 'var(--primary)', top: '30%', right: '15%', filter: 'none', transform: 'rotate(45deg)', opacity: 0.2 }} />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${6 + i * 2}px`, height: `${6 + i * 2}px`,
            borderRadius: '50%',
            background: ['var(--primary)', 'var(--secondary)', 'var(--accent)', 'var(--primary)', 'var(--secondary)', 'var(--accent)'][i],
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
              background: 'white', border: '2px solid var(--text)',
              padding: '8px 20px', borderRadius: '100px', marginBottom: '40px',
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              boxShadow: '4px 4px 0px var(--accent)'
            }}>
              <span style={{ color: 'var(--primary)' }}>●</span> GIK Institute of Engineering
            </div>

            <h1 style={{
              fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
              fontWeight: 900,
              color: 'var(--text)',
              letterSpacing: '-0.04em',
              lineHeight: 1.0,
              marginBottom: '28px',
              fontFamily: 'Outfit, sans-serif',
            }}>
              GIKI<br /><span className="gradient-text">COURSE HUB</span>
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.3rem)',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              maxWidth: '600px',
              margin: '0 auto 20px',
              lineHeight: 1.7,
            }}>
              {quote}
            </p>

            <p style={{
              fontSize: '1.1rem',
              color: 'var(--text-muted)',
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
              {!user && (
                <button className="btn-outline" onClick={onSignIn}>Sign In</button>
              )}
            </div>
          </div>

          {/* Scroll hint */}
          <div style={{ marginTop: '80px', animation: 'float 3s ease-in-out infinite' }}>
            <div style={{ width: 2, height: 60, background: 'linear-gradient(to bottom, var(--primary), transparent)', margin: '0 auto' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center', marginTop: '8px', letterSpacing: '0.1em' }}>SCROLL</p>
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
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>⏳</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '8px', fontFamily: 'Outfit' }}>
                Fetching Featured Courses...
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
                The server is waking up — this usually takes about 30 seconds on the first visit.
              </p>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : randomCourses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
              No featured courses available at the moment.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '28px' }}>
              {randomCourses.map((course, i) => (
                <ScrollReveal key={course.id} delay={`reveal-delay-${i+1}`}>
                  <div className="course-card" onClick={() => navigate(`/course/${course.id}`)}>
                    {/* Top gradient banner */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                      background: ['var(--primary)', 'var(--secondary)', 'var(--accent)'][i],
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
                      color: 'var(--accent)' }}>
                      View Materials <span style={{ color: 'var(--text)' }}>→</span>
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
      <section style={{ padding: '120px 0', background: 'var(--bg-subtle)', position: 'relative', overflow: 'hidden', borderTop: '2px solid var(--border)', borderBottom: '2px solid var(--border)' }}>
        {/* Background orbs */}
        <div style={{ position: 'absolute', width: 500, height: 500, border: '40px solid var(--accent)', top: -100, right: -100, borderRadius: '50%', opacity: 0.1 }} />
        <div style={{ position: 'absolute', width: 400, height: 400, background: 'var(--secondary)', bottom: -50, left: -50, opacity: 0.1, transform: 'rotate(20deg)' }} />

        <div className="page-container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
            <ScrollReveal>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px',
                color: 'var(--primary)' }}>
                About GIKI Course Hub
              </p>
              <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '24px', lineHeight: 1.1 }}>
                Built by Students, <br />For Students.
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '16px' }}>
                GIK Institute of Engineering Sciences and Technology, nestled in the foothills of the Himalayas, is one of Pakistan's top engineering universities.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.8 }}>
                GIKI Course Hub is a community-driven platform where students collaborate by sharing high-quality study materials across all programs — completely free.
              </p>
            </ScrollReveal>

            <ScrollReveal delay="reveal-delay-2">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {STATS.map((s, i) => (
                  <div key={s.label} style={{
                    background: 'white',
                    border: '1px solid var(--text)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '32px 20px',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{s.icon}</div>
                    <div style={{
                      fontSize: '2.2rem', fontWeight: 900, fontFamily: 'Outfit', letterSpacing: '-0.04em',
                      color: 'var(--text)',
                    }}>{s.val}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
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
      <footer style={{ padding: '48px 24px', background: 'white', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.2rem', marginBottom: '12px' }}>
          <span style={{ color: 'var(--text)' }}>GIKI </span>
          <span style={{ color: 'var(--primary)' }}>COURSE HUB</span>
        </div>
        <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
          © 2024 Ghulam Ishaq Khan Institute. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
