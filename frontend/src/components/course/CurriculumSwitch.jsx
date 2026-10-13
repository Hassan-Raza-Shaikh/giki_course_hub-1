import React from 'react';
import { CURRICULA } from '../../utils/curriculum';

/** Pill toggle between the 2025 plan and the one earlier batches follow. */
export default function CurriculumSwitch({ value, onChange, style }) {
  return (
    <div
      role="radiogroup"
      aria-label="Curriculum"
      style={{
        display: 'inline-flex', padding: 4, gap: 4, borderRadius: 'var(--radius-pill)',
        background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-soft)',
        ...style,
      }}
    >
      {CURRICULA.map(c => {
        const active = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c.id)}
            style={{
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '0.85rem',
              padding: '10px 18px', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
              background: active ? 'var(--primary)' : 'transparent',
              color: active ? 'var(--on-primary)' : 'var(--text-muted)',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
