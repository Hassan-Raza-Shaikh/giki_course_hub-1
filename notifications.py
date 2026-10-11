"""
In-app notification helper.

Other features call notify() / notify_many() to drop a notification into a
user's notification centre. Both are best-effort: they never raise, so a
notification failure can't break the action that triggered it.

    from notifications import notify
    notify(user_id, 'upload_approved', "Your upload was approved",
           body="'Lecture 3' is now live in CS101.",
           link='/course/CS101', data={'file_id': 42})

Pass conn=<an open connection> to write inside the caller's transaction
(the caller commits). The insert runs under a savepoint, so if it fails
(e.g. the migration hasn't been run yet) the caller's transaction is untouched.
Without conn, the helper opens its own connection and commits.
"""
import json
from db import get_connection

# Known types. Add new ones here so the frontend can pick an icon/colour.
TYPES = {
    'upload_approved',
    'upload_rejected',
    'report_resolved',
    'report_dismissed',
    'new_file',          # new material in a course the user follows
    'calendar_event',    # upcoming GIKI calendar event / exam countdown
    'announcement',      # admin broadcast
}


def _insert(cur, user_ids, type, title, body, link, data):
    payload = json.dumps(data or {})
    cur.executemany(
        """
        INSERT INTO notifications (user_id, type, title, body, link, data)
        VALUES (%s, %s, %s, %s, %s, %s::jsonb);
        """,
        [(uid, type, title[:200], body, link, payload) for uid in user_ids],
    )


def notify_many(user_ids, type, title, body=None, link=None, data=None, conn=None):
    """Send the same notification to several users. Returns how many were written."""
    user_ids = sorted({int(u) for u in (user_ids or []) if u})
    if not user_ids or not title:
        return 0
    if type not in TYPES:
        print(f"[Notifications] Unknown type '{type}', sending anyway.")

    if conn is not None:
        cur = conn.cursor()
        try:
            cur.execute("SAVEPOINT notify_sp;")
            _insert(cur, user_ids, type, title, body, link, data)
            cur.execute("RELEASE SAVEPOINT notify_sp;")
            return len(user_ids)
        except Exception as e:
            cur.execute("ROLLBACK TO SAVEPOINT notify_sp;")
            print(f"[Notifications] Failed to write '{type}' for {user_ids}: {e}")
            return 0
        finally:
            cur.close()

    own = None
    try:
        own = get_connection()
        cur = own.cursor()
        _insert(cur, user_ids, type, title, body, link, data)
        own.commit()
        cur.close()
        return len(user_ids)
    except Exception as e:
        if own is not None:
            own.rollback()
        print(f"[Notifications] Failed to write '{type}' for {user_ids}: {e}")
        return 0
    finally:
        if own is not None:
            own.close()


def notify(user_id, type, title, body=None, link=None, data=None, conn=None):
    """Send one notification to one user. Returns True if it was written."""
    return notify_many([user_id], type, title, body, link, data, conn) == 1
