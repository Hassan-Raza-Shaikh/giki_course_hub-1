# ==========================================
# utils/calendar.py — GIKI Calendar helpers
# Timezone handling, row serialization, .ics generation
# and the hooks the notification centre plugs into.
# ==========================================

from datetime import datetime, date, time, timedelta, timezone

# GIKI is in Pakistan (PKT, UTC+5, no DST). A fixed offset avoids depending
# on tzdata being present in the slim Docker image.
CAMPUS_TZ = timezone(timedelta(hours=5), 'PKT')

EVENT_TYPES = ('midterm', 'final', 'exam', 'holiday', 'deadline', 'registration', 'semester', 'event')

EVENT_COLUMNS = """
    event_id, title, description, event_type, start_at, end_at,
    all_day, location, show_countdown, created_at, updated_at
"""


def row_to_event(row):
    (event_id, title, description, event_type, start_at, end_at,
     all_day, location, show_countdown, created_at, updated_at) = row
    return {
        "id": event_id,
        "title": title,
        "description": description or '',
        "type": event_type,
        "start_at": start_at.isoformat() if start_at else None,
        "end_at": end_at.isoformat() if end_at else None,
        "all_day": bool(all_day),
        "location": location or '',
        "show_countdown": bool(show_countdown),
        "created_at": created_at.isoformat() if created_at else None,
        "updated_at": updated_at.isoformat() if updated_at else None,
    }


def parse_event_time(value, all_day):
    """Parse an incoming start/end value.

    All-day events take a plain date ('2026-12-15') and are stored at midnight
    campus time. Timed events take an ISO datetime with offset
    ('2026-12-15T09:00:00+05:00'); a naive datetime is treated as campus time.
    Raises ValueError on bad input.
    """
    if not value:
        return None
    value = str(value).strip()
    if all_day:
        d = date.fromisoformat(value[:10])
        return datetime.combine(d, time(0, 0), tzinfo=CAMPUS_TZ)
    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=CAMPUS_TZ)
    return dt


# ─────────────────────────────────────────────────────────────────────────────
# Notification centre: announcements and reminders
# ─────────────────────────────────────────────────────────────────────────────

# How many days before an event each reminder goes out. Events pinned with
# show_countdown get the exam schedule whatever their type.
REMINDER_DAYS = {
    'midterm': (7, 1),
    'final': (7, 1),
    'exam': (1,),
    'holiday': (1,),
    'deadline': (1,),
    'registration': (1,),
}
PINNED_REMINDER_DAYS = (7, 1)


def _when_label(start, now):
    days = (start.astimezone(CAMPUS_TZ).date() - now.astimezone(CAMPUS_TZ).date()).days
    if days <= 0:
        return 'Today'
    if days == 1:
        return 'Tomorrow'
    return f'In {days} days'


def _date_label(ev):
    fmt = lambda iso: datetime.fromisoformat(iso).astimezone(CAMPUS_TZ).strftime('%a %d %b')
    start = fmt(ev['start_at'])
    if ev['end_at'] and fmt(ev['end_at']) != start:
        return f"{start} to {fmt(ev['end_at'])}"
    if not ev['all_day']:
        return datetime.fromisoformat(ev['start_at']).astimezone(CAMPUS_TZ).strftime('%a %d %b, %I:%M %p').replace(' 0', ' ')
    return start


def on_event_changed(action, event, announce=False):
    """Called after an admin creates, updates or deletes a calendar event.

    action: 'created' | 'updated' | 'deleted'; event: dict from row_to_event().
    When the admin ticks "Notify everyone" on a new event, every user gets a
    notification about it. Best-effort: never raises.
    """
    if action != 'created' or not announce:
        return 0
    from notifications import notify_all
    return notify_all(
        'calendar_event',
        f"New on the GIKI calendar: {event['title']}",
        body=_date_label(event),
        link='/calendar',
        data={'event_id': event['id']},
    )


