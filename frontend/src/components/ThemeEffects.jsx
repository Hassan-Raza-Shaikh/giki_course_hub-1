import React, { useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';
import '../styles/ThemeEffects.css';

const BatSignal = () => (
  <div className="bat-signal-container">
    <svg className="bat-logo" viewBox="0 0 122.13 69.89" xmlns="http://www.w3.org/2000/svg">
      <path fill="#f7dd30" d="M121.06,35c0,18.71-26.86,33.88-60,33.88S1.06,53.66,1.06,35s26.87-33.89,60-33.89,60,15.17,60,33.89Z"/>
      <path fill="#000000" d="M51.72,24.46c-14.49,5.37-21.86-8-14.49-15.74-11.75,3-30.86,11.49-30.86,25.63,0,12.83,12.49,20.09,21.49,23.22-8.68-10.74,3.25-19.16,13.7-7.41C49.69,35.73,59.28,56.44,61,59.58h0c1.71-3.14,11.31-23.85,19.44-9.42,10.45-11.75,22.38-3.33,13.7,7.41,9-3.13,21.49-10.39,21.49-23.22,0-14.14-19.11-22.63-30.86-25.63,7.37,7.74,0,21.11-14.49,15.74-1.67-2-2.75-6.11-2.75-18.24-1.94,1.26-3.33,5.71-3.45,6a12,12,0,0,0-6.15,0c-.12-.32-1.51-4.77-3.45-6,0,12.13-1.08,16.25-2.75,18.24ZM122.13,35c0,9.76-6.93,18.56-18.12,24.88-11,6.22-26.2,10.06-42.95,10.06S29.13,66.05,18.12,59.83C6.92,53.51,0,44.71,0,35S6.92,16.39,18.12,10.07C29.13,3.85,44.32,0,61.06,0S93,3.85,104,10.07C115.2,16.39,122.13,25.18,122.13,35ZM103,58c10.52-5.94,17-14.09,17-23s-6.51-17.1-17-23c-10.7-6-25.52-9.78-41.91-9.78s-31.2,3.74-41.9,9.78C8.64,17.85,2.13,26,2.13,35S8.64,52,19.16,58c10.7,6.05,25.52,9.79,41.9,9.79S92.27,64,103,58Z"/>
    </svg>
    <div className="bat-beam" />
  </div>
);

const Snowflakes = () => Array.from({ length: 30 }).map((_, i) => (
  <img key={i} src="/ice-crystal.png" className="snow-flake" alt="ice" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${5 + Math.random() * 10}s`, animationDelay: `-${Math.random() * 10}s`, width: `${15 + Math.random() * 20}px`, imageRendering: 'pixelated' }} />
));

const SimpsonsDonuts = () => Array.from({ length: 15 }).map((_, i) => (
  <img key={i} src="/simpsons-donut.png" className="donut" alt="donut" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${10 + Math.random() * 10}s`, animationDelay: `-${Math.random() * 15}s`, width: `${40 + Math.random() * 60}px` }} />
));

