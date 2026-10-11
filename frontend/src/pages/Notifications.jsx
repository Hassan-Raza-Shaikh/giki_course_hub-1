import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, Lock, X } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  NotificationIcon, timeAgo, notificationsApi,
  emitNotificationsChanged, onNotificationsChanged,
} from '../components/notifications/notificationUtils';

const PAGE_SIZE = 20;

const Notifications = ({ user, onSignIn }) => {
  const [items, setItems]       = useState([]);
  const [unread, setUnread]     = useState(0);
  const [filter, setFilter]     = useState('all');   // 'all' | 'unread'
  const [hasMore, setHasMore]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  const load = useCallback((before) => {
    const params = { limit: PAGE_SIZE };
    if (before) params.before = before;
    if (filter === 'unread') params.unread = 1;
    return notificationsApi.list(params).then(res => {
      if (!res.data.success) return;
      setItems(prev => before ? [...prev, ...res.data.notifications] : res.data.notifications);
      setHasMore(res.data.has_more);
      setUnread(res.data.unread_count);
    });
  }, [filter]);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    load().catch(() => {}).finally(() => setLoading(false));
  }, [user, load]);

  // Stay in sync with reads made from the navbar bell
  useEffect(() => onNotificationsChanged(count => {
    if (typeof count === 'number') setUnread(count);
    if (count === 0) setItems(prev => prev.map(x => ({ ...x, is_read: true })));
  }), []);

  const loadMore = () => {
    if (!items.length) return;
    setLoadingMore(true);
    load(items[items.length - 1].notification_id).catch(() => {}).finally(() => setLoadingMore(false));
  };

  const markRead = (n) => {
    if (n.is_read) return;
    const next = Math.max(0, unread - 1);
    setItems(prev => prev.map(x => x.notification_id === n.notification_id ? { ...x, is_read: true } : x));
    setUnread(next);
    emitNotificationsChanged(next);
    notificationsApi.markRead(n.notification_id).catch(() => {});
  };

  const openItem = (n) => {
    markRead(n);
    if (n.link) navigate(n.link);
  };

  const remove = (n) => {
    const next = n.is_read ? unread : Math.max(0, unread - 1);
    setItems(prev => prev.filter(x => x.notification_id !== n.notification_id));
    setUnread(next);
    emitNotificationsChanged(next);
    notificationsApi.remove(n.notification_id).catch(() => load());
  };

  const markAllRead = () => {
    setItems(prev => prev.map(x => ({ ...x, is_read: true })));
    setUnread(0);
    emitNotificationsChanged(0);
    notificationsApi.markAllRead().catch(() => load());
  };

  const visible = filter === 'unread' ? items.filter(x => !x.is_read) : items;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-hero)', paddingTop: '100px', paddingBottom: '80px' }}>
      <div className="page-container" style={{ maxWidth: '800px' }}>

        {/* Header */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px',
          padding: '32px 40px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', marginBottom: '32px',
          display: 'flex', alignItems: 'center', gap: '24px', color: 'var(--text)', flexWrap: 'wrap',
          animation: 'fadeUp 0.4s ease-out'
        }}>
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <Bell size={40} strokeWidth={2.5} color="var(--primary)" />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px 0', lineHeight: 1.1 }}>
              Notifications
            </h1>
            <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              Updates on your uploads, courses and upcoming events.
            </p>
          </div>
        </div>

        {!user ? (
          <ScrollReveal delay="reveal-delay-1">
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', padding: '80px 32px', textAlign: 'center' }}>
              <div style={{ marginBottom: '24px', color: 'var(--text-light)', display: 'flex', justifyContent: 'center' }}><Lock size={64} strokeWidth={1.5} /></div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>Account Required</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Please sign in to see your notifications.</p>
              <button className="btn-primary" onClick={onSignIn}>Sign In Now</button>
            </div>
          </ScrollReveal>
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div className="notif-tabs" role="tablist">
                {[['all', 'All'], ['unread', `Unread${unread ? ` (${unread})` : ''}`]].map(([id, label]) => (
                  <button key={id} role="tab" aria-selected={filter === id}
                    className={`notif-tab ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
                    {label}
                  </button>
                ))}
              </div>
              {unread > 0 && (
                <button className="btn-nav" onClick={markAllRead}>
                  <CheckCheck size={16} strokeWidth={2.5} /> Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <LoadingSpinner message="Loading notifications..." />
            ) : visible.length === 0 ? (
              <ScrollReveal delay="reveal-delay-1">
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', padding: '60px 32px', textAlign: 'center' }}>
                  <div style={{ marginBottom: '20px', color: 'var(--text-light)', display: 'flex', justifyContent: 'center' }}><BellOff size={56} strokeWidth={1.5} /></div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>
                    {filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto' }}>
                    {filter === 'unread'
                      ? 'You have read everything. New updates will appear here.'
                      : "When your uploads are reviewed or something new happens in your courses, you'll see it here."}
                  </p>
                </div>
              </ScrollReveal>
            ) : (
              <div className="notif-page-list">
                {visible.map(n => (
                  <div key={n.notification_id} className={`notif-card ${n.is_read ? '' : 'unread'}`}>
                    <button className="notif-card-main" onClick={() => openItem(n)}>
                      <NotificationIcon type={n.type} size={20} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span className="notif-item-title">{n.title}</span>
                        {n.body && <span className="notif-item-body full">{n.body}</span>}
                        <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                      </span>
                      {!n.is_read && <span className="notif-dot" aria-label="Unread" />}
                    </button>
                    <button className="notif-card-remove" onClick={() => remove(n)} title="Remove notification" aria-label="Remove notification">
                      <X size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
                {hasMore && (
                  <button className="btn-outline" onClick={loadMore} disabled={loadingMore}
                    style={{ alignSelf: 'center', marginTop: '8px', fontSize: '0.9rem', padding: '10px 24px' }}>
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
