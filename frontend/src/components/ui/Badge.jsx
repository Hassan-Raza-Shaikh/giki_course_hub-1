import React from 'react';
import { cx } from './cx';

/** tone: 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info' */
const Badge = ({ tone = 'neutral', className, children, ...props }) => (
  <span className={cx('ui-badge', tone !== 'neutral' && `ui-badge--${tone}`, className)} {...props}>{children}</span>
);

// Maps record states used across the app to a badge tone.
export const STATUS_TONES = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  resolved: 'info',
  dismissed: 'neutral',
};

export const StatusBadge = ({ status }) => (
  <Badge tone={STATUS_TONES[status] || 'neutral'} style={{ textTransform: 'uppercase' }}>{status}</Badge>
);

export default Badge;
