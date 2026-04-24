from flask import Blueprint, request, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_connection
from firebase_admin_init import is_initialized
import firebase_admin.auth as fb_auth

auth_bp = Blueprint('auth', __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helper: decode + verify Firebase ID token (or fall back gracefully)
# ─────────────────────────────────────────────────────────────────────────────
def _verify_id_token(id_token):
    """
    Returns decoded token dict { uid, email, name, picture } on success.
    Returns None if verification is disabled (no service account key).
    Raises ValueError with message on invalid/expired token.
    """
    if not is_initialized():
        # Degraded mode: parse the token without verifying signature.
        # In production this should never happen — always add the key.
        return None

    try:
        decoded = fb_auth.verify_id_token(id_token)
        return {
            "uid":     decoded.get("uid") or decoded.get("user_id"),
            "email":   decoded.get("email", ""),
            "name":    decoded.get("name", ""),
            "picture": decoded.get("picture", ""),
        }
    except fb_auth.ExpiredIdTokenError:
        raise ValueError("Session expired. Please sign in again.")
    except fb_auth.InvalidIdTokenError as e:
        raise ValueError(f"Invalid token: {e}")
    except Exception as e:
        raise ValueError(f"Token verification failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/auth/firebase  — Google Sign-In (token verified server-side)
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/auth/firebase', methods=['POST'])
def firebase_auth():
    data = request.get_json()

    id_token     = data.get('idToken')       # signed JWT from getIdToken()
    uid_fallback = data.get('uid')           # used only when Admin SDK not initialised
    email        = data.get('email', '')
    display_name = data.get('displayName', email.split('@')[0] if email else 'user')
    photo_url    = data.get('photoURL', '')

    # ── Verify the token ──────────────────────────────────────────────────────
    if id_token:
        try:
            decoded = _verify_id_token(id_token)
            if decoded:
                uid          = decoded['uid']
                email        = decoded['email']
                display_name = decoded.get('name') or display_name
                photo_url    = decoded.get('picture') or photo_url
            else:
                # Degraded: no key file, trust the client-sent uid/email
                uid = uid_fallback
        except ValueError as e:
            return jsonify({"success": False, "message": str(e)}), 401
    elif uid_fallback:
        # Old-style call without idToken (only allowed when Admin SDK is off)
        if is_initialized():
            return jsonify({
                "success": False,
                "message": "idToken is required for authenticated requests."
            }), 401
        uid = uid_fallback
    else:
        return jsonify({"success": False, "message": "idToken is required."}), 400

    if not uid or not email:
        return jsonify({"success": False, "message": "Could not extract uid/email from token."}), 400

    # ── Upsert user in Postgres ───────────────────────────────────────────────
    conn = get_connection()
    try:
        cur = conn.cursor()

        # 1. Existing user by Firebase UID
        cur.execute(
            "SELECT user_id, username, role FROM users WHERE firebase_uid = %s;",
            (uid,)
        )
        user = cur.fetchone()

        if not user:
            # 2. Existing user linked by email
            cur.execute(
                "SELECT user_id, username, role FROM users WHERE email = %s;",
                (email,)
            )
            user = cur.fetchone()
            if user:
                cur.execute(
                    "UPDATE users SET firebase_uid = %s, email = %s WHERE user_id = %s;",
                    (uid, email, user[0])
                )
            else:
                # 3. Brand new user
                username = email.split('@')[0]
                cur.execute("SELECT 1 FROM users WHERE username = %s;", (username,))
                if cur.fetchone():
                    username = f"{username}_{uid[:4]}"

                cur.execute(
                    """INSERT INTO users (username, email, firebase_uid, role)
                       VALUES (%s, %s, %s, 'user')
                       RETURNING user_id, username, role;""",
                    (username, email, uid)
                )
                user = cur.fetchone()

        conn.commit()
        cur.close()

        session['user_id']  = user[0]
        session['username'] = user[1]
        session['role']     = user[2]

        return jsonify({
            "success": True,
            "message": f"Welcome, {user[1]}!",
            "user": {"id": user[0], "username": user[1], "role": user[2]}
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Auth error: {e}"}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/signup  — username/password signup
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/signup', methods=['POST'])
def signup():
    data     = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required."}), 400

    hashed = generate_password_hash(password)
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, password, role) VALUES (%s, %s, 'user') RETURNING user_id;",
            (username, hashed)
        )
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Account created successfully!"})
    except Exception as e:
        conn.rollback()
        if 'unique' in str(e).lower():
            return jsonify({"success": False, "message": "Username already taken."}), 409
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/login  — username/password login
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/login', methods=['POST'])
def login():
    data     = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, password, role FROM users WHERE username = %s;",
            (username,)
        )
        user = cur.fetchone()
        cur.close()

        if user and check_password_hash(user[1], password):
            session['user_id']  = user[0]
            session['username'] = username
            session['role']     = user[2]
            return jsonify({
                "success": True,
                "message": f"Welcome back, {username}!",
                "user": {"id": user[0], "username": username, "role": user[2]}
            })
        return jsonify({"success": False, "message": "Invalid username or password."}), 401
    except Exception as e:
        return jsonify({"success": False, "message": f"Login error: {e}"}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/logout
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully."})


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/me
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/me', methods=['GET'])
def get_me():
    if 'user_id' in session:
        return jsonify({
            "is_logged_in": True,
            "user": {
                "id":       session['user_id'],
                "username": session['username'],
                "role":     session['role'],
            }
        })
    return jsonify({"is_logged_in": False}), 200
