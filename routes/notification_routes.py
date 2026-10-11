from flask import Blueprint, request, session, jsonify
from db import get_connection

notification_bp = Blueprint('notifications', __name__)

_COLS = "notification_id, type, title, body, link, data, is_read, created_at"


def _row_to_dict(row):
    nid, type_, title, body, link, data, is_read, created_at = row
    return {
        "notification_id": nid,
        "type": type_,
        "title": title,
        "body": body,
        "link": link,
        "data": data or {},
        "is_read": is_read,
        "created_at": created_at.isoformat() if created_at else None,
    }


def _no_store(resp):
    resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return resp


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/notifications?limit=20&before=<notification_id>&unread=1
# Newest first. Pass the last notification_id you got as `before` for the next page.
# ─────────────────────────────────────────────────────────────────────────────
@notification_bp.route('/api/notifications', methods=['GET'])
def list_notifications():
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401

    try:
        limit = max(1, min(int(request.args.get('limit', 20)), 50))
    except ValueError:
        limit = 20
    before = request.args.get('before', type=int)
    unread_only = request.args.get('unread') in ('1', 'true')

    where = ["user_id = %s"]
    params = [session['user_id']]
    if before:
        where.append("notification_id < %s")
        params.append(before)
    if unread_only:
        where.append("is_read = false")

    conn = get_connection()
    try:
        cur = conn.cursor()
        # Fetch one extra row to know whether another page exists
        cur.execute(
            f"SELECT {_COLS} FROM notifications WHERE {' AND '.join(where)} "
            "ORDER BY notification_id DESC LIMIT %s;",
            (*params, limit + 1),
        )
        rows = cur.fetchall()
        cur.execute(
            "SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = false;",
            (session['user_id'],),
        )
        unread = cur.fetchone()[0]
        cur.close()
        items = [_row_to_dict(r) for r in rows[:limit]]
        return _no_store(jsonify({
            "success": True,
            "notifications": items,
            "unread_count": unread,
            "has_more": len(rows) > limit,
        }))
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": "An unexpected error occurred. Please try again."}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/notifications/unread-count  — cheap call for the navbar badge
# ─────────────────────────────────────────────────────────────────────────────
@notification_bp.route('/api/notifications/unread-count', methods=['GET'])
def unread_count():
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = false;",
            (session['user_id'],),
        )
        count = cur.fetchone()[0]
        cur.close()
        return _no_store(jsonify({"success": True, "unread_count": count}))
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": "An unexpected error occurred. Please try again."}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/notifications/<id>/read
# ─────────────────────────────────────────────────────────────────────────────
@notification_bp.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
def mark_read(notification_id):
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE notifications SET is_read = true WHERE notification_id = %s AND user_id = %s;",
            (notification_id, session['user_id']),
        )
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"success": False, "message": "Notification not found."}), 404
        conn.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception:
        conn.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": "An unexpected error occurred. Please try again."}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/notifications/read-all
# ─────────────────────────────────────────────────────────────────────────────
@notification_bp.route('/api/notifications/read-all', methods=['POST'])
def mark_all_read():
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE notifications SET is_read = true WHERE user_id = %s AND is_read = false;",
            (session['user_id'],),
        )
        updated = cur.rowcount
        conn.commit()
        cur.close()
        return jsonify({"success": True, "updated": updated})
    except Exception:
        conn.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": "An unexpected error occurred. Please try again."}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/notifications/<id>
# ─────────────────────────────────────────────────────────────────────────────
@notification_bp.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM notifications WHERE notification_id = %s AND user_id = %s;",
            (notification_id, session['user_id']),
        )
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"success": False, "message": "Notification not found."}), 404
        conn.commit()
        cur.close()
        return jsonify({"success": True})
    except Exception:
        conn.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": "An unexpected error occurred. Please try again."}), 500
    finally:
        conn.close()
