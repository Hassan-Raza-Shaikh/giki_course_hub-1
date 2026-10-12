from datetime import datetime, timedelta, timezone
from flask import Blueprint, Response, jsonify, request
from db import get_connection
from routes.admin_routes import _require_admin, _log
from utils.calendar import (
    EVENT_COLUMNS, EVENT_TYPES, build_ics, on_event_changed, parse_event_time, row_to_event,
    send_due_reminders,
)

calendar_bp = Blueprint('calendar', __name__)

ERROR_MSG = "An unexpected error occurred. Please try again."


def _ics_response(body, filename):
    return Response(
        body,
        mimetype='text/calendar',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public
# ─────────────────────────────────────────────────────────────────────────────

@calendar_bp.route('/api/calendar/events', methods=['GET'])
def list_events():
    """Events overlapping [from, to]. Defaults to one year either side of today."""
    now = datetime.now(timezone.utc)
    try:
        range_start = datetime.fromisoformat(request.args['from']) if request.args.get('from') else now - timedelta(days=365)
        range_end = datetime.fromisoformat(request.args['to']) if request.args.get('to') else now + timedelta(days=365)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid date range."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(f"""
            SELECT {EVENT_COLUMNS} FROM calendar_events
            WHERE start_at <= %s AND COALESCE(end_at, start_at) >= %s
            ORDER BY start_at
            LIMIT 1000;
        """, (range_end, range_start))
        events = [row_to_event(r) for r in cur.fetchall()]
        cur.close()
        return jsonify({"success": True, "events": events})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": ERROR_MSG}), 500
    finally:
        conn.close()


@calendar_bp.route('/api/calendar/upcoming', methods=['GET'])
def upcoming_events():
    """Upcoming and in-progress events, soonest first. Feeds the countdowns."""
    limit = min(max(request.args.get('limit', 8, type=int), 1), 50)
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(f"""
            SELECT {EVENT_COLUMNS} FROM calendar_events
            WHERE COALESCE(end_at, start_at) >= NOW()
            ORDER BY start_at
            LIMIT %s;
        """, (limit,))
        events = [row_to_event(r) for r in cur.fetchall()]
        cur.close()
        return jsonify({"success": True, "events": events})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": ERROR_MSG}), 500
    finally:
        conn.close()


@calendar_bp.route('/api/calendar/events/<int:event_id>.ics', methods=['GET'])
def event_ics(event_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(f"SELECT {EVENT_COLUMNS} FROM calendar_events WHERE event_id = %s;", (event_id,))
        row = cur.fetchone()
        cur.close()
        if not row:
            return jsonify({"success": False, "message": "Event not found."}), 404
        return _ics_response(build_ics([row_to_event(row)]), f'giki-event-{event_id}.ics')
    finally:
        conn.close()


@calendar_bp.route('/api/calendar/feed.ics', methods=['GET'])
def calendar_feed():
    """Subscribable feed of every event (Google/Apple/Outlook "add by URL")."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(f"""
            SELECT {EVENT_COLUMNS} FROM calendar_events
            WHERE COALESCE(end_at, start_at) >= NOW() - INTERVAL '180 days'
            ORDER BY start_at;
        """)
        events = [row_to_event(r) for r in cur.fetchall()]
        cur.close()
        resp = _ics_response(build_ics(events), 'giki-calendar.ics')
        resp.headers['Cache-Control'] = 'public, max-age=900'
        return resp
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Admin CRUD
# ─────────────────────────────────────────────────────────────────────────────

def _validate_event(data):
    """Return (fields, None) or (None, error message)."""
    title = (data.get('title') or '').strip()
    if not title:
        return None, "Title is required."
    if len(title) > 200:
        return None, "Title must be 200 characters or fewer."

    event_type = data.get('type') or 'event'
    if event_type not in EVENT_TYPES:
        return None, "Invalid event type."

    description = (data.get('description') or '').strip()
    location = (data.get('location') or '').strip()
    if len(description) > 5000:
        return None, "Description is too long."
    if len(location) > 200:
        return None, "Location must be 200 characters or fewer."

    all_day = bool(data.get('all_day'))
    try:
        start_at = parse_event_time(data.get('start_at'), all_day)
        end_at = parse_event_time(data.get('end_at'), all_day)
    except ValueError:
        return None, "Invalid start or end time."
    if not start_at:
        return None, "Start date is required."
    if end_at and end_at < start_at:
        return None, "End must be after the start."

    return {
        "title": title,
        "description": description or None,
        "event_type": event_type,
        "start_at": start_at,
        "end_at": end_at,
        "all_day": all_day,
        "location": location or None,
        "show_countdown": bool(data.get('show_countdown')),
    }, None


@calendar_bp.route('/api/admin/calendar/events', methods=['POST'])
def admin_create_event():
    admin_email, err = _require_admin()
    if err: return err

    data = request.get_json() or {}
    fields, msg = _validate_event(data)
    if msg:
        return jsonify({"success": False, "message": msg}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO calendar_events
                (title, description, event_type, start_at, end_at, all_day, location, show_countdown, created_by)
            VALUES (%(title)s, %(description)s, %(event_type)s, %(start_at)s, %(end_at)s,
                    %(all_day)s, %(location)s, %(show_countdown)s, %(created_by)s)
            RETURNING {EVENT_COLUMNS};
        """, {**fields, "created_by": admin_email})
        event = row_to_event(cur.fetchone())
        conn.commit()
        cur.close()
    except Exception:
        conn.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": ERROR_MSG}), 500
    finally:
        conn.close()

    _log(admin_email, 'create_event', event['id'], event['title'])
    on_event_changed('created', event, announce=bool(data.get('notify')))
    return jsonify({"success": True, "message": "Event added.", "event": event})


