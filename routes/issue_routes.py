from flask import Blueprint, request, session, jsonify
from db import get_connection
import email_events
import logging

logger = logging.getLogger(__name__)

issue_bp = Blueprint('issues', __name__)

# Matches the options on the Report an Issue page
ISSUE_TYPES = {'ui', 'material', 'gpa_calculator', 'profile', 'leaderboard', 'bug', 'feature', 'other'}

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
    if itype not in ISSUE_TYPES:
        itype = 'other'
    if len(title) > 200 or len(desc) > 5000:
        return jsonify({"success": False, "message": "Please keep the title under 200 and the description under 5000 characters."}), 400
        
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
        email_events.admin_new_issue(session['user_id'], itype, title, desc)
        return jsonify({"success": True, "issue_id": new_id, "message": "Issue reported. We'll look into it!"})
    except Exception:
        conn.rollback()
        logger.exception("%s %s failed", request.method, request.path)
        return jsonify({"success": False, "message": "An unexpected error occurred. Please try again."}), 500
    finally:
        conn.close()