def send_due_reminders(conn, now=None):
    """Send every calendar reminder that is due and hasn't gone out yet.

    Safe to call as often as you like (the keep-awake ping calls it every few
    minutes): each reminder is claimed in calendar_reminders first, so it is
    sent once even if two calls overlap. If the job was down and several
    reminders for one event are due at once, only the nearest is sent.
    Returns a list of {"event_id", "kind", "title"} for what was sent.
    """
    from notifications import notify_all
    now = now or datetime.now(timezone.utc)
    horizon = now + timedelta(days=max(PINNED_REMINDER_DAYS) + 1)
    cur = conn.cursor()
    cur.execute(
        f"SELECT {EVENT_COLUMNS} FROM calendar_events "
        "WHERE start_at > %s AND start_at <= %s ORDER BY start_at;",
        (now, horizon)
    )
    events = [row_to_event(r) for r in cur.fetchall()]

    sent = []
    for ev in events:
        offsets = PINNED_REMINDER_DAYS if ev['show_countdown'] else REMINDER_DAYS.get(ev['type'], ())
        start = datetime.fromisoformat(ev['start_at'])
        due = [d for d in offsets if now >= start - timedelta(days=d)]
        if not due:
            continue
        nearest = f"{min(due)}d"
        cur.execute(
            "INSERT INTO calendar_reminders (event_id, kind) SELECT %s, k FROM unnest(%s::text[]) AS k "
            "ON CONFLICT DO NOTHING RETURNING kind;",
            (ev['id'], [f"{d}d" for d in due])
        )
        claimed = {r[0] for r in cur.fetchall()}
        if nearest in claimed:
            title = f"{_when_label(start, now)}: {ev['title']}"
            notify_all('calendar_event', title, body=_date_label(ev), link='/calendar',
                       data={'event_id': ev['id'], 'reminder': nearest}, conn=conn)
            sent.append({"event_id": ev['id'], "kind": nearest, "title": title})
        conn.commit()
    cur.close()
    return sent


# ─────────────────────────────────────────────────────────────────────────────
# iCalendar (.ics) export — RFC 5545
# ─────────────────────────────────────────────────────────────────────────────

def _ics_escape(text):
    return (text or '').replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,').replace('\r\n', '\\n').replace('\n', '\\n')


def _ics_fold(line):
    """Fold lines longer than 75 octets (RFC 5545 §3.1)."""
    raw = line.encode('utf-8')
    if len(raw) <= 75:
        return line
    parts, current = [], b''
    for ch in line:
        b = ch.encode('utf-8')
        limit = 75 if not parts else 74  # continuation lines start with a space
        if len(current) + len(b) > limit:
            parts.append(current.decode('utf-8'))
            current = b''
        current += b
    parts.append(current.decode('utf-8'))
    return '\r\n '.join(parts)


def _utc_stamp(dt):
    return dt.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')


def _event_vevent(ev, now):
    start = datetime.fromisoformat(ev['start_at'])
    end = datetime.fromisoformat(ev['end_at']) if ev['end_at'] else None
    lines = [
        'BEGIN:VEVENT',
        f"UID:giki-calendar-{ev['id']}@gikicoursehub",
        f"DTSTAMP:{_utc_stamp(now)}",
    ]
    if ev['all_day']:
        start_day = start.astimezone(CAMPUS_TZ).date()
        end_day = (end.astimezone(CAMPUS_TZ).date() if end else start_day) + timedelta(days=1)  # DTEND is exclusive
        lines.append(f"DTSTART;VALUE=DATE:{start_day.strftime('%Y%m%d')}")
        lines.append(f"DTEND;VALUE=DATE:{end_day.strftime('%Y%m%d')}")
    else:
        lines.append(f"DTSTART:{_utc_stamp(start)}")
        lines.append(f"DTEND:{_utc_stamp(end or start + timedelta(hours=1))}")
    lines.append(f"SUMMARY:{_ics_escape(ev['title'])}")
    if ev['description']:
        lines.append(f"DESCRIPTION:{_ics_escape(ev['description'])}")
    if ev['location']:
        lines.append(f"LOCATION:{_ics_escape(ev['location'])}")
    lines.append(f"CATEGORIES:{ev['type'].upper()}")
    if ev['updated_at']:
        lines.append(f"LAST-MODIFIED:{_utc_stamp(datetime.fromisoformat(ev['updated_at']))}")
    lines.append('END:VEVENT')
    return lines


def build_ics(events, name='GIKI Calendar'):
    now = datetime.now(timezone.utc)
    lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//GIKI Course Hub//GIKI Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        f'X-WR-CALNAME:{_ics_escape(name)}',
        'X-WR-TIMEZONE:Asia/Karachi',
        'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
        'X-PUBLISHED-TTL:PT6H',
    ]
    for ev in events:
        lines.extend(_event_vevent(ev, now))
    lines.append('END:VCALENDAR')
    return '\r\n'.join(_ics_fold(line) for line in lines) + '\r\n'
