import React from 'react';
import { CheckCircle, XCircle, Flag, FilePlus, CalendarDays, Megaphone, Bell } from 'lucide-react';
import api from '../../services/api';

// Icon + theme colour per notification type. Keep in sync with TYPES in notifications.py.
export const NOTIFICATION_META = {
  upload_approved:  { icon: CheckCircle,  color: '#10B981' },
  upload_rejected:  { icon: XCircle,      color: '#dc2626' },
  report_resolved:  { icon: Flag,         color: '#10B981' },
  report_dismissed: { icon: Flag,         color: 'var(--text-muted)' },
  new_file:         { icon: FilePlus,     color: 'var(--primary)' },
  calendar_event:   { icon: CalendarDays, color: 'var(--electric)' },
  announcement:     { icon: Megaphone,    color: 'var(--accent)' },
};

export const NotificationIcon = ({ type, size = 18 }) => {
  const meta = NOTIFICATION_META[type] || { icon: Bell, color: 'var(--primary)' };
  const Icon = meta.icon;
  return (
    <span className="notif-icon" style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}>
      <Icon size={size} strokeWidth={2.25} />
    </span>
  );
};

export const timeAgo = (iso) => {
  if (!iso) return '';
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

// The bell and the notifications page each hold their own copy of the unread
// count; this event keeps them in sync after reads/deletes.
const CHANGED_EVENT = 'notifications:changed';
export const emitNotificationsChanged = (unreadCount) =>
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: { unreadCount } }));
export const onNotificationsChanged = (handler) => {
  const listener = (e) => handler(e.detail?.unreadCount);
  window.addEventListener(CHANGED_EVENT, listener);
  return () => window.removeEventListener(CHANGED_EVENT, listener);
};

export const notificationsApi = {
  list: (params = {}) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};