@calendar_bp.route('/api/admin/calendar/events/<int:event_id>', methods=['PUT'])
def admin_update_event(event_id):
    admin_email, err = _require_admin()
    if err: return err

    fields, msg = _validate_event(request.get_json() or {})
    if msg:
        return jsonify({"success": False, "message": msg}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(f"""
            UPDATE calendar_events SET
                title = %(title)s, description = %(description)s, event_type = %(event_type)s,
                start_at = %(start_at)s, end_at = %(end_at)s, all_day = %(all_day)s,
                location = %(location)s, show_countdown = %(show_countdown)s
            WHERE event_id = %(event_id)s
            RETURNING {EVENT_COLUMNS};
        """, {**fields, "event_id": event_id})
        row = cur.fetchone()
        conn.commit()
        cur.close()
    except Exception:
        conn.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": ERROR_MSG}), 500
    finally:
        conn.close()

    if not row:
        return jsonify({"success": False, "message": "Event not found."}), 404
    event = row_to_event(row)
    _log(admin_email, 'update_event', event_id, event['title'])
    on_event_changed('updated', event)
    return jsonify({"success": True, "message": "Event updated.", "event": event})


@calendar_bp.route('/api/admin/calendar/events/<int:event_id>', methods=['DELETE'])
def admin_delete_event(event_id):
    admin_email, err = _require_admin()
    if err: return err

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(f"DELETE FROM calendar_events WHERE event_id = %s RETURNING {EVENT_COLUMNS};", (event_id,))
        row = cur.fetchone()
        conn.commit()
        cur.close()
    except Exception:
        conn.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": ERROR_MSG}), 500
    finally:
        conn.close()

    if not row:
        return jsonify({"success": False, "message": "Event not found."}), 404
    event = row_to_event(row)
    _log(admin_email, 'delete_event', event_id, event['title'])
    on_event_changed('deleted', event)
    return jsonify({"success": True, "message": "Event deleted."})


# ─────────────────────────────────────────────────────────────────────────────
# Reminders (called by the keep-awake workflow every few minutes)
# ─────────────────────────────────────────────────────────────────────────────

@calendar_bp.route('/api/calendar/reminders/run', methods=['POST'])
def run_reminders():
    """Send any calendar reminders that are due. Idempotent and public: each
    reminder is claimed once in calendar_reminders, so extra calls send nothing."""
    conn = get_connection()
    try:
        sent = send_due_reminders(conn)
    except Exception:
        conn.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": ERROR_MSG}), 500
    finally:
        conn.close()
    return jsonify({"success": True, "sent": sent})
