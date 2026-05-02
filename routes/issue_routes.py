from flask import Blueprint, request, session, jsonify
from db import get_connection

issue_bp = Blueprint('issues', __name__)

@issue_bp.route('/api/issues', methods=['POST'])
def submit_issue():
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Login required to report issues."}), 401
    
    data = request.get_json() or {}
    itype = data.get('type', 'other')
    title = data.get('title', '').strip()
    desc  = data.get('description', '').strip()
    
    if not title or not desc:
        return jsonify({"success": False, "message": "Title and description are required."}), 400
        
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO issues (user_id, type, title, description) VALUES (%s, %s, %s, %s) RETURNING issue_id;",
            (session['user_id'], itype, title, desc)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        return jsonify({"success": True, "issue_id": new_id, "message": "Issue reported. We'll look into it!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()