const SnakeEffect = () => {
  const [snake, setSnake] = useState(() => {
    const init = [];
    for(let i=0; i<15; i++) init.push({x: 20 - i, y: 10});
    return init;
  });
  const directionRef = React.useRef({dx: 1, dy: 0});
  const headRotRef = React.useRef(0);

  useEffect(() => {
    const moveInterval = setInterval(() => {
      setSnake(prev => {
        const head = prev[0];
        let { dx, dy } = directionRef.current;
        
        // 5% chance to randomly turn
        if (Math.random() < 0.05) {
          if (dx !== 0) {
            dx = 0;
            dy = Math.random() < 0.5 ? 1 : -1;
            headRotRef.current = dy === 1 ? 90 : -90;
          } else {
            dx = Math.random() < 0.5 ? 1 : -1;
            dy = 0;
            headRotRef.current = dx === 1 ? 0 : 180;
          }
          directionRef.current = { dx, dy };
        }

        let newX = head.x + dx;
        let newY = head.y + dy;

        const maxX = Math.floor(window.innerWidth / 25);
        const maxY = Math.floor(window.innerHeight / 25);

        // Wrap around boundaries
        if (newX < 0) newX = maxX;
        if (newX > maxX) newX = 0;
        if (newY < 0) newY = maxY;
        if (newY > maxY) newY = 0;

        const newSnake = [{x: newX, y: newY}, ...prev.slice(0, prev.length - 1)];
        
        // Slowly grow
        if (prev.length < 60 && Math.random() < 0.05) {
          newSnake.push(prev[prev.length - 1]);
        }
        return newSnake;
      });
    }, 120);

    return () => clearInterval(moveInterval);
  }, []);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {snake.map((segment, i) => (
        <img 
          key={i} 
          src={i === 0 ? "/snake-head.png" : "/snake-body.png"} 
          alt="snake"
          style={{
            position: 'absolute',
            left: `${segment.x * 25}px`,
            top: `${segment.y * 25}px`,
            width: '25px',
            height: '25px',
            imageRendering: 'pixelated',
            transform: i === 0 ? `rotate(${headRotRef.current}deg)` : 'none',
            opacity: 0.8
          }} 
        />
      ))}
    </div>
  );
};

const MarioSprites = () => (
  <>
    {/* 1 Mario running at bottom */}
    <img src="/mario.png" className="mario-sprite" alt="mario" style={{ bottom: '20px', animationDuration: `12s`, width: `40px` }} />
    {/* 2 Goombas following */}
    <img src="/goomba.png" className="mario-sprite" alt="goomba" style={{ bottom: '20px', animationDuration: `15s`, width: `40px` }} />
    <img src="/goomba.png" className="mario-sprite" alt="goomba" style={{ bottom: '20px', animationDuration: `18s`, width: `40px` }} />
    
    {/* Floating Blocks */}
    {Array.from({ length: 3 }).map((_, i) => (
      <img key={`block-${i}`} src="/mario-block.png" className="drift-left" alt="block" style={{ top: `${20 + i * 15}vh`, animationDuration: `${20 + Math.random() * 20}s`, animationDelay: `-${Math.random() * 20}s`, width: `40px`, imageRendering: 'pixelated', opacity: 0.9 }} />
    ))}
    {/* Floating Clouds */}
    {Array.from({ length: 4 }).map((_, i) => (
      <img key={`cloud-${i}`} src="/mario-cloud.png" className="mario-cloud" alt="cloud" style={{ top: `${10 + Math.random() * 40}vh`, animationDuration: `${30 + Math.random() * 30}s`, animationDelay: `-${Math.random() * 30}s`, width: `${60 + Math.random() * 40}px`, imageRendering: 'pixelated', opacity: 0.8 }} />
    ))}
  </>
);

const LotrEmbers = () => Array.from({ length: 20 }).map((_, i) => (
  <img key={i} src="/the-ring.png" className="ember" alt="ring" style={{ left: `${Math.random() * 100}vw`, bottom: `${-10 - Math.random() * 20}px`, animationDuration: `${3 + Math.random() * 5}s`, animationDelay: `-${Math.random() * 5}s`, width: `${10 + Math.random() * 15}px`, imageRendering: 'pixelated', boxShadow: 'none', background: 'none' }} />
));

const HackerRain = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
  return Array.from({ length: 40 }).map((_, i) => (
    <div key={i} className="matrix-char" style={{ left: `${(i / 40) * 100}vw`, animationDuration: `${2 + Math.random() * 4}s`, animationDelay: `-${Math.random() * 4}s` }}>
      {chars[Math.floor(Math.random() * chars.length)]}
    </div>
  ));
};

