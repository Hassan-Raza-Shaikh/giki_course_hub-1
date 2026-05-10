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

    id_token     = data.get('idToken')
    uid_fallback = data.get('uid')
    email        = data.get('email', '')
    display_name = data.get('displayName', email.split('@')[0] if email else 'user')
    photo_url    = data.get('photoURL', '')

    # Optional profile fields — only sent during native email/password sign-up
    student_id = data.get('studentId', '').strip() or None  if data.get('studentId') else None
    batch_year = data.get('batchYear', None)
    program    = data.get('program', '').strip()  or None   if data.get('program')    else None

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
                uid = uid_fallback
        except ValueError as e:
            return jsonify({"success": False, "message": str(e)}), 401
    elif uid_fallback:
        if is_initialized():
            return jsonify({"success": False, "message": "idToken is required for authenticated requests."}), 401
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
        cur.execute("SELECT user_id, username, role FROM users WHERE firebase_uid = %s;", (uid,))
        user = cur.fetchone()

        if not user:
            # 2. Existing user linked by email
            cur.execute("SELECT user_id, username, role FROM users WHERE email = %s;", (email,))
            user = cur.fetchone()
            if user:
                cur.execute("UPDATE users SET firebase_uid = %s WHERE user_id = %s;", (uid, user[0]))
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

        user_id = user[0]
        role    = user[2]

        # 4. Check if user is an admin to sync role
        cur.execute("SELECT 1 FROM admins WHERE email = %s;", (email,))
        is_admin_in_db = cur.fetchone() is not None or email in ['ammarbatman9@gmail.com', 'hassan.raza.shaikh.hrs@gmail.com']
        
        if is_admin_in_db and role != 'admin':
            cur.execute("UPDATE users SET role = 'admin' WHERE user_id = %s;", (user_id,))
            role = 'admin'
        elif not is_admin_in_db and role == 'admin':
            cur.execute("UPDATE users SET role = 'user' WHERE user_id = %s;", (user_id,))
            role = 'user'

        # Update display_name / photo_url on users row
        cur.execute(
            "UPDATE users SET display_name = %s, photo_url = %s WHERE user_id = %s;",
            (display_name, photo_url, user_id)
        )

        # If profile fields were sent (native sign-up), upsert user_profiles
        if display_name or student_id or batch_year or program:
            cur.execute(
                """INSERT INTO user_profiles (user_id, display_name, student_id, batch_year, program)
                   VALUES (%s, %s, %s, %s, %s)
                   ON CONFLICT (user_id) DO UPDATE
                     SET display_name = EXCLUDED.display_name,
                         student_id   = COALESCE(EXCLUDED.student_id,   user_profiles.student_id),
                         batch_year   = COALESCE(EXCLUDED.batch_year,   user_profiles.batch_year),
                         program      = COALESCE(EXCLUDED.program,      user_profiles.program),
                         updated_at   = CURRENT_TIMESTAMP;""",
                (user_id, display_name or user[1], student_id, batch_year, program)
            )

        conn.commit()
        cur.close()

        session['user_id']  = user_id
        session['username'] = user[1]
        session['role']     = user[2]

        return jsonify({
            "success": True,
            "message": f"Welcome, {user[1]}!",
            "user": {
                "id": user_id, "username": user[1], "role": user[2],
                "displayName": display_name, "photoURL": photo_url, "email": email
            }
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
    data         = request.get_json()
    email        = data.get('email', '').strip().lower()
    password     = data.get('password', '').strip()
    display_name = data.get('displayName', '').strip()
    student_id   = data.get('studentId', '').strip() or None
    batch_year   = data.get('batchYear', None)
    program      = data.get('program', '').strip() or None

    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()

        # The user was already created in `users` by /api/auth/firebase.
        # Look them up by email to get their user_id.
        cur.execute("SELECT user_id, username FROM users WHERE email = %s;", (email,))
        existing = cur.fetchone()

        if existing:
            user_id  = existing[0]
            username = existing[1]
        else:
            # Fallback: create the user if somehow they don't exist yet
            if not password or len(password) < 6:
                return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400
            username = email.split('@')[0]
            hashed   = generate_password_hash(password)
            cur.execute("SELECT 1 FROM users WHERE username = %s;", (username,))
            if cur.fetchone():
                username = f"{username}_{email.split('@')[0][-4:]}"
            cur.execute(
                "INSERT INTO users (username, email, password, role) VALUES (%s, %s, %s, 'user') RETURNING user_id, username;",
                (username, email, hashed)
            )
            row = cur.fetchone()
            user_id, username = row[0], row[1]

        # Upsert into user_profiles (INSERT or UPDATE if they re-submit)
        cur.execute(
            """INSERT INTO user_profiles (user_id, display_name, student_id, batch_year, program)
               VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT (user_id) DO UPDATE
                 SET display_name = EXCLUDED.display_name,
                     student_id   = EXCLUDED.student_id,
                     batch_year   = EXCLUDED.batch_year,
                     program      = EXCLUDED.program,
                     updated_at   = CURRENT_TIMESTAMP;""",
            (user_id, display_name or username, student_id, batch_year, program)
        )

        conn.commit()
        cur.close()

        return jsonify({
            "success": True,
            "message": "Profile saved.",
            "user": {
                "id": user_id, "username": username,
                "displayName": display_name or username, "email": email
            }
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/login  — username/password login
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/login', methods=['POST'])
def login():
    data     = request.get_json()
    # Accept email OR username
    login_id = data.get('email', '') or data.get('username', '')
    login_id = login_id.strip()
    password = data.get('password', '').strip()

    if not login_id or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        # Try email first, then username
        cur.execute(
            """SELECT user_id, username, password, role, display_name, photo_url, email
               FROM users WHERE email = %s OR username = %s;""",
            (login_id, login_id)
        )
        user = cur.fetchone()
        cur.close()

        if not user or not user[2]:
            return jsonify({"success": False, "message": "Invalid email or password."}), 401

        if check_password_hash(user[2], password):
            session['user_id']  = user[0]
            session['username'] = user[1]
            session['role']     = user[3]
            return jsonify({
                "success": True,
                "message": f"Welcome back, {user[4] or user[1]}!",
                "user": {
                    "id": user[0], "username": user[1], "role": user[3],
                    "displayName": user[4] or user[1], "photoURL": user[5], "email": user[6]
                }
            })
        return jsonify({"success": False, "message": "Invalid email or password."}), 401
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
        conn = get_connection()
        try:
            cur = conn.cursor()
            # Join users with user_profiles (LEFT JOIN — Google users won't have a profile row)
            cur.execute(
                """SELECT u.email, u.photo_url, u.display_name,
                          up.display_name, up.student_id, up.batch_year, up.program
                   FROM users u
                   LEFT JOIN user_profiles up ON u.user_id = up.user_id
                   WHERE u.user_id = %s;""",
                (session['user_id'],)
            )
            row = cur.fetchone()
            cur.close()

            # Prefer profile display_name for native users, fall back to users.display_name or username
            display_name = (row[3] or row[2] or session['username']) if row else session['username']

            return jsonify({
                "is_logged_in": True,
                "user": {
                    "id":          session['user_id'],
                    "username":    session['username'],
                    "role":        session['role'],
                    "email":       row[0] if row else None,
                    "photoURL":    row[1] if row else None,
                    "displayName": display_name,
                    # These are only set for native (email/password) users
                    "studentId":   row[4] if row else None,
                    "batchYear":   row[5] if row else None,
                    "program":     row[6] if row else None,
                }
            })
        except Exception as e:
            return jsonify({"is_logged_in": True, "user": {"id": session['user_id'], "username": session['username'], "role": session['role']}})
        finally:
            conn.close()
    return jsonify({"is_logged_in": False}), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/me/stats  — upload + bookmark counts for the logged-in user
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/me/stats', methods=['GET'])
def get_me_stats():
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401

    conn = get_connection()
    try:
        cur = conn.cursor()
        uid = session['user_id']

        cur.execute("SELECT COUNT(*) FROM files WHERE uploaded_by = %s AND status IN ('approved', 'pending');", (uid,))
        uploads = cur.fetchone()[0]

        # bookmarks table may not exist yet — handle gracefully
        try:
            cur.execute("SELECT COUNT(*) FROM bookmarks WHERE user_id = %s;", (uid,))
            bookmarks = cur.fetchone()[0]
        except Exception:
            bookmarks = 0

        cur.close()
        resp = jsonify({"success": True, "uploads": uploads, "bookmarks": bookmarks})
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        return resp
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()



