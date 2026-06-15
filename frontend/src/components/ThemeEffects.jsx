import React, { useEffect, useState } from 'react';
import '../styles/ThemeEffects.css';

const BatSignal = () => (
  <div className="bat-signal-container">
    <svg className="bat-logo" viewBox="100 50 312 250" fill="#000" xmlns="http://www.w3.org/2000/svg">
      <path d="M 256.00,83.80 C 265.80,83.80 288.70,85.20 308.00,94.00 C 318.00,85.00 330.00,76.00 348.00,65.00 C 345.00,78.00 343.00,90.00 342.00,106.00 C 361.00,114.00 380.00,128.00 392.00,142.00 C 384.00,138.00 375.00,134.00 366.00,132.00 C 375.00,140.00 382.00,150.00 387.00,163.00 C 377.00,159.00 366.00,155.00 354.00,154.00 C 366.00,165.00 375.00,183.00 378.00,203.00 C 367.00,192.00 352.00,183.00 336.00,177.00 C 344.00,203.00 346.00,233.00 344.00,264.00 C 333.00,267.00 320.00,268.00 306.00,268.00 C 290.00,268.00 274.00,266.00 260.00,260.00 C 261.00,241.00 260.00,222.00 256.00,204.00 C 252.00,222.00 251.00,241.00 252.00,260.00 C 238.00,266.00 222.00,268.00 206.00,268.00 C 192.00,268.00 179.00,267.00 168.00,264.00 C 166.00,233.00 168.00,203.00 176.00,177.00 C 160.00,183.00 145.00,192.00 134.00,203.00 C 137.00,183.00 146.00,165.00 158.00,154.00 C 146.00,155.00 135.00,159.00 125.00,163.00 C 130.00,150.00 137.00,140.00 146.00,132.00 C 137.00,134.00 128.00,138.00 120.00,142.00 C 132.00,128.00 151.00,114.00 170.00,106.00 C 169.00,90.00 167.00,78.00 164.00,65.00 C 182.00,76.00 194.00,85.00 204.00,94.00 C 223.30,85.20 246.20,83.80 256.00,83.80 Z"/>
    </svg>
  </div>
);

const Snowflakes = () => Array.from({ length: 30 }).map((_, i) => (
  <div key={i} className="snow-flake" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${5 + Math.random() * 10}s`, animationDelay: `-${Math.random() * 10}s`, fontSize: `${10 + Math.random() * 20}px` }}>❄</div>
));

const SimpsonsDonuts = () => Array.from({ length: 15 }).map((_, i) => (
  <div key={i} className="donut" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${10 + Math.random() * 10}s`, animationDelay: `-${Math.random() * 15}s`, fontSize: `${30 + Math.random() * 40}px` }}>🍩</div>
));

const SnakeEffect = () => Array.from({ length: 15 }).map((_, i) => (
  <div key={i} className="snake-segment" style={{ animationDelay: `-${(15 - i) * 0.15}s` }} />
));

const MarioClouds = () => Array.from({ length: 8 }).map((_, i) => (
  <div key={i} className="mario-cloud" style={{ top: `${Math.random() * 60}vh`, animationDuration: `${20 + Math.random() * 40}s`, animationDelay: `-${Math.random() * 40}s`, fontSize: `${50 + Math.random() * 50}px` }}>☁️</div>
));

const LotrEmbers = () => Array.from({ length: 40 }).map((_, i) => (
  <div key={i} className="ember" style={{ left: `${Math.random() * 100}vw`, bottom: `${-10 - Math.random() * 20}px`, animationDuration: `${3 + Math.random() * 5}s`, animationDelay: `-${Math.random() * 5}s` }} />
));

const HackerRain = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
  return Array.from({ length: 40 }).map((_, i) => (
    <div key={i} className="matrix-char" style={{ left: `${(i / 40) * 100}vw`, animationDuration: `${2 + Math.random() * 4}s`, animationDelay: `-${Math.random() * 4}s` }}>
      {chars[Math.floor(Math.random() * chars.length)]}
    </div>
  ));
};

const OceanBubbles = () => Array.from({ length: 30 }).map((_, i) => {
  const size = 10 + Math.random() * 30;
  return <div key={i} className="bubble" style={{ left: `${Math.random() * 100}vw`, width: `${size}px`, height: `${size}px`, animationDuration: `${4 + Math.random() * 8}s`, animationDelay: `-${Math.random() * 8}s` }} />;
});

const SpaceStars = () => Array.from({ length: 100 }).map((_, i) => {
  const size = 1 + Math.random() * 3;
  return <div key={i} className="star" style={{ left: `${Math.random() * 100}vw`, top: `${Math.random() * 100}vh`, width: `${size}px`, height: `${size}px`, animationDuration: `${1 + Math.random() * 3}s`, animationDelay: `-${Math.random() * 3}s` }} />;
});

// === NEW EFFECTS ===