const OceanBubbles = () => Array.from({ length: 20 }).map((_, i) => (
  <div key={i} className="bubble" style={{ left: `${Math.random() * 100}vw`, width: `${20 + Math.random() * 30}px`, height: `${20 + Math.random() * 30}px`, animationDuration: `${5 + Math.random() * 10}s`, animationDelay: `-${Math.random() * 5}s` }}></div>
));

const SpaceStars = () => (
  <>
    <div className="nebula-cloud nebula-1" />
    <div className="nebula-cloud nebula-2" />
    <div className="nebula-cloud nebula-3" />
    {Array.from({ length: 150 }).map((_, i) => {
      const size = Math.random() > 0.8 ? 2 : 1;
      return <div key={i} className="space-star" style={{ 
        left: `${Math.random() * 100}vw`, 
        top: `${Math.random() * 100}vh`, 
        width: `${size}px`, 
        height: `${size}px`,
        animationDuration: `${3 + Math.random() * 5}s`,
        animationDelay: `-${Math.random() * 5}s`
      }} />;
    })}
  </>
);

// === NEW EFFECTS ===

const SvgDiscord = () => (
  <svg viewBox="0 0 127.14 96.36" width="1em" height="1em" fill="currentColor">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.1,46,96,53,91.08,65.69,84.69,65.69Z"/>
  </svg>
);

const MidnightStars = () => (
  <>
    <div className="midnight-moon" />
    {Array.from({ length: 60 }).map((_, i) => (
      <div key={`star-${i}`} className="midnight-star" style={{
        left: `${Math.random() * 100}vw`,
        top: `${Math.random() * 100}vh`,
        width: `${Math.random() * 3 + 1}px`,
        height: `${Math.random() * 3 + 1}px`,
        animationDuration: `${2 + Math.random() * 4}s`,
        animationDelay: `-${Math.random() * 5}s`,
      }} />
    ))}
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={`shooting-${i}`} className="shooting-star" style={{
        top: `${Math.random() * 50}vh`,
        left: `${Math.random() * 100}vw`,
        animationDuration: `${5 + Math.random() * 10}s`,
        animationDelay: `${Math.random() * 10}s`
      }} />
    ))}
  </>
);

const SvgPalm = () => (
  <svg viewBox="0 0 100 100" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg">
    <path fill="#8e24aa" d="M45 100 Q50 60 40 20 L55 20 Q60 60 55 100 Z" />
    <path fill="#00bcd4" d="M45 25 Q10 20 0 40 Q20 30 45 35 Z M50 20 Q20 0 10 10 Q30 20 50 25 Z M55 25 Q90 20 100 40 Q80 30 55 35 Z M50 20 Q80 0 90 10 Q70 20 50 25 Z" />
  </svg>
);
const SvgSun = () => (
  <svg viewBox="0 0 100 100" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" fill="#ff4081" />
    <rect x="10" y="60" width="80" height="4" fill="var(--bg-white)" />
    <rect x="10" y="68" width="80" height="6" fill="var(--bg-white)" />
    <rect x="10" y="78" width="80" height="8" fill="var(--bg-white)" />
  </svg>
);

const VaporwaveGrid = () => Array.from({ length: 8 }).map((_, i) => (
  <div key={i} className={i % 3 === 0 ? "drift-left" : "mario-cloud"} style={{ top: `${Math.random() * 80}vh`, animationDuration: `${20 + Math.random() * 30}s`, animationDelay: `-${Math.random() * 30}s`, fontSize: `${60 + Math.random() * 60}px`, opacity: 0.6 }}>
    {i % 3 === 0 ? <SvgSun /> : <SvgPalm />}
  </div>
));

