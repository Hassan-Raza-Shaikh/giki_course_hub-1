from flask import Blueprint, request, session, jsonify
from db import get_connection

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users;")
        total_users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM files;")
        total_files = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM files WHERE status='pending';")
        pending_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM reports WHERE status='pending';")
        open_reports = cur.fetchone()[0]
        cur.execute("SELECT file_id, title, total_downloads FROM popular_files_view LIMIT 10;")
        top_files = [
            {"id": f[0], "title": f[1], "downloads": f[2]}
            for f in cur.fetchall()
        ]
        cur.close()
        return jsonify({
            "success": True,
            "stats": {
                "total_users": total_users,
                "total_files": total_files,
                "pending_files": pending_count,
                "open_reports": open_reports
            },
            "top_files": top_files
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/pending', methods=['GET'])
def pending_files():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM admin_pending_files_view ORDER BY upload_date ASC;")
        files = [
            {
                "id": f[0], "title": f[1], "uploader": f[2], "type": f[3], 
                "size": f[4], "date": f[5].isoformat() if f[5] else None, 
                "subject": f[6], "category": f[7]
            }
            for f in cur.fetchall()
        ]
        cur.close()
        return jsonify({"success": True, "files": files})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/approve/<int:file_id>', methods=['POST'])
def approve_file(file_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        admin_id = session.get('user_id', 1)
        cur.execute("CALL approve_file(%s, %s);", (file_id, admin_id))
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "File approved!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/reject/<int:file_id>', methods=['POST'])
def reject_file(file_id):
    data = request.get_json()
    reason = data.get('reason', 'No reason provided.').strip() if data else "No reason provided."
    conn = get_connection()
    try:
        cur = conn.cursor()
        admin_id = session.get('user_id', 1)
        cur.execute("CALL reject_file(%s, %s, %s);", (file_id, admin_id, reason))
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "File rejected."})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/reports', methods=['GET'])
def reports():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM admin_reports_view ORDER BY created_at DESC;")
        all_reports = [
            {
                "id": r[0], "file_id": r[1], "file_title": r[2], "file_status": r[3],
                "reporter": r[4], "reason": r[5], "resolved": r[6], 
                "date": r[7].isoformat() if r[7] else None
            }
            for r in cur.fetchall()
        ]
        cur.close()
        return jsonify({"success": True, "reports": all_reports})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/resolve-report/<int:report_id>', methods=['POST'])
def resolve_report(report_id):
    data = request.get_json()
    take_down = data.get('take_down') == True if data else False
    conn = get_connection()
    try:
        cur = conn.cursor()
        admin_id = session.get('user_id', 1)
        cur.execute("CALL resolve_report(%s, %s, %s);", (report_id, admin_id, take_down))
        conn.commit()
        cur.close()
        return jsonify({
            "success": True, 
            "message": "Report resolved." + (" File taken down." if take_down else "")
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/generate-report', methods=['POST'])
def generate_report():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("CALL generate_monthly_analytics_report();")
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Monthly report generated!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()
