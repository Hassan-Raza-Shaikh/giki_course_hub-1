import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScrollReveal from '../components/ScrollReveal';

const QUOTES = [
  '"Education is the most powerful weapon which you can use to change the world."',
  '"The roots of education are bitter, but the fruit is sweet."',
  '"An investment in knowledge pays the best interest."',
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
        {/* Glows */}
        <div className="hero-glow" style={{ width: 700, height: 700, background: 'radial-gradient(circle, rgba(79,163,209,0.25), transparent 70%)', top: -200, left: -100 }} />
        <div className="hero-glow" style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(0,201,255,0.15), transparent 70%)', bottom: -100, right: -50 }} />

        <div className="page-container" style={{ position: 'relative', zIndex: 2, paddingTop: '80px' }}>
          <div style={{ animation: 'fadeSlideUp 0.9s ease forwards' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              padding: '8px 20px', borderRadius: '100px', marginBottom: '40px',
              fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              <span style={{ color: '#00C9FF' }}>●</span> GIK Institute of Engineering
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
              color: 'rgba(255,255,255,0.6)',
              fontStyle: 'italic',
              maxWidth: '600px',
              margin: '0 auto 20px',
              lineHeight: 1.7,
            }}>
              {quote}
            </p>

            <p style={{
              fontSize: '1.1rem',
              color: 'rgba(255,255,255,0.5)',
              maxWidth: '520px',
              margin: '0 auto 52px',
              lineHeight: 1.7,
            }}>
              Your one-stop platform for academic materials at GIKI — past papers, lecture notes, slides, and more, organized by course and year.
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
            <div style={{ width: 1, height: 60, background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)', margin: '0 auto' }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', marginTop: '8px', letterSpacing: '0.1em' }}>SCROLL</p>
          </div>
        </div>
      </section>

      {/* ── Random Courses ─────────────────────────────────── */}
      <section style={{ padding: '120px 0 80px', background: 'var(--bg-subtle)' }}>
        <div className="page-container">
          <ScrollReveal>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <p style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px' }}>
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
                <div key={i} style={{ height: 200, background: 'linear-gradient(90deg, #e2e8f0 25%, #f0f4ff 50%, #e2e8f0 75%)', backgroundSize: '200%', animation: 'shimmer 1.5s infinite', borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '28px' }}>
              {randomCourses.map((course, i) => (
                <ScrollReveal key={course.id} delay={`reveal-delay-${i+1}`}>
                  <div className="course-card" onClick={() => navigate(`/course/${course.id}`)}>
                    <div style={{ fontSize: '2.8rem', marginBottom: '20px' }}>{course.icon}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span className="badge badge-year">Year {course.year}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{course.code}</span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px', lineHeight: 1.3 }}>{course.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{course.description}</p>
                    <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary)', fontWeight: 700, fontSize: '0.9rem' }}>
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
      <section style={{ padding: '120px 0', background: 'linear-gradient(135deg, var(--bg-hero) 0%, var(--primary) 100%)' }}>
        <div className="page-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
            <ScrollReveal>
              <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px' }}>
                About GIKI Course Hub
              </p>
              <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '24px', lineHeight: 1.1 }}>
                Built by Students, <br />For Students.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '16px' }}>
                GIK Institute of Engineering Sciences and Technology, nestled in the foothills of the Himalayas, is one of Pakistan's top engineering universities.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', lineHeight: 1.8 }}>
                GIKI Course Hub is a community-driven platform where students collaborate by sharing high-quality study materials across all four academic years — completely free.
              </p>
            </ScrollReveal>

            <ScrollReveal delay="reveal-delay-2">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {[
                  { val: '32+', label: 'Core Courses' },
                  { val: '5', label: 'Material Types' },
                  { val: '4', label: 'Academic Years' },
                  { val: '100%', label: 'Free & Open' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '32px 24px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', fontFamily: 'Outfit', letterSpacing: '-0.04em' }}>{s.val}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 600, marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
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
      <footer style={{ padding: '48px 24px', background: '#001A4D', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Outfit', fontWeight: 900, color: 'white', fontSize: '1.2rem', marginBottom: '12px' }}>
          GIKI <span style={{ color: 'var(--accent)' }}>COURSE HUB</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
          © 2024 Ghulam Ishaq Khan Institute. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