const GruvboxBrackets = () => Array.from({ length: 20 }).map((_, i) => {
  const brackets = ['{ }', '< >', '[ ]', '( )', '=>'];
  return <div key={i} className="float-up" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${15 + Math.random() * 20}s`, animationDelay: `-${Math.random() * 20}s`, fontSize: `${15 + Math.random() * 20}px`, color: '#ebdbb2', opacity: 0.3, fontFamily: 'monospace' }}>
    {brackets[Math.floor(Math.random() * brackets.length)]}
  </div>;
});

const ZeldaFairy = () => Array.from({ length: 5 }).map((_, i) => (
  <img key={i} src="/navi.png" className="navi-fairy" alt="navi" style={{ left: `${20 + Math.random() * 60}vw`, top: `${20 + Math.random() * 60}vh`, animationDuration: `${4 + Math.random() * 4}s`, animationDelay: `-${Math.random() * 4}s`, width: `${30 + Math.random() * 20}px`, filter: 'drop-shadow(0 0 10px #64c8ff)' }} />
));

const DraculaBats = () => Array.from({ length: 15 }).map((_, i) => (
  <img key={i} src="/dracula-bat.png" className="bat" alt="bat" style={{ left: `${Math.random() * 100}vw`, top: `${Math.random() * 100}vh`, animationDuration: `${8 + Math.random() * 8}s`, animationDelay: `-${Math.random() * 8}s`, width: `${30 + Math.random() * 30}px`, imageRendering: 'pixelated' }} />
));

const PacmanChase = () => {
  const [chases, setChases] = useState([]);

  useEffect(() => {
    const spawn = () => {
      setChases(prev => {
        const newChases = [...prev, {
          id: Date.now(),
          top: Math.random() * 80 + 10,
          direction: Math.random() > 0.5 ? 1 : -1,
          isPowerPellet: Math.random() > 0.7,
          speed: 10 + Math.random() * 8
        }];
        return newChases.slice(-1); // Only 1 chase at a time!
      });
    };
    
    spawn();
    const interval = setInterval(spawn, 15000); // Wait 15s between chases so it's less crowded
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {chases.map(chase => (
        <div key={chase.id} style={{
          position: 'absolute',
          top: `${chase.top}vh`,
          left: chase.direction === 1 ? '-400px' : '100vw',
          display: 'flex',
          gap: '20px',
          flexDirection: chase.direction === 1 ? 'row' : 'row-reverse',
          animation: `pacmanSlide${chase.direction === 1 ? 'Right' : 'Left'} ${chase.speed}s linear forwards`,
          whiteSpace: 'nowrap'
        }}>
          {chase.isPowerPellet ? (
             <>
               <img src="/pacman.png" alt="pacman" style={{width:'40px', transform: `scaleX(${chase.direction === 1 ? 1 : -1})`, imageRendering: 'pixelated'}} />
               <img src="/ghost.png" alt="scared-ghost" style={{width:'40px', filter: 'hue-rotate(180deg) brightness(1.5)', transform: `scaleX(${chase.direction === 1 ? 1 : -1})`, imageRendering: 'pixelated'}} />
               <img src="/ghost.png" alt="scared-ghost" style={{width:'40px', filter: 'hue-rotate(180deg) brightness(1.5)', transform: `scaleX(${chase.direction === 1 ? 1 : -1})`, imageRendering: 'pixelated'}} />
               <img src="/ghost.png" alt="scared-ghost" style={{width:'40px', filter: 'hue-rotate(180deg) brightness(1.5)', transform: `scaleX(${chase.direction === 1 ? 1 : -1})`, imageRendering: 'pixelated'}} />
             </>
          ) : (
             <>
               <img src="/ghost.png" alt="ghost-red" className="ghost-red" style={{width:'40px', transform: `scaleX(${chase.direction === 1 ? 1 : -1})`, imageRendering: 'pixelated'}} />
               <img src="/ghost.png" alt="ghost-pink" className="ghost-pink" style={{width:'40px', transform: `scaleX(${chase.direction === 1 ? 1 : -1})`, imageRendering: 'pixelated'}} />
               <img src="/ghost.png" alt="ghost-cyan" className="ghost-cyan" style={{width:'40px', transform: `scaleX(${chase.direction === 1 ? 1 : -1})`, imageRendering: 'pixelated'}} />
               <img src="/ghost.png" alt="ghost-orange" className="ghost-orange" style={{width:'40px', transform: `scaleX(${chase.direction === 1 ? 1 : -1})`, imageRendering: 'pixelated'}} />
               <img src="/pacman.png" alt="pacman" style={{width:'40px', transform: `scaleX(${chase.direction === 1 ? 1 : -1})`, imageRendering: 'pixelated'}} />
             </>
          )}
        </div>
      ))}
    </>
  );
};

const MinecraftBlocks = () => Array.from({ length: 25 }).map((_, i) => (
  <img key={i} src="/minecraft-block.png" className="minecraft-block-sprite" alt="minecraft-block" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${10 + Math.random() * 15}s`, animationDelay: `-${Math.random() * 15}s`, width: `${20 + Math.random() * 30}px`, opacity: 0.9 }} />
));

