import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Download, X, Rss, Copy, Hourglass, Settings } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import {
  EVENT_TYPES, typeMeta, dayKey, eventDayKeys, fmtDate, fmtEventWhen, timeLeft, isOngoing,
  icsUrl, feedUrl, webcalUrl, googleCalendarUrl, googleSubscribeUrl,
} from '../utils/calendar';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COUNTDOWN_TYPES = ['midterm', 'final'];

// Monday-first grid of 'YYYY-MM-DD' keys covering the given month
const monthGrid = (year, month) => {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(1 - offset);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
};

const TypePill = ({ type }) => {
  const { label, color } = typeMeta(type);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '100px',
      fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
      color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />{label}
    </span>
  );
};

/* ── Countdown card ───────────────────────────────────────────── */
const CountdownCard = ({ ev, now, onOpen, index }) => {
  const ongoing = isOngoing(ev, now);
  const endTarget = ev.all_day
    ? new Date(new Date(`${dayKey(ev.end_at || ev.start_at)}T00:00:00+05:00`).getTime() + 86400000)
    : (ev.end_at || ev.start_at);
  const t = timeLeft(ongoing ? endTarget : ev.start_at, now);
  const { color } = typeMeta(ev.type);
  const units = [['days', t.days], ['hrs', t.hours], ['min', t.minutes], ['sec', t.seconds]];

  return (
    <button onClick={() => onOpen(ev)} className="cal-countdown" style={{
      '--cd-color': color, animation: `fadeSlideUp 0.4s ease-out ${index * 0.06}s both`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <TypePill type={ev.type} />
        {ongoing && <span style={{ fontSize: '0.72rem', fontWeight: 800, color }}>● HAPPENING NOW</span>}
      </div>
      <div style={{ fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.25, color: 'var(--text)', marginBottom: '4px', textAlign: 'left' }}>{ev.title}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '14px', textAlign: 'left' }}>{fmtEventWhen(ev)}</div>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', textAlign: 'left' }}>
        {ongoing ? 'Ends in' : 'Starts in'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {units.map(([label, val]) => (
          <div key={label} className="cal-countdown-unit">
            <div style={{ fontWeight: 900, fontSize: '1.5rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums', color }}>{String(val).padStart(2, '0')}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>
    </button>
  );
};

/* ── Event row (agenda) ──────────────────────────────────────── */
const EventRow = ({ ev, onOpen }) => {
  const { color } = typeMeta(ev.type);
  return (
    <button onClick={() => onOpen(ev)} className="cal-event-row" style={{ '--ev-color': color }}>
      <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontWeight: 800, fontSize: '0.92rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
          <Clock size={12} /> {fmtEventWhen(ev)}
        </span>
      </span>
    </button>
  );
};

/* ── Add-to-calendar buttons ─────────────────────────────────── */
const AddToCalendar = ({ ev }) => (
  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
    <a href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer" className="btn-nav"
      style={{ background: 'var(--primary)', color: 'var(--nav-btn-text)', textDecoration: 'none' }}>
      <CalendarDays size={16} strokeWidth={2.5} /> Google Calendar
    </a>
    <a href={icsUrl(ev)} className="btn-nav"
      style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', textDecoration: 'none' }}>
      <Download size={16} strokeWidth={2.5} /> Apple / Outlook (.ics)
    </a>
  </div>
);

/* ── Modal shell ─────────────────────────────────────────────── */
const Modal = ({ onClose, children, maxWidth = 520 }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: 'var(--bg-card)', color: 'var(--text)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', padding: '28px', width: '100%', maxWidth, maxHeight: '90dvh', overflowY: 'auto', animation: 'scaleIn 0.2s ease-out' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}>
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
};

/* ── Page ────────────────────────────────────────────────────── */
const Calendar = ({ user }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const todayKey = dayKey(new Date());
  const [view, setView] = useState(() => ({ year: +todayKey.slice(0, 4), month: +todayKey.slice(5, 7) - 1 }));
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [monthEvents, setMonthEvents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hiddenTypes, setHiddenTypes] = useState(new Set());
  const [openEvent, setOpenEvent] = useState(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [now, setNow] = useState(Date.now());

  const grid = useMemo(() => monthGrid(view.year, view.month), [view]);

  // Live countdown tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.get('/calendar/upcoming?limit=20')
      .then(r => setUpcoming(r.data.events || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    api.get('/admin/check').then(r => setIsAdmin(!!r.data.is_admin)).catch(() => {});
  }, [user]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const from = `${grid[0]}T00:00:00+05:00`;
    const to = `${grid[grid.length - 1]}T23:59:59+05:00`;
    api.get(`/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(r => setMonthEvents(r.data.events || []))
      .catch(() => setError('Could not load the calendar. Please try again.'))
      .finally(() => setLoading(false));
  }, [grid]);

  const visible = (ev) => !hiddenTypes.has(ev.type);

  const eventsByDay = useMemo(() => {
    const map = {};
    monthEvents.filter(visible).forEach(ev => {
      eventDayKeys(ev).forEach(k => { (map[k] = map[k] || []).push(ev); });
    });
    return map;
  }, [monthEvents, hiddenTypes]);

  const countdowns = useMemo(() => {
    const pinned = upcoming.filter(ev => ev.show_countdown || COUNTDOWN_TYPES.includes(ev.type));
    return pinned.slice(0, 3);
  }, [upcoming]);

  const shiftMonth = (delta) => setView(v => {
    const d = new Date(Date.UTC(v.year, v.month + delta, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });

  const goToday = () => {
    setView({ year: +todayKey.slice(0, 4), month: +todayKey.slice(5, 7) - 1 });
    setSelectedDay(todayKey);
  };

  const toggleType = (type) => setHiddenTypes(prev => {
    const next = new Set(prev);
    next.has(type) ? next.delete(type) : next.add(type);
    return next;
  });

  const copyFeed = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl());
      toast.success('Calendar link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const monthLabel = new Date(Date.UTC(view.year, view.month, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const selectedEvents = eventsByDay[selectedDay] || [];
  const nextUp = upcoming.filter(visible).slice(0, 6);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-hero)', paddingTop: '100px', paddingBottom: '80px' }}>
      <div className="page-container" style={{ maxWidth: '1200px' }}>

        {/* Header */}
        <div className="cal-header" data-tour="calendar-header" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', flex: '1 1 340px', minWidth: 0 }}>
            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
              <CalendarDays size={40} strokeWidth={2.5} color="var(--primary)" />
            </div>
            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px 0', lineHeight: 1.1, fontFamily: 'var(--font-primary)' }}>
                GIKI <span className="gradient-text">Calendar</span>
              </h1>
              <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
                Midterms, finals, holidays and deadlines in one place. All times are campus time (PKT).
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isAdmin && (
              <button className="btn-nav" onClick={() => navigate('/admin?tab=calendar')} style={{ background: 'var(--bg-card)', color: 'var(--text)' }}>
                <Settings size={16} strokeWidth={2.5} /> Manage events
              </button>
            )}
            <button className="btn-nav" onClick={() => setShowSubscribe(true)} style={{ background: 'var(--primary)', color: 'var(--nav-btn-text)' }}>
              <Rss size={16} strokeWidth={2.5} /> Subscribe
            </button>
          </div>
        </div>

        {/* Countdowns */}
        {countdowns.length > 0 && (
          <section data-tour="calendar-countdowns" style={{ marginBottom: '32px' }}>
            <h3 className="cal-section-title"><Hourglass size={18} /> Countdowns</h3>
            <div className="cal-countdowns">
              {countdowns.map((ev, i) => <CountdownCard key={ev.id} ev={ev} now={now} onOpen={setOpenEvent} index={i} />)}
            </div>
          </section>
        )}

        {/* Type filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {Object.entries(EVENT_TYPES).map(([type, { label, color }]) => {
            const on = !hiddenTypes.has(type);
            return (
              <button key={type} onClick={() => toggleType(type)} aria-pressed={on} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '100px', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 800, transition: 'var(--transition)',
                color: on ? color : 'var(--text-light)',
                background: on ? `color-mix(in srgb, ${color} 12%, var(--bg-card))` : 'var(--bg-card)',
                border: `1px solid ${on ? `color-mix(in srgb, ${color} 40%, transparent)` : 'var(--border)'}`,
                opacity: on ? 1 : 0.6,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: on ? color : 'var(--text-light)' }} />{label}
              </button>
            );
          })}
        </div>

        <div className="cal-layout">
          {/* Month grid */}
          <section className="cal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, fontFamily: 'var(--font-primary)' }}>{monthLabel}</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={goToday} className="cal-nav-btn" style={{ width: 'auto', padding: '0 14px', fontWeight: 800, fontSize: '0.82rem' }}>Today</button>
                <button onClick={() => shiftMonth(-1)} className="cal-nav-btn" aria-label="Previous month"><ChevronLeft size={18} /></button>
                <button onClick={() => shiftMonth(1)} className="cal-nav-btn" aria-label="Next month"><ChevronRight size={18} /></button>
              </div>
            </div>

            <div className="cal-grid" style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.2s' }}>
              {WEEKDAYS.map(d => <div key={d} className="cal-weekday">{d}</div>)}
              {grid.map(key => {
                const inMonth = +key.slice(5, 7) - 1 === view.month;
                const dayEvents = eventsByDay[key] || [];
                const classes = ['cal-cell', !inMonth && 'is-outside', key === todayKey && 'is-today', key === selectedDay && 'is-selected'].filter(Boolean).join(' ');
                return (
                  <button key={key} className={classes} onClick={() => setSelectedDay(key)} aria-label={`${key}, ${dayEvents.length} events`}>
                    <span className="cal-daynum">{+key.slice(8)}</span>
                    <span className="cal-chips">
                      {dayEvents.slice(0, 2).map(ev => (
                        <span key={ev.id} className="cal-chip" style={{ '--ev-color': typeMeta(ev.type).color }}>{ev.title}</span>
                      ))}
                      {dayEvents.length > 2 && <span className="cal-more">+{dayEvents.length - 2}</span>}
                    </span>
                    <span className="cal-dots">
                      {dayEvents.slice(0, 3).map(ev => <span key={ev.id} style={{ background: typeMeta(ev.type).color }} />)}
                    </span>
                  </button>
                );
              })}
            </div>
            {error && <p style={{ color: 'var(--accent)', fontWeight: 700, marginTop: '12px' }}>{error}</p>}
          </section>

          {/* Agenda */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            <section className="cal-card">
              <h3 className="cal-section-title" style={{ marginBottom: '12px' }}>
                {selectedDay === todayKey ? 'Today' : fmtDate(`${selectedDay}T12:00:00+05:00`, { year: 'numeric' })}
              </h3>
              {selectedEvents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Nothing scheduled.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedEvents.map(ev => <EventRow key={ev.id} ev={ev} onOpen={setOpenEvent} />)}
                </div>
              )}
            </section>

            <section className="cal-card">
              <h3 className="cal-section-title" style={{ marginBottom: '12px' }}>Coming up</h3>
              {nextUp.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>No upcoming events yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {nextUp.map(ev => <EventRow key={ev.id} ev={ev} onOpen={setOpenEvent} />)}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* Event details */}
      {openEvent && (
        <Modal onClose={() => setOpenEvent(null)}>
          <div style={{ marginBottom: '12px', paddingRight: '40px' }}><TypePill type={openEvent.type} /></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.2, marginBottom: '14px', fontFamily: 'var(--font-primary)' }}>{openEvent.title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} /> {fmtEventWhen(openEvent)}</span>
            {openEvent.location && <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} /> {openEvent.location}</span>}
          </div>
          {openEvent.description && (
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.95rem', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px 16px', marginBottom: '20px' }}>
              {openEvent.description}
            </p>
          )}
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Add to my calendar</div>
          <AddToCalendar ev={openEvent} />
        </Modal>
      )}

      {/* Subscribe */}
      {showSubscribe && (
        <Modal onClose={() => setShowSubscribe(false)}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '8px', paddingRight: '40px', fontFamily: 'var(--font-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Rss size={22} color="var(--primary)" /> Subscribe to the calendar
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.55, marginBottom: '20px' }}>
            Add every GIKI event to your own calendar app. New and changed events sync automatically.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a href={googleSubscribeUrl()} target="_blank" rel="noopener noreferrer" className="btn-nav" style={{ background: 'var(--primary)', color: 'var(--nav-btn-text)', textDecoration: 'none', justifyContent: 'center' }}>
              <CalendarDays size={16} strokeWidth={2.5} /> Add to Google Calendar
            </a>
            <a href={webcalUrl()} className="btn-nav" style={{ background: 'var(--bg-card)', color: 'var(--text)', textDecoration: 'none', justifyContent: 'center' }}>
              <CalendarDays size={16} strokeWidth={2.5} /> Apple Calendar / Outlook
            </a>
            <button onClick={copyFeed} className="btn-nav" style={{ background: 'var(--bg-card)', color: 'var(--text)', justifyContent: 'center' }}>
              <Copy size={16} strokeWidth={2.5} /> Copy calendar link
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Calendar;
