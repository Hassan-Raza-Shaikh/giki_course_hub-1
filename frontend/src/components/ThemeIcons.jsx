import React from 'react';

export const BatIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 100 50" fill="currentColor" {...props}>
    <path d="M50 3.8C42.8 3.8 38 6 35.8 7.5c-2.2 1.5-3.8 3.8-5 6-1.5-3-3.8-4.5-6.8-5.3-3-.8-6.8-.8-9.8 0-3 .8-6 2.3-7.5 4.5-1.5 2.2-2.3 5.3-2.3 8.3 0 6 3.8 11.3 8.3 14.3 4.5 3 9.8 4.5 15 5.3 5.3.8 10.5.8 16.5 0 6-.8 11.3-2.3 15.8-5.3 4.5-3 8.3-8.3 8.3-14.3 0-3-.8-6-2.3-8.3-1.5-2.2-4.5-3.8-7.5-4.5-3-.8-6.8-.8-9.8 0-3 .8-5.3 2.3-6.8 5.3-1.2-2.2-2.8-4.5-5-6C57 6 52.2 3.8 45 3.8z" />
  </svg>
);

export const PacmanIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10L12 12V2z" />
  </svg>
);

export const PokeballIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <path d="M2 12h7" />
    <path d="M15 12h7" />
  </svg>
);

export const MushroomIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 12c0-4.4-3.6-8-8-8s-8 3.6-8 8" />
    <path d="M4 12h16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2z" />
    <path d="M9 16v4" />
    <path d="M15 16v4" />
  </svg>
);

export const TriforceIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2L2 20h20L12 2zm0 10.5L16.5 20h-9L12 12.5z" />
  </svg>
);

export const MatrixIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 3v18" />
    <path d="M12 3v18" />
    <path d="M18 3v18" />
    <path d="M4 7h4" />
    <path d="M10 11h4" />
    <path d="M16 15h4" />
  </svg>
);

export const RingIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="12" rx="10" ry="6" />
    <ellipse cx="12" cy="12" rx="7" ry="3" />
  </svg>
);

export const DonutIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <path d="M10 2a10 10 0 0 1 8 5" />
    <path d="M22 12a10 10 0 0 1-5 8" />
  </svg>
);

export const BlockIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="M3.3 7l8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);
