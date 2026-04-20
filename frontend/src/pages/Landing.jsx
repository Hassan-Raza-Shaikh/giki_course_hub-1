import React from 'react';
import { NavLink } from 'react-router-dom';

const Landing = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Hero Section ───────────────────────────────────────── */}
      <section style={{ 
        minHeight: '85vh', 
        background: 'linear-gradient(135deg, var(--bg-dark) 0%, #002D6B 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Background Elements */}
        <div style={{ position: 'absolute', width: '800px', height: '800px', background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)', borderRadius: '50%', opacity: 0.3, top: '-300px', left: '-200px', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', width: '500px', height: '500px', background: 'radial-gradient(circle, var(--secondary) 0%, transparent 70%)', borderRadius: '50%', opacity: 0.2, bottom: '-100px', right: '-100px', filter: 'blur(80px)' }} />

        <div style={{ zIndex: 2, maxWidth: '900px' }} className="fade-in">
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '10px', 
            background: 'rgba(255,255,255,0.05)', 
            padding: '10px 20px', 
            borderRadius: '100px',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '32px',
            border: '1px solid rgba(255,255,255,0.1)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            <span style={{ color: 'var(--secondary)' }}>✨ New Era</span> 
            <span style={{ opacity: 0.5 }}>|</span> 
            <span>GIKI Student Hub</span>
          </div>
          
          <h1 style={{ 
            fontSize: 'clamp(3rem, 8vw, 5rem)', 
            fontWeight: 800, 
            lineHeight: 1.05, 
            marginBottom: '28px',
            letterSpacing: '-0.03em'
          }}>
            Elevate Your Learning with <br />
            <span style={{ background: 'linear-gradient(90deg, #FFFFFF 30%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              GIKI COURSE HUB
            </span>
          </h1>
          
          <p style={{ fontSize: '1.25rem', opacity: 0.7, maxWidth: '650px', margin: '0 auto 48px', lineHeight: 1.6, fontWeight: 500 }}>
            Discover high-quality resources, share your knowledge, and connect with peers in GIKI's most advanced academic platform.
          </p>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <NavLink to="/signup" style={{ 
              backgroundColor: 'white', 
              color: 'var(--primary)', 
              padding: '18px 40px', 
              borderRadius: '16px', 
              fontWeight: 800,
              fontSize: '1.1rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              transition: 'var(--transition)'
            }} className="hover-scale">
              Launch Your Hub
            </NavLink>
            <NavLink to="/files" style={{ 
              background: 'rgba(255,255,255,0.05)', 
              color: 'white', 
              padding: '18px 40px', 
              borderRadius: '16px', 
              fontWeight: 700,
              fontSize: '1.1rem',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)'
            }}>
              Explore Resources
            </NavLink>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ────────────────────────────────────────── */}
      <div style={{ padding: '0 24px', position: 'relative', zIndex: 10, marginTop: '-60px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '80px', 
          padding: '40px', 
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          maxWidth: '1100px',
          margin: '0 auto',
          boxShadow: '0 20px 40px -10px rgba(0, 58, 143, 0.2)',
          backdropFilter: 'blur(20px)',
          border: '1px solid white',
          flexWrap: 'wrap'
        }}>
          <StatItem num="850+" label="Verified Files" />
          <StatItem num="45+" label="Active Subjects" />
          <StatItem num="2.5k+" label="Daily Downloads" />
          <StatItem num="1k+" label="Platform Users" />
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────── */}
      <section style={{ padding: '120px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
            Built for Students, <span style={{ color: 'var(--secondary)' }}>By Students.</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '16px' }}>Everything you need to survive and thrive academic life.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px' }}>
          <FeatureCard icon="⚡" title="Lightning Fast Search" desc="Our advanced indexing makes finding the specific past paper or notes easier than ever." />
          <FeatureCard icon="💎" title="Premium Quality" desc="Every single file is moderated by our admin team to ensure students get only the best resources." />
          <FeatureCard icon="🌌" title="Modern Interface" desc="A beautiful, responsive UI designed with GIKI's identity in mind, optimized for all devices." />
          <FeatureCard icon="🤝" title="Collaborative" desc="Join the community contribution effort. Share your best work and earn reputation within the hub." />
          <FeatureCard icon="🚀" title="Always Syncing" desc="Your bookmarks and interactions are synced in real-time. Access your library from anywhere." />
          <FeatureCard icon="🛡️" title="Secure & Private" desc="We value your privacy. All your activities and uploads are handled with enterprise-grade security." />
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────── */}
      <section style={{ paddingBottom: '120px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ 
          maxWidth: '1000px', 
          margin: '0 auto', 
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', 
          borderRadius: '32px',
          padding: '80px 40px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 40px 100px -20px rgba(0, 58, 143, 0.4)'
        }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '24px' }}>Ready to Ace Your Semester?</h2>
          <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
            Join over 1,000 GIKIANS who are already using the Course Hub to simplify their studies.
          </p>
          <NavLink to="/signup" style={{ 
            backgroundColor: 'white', 
            color: 'var(--primary)', 
            padding: '18px 48px', 
            borderRadius: '16px', 
            fontWeight: 800,
            fontSize: '1.1rem',
            display: 'inline-block'
          }}>
            Create Your Account
          </NavLink>
        </div>
      </section>

      <footer style={{ 
        padding: '60px 24px', 
        textAlign: 'center', 
        borderTop: '1px solid var(--border)',
        backgroundColor: 'white'
      }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '16px', fontFamily: 'Outfit' }}>
          GIKI COURSE HUB
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
          Crafted with 💙 by the GIKI Student Community. <br />
          Official Branding & Academic Excellence.
        </p>
        <div style={{ marginTop: '32px', fontSize: '0.8rem', opacity: 0.5 }}>
          © 2024 Ghulam Ishaq Khan Institute. All Rights Reserved.
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .hover-scale { transition: transform 0.2s ease; }
        .hover-scale:hover { transform: scale(1.05); }
        
        @media (max-width: 768px) {
          section:first-of-type { padding: 100px 24px !important; }
          h1 { font-size: 2.8rem !important; }
        }
      `}</style>
    </div>
  );
};

const StatItem = ({ num, label }) => (
  <div style={{ textAlign: 'center', minWidth: '150px' }}>
    <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit', letterSpacing: '-0.03em' }}>{num}</div>
    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>{label}</div>
  </div>
);

const FeatureCard = ({ icon, title, desc }) => (
  <div style={{ 
    padding: '48px 40px', 
    backgroundColor: 'white', 
    borderRadius: '24px', 
    border: '1px solid var(--border)',
    transition: 'var(--transition)',
    cursor: 'default',
    boxShadow: 'var(--shadow-md)'
  }} className="hover-scale">
    <div style={{ 
      width: '64px', 
      height: '64px', 
      background: 'var(--primary-fade)', 
      borderRadius: '16px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontSize: '2rem',
      marginBottom: '28px',
      color: 'var(--primary)'
    }}>{icon}</div>
    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px', color: 'var(--primary)' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.05rem' }}>{desc}</p>
  </div>
);

export default Landing;
