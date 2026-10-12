import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, BellOff } from 'lucide-react';
import {
  NotificationIcon, timeAgo, notificationsApi,
  emitNotificationsChanged, onNotificationsChanged,
} from './notificationUtils';

const POLL_MS = 60 * 1000;
const PANEL_LIMIT = 8;

const NotificationBell = ({ user }) => {
  const [open, setOpen]       = useState(false);
  const [unread, setUnread]   = useState(0);
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const refreshCount = useCallback(() => {
    notificationsApi.unreadCount()
      .then(res => { if (res.data.success) setUnread(res.data.unread_count); })
      .catch(() => {});
  }, []);

  // Badge: fetch on sign-in, then poll only while the tab is visible
  useEffect(() => {
    if (!user) { setUnread(0); setItems([]); return; }
    refreshCount();
    const tick = () => { if (document.visibilityState === 'visible') refreshCount(); };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [user, refreshCount]);

  useEffect(() => onNotificationsChanged(count => {
    if (typeof count === 'number') setUnread(count); else refreshCount();
  }), [refreshCount]);

  // Load the latest few whenever the panel opens
  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    notificationsApi.list({ limit: PANEL_LIMIT })
      .then(res => {
        if (res.data.success) { setItems(res.data.notifications); setUnread(res.data.unread_count); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const openItem = (n) => {
    if (!n.is_read) {
      const next = Math.max(0, unread - 1);
      setItems(prev => prev.map(x => x.notification_id === n.notification_id ? { ...x, is_read: true } : x));
      setUnread(next);
      emitNotificationsChanged(next);
      notificationsApi.markRead(n.notification_id).catch(() => {});
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAllRead = () => {
    setItems(prev => prev.map(x => ({ ...x, is_read: true })));
    setUnread(0);
    emitNotificationsChanged(0);
    notificationsApi.markAllRead().catch(refreshCount);
  };

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`notif-bell ${open ? 'open' : ''}`}
        data-tour="notifications"
        onClick={() => setOpen(o => !o)}
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={20} strokeWidth={2.5} />
        {unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div style={{ height: '5px', background: 'linear-gradient(90deg, var(--primary), var(--electric))' }} />

          <div className="notif-panel-header">
            <div>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text)' }}>Notifications</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {unread ? `${unread} unread` : "You're all caught up"}
              </div>
            </div>
            {unread > 0 && (
              <button className="notif-link-btn" onClick={markAllRead}>
                <CheckCheck size={14} strokeWidth={2.5} /> Mark all read
              </button>
            )}
          </div>

          <div className="notif-panel-list">
            {loading && items.length === 0 ? (
              <div className="notif-empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="notif-empty">
                <BellOff size={32} strokeWidth={1.5} style={{ color: 'var(--text-light)' }} />
                <div style={{ fontWeight: 800, color: 'var(--text)' }}>No notifications yet</div>
                <div>Updates about your uploads and courses will show up here.</div>
              </div>
            ) : items.map(n => (
              <button key={n.notification_id} className={`notif-item ${n.is_read ? '' : 'unread'}`} onClick={() => openItem(n)}>
                <NotificationIcon type={n.type} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="notif-item-title">{n.title}</span>
                  {n.body && <span className="notif-item-body">{n.body}</span>}
                  <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                </span>
                {!n.is_read && <span className="notif-dot" aria-label="Unread" />}
              </button>
            ))}
          </div>

          <button className="notif-panel-footer" onClick={() => { setOpen(false); navigate('/notifications'); }}>
            View all notifications <span style={{ color: 'var(--text-muted)' }}>→</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
