import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { CalendarDays, Edit3, Trash2, Hourglass, Plus, Bell } from 'lucide-react';
import { LoadingRow, EmptyRow, btnStyle, inputStyle } from './AdminHelpers';
import { EVENT_TYPES, typeMeta, fmtEventWhen, toInputValue, fromInputValue } from '../../utils/calendar';

const EMPTY_FORM = {
  title: '', type: 'event', description: '', location: '',
  all_day: true, start_at: '', end_at: '', show_countdown: false, notify: false,
};

const labelStyle = { display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '6px' };

export const CalendarTab = ({ isAdmin, showToast, setConfirmModal }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/calendar/events')
      .then(r => setEvents(r.data.events || []))
      .catch(() => showToast('Could not load events.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  // Switching between all-day and timed keeps the chosen dates
  const toggleAllDay = (e) => {
    const allDay = e.target.checked;
    const convert = (v) => !v ? '' : allDay ? v.slice(0, 10) : `${v.slice(0, 10)}T09:00`;
    setForm({ ...form, all_day: allDay, start_at: convert(form.start_at), end_at: convert(form.end_at) });
  };

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title, type: ev.type, description: ev.description, location: ev.location,
      all_day: ev.all_day, show_countdown: ev.show_countdown,
      start_at: toInputValue(ev.start_at, ev.all_day),
      end_at: toInputValue(ev.end_at, ev.all_day),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditingId(null); setForm(EMPTY_FORM); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      start_at: fromInputValue(form.start_at, form.all_day),
      end_at: fromInputValue(form.end_at, form.all_day),
    };
    try {
      if (editingId) {
        await api.put(`/admin/calendar/events/${editingId}`, payload);
        showToast('Event updated');
      } else {
        await api.post('/admin/calendar/events', payload);
        showToast(form.notify ? 'Event added and everyone notified' : 'Event added');
      }
      cancelEdit();
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save the event.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = (ev) => setConfirmModal({
    title: <><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete Event</>,
    body: `Delete "${ev.title}" from the calendar? This cannot be undone.`,
    danger: true,
    onConfirm: async () => {
      try {
        await api.delete(`/admin/calendar/events/${ev.id}`);
        showToast('Event deleted');
        if (editingId === ev.id) cancelEdit();
        load();
      } catch (err) {
        showToast(err.response?.data?.message || 'Delete failed.', 'error');
      }
      setConfirmModal(null);
    },
  });

  const now = Date.now();
  const isPast = (ev) => new Date(ev.end_at || ev.start_at).getTime() < now - 86400000;
  const shown = events.filter(ev => showPast || !isPast(ev));
  const pastCount = events.filter(isPast).length;
  const dateType = form.all_day ? 'date' : 'datetime-local';

  return (
    <div>
      <form onSubmit={save} style={{ background: 'var(--bg-white)', borderRadius: '24px', border: editingId ? '2px solid var(--primary)' : '1px solid var(--border)', padding: '28px', marginBottom: '32px' }}>
        <h3 style={{ fontWeight: 900, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={24} /> {editingId ? 'Edit Event' : 'Add Calendar Event'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Title *</label>
            <input value={form.title} onChange={set('title')} placeholder="e.g. Fall 2026 Midterms" required maxLength={200} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Type *</label>
            <select value={form.type} onChange={set('type')} style={inputStyle}>
              {Object.entries(EVENT_TYPES).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <input value={form.location} onChange={set('location')} placeholder="e.g. Main Academic Block" maxLength={200} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{form.all_day ? 'Start date *' : 'Starts (PKT) *'}</label>
            <input type={dateType} value={form.start_at} onChange={set('start_at')} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{form.all_day ? 'End date (multi-day events)' : 'Ends (PKT)'}</label>
            <input type={dateType} value={form.end_at} onChange={set('end_at')} min={form.start_at || undefined} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={set('description')} rows={3} maxLength={5000}
              placeholder="Details students should know, e.g. which courses or a link to the official schedule."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '18px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.all_day} onChange={toggleAllDay} /> All-day event
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.show_countdown} onChange={set('show_countdown')} />
            <Hourglass size={14} /> Pin a countdown on the calendar page
          </label>
          {!editingId && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.notify} onChange={set('notify')} />
              <Bell size={14} /> Notify everyone about this event
            </label>
          )}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          Midterms and finals always get a countdown. Reminders go out automatically before exams, holidays and deadlines. Times are campus time (PKT).
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          {editingId && (
            <button type="button" onClick={cancelEdit} style={{ flex: 1, padding: '14px', border: '1px solid var(--border)', borderRadius: '100px', background: 'var(--bg-white)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={saving} style={{ flex: 2, background: 'var(--primary)', color: 'var(--nav-btn-text)', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '14px', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {editingId ? 'Save Changes' : <><Plus size={16} /> Add Event</>}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ fontWeight: 900, fontSize: '1.1rem' }}>{showPast ? 'All events' : 'Upcoming events'} ({shown.length})</h3>
        {pastCount > 0 && (
          <button onClick={() => setShowPast(p => !p)} style={btnStyle('var(--text-muted)')}>
            {showPast ? 'Hide past events' : `Show ${pastCount} past`}
          </button>
        )}
      </div>

      <div style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? <LoadingRow /> : shown.length === 0 ? (
          <EmptyRow icon={<CalendarDays size={40} />} msg="No events yet. Add the first one above." />
        ) : shown.map(ev => {
          const { label, color } = typeMeta(ev.type);
          return (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', opacity: isPast(ev) ? 0.6 : 1 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {ev.title}
                  {ev.show_countdown && <Hourglass size={14} style={{ color }} />}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span style={{ fontWeight: 800, color }}>{label}</span> · {fmtEventWhen(ev)}{ev.location ? ` · ${ev.location}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => startEdit(ev)} style={{ ...btnStyle('var(--primary)'), display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Edit3 size={14} /> Edit</button>
                <button onClick={() => remove(ev)} style={{ ...btnStyle('var(--accent)'), display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
