import { useState, useEffect } from 'react';

// Batches from this year on study the 2025 prospectus plan; earlier ones the old plan.
export const NEW_CURRICULUM_FROM_BATCH = 2025;

export const CURRICULA = [
  { id: '2025', label: '2025 curriculum' },
  { id: 'old', label: 'Earlier batches' },
];

const STORAGE_KEY = 'curriculum';

/** The plan a user follows: their saved choice, else their batch year, else the 2025 plan. */
export function defaultCurriculum(user) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === '2025' || saved === 'old') return saved;
  } catch { /* storage unavailable */ }
  const batch = Number(user?.batchYear);
  if (batch && batch < NEW_CURRICULUM_FROM_BATCH) return 'old';
  return '2025';
}

/** [curriculum, setCurriculum], remembered across pages and visits. */
export function useCurriculum(user) {
  const [curriculum, setState] = useState(() => defaultCurriculum(user));
  // The signed-in user often loads after the page; follow their batch until they pick
  useEffect(() => { setState(defaultCurriculum(user)); }, [user?.batchYear]);
  const setCurriculum = (value) => {
    setState(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* storage unavailable */ }
  };
  return [curriculum, setCurriculum];
}
