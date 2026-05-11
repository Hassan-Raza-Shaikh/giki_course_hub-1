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
  const [stats, setStats] = useState({ courses: '...', faculties: '...', programs: '...', materials: '...' });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch live stats
    api.get('/stats')
      .then(res => {
        if (res.data.success) {
          setStats(res.data.stats);
        }
      })
      .catch(err => console.error("Stats fetch error:", err));

    let attempts = 0;
    const maxAttempts = 20;

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

  const statItems = [
    { val: stats.courses,   label: 'Courses',   icon: '📚' },
    { val: stats.faculties, label: 'Faculties', icon: '🏛️' },
    { val: stats.programs,  label: 'Programs',  icon: '🎓' },
    { val: stats.materials, label: 'Materials', icon: '📂' },
  ];

  return (
    <div style={{ overflowX: 'hidden' }}>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="hero" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', padding: '120px 0 80px' }}>
        {/* Background Decorative Elements */}
        <div className="hero-glow" style={{ width: 600, height: 600, background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)', top: -200, left: -200, borderRadius: '50%', filter: 'blur(80px)' }} />
        <div className="hero-glow" style={{ width: 500, height: 500, background: 'linear-gradient(135deg, rgba(255,94,0,0.08), transparent)', bottom: -150, right: -150, borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '15%', right: '10%', fontSize: '4rem', opacity: 0.05, transform: 'rotate(15deg)', fontWeight: 900, fontFamily: 'Outfit' }}>GIKI</div>
        <div style={{ position: 'absolute', bottom: '15%', left: '10%', fontSize: '4rem', opacity: 0.05, transform: 'rotate(-15deg)', fontWeight: 900, fontFamily: 'Outfit' }}>HUB</div>

        <div className="page-container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ animation: 'fadeSlideUp 0.9s ease forwards' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              background: 'var(--bg-white)', border: '2px solid var(--text)',
              padding: '10px 24px', borderRadius: '100px', marginBottom: '48px',
              fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)',
              textTransform: 'uppercase', letterSpacing: '0.15em',
              boxShadow: '4px 4px 0px var(--secondary)'
            }}>
              <span style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>✦</span> GIK Institute of Engineering
            </div>

            <h1 style={{
              fontSize: 'clamp(3.8rem, 10vw, 7.5rem)',
              fontWeight: 950,
              color: 'var(--text)',
              letterSpacing: '-0.05em',
              lineHeight: 0.9,
              marginBottom: '32px',
              fontFamily: 'Outfit, sans-serif',
              textShadow: '0 10px 30px rgba(0,0,0,0.05)'
            }}>
              GIKI<br /><span className="gradient-text">COURSE HUB</span>
            </h1>

            <p style={{
              fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
              color: 'var(--text-muted)',
              maxWidth: '700px',
              margin: '0 auto 56px',
              lineHeight: 1.5,
              fontWeight: 500,
              letterSpacing: '-0.01em'
            }}>
              The ultimate academic repository for GIKI students. <br/>
              Access past papers, notes, and course materials in one place.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '500px' }}>
                <button className="btn-primary" onClick={() => navigate('/courses')}
                  style={{ 
                    fontSize: '1.1rem', 
                    padding: '16px 36px',
                    borderRadius: '14px',
                    flex: '1 1 200px'
                  }}>
                  Explore Courses →
                </button>
                {!user && (
                  <button className="btn-outline" onClick={onSignIn} 
                    style={{ 
                      padding: '16px 36px',
                      borderRadius: '14px',
                      fontSize: '1.1rem',
                      flex: '1 1 120px'
                    }}>
                    Sign In
                  </button>
                )}
              </div>

              {/* Scroll Indicator */}
              <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Scroll to Explore</span>
                <div style={{ 
                  width: '2px', 
                  height: '50px', 
                  background: 'linear-gradient(to bottom, var(--primary), transparent)',
                  animation: 'growShrink 2s ease-in-out infinite'
                }} />
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes growShrink {
            0%, 100% { transform: scaleY(0.5); transform-origin: top; opacity: 0.3; }
            50% { transform: scaleY(1); transform-origin: top; opacity: 1; }
          }
        `}</style>
      </section>

      {/* ── Random Courses ─────────────────────────────────── */}
      <section style={{ padding: '120px 0 80px', background: 'var(--bg-subtle)' }}>
        <div className="page-container">
          <ScrollReveal>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <p style={{ color: 'var(--hot-pink)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px' }}>
                Featured Resources
              </p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.03em' }}>
                Discover Materials
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '16px', maxWidth: '500px', margin: '16px auto 0' }}>
                Browse high-quality study materials contributed by the GIKI community.
              </p>
            </div>
          </ScrollReveal>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>⏳</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '8px', fontFamily: 'Outfit' }}>
                Fetching Resources...
              </div>
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
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                      background: ['var(--primary)', 'var(--secondary)', 'var(--accent)'][i % 3],
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
                      color: 'var(--electric)' }}>
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
      <section style={{ padding: '120px 0', background: 'var(--bg-subtle)', position: 'relative', overflow: 'hidden', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'absolute', width: 500, height: 500, border: '40px solid var(--accent)', top: -100, right: -100, borderRadius: '50%', opacity: 0.05 }} />
        
        <div className="page-container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '60px', 
            alignItems: 'center' 
          }}>
            <ScrollReveal>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px',
                color: 'var(--primary)' }}>
                Platform Overview
              </p>
              <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '24px', lineHeight: 1.1 }}>
                Streamlined Academic <br />Collaboration.
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '20px' }}>
                Experience a centralized repository for GIK Institute resources. We bridge the gap between departments by making high-quality study materials accessible to everyone.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.8 }}>
                Empowering the GIKI community through shared knowledge and efficient, peer-to-peer resource distribution.
              </p>
            </ScrollReveal>

            <ScrollReveal delay="reveal-delay-2">
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                gap: '16px' 
              }}>
                {statItems.map((s, i) => (
                  <div key={s.label} style={{
                    background: 'var(--bg-white)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '32px 20px',
                    textAlign: 'center',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{s.icon}</div>
                    <div style={{
                      fontSize: '2.4rem', fontWeight: 900, fontFamily: 'Outfit', letterSpacing: '-0.04em',
                      color: 'var(--text)',
                      marginBottom: '4px'
                    }}>{s.val}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{ padding: '60px 24px', background: 'var(--bg-white)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.4rem', marginBottom: '16px' }}>
          <span style={{ color: 'var(--text)' }}>GIKI </span>
          <span style={{ color: 'var(--primary)' }}>COURSE HUB</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
          © {new Date().getFullYear()} GIK Institute of Engineering Sciences and Technology
        </p>
      </footer>
    </div>
  );
};

export default Landing;
