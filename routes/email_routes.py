from flask import Blueprint, request, session, jsonify
from db import get_connection
from config import BOOTSTRAP_ADMIN_EMAILS
import email_events
import logging

logger = logging.getLogger(__name__)

email_bp = Blueprint('email', __name__)


def _resolve_email(token):
    """The email address being managed: from a signed link token, else the logged-in user."""
    if token:
        email, _ = email_events.read_token(token)
        return email
    if 'user_id' not in session:
        return None
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT email FROM users WHERE user_id = %s;", (session['user_id'],))
        row = cur.fetchone()
        cur.close()
        return row[0].strip().lower() if row and row[0] else None
    finally:
        conn.close()


def _is_admin(email):
    if email in BOOTSTRAP_ADMIN_EMAILS:
        return True
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM admins WHERE email = %s;", (email,))
        found = cur.fetchone() is not None
        cur.close()
        return found
    finally:
        conn.close()


def _payload(email, prefs):
    is_admin = _is_admin(email)
    return {
        "success": True,
        "email": email,
        "preferences": prefs,
        "categories": [
            {"key": key, "label": label}
            for key, (_, label) in email_events.CATEGORIES.items()
            if key != 'admin_alerts' or is_admin
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET/PATCH /api/email/preferences  (?token=… from an email link, or logged in)
# ─────────────────────────────────────────────────────────────────────────────
@email_bp.route('/api/email/preferences', methods=['GET', 'PATCH'])
def email_preferences():
    data = request.get_json(silent=True) or {}
    token = request.args.get('token') or data.get('token')
    email = _resolve_email(token)
    if not email:
        if token:
            return jsonify({"success": False, "message": "This link is invalid or has expired."}), 400
        return jsonify({"success": False, "message": "Not logged in."}), 401

    try:
        if request.method == 'PATCH':
            prefs = email_events.set_preferences(email, data.get('preferences') or {})
        else:
            prefs = email_events.get_preferences(email)
        return jsonify(_payload(email, prefs))
    except Exception:
        logger.exception("%s %s failed", request.method, request.path)
        return jsonify({"success": False, "message": "An unexpected error occurred. Please try again."}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/email/unsubscribe  {token, category?}
# One click from the link at the bottom of every email; no login needed.
# ─────────────────────────────────────────────────────────────────────────────
@email_bp.route('/api/email/unsubscribe', methods=['POST'])
def email_unsubscribe():
    data = request.get_json(silent=True) or {}
    email, token_category = email_events.read_token(data.get('token') or '')
    if not email:
        return jsonify({"success": False, "message": "This link is invalid or has expired."}), 400

    category = token_category or data.get('category')
    targets = [category] if category in email_events.CATEGORIES else list(email_events.CATEGORIES)
    try:
        prefs = email_events.set_preferences(email, {key: False for key in targets})
        return jsonify(_payload(email, prefs))
    except Exception:
        logger.exception("%s %s failed", request.method, request.path)
        return jsonify({"success": False, "message": "An unexpected error occurred. Please try again."}), 500
