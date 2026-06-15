import React, { useEffect, useState } from 'react';
import '../styles/ThemeEffects.css';

const BatSignal = () => (
  <div className="bat-signal-container">
    <svg className="bat-logo" viewBox="0 0 100 60" fill="#000" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 59.8 C 45 55, 30 40, 10 30 C 0 25, 0 10, 5 5 C 10 10, 15 15, 20 10 C 25 5, 20 0, 30 0 C 35 5, 40 10, 45 10 L 48 2 L 52 2 L 55 10 C 60 10, 65 5, 70 0 C 80 0, 75 5, 80 10 C 85 15, 90 10, 95 5 C 100 10, 100 25, 90 30 C 70 40, 55 55, 50 59.8 Z" />
    </svg>
  </div>
);

const Snowflakes = () => {
  return Array.from({ length: 30 }).map((_, i) => (
    <div key={i} className="snow-flake" style={{
      left: `${Math.random() * 100}vw`,
      animationDuration: `${5 + Math.random() * 10}s`,
      animationDelay: `-${Math.random() * 10}s`,
      fontSize: `${10 + Math.random() * 20}px`
    }}>
      ❄
    </div>
  ));
};

const SimpsonsDonuts = () => {
  return Array.from({ length: 15 }).map((_, i) => (
    <div key={i} className="donut" style={{
      left: `${Math.random() * 100}vw`,
      animationDuration: `${10 + Math.random() * 10}s`,
      animationDelay: `-${Math.random() * 15}s`,
      fontSize: `${30 + Math.random() * 40}px`
    }}>
      🍩
    </div>
  ));
};

const SnakeEffect = () => {
  // A snake made of 10 segments following each other
  return Array.from({ length: 15 }).map((_, i) => (
    <div key={i} className="snake-segment" style={{
      animationDelay: `-${(15 - i) * 0.15}s`
    }} />
  ));
};

const MarioClouds = () => {
  return Array.from({ length: 8 }).map((_, i) => (
    <div key={i} className="mario-cloud" style={{
      top: `${Math.random() * 60}vh`,
      animationDuration: `${20 + Math.random() * 40}s`,
      animationDelay: `-${Math.random() * 40}s`,
      fontSize: `${50 + Math.random() * 50}px`
    }}>
      ☁️
    </div>
  ));
};

const LotrEmbers = () => {
  return Array.from({ length: 40 }).map((_, i) => (
    <div key={i} className="ember" style={{
      left: `${Math.random() * 100}vw`,
      bottom: `${-10 - Math.random() * 20}px`,
      animationDuration: `${3 + Math.random() * 5}s`,
      animationDelay: `-${Math.random() * 5}s`
    }} />
  ));
};

const HackerRain = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
  return Array.from({ length: 40 }).map((_, i) => (
    <div key={i} className="matrix-char" style={{
      left: `${(i / 40) * 100}vw`,
      animationDuration: `${2 + Math.random() * 4}s`,
      animationDelay: `-${Math.random() * 4}s`
    }}>
      {chars[Math.floor(Math.random() * chars.length)]}
    </div>
  ));
};

const OceanBubbles = () => {
  return Array.from({ length: 30 }).map((_, i) => {
    const size = 10 + Math.random() * 30;
    return (
      <div key={i} className="bubble" style={{
        left: `${Math.random() * 100}vw`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${4 + Math.random() * 8}s`,
        animationDelay: `-${Math.random() * 8}s`
      }} />
    );
  });
};

const SpaceStars = () => {
  return Array.from({ length: 100 }).map((_, i) => {
    const size = 1 + Math.random() * 3;
    return (
      <div key={i} className="star" style={{
        left: `${Math.random() * 100}vw`,
        top: `${Math.random() * 100}vh`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${1 + Math.random() * 3}s`,
        animationDelay: `-${Math.random() * 3}s`
      }} />
    );
  });
};

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
      case 'hacker': return <HackerRain />;
      case 'ocean': return <OceanBubbles />;
      case 'space': return <SpaceStars />;
      case 'retro': 
      case 'synthwave':
        // Perhaps some grid lines or something, but let's leave simple for now
        return null;
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
