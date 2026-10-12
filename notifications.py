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
import logging
from db import get_connection

logger = logging.getLogger(__name__)

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
        logger.warning("Unknown notification type %r, sending anyway", type)

    if conn is not None:
        cur = conn.cursor()
        try:
            cur.execute("SAVEPOINT notify_sp;")
            _insert(cur, user_ids, type, title, body, link, data)
            cur.execute("RELEASE SAVEPOINT notify_sp;")
            return len(user_ids)
        except Exception as e:
            try:
                cur.execute("ROLLBACK TO SAVEPOINT notify_sp;")
            except Exception:
                pass  # savepoint never opened: the caller's transaction was already aborted
            logger.warning("Failed to write %r notification for %s: %s", type, user_ids, e)
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
        logger.warning("Failed to write %r notification for %s: %s", type, user_ids, e)
        return 0
    finally:
        if own is not None:
            own.close()


def notify(user_id, type, title, body=None, link=None, data=None, conn=None):
    """Send one notification to one user. Returns True if it was written."""
    return notify_many([user_id], type, title, body, link, data, conn) == 1


def _run(sql, params, label, conn=None):
    """Execute one write statement best-effort; returns rowcount (0 on failure)."""
    if conn is not None:
        cur = conn.cursor()
        try:
            cur.execute("SAVEPOINT notify_sp;")
            cur.execute(sql, params)
            count = cur.rowcount
            cur.execute("RELEASE SAVEPOINT notify_sp;")
            return count
        except Exception as e:
            try:
                cur.execute("ROLLBACK TO SAVEPOINT notify_sp;")
            except Exception:
                pass  # savepoint never opened: the caller's transaction was already aborted
            logger.warning("Failed to write %s notifications: %s", label, e)
            return 0
        finally:
            cur.close()

    own = None
    try:
        own = get_connection()
        cur = own.cursor()
        cur.execute(sql, params)
        count = cur.rowcount
        own.commit()
        cur.close()
        return count
    except Exception as e:
        if own is not None:
            own.rollback()
        logger.warning("Failed to write %s notifications: %s", label, e)
        return 0
    finally:
        if own is not None:
            own.close()


def notify_all(type, title, body=None, link=None, data=None, conn=None):
    """Send one notification to every user (admin announcements). Returns how many were written."""
    if not title:
        return 0
    return _run(
        """
        INSERT INTO notifications (user_id, type, title, body, link, data)
        SELECT user_id, %s, %s, %s, %s, %s::jsonb FROM users;
        """,
        (type, title[:200], body, link, json.dumps(data or {})),
        type, conn,
    )


def notify_course_followers(course_code, titles, exclude_user_ids=(), conn=None):
    """
    Tell users who follow a course that new material was published there.
    A user follows a course when they have bookmarked an approved file in it.
    `titles` are the newly published file titles (one notification per user, however many).
    """
    titles = [t for t in (titles or []) if t]
    if not course_code or not titles:
        return 0
    if len(titles) == 1:
        body = f"'{titles[0]}' was added to {course_code}."
    else:
        body = f"{len(titles)} new files were added to {course_code}, including '{titles[0]}'."
    exclude = [int(u) for u in exclude_user_ids if u]
    return _run(
        """
        INSERT INTO notifications (user_id, type, title, body, link, data)
        SELECT DISTINCT b.user_id, 'new_file', %s, %s,
               COALESCE((SELECT '/course/' || MIN(c.course_id) FROM courses c WHERE c.code = %s), '/courses'),
               %s::jsonb
        FROM bookmarks b
        JOIN files f ON f.file_id = b.file_id
        WHERE f.course_code = %s AND f.status = 'approved'
          AND NOT (b.user_id = ANY(%s));
        """,
        (f"New material in {course_code}", body, course_code,
         json.dumps({"course_code": course_code, "count": len(titles)}),
         course_code, exclude),
        'new_file', conn,
    )
