import React, { useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import api from '../../services/api';
import { Card, Button, Alert } from '../ui';
import { NotificationIcon } from '../notifications/notificationUtils';

const TITLE_MAX = 200;
const BODY_MAX = 1000;

export const AnnounceTab = ({ showToast, setConfirmModal }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  const linkInvalid = link.trim() && (!link.trim().startsWith('/') || link.trim().startsWith('//'));
  const canSend = title.trim() && !linkInvalid && !sending;

  const send = async () => {
    setConfirmModal(null);
    setSending(true);
    try {
      const res = await api.post('/admin/announcements', { title: title.trim(), body: body.trim(), link: link.trim() });
      showToast(res.data.message || 'Announcement sent.');
      setTitle(''); setBody(''); setLink('');
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to send announcement.', 'error');
    } finally {
      setSending(false);
    }
  };

  const confirm = () => setConfirmModal({
    title: 'Send to everyone?',
    body: `"${title.trim()}" will appear in every user's notifications. This can't be unsent.`,
    onConfirm: send,
  });

  return (
    <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
      <Card padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Megaphone size={22} strokeWidth={2.5} color="var(--primary)" />
          <h3 style={{ margin: 0, fontWeight: 900 }}>Send an announcement</h3>
        </div>

        <div className="ui-field">
          <label className="ui-label" htmlFor="ann-title">Title</label>
          <input id="ann-title" className="ui-input" maxLength={TITLE_MAX} value={title}
            onChange={e => setTitle(e.target.value)} placeholder="e.g. Midterm past papers are up" />
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="ann-body">Message <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(optional)</span></label>
          <textarea id="ann-body" className="ui-textarea" maxLength={BODY_MAX} value={body}
            onChange={e => setBody(e.target.value)} placeholder="A sentence or two of detail." />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', textAlign: 'right', marginTop: '4px' }}>{body.length}/{BODY_MAX}</div>
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="ann-link">Link <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(optional, an in-app path)</span></label>
          <input id="ann-link" className="ui-input" value={link}
            onChange={e => setLink(e.target.value)} placeholder="/courses" />
          {linkInvalid && <div style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '6px' }}>Use a path inside the app, starting with /</div>}
        </div>

        <Alert tone="info" style={{ marginBottom: '16px' }}>Every user gets this in their notification centre.</Alert>
        <Button variant="primary" block icon={<Send size={16} />} disabled={!canSend} onClick={confirm}>
          {sending ? 'Sending…' : 'Send to everyone'}
        </Button>
      </Card>

      <Card padding="lg">
        <div className="ui-label" style={{ marginBottom: '12px' }}>Preview</div>
        <div className="notif-card unread" style={{ animation: 'none' }}>
          <div className="notif-card-main" style={{ cursor: 'default' }}>
            <NotificationIcon type="announcement" size={20} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="notif-item-title">{title.trim() || 'Your title'}</span>
              {body.trim() && <span className="notif-item-body full">{body.trim()}</span>}
              <span className="notif-item-time">just now</span>
            </span>
            <span className="notif-dot" />
          </div>
        </div>
      </Card>
    </div>
  );
};
