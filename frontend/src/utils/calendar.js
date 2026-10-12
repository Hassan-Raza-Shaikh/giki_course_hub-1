import api from '../services/api';

// All calendar dates are shown in campus time (PKT) regardless of the
// viewer's device timezone, so a midterm at 9:00 is 9:00 for everyone.
export const CAMPUS_TZ = 'Asia/Karachi';

export const EVENT_TYPES = {
  midterm:      { label: 'Midterm',      color: 'var(--accent)' },
  final:        { label: 'Final',        color: 'var(--secondary)' },
  exam:         { label: 'Exam / Quiz',  color: 'var(--tertiary)' },
  deadline:     { label: 'Deadline',     color: 'var(--primary)' },
  registration: { label: 'Registration', color: 'color-mix(in srgb, var(--primary) 60%, var(--tertiary))' },
  holiday:      { label: 'Holiday',      color: 'var(--electric)' },
  semester:     { label: 'Semester',     color: 'color-mix(in srgb, var(--electric) 60%, var(--secondary))' },
  event:        { label: 'Event',        color: 'var(--text-muted)' },
};

export const typeMeta = (type) => EVENT_TYPES[type] || EVENT_TYPES.event;

// 'YYYY-MM-DD' of a Date in campus time
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: CAMPUS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayKey = (d) => dayKeyFmt.format(new Date(d));

// Every campus-time day an event covers, as 'YYYY-MM-DD' keys
export const eventDayKeys = (ev) => {
  const keys = [];
  const startKey = dayKey(ev.start_at);
  const endKey = dayKey(ev.end_at || ev.start_at);
  const cursor = new Date(`${startKey}T00:00:00Z`);
  for (let i = 0; i < 120; i++) {
    const k = cursor.toISOString().slice(0, 10);
    keys.push(k);
    if (k >= endKey) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
};

export const fmtDate = (d, opts = {}) =>
  new Date(d).toLocaleDateString('en-GB', { timeZone: CAMPUS_TZ, weekday: 'short', day: 'numeric', month: 'short', ...opts });

export const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-US', { timeZone: CAMPUS_TZ, hour: 'numeric', minute: '2-digit' });

export const fmtEventWhen = (ev) => {
  const start = fmtDate(ev.start_at);
  const sameDay = !ev.end_at || dayKey(ev.start_at) === dayKey(ev.end_at);
  if (ev.all_day) return sameDay ? `${start} · All day` : `${start} – ${fmtDate(ev.end_at)}`;
  if (sameDay) return `${start} · ${fmtTime(ev.start_at)}${ev.end_at ? ` – ${fmtTime(ev.end_at)}` : ''}`;
  return `${start}, ${fmtTime(ev.start_at)} – ${fmtDate(ev.end_at)}, ${fmtTime(ev.end_at)}`;
};

// Time left until `target`, split into units for the countdown tiles
export const timeLeft = (target, now = Date.now()) => {
  const ms = Math.max(0, new Date(target).getTime() - now);
  const s = Math.floor(ms / 1000);
  return { done: ms === 0, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
};

export const isOngoing = (ev, now = Date.now()) => {
  const start = new Date(ev.start_at).getTime();
  const end = new Date(ev.end_at || ev.start_at).getTime() + (ev.all_day ? 86400000 : 0);
  return start <= now && now < end;
};

// ── Add to calendar ───────────────────────────────────────────────

const apiBase = () => (api.defaults.baseURL || '').replace(/\/$/, '');

export const icsUrl = (ev) => `${apiBase()}/calendar/events/${ev.id}.ics`;
export const feedUrl = () => `${apiBase()}/calendar/feed.ics`;
export const webcalUrl = () => feedUrl().replace(/^https?:/, 'webcal:');

const gcalStamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const gcalDay = (d) => dayKey(d).replace(/-/g, '');

export const googleCalendarUrl = (ev) => {
  let dates;
  if (ev.all_day) {
    const end = new Date(`${dayKey(ev.end_at || ev.start_at)}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1); // Google's end date is exclusive
    dates = `${gcalDay(ev.start_at)}/${end.toISOString().slice(0, 10).replace(/-/g, '')}`;
  } else {
    const end = ev.end_at || new Date(new Date(ev.start_at).getTime() + 3600000);
    dates = `${gcalStamp(ev.start_at)}/${gcalStamp(end)}`;
  }
  const params = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates, ctz: CAMPUS_TZ });
  if (ev.description) params.set('details', ev.description);
  if (ev.location) params.set('location', ev.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const googleSubscribeUrl = () => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl())}`;

// ── Admin form <-> API conversion ────────────────────────────────

// API value -> <input type="datetime-local"> / <input type="date"> value, in campus time
export const toInputValue = (iso, allDay) => {
  if (!iso) return '';
  if (allDay) return dayKey(iso);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: CAMPUS_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso)).map(p => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

// Form input value -> API value. Times typed by the admin are campus time.
export const fromInputValue = (value, allDay) => {
  if (!value) return null;
  if (allDay) return value.slice(0, 10);
  return `${value.length === 16 ? `${value}:00` : value}+05:00`;
};
