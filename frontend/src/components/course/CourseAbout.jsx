import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Badge } from '../ui';

const FOLD_AT = 320; // characters shown before "Read more"

/**
 * "About this course" card on the course page: the prospectus description,
 * credit hours, prerequisites, and the code earlier batches knew it by.
 */
export default function CourseAbout({ course }) {
  const [open, setOpen] = useState(false);
  const { description, credit_hours, prereq, old_code, old_name, old_semester, curriculum } = course;
  const renamed = old_code || old_name || old_semester;

  if (!description && !credit_hours && !prereq && !renamed) return null;

  const long = description && description.length > FOLD_AT;
  const text = long && !open ? `${description.slice(0, FOLD_AT).replace(/\s+\S*$/, '')}…` : description;

  const earlier = [
    old_code && <strong key="c">{old_code}</strong>,
    old_name && <span key="n">{old_name}</span>,
    old_semester && <span key="s">Semester {old_semester}</span>,
  ].filter(Boolean);

  return (
    <Card padding="lg" className="course-about">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: description ? 12 : 8, flexWrap: 'wrap' }}>
        <Info size={20} strokeWidth={2.5} color="var(--primary)" />
        <h2 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>About this course</h2>
        {curriculum === '2025' && <Badge tone="primary">New in 2025</Badge>}
        {curriculum === 'old' && <Badge>Earlier batches only</Badge>}
      </div>

      {description && (
        <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.65, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
          {text}
          {long && (
            <button
              onClick={() => setOpen(o => !o)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer',
                       padding: '0 0 0 6px', fontSize: '0.9rem', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 2 }}
            >
              {open ? <>Show less <ChevronUp size={14} /></> : <>Read more <ChevronDown size={14} /></>}
            </button>
          )}
        </p>
      )}

      {(credit_hours || prereq || earlier.length > 0) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: description ? 16 : 0 }}>
          {credit_hours != null && <Badge>{credit_hours} credit {credit_hours === 1 ? 'hour' : 'hours'}</Badge>}
          {prereq && <Badge>Prerequisite: {prereq}</Badge>}
          {earlier.length > 0 && (
            <Badge tone="info">
              Earlier batches:&nbsp;{earlier.reduce((acc, el, i) => (i ? [...acc, ' · ', el] : [el]), [])}
            </Badge>
          )}
        </div>
      )}
      {!description && (
        <p style={{ margin: '12px 0 0', color: 'var(--text-light)', fontSize: '0.85rem' }}>
          The prospectus has no description for this course.
        </p>
      )}
    </Card>
  );
}