const DiscordControllers = () => Array.from({ length: 15 }).map((_, i) => (
  <div key={i} className="float-up" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${10 + Math.random() * 15}s`, animationDelay: `-${Math.random() * 15}s`, fontSize: `${20 + Math.random() * 20}px`, opacity: 0.5 }}>🎮</div>
));

const VaporwaveGrid = () => Array.from({ length: 6 }).map((_, i) => (
  <div key={i} className={i % 2 === 0 ? "mario-cloud" : "drift-left"} style={{ top: `${Math.random() * 80}vh`, animationDuration: `${20 + Math.random() * 30}s`, animationDelay: `-${Math.random() * 30}s`, fontSize: `${40 + Math.random() * 40}px`, opacity: 0.6 }}>
    {i % 2 === 0 ? '🌴' : '🐬'}
  </div>
));

const GruvboxBrackets = () => Array.from({ length: 20 }).map((_, i) => {
  const brackets = ['{ }', '< >', '[ ]', '( )', '=>'];
  return <div key={i} className="float-up" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${15 + Math.random() * 20}s`, animationDelay: `-${Math.random() * 20}s`, fontSize: `${15 + Math.random() * 20}px`, color: '#ebdbb2', opacity: 0.3, fontFamily: 'monospace' }}>
    {brackets[Math.floor(Math.random() * brackets.length)]}
  </div>;
});

const ZeldaFairy = () => Array.from({ length: 3 }).map((_, i) => (
  <div key={i} className="navi-fairy" style={{ left: `${20 + Math.random() * 60}vw`, top: `${20 + Math.random() * 60}vh`, animationDuration: `${4 + Math.random() * 4}s`, animationDelay: `-${Math.random() * 4}s` }}>🧚</div>
));

const DraculaBats = () => Array.from({ length: 10 }).map((_, i) => (
  <div key={i} className="bat" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${8 + Math.random() * 8}s`, animationDelay: `-${Math.random() * 8}s`, fontSize: `${20 + Math.random() * 30}px` }}>🦇</div>
));

const PacmanChase = () => (
  <div className="pacman-chase">
    <span>🟡</span>
    <span style={{color: 'red'}}>👻</span>
    <span style={{color: 'cyan'}}>👻</span>
    <span style={{color: 'pink'}}>👻</span>
    <span style={{color: 'orange'}}>👻</span>
  </div>
);

const MinecraftBlocks = () => Array.from({ length: 25 }).map((_, i) => (
  <div key={i} className="snow-flake" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${8 + Math.random() * 10}s`, animationDelay: `-${Math.random() * 10}s`, fontSize: `${20 + Math.random() * 20}px`, opacity: 0.9 }}>🟫</div>
));

const CyberpunkScanlines = () => Array.from({ length: 5 }).map((_, i) => (
  <div key={i} className="scanline" style={{ animationDuration: `${3 + Math.random() * 5}s`, animationDelay: `-${Math.random() * 5}s` }} />
));

const FireSparks = () => Array.from({ length: 50 }).map((_, i) => (
  <div key={i} className="ember" style={{ left: `${Math.random() * 100}vw`, bottom: `${-10 - Math.random() * 20}px`, animationDuration: `${2 + Math.random() * 3}s`, animationDelay: `-${Math.random() * 3}s`, background: '#ffeb3b', boxShadow: '0 0 10px #ffeb3b, 0 0 20px #ff9800' }} />
));

const BarbieSparkles = () => Array.from({ length: 30 }).map((_, i) => {
  const chars = ['💖', '✨', '🎀'];
  return <div key={i} className="float-up" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${6 + Math.random() * 8}s`, animationDelay: `-${Math.random() * 8}s`, fontSize: `${15 + Math.random() * 25}px`, opacity: 0.8 }}>
    {chars[Math.floor(Math.random() * chars.length)]}
  </div>;
});

const ForestLeaves = () => Array.from({ length: 25 }).map((_, i) => {
  const chars = ['🍃', '🍂', '🍁'];
  return <div key={i} className="leaf" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${10 + Math.random() * 15}s`, animationDelay: `-${Math.random() * 15}s`, fontSize: `${20 + Math.random() * 20}px` }}>
    {chars[Math.floor(Math.random() * chars.length)]}
  </div>;
});


export default function ThemeEffects() {
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light');

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setTheme(document.documentElement.getAttribute('data-theme'));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const renderEffect = () => {
    switch (theme) {
      case 'frozen': return <Snowflakes />;
      case 'simpsons': return <SimpsonsDonuts />;
      case 'batman': return <BatSignal />;
      case 'snake': return <SnakeEffect />;
      case 'mario': return <MarioClouds />;
      case 'lotr': return <LotrEmbers />;
      case 'matrix': // also handled as 'hacker' via global.css mapping, wait 'matrix' is the data-theme
      case 'hacker': return <HackerRain />;
      case 'ocean': return <OceanBubbles />;
      case 'space': return <SpaceStars />;
      case 'discord': return <DiscordControllers />;
      case 'vaporwave': return <VaporwaveGrid />;
      case 'gruvbox': return <GruvboxBrackets />;
      case 'zelda': return <ZeldaFairy />;
      case 'dracula': return <DraculaBats />;
      case 'pacman': return <PacmanChase />;
      case 'minecraft': return <MinecraftBlocks />;
      case 'cyberpunk': return <CyberpunkScanlines />;
      case 'fire': return <FireSparks />;
      case 'barbie': return <BarbieSparkles />;
      case 'forest': return <ForestLeaves />;
      default: return null;
    }
  };

  const effect = renderEffect();
  if (!effect) return null;

  return (
    <div className="theme-effects-container">
      {effect}
    </div>
  );
}