const CyberpunkScanlines = () => Array.from({ length: 15 }).map((_, i) => (
  <div key={i} className="scanline" style={{ top: `${Math.random() * 100}vh`, animationDuration: `${2 + Math.random() * 3}s`, animationDelay: `-${Math.random() * 3}s` }}></div>
));

const FireSparks = () => Array.from({ length: 30 }).map((_, i) => (
  <img key={i} src="/flame.png" className="ember" alt="flame" style={{ left: `${Math.random() * 100}vw`, bottom: `${-10 - Math.random() * 20}px`, animationDuration: `${2 + Math.random() * 3}s`, animationDelay: `-${Math.random() * 3}s`, width: `${20 + Math.random() * 30}px`, imageRendering: 'pixelated', boxShadow: 'none', background: 'none' }} />
));

const BarbieSparkles = () => Array.from({ length: 25 }).map((_, i) => {
  return <img key={i} src="/barbie-bow.png" className="float-up barbie-item" alt="bow" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${6 + Math.random() * 8}s`, animationDelay: `-${Math.random() * 8}s`, width: `${20 + Math.random() * 30}px`, imageRendering: 'pixelated', opacity: 0.8 }} />;
});

const ForestLeaves = () => Array.from({ length: 30 }).map((_, i) => {
  const leaves = ["/leaf-green.png", "/leaf-orange.png", "/leaf-red.png"];
  const src = leaves[i % leaves.length];
  return <img key={i} src={src} className="leaf" alt="leaf" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${10 + Math.random() * 15}s`, animationDelay: `-${Math.random() * 15}s`, width: `${20 + Math.random() * 20}px`, imageRendering: 'pixelated' }} />;
});

const PokemonSprites = () => (
  <>
    {/* Pokeballs bouncing */}
    {Array.from({ length: 10 }).map((_, i) => (
      <img key={`ball-${i}`} src="/pokeball.png" className="pokeball-bounce" alt="pokeball" style={{ left: `${Math.random() * 100}vw`, animationDuration: `${3 + Math.random() * 5}s`, animationDelay: `-${Math.random() * 5}s`, width: `${30 + Math.random() * 20}px`, imageRendering: 'pixelated' }} />
    ))}
    <img src="/pikachu.png" className="pokemon-sprite" alt="pikachu" style={{ animationDuration: '25s', animationDelay: '-2s', width: '60px' }} />
    <img src="/charmander.png" className="pokemon-sprite" alt="charmander" style={{ animationDuration: '28s', animationDelay: '-12s', width: '60px' }} />
    <img src="/bulbasaur.png" className="pokemon-sprite" alt="bulbasaur" style={{ animationDuration: '32s', animationDelay: '-20s', width: '60px' }} />
    <img src="/squirtle.png" className="pokemon-sprite" alt="squirtle" style={{ animationDuration: '30s', animationDelay: '-5s', width: '60px' }} />
  </>
);

