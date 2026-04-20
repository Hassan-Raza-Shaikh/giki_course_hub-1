from flask import Blueprint, session, jsonify
from db import get_connection

user_bp = Blueprint('user', __name__)


@user_bp.route('/api/dashboard', methods=['GET'])
def dashboard():
    conn = get_connection()
    try:
        cur = conn.cursor()
        uid = session.get('user_id', 0)
        cur.execute("""
            SELECT f.file_id, f.title, f.status, f.upload_date, s.name AS subject
            FROM files f LEFT JOIN subjects s ON f.subject_id = s.subject_id
            WHERE f.uploaded_by = %s ORDER BY f.upload_date DESC LIMIT 10;
        """, (uid,))
        my_files = [
            {"id": f[0], "title": f[1], "status": f[2], "date": f[3].isoformat() if f[3] else None, "subject": f[4]}
            for f in cur.fetchall()
        ]
        
        cur.execute("SELECT get_user_contrib_count(%s);", (uid,))
        contrib_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM bookmarks WHERE user_id=%s;", (uid,))
        bookmark_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM notifications WHERE user_id=%s AND is_read=FALSE;", (uid,))
        notif_count = cur.fetchone()[0]
        
        cur.close()
        return jsonify({
            "success": True,
            "my_files": my_files,
            "stats": {
                "contributions": contrib_count,
                "bookmarks": bookmark_count,
                "notifications": notif_count
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@user_bp.route('/api/bookmarks', methods=['GET'])
def bookmarks():
    conn = get_connection()
    try:
        cur = conn.cursor()
        uid = session.get('user_id', 0)
        cur.execute("""
            SELECT file_id, title, file_url, subject_name, category
            FROM user_bookmarks_view WHERE user_id = %s;
        """, (uid,))
        bookmarked_files = [
            {"id": f[0], "title": f[1], "file_url": f[2], "subject": f[3], "category": f[4]}
            for f in cur.fetchall()
        ]
        cur.close()
        return jsonify({"success": True, "files": bookmarked_files})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@user_bp.route('/api/profile', methods=['GET'])
def profile():
    conn = get_connection()
    try:
        cur = conn.cursor()
        uid = session.get('user_id', 0)
        cur.execute("SELECT username, role, created_at FROM users WHERE user_id=%s;", (uid,))
        user_row = cur.fetchone()
        if not user_row:
            return jsonify({"success": False, "message": "User not found"}), 404
            
        cur.execute("SELECT get_user_contrib_count(%s);", (uid,))
        contrib_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM downloads WHERE user_id=%s;", (uid,))
        download_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM bookmarks WHERE user_id=%s;", (uid,))
        bookmark_count = cur.fetchone()[0]
        
        cur.close()
        return jsonify({
            "success": True,
            "user": {
                "username": user_row[0],
                "role": user_row[1],
                "created_at": user_row[2].isoformat() if user_row[2] else None
            },
            "stats": {
                "contributions": contrib_count,
                "downloads": download_count,
                "bookmarks": bookmark_count
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@user_bp.route('/api/notifications', methods=['GET'])
def notifications():
    conn = get_connection()
    try:
        cur = conn.cursor()
        uid = session.get('user_id', 0)
        cur.execute("""
            SELECT notification_id, message, is_read, created_at
            FROM notifications WHERE user_id = %s ORDER BY created_at DESC;
        """, (uid,))
        notifs = [
            {"id": n[0], "message": n[1], "is_read": n[2], "date": n[3].isoformat() if n[3] else None}
            for n in cur.fetchall()
        ]
        cur.execute("UPDATE notifications SET is_read=TRUE WHERE user_id=%s AND is_read=FALSE;", (uid,))
        conn.commit()
        cur.close()
        return jsonify({"success": True, "notifications": notifs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()
