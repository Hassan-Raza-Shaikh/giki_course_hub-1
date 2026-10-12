import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, Lock, X } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PageHeader, Card, Button, EmptyState } from '../components/ui';
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
    <div className="ui-page">
      <div className="page-container" style={{ maxWidth: '800px' }}>

        <PageHeader
          icon={<Bell size={40} strokeWidth={2.5} />}
          title="Notifications"
          subtitle="Updates on your uploads, courses and upcoming events."
        />

        {!user ? (
          <Card padding="lg">
            <EmptyState
              icon={<Lock size={56} strokeWidth={1.5} />}
              title="Account Required"
              text="Please sign in to see your notifications."
              action={<Button variant="primary" onClick={onSignIn}>Sign In Now</Button>}
            />
          </Card>
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
                <Button size="sm" icon={<CheckCheck size={16} strokeWidth={2.5} />} onClick={markAllRead}>
                  Mark all read
                </Button>
              )}
            </div>

            {loading ? (
              <LoadingSpinner message="Loading notifications..." />
            ) : visible.length === 0 ? (
              <Card padding="lg">
                <EmptyState
                  icon={<BellOff size={56} strokeWidth={1.5} />}
                  title={filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
                  text={filter === 'unread'
                    ? 'You have read everything. New updates will appear here.'
                    : "When your uploads are reviewed or something new happens in your courses, you'll see it here."}
                />
              </Card>
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
                  <Button onClick={loadMore} disabled={loadingMore} style={{ alignSelf: 'center', marginTop: '8px' }}>
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </Button>
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