const SakuraPetals = () => Array.from({ length: 40 }).map((_, i) => (
  <div key={i} className="sakura-petal" style={{
    left: `${Math.random() * 100}vw`,
    animationDuration: `${8 + Math.random() * 12}s`,
    animationDelay: `-${Math.random() * 12}s`,
    width: `${8 + Math.random() * 8}px`,
    height: `${12 + Math.random() * 12}px`,
    opacity: 0.6 + Math.random() * 0.4
  }}></div>
));

const CoffeeSteam = () => Array.from({ length: 15 }).map((_, i) => (
  <div key={i} className="coffee-steam" style={{
    left: `${Math.random() * 100}vw`,
    animationDuration: `${15 + Math.random() * 15}s`,
    animationDelay: `-${Math.random() * 15}s`,
    width: `${40 + Math.random() * 60}px`,
    height: `${40 + Math.random() * 60}px`,
    opacity: 0.05 + Math.random() * 0.1
  }}></div>
));

const SpongeBobSprites = () => Array.from({ length: 12 }).map((_, i) => (
  <img key={i} src={`/sb-flower-${(i % 4) + 1}.svg`} className="spongebob-sprite" alt="spongebob-flower" style={{
    position: 'absolute',
    left: `${Math.random() * 100}vw`,
    top: `${Math.random() * 100}vh`,
    animation: `floatSlow ${15 + Math.random() * 20}s ease-in-out infinite alternate`,
    animationDelay: `-${Math.random() * 10}s`,
    width: `${60 + Math.random() * 80}px`,
    opacity: 0.8
  }} />
));

const DragonBallSprites = () => Array.from({ length: 7 }).map((_, i) => (
  <img key={i} src={`/dragonball-${i + 1}.svg`} className="dragonball-sprite" alt={`dragonball-${i + 1}`} style={{
    position: 'absolute',
    left: `${10 + Math.random() * 80}vw`,
    top: `${10 + Math.random() * 80}vh`,
    animation: `floatSlow ${10 + Math.random() * 10}s linear infinite alternate`,
    animationDelay: `-${Math.random() * 10}s`,
    width: `${40 + Math.random() * 30}px`,
    filter: 'drop-shadow(0 0 10px #FFD700)'
  }} />
));

const ScoobySprites = () => Array.from({ length: 8 }).map((_, i) => (
  <img key={i} src={i % 2 === 0 ? "/scooby-tag.svg" : "/scooby-snack.svg"} className="scooby-sprite" alt="scooby-item" style={{
    position: 'absolute',
    left: `${Math.random() * 100}vw`,
    top: `${Math.random() * 100}vh`,
    animation: `fall ${10 + Math.random() * 15}s linear infinite`,
    animationDelay: `-${Math.random() * 15}s`,
    width: `${40 + Math.random() * 30}px`,
    filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))'
  }} />
));


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
      case 'mario': return <MarioSprites />;
      case 'lotr': return <LotrEmbers />;
      case 'matrix': // also handled as 'hacker' via global.css mapping, wait 'matrix' is the data-theme
      case 'hacker': return <HackerRain />;
      case 'ocean': return <OceanBubbles />;
      case 'space': return <SpaceStars />;
      case 'discord': return <MidnightStars />;
      case 'vaporwave': return <VaporwaveGrid />;
      case 'gruvbox': return <GruvboxBrackets />;
      case 'zelda': return <ZeldaFairy />;
      case 'dracula': return <DraculaBats />;
      case 'pacman': return <PacmanChase />;
      case 'minecraft': return <MinecraftBlocks />;
      case 'cyberpunk': return <CyberpunkScanlines />;
      // case 'fire': return <FireSparks />;
      case 'dragonball': return <DragonBallSprites />;
      case 'barbie': return <BarbieSparkles />;
      // case 'forest': return <ForestLeaves />;
      case 'scooby': return <ScoobySprites />;
      case 'pokemon': return <PokemonSprites />;
      case 'samurai': return <SakuraPetals />;
      // case 'coffee': return <CoffeeSteam />;
      case 'spongebob': return <SpongeBobSprites />;
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
