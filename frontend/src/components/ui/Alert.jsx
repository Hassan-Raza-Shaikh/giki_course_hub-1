import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cx } from './cx';

const ICONS = { danger: AlertTriangle, warning: AlertTriangle, success: CheckCircle, info: Info };

/** Inline banner. tone: 'danger' | 'warning' | 'success' | 'info' */
const Alert = ({ tone = 'info', icon, className, children, ...props }) => {
  const Icon = ICONS[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('ui-alert', `ui-alert--${tone}`, className)} {...props}>
      {icon !== undefined ? icon : <Icon size={18} style={{ flexShrink: 0 }} />}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};

export default Alert;
