from flask import Blueprint, request, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_connection
from firebase_admin_init import is_initialized
import firebase_admin.auth as fb_auth
from config import BOOTSTRAP_ADMIN_EMAILS

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
    data = request.get_json() or {}

    id_token     = data.get('idToken')
    uid_fallback = data.get('uid')
    email        = (data.get('email', '') or '').strip().lower()
    display_name = (data.get('displayName', '') or '').strip()
    photo_url    = (data.get('photoURL', '') or '').strip()

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
        cur.execute("SELECT user_id, username, role, display_name FROM users WHERE firebase_uid = %s;", (uid,))
        user = cur.fetchone()

        if not user:
            # 2. Existing user linked by email
            cur.execute("SELECT user_id, username, role, display_name FROM users WHERE email = %s;", (email,))
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
                    """INSERT INTO users (username, email, firebase_uid, role, display_name)
                       VALUES (%s, %s, %s, 'user', %s)
                       RETURNING user_id, username, role, display_name;""",
                    (username, email, uid, display_name or username)
                )
                user = cur.fetchone()

        user_id = user[0]
        role    = user[2]
        existing_display_name = user[3]

        # 4. Check if user is an admin to sync role
        cur.execute("SELECT 1 FROM admins WHERE email = %s;", (email,))
        is_admin_in_db = cur.fetchone() is not None or email.lower() in BOOTSTRAP_ADMIN_EMAILS
        
        if is_admin_in_db and role != 'admin':
            cur.execute("UPDATE users SET role = 'admin' WHERE user_id = %s;", (user_id,))
            role = 'admin'
        elif not is_admin_in_db and role == 'admin':
            cur.execute("UPDATE users SET role = 'user' WHERE user_id = %s;", (user_id,))
            role = 'user'

        # Update display_name / photo_url on users row gracefully
        if display_name or photo_url:
            cur.execute(
                """UPDATE users 
                   SET display_name = COALESCE(NULLIF(%s, ''), display_name), 
                       photo_url = COALESCE(NULLIF(%s, ''), photo_url) 
                   WHERE user_id = %s;""",
                (display_name, photo_url, user_id)
            )

        # Upsert user_profiles gracefully
        cur.execute(
            """INSERT INTO user_profiles (user_id, display_name, student_id, batch_year, program)
               VALUES (%s, COALESCE(NULLIF(%s, ''), %s), %s, %s, %s)
               ON CONFLICT (user_id) DO UPDATE
                 SET display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), user_profiles.display_name),
                     student_id   = COALESCE(EXCLUDED.student_id,   user_profiles.student_id),
                     batch_year   = COALESCE(EXCLUDED.batch_year,   user_profiles.batch_year),
                     program      = COALESCE(EXCLUDED.program,      user_profiles.program),
                     updated_at   = CURRENT_TIMESTAMP;""",
            (user_id, display_name, user[1], student_id, batch_year, program)
        )

        # Fetch latest profile data to return complete state
        cur.execute("SELECT student_id, batch_year, program, user_type FROM user_profiles WHERE user_id = %s;", (user_id,))
        p_row = cur.fetchone()
        student_id_db = p_row[0] if p_row else student_id
        batch_year_db = p_row[1] if p_row else batch_year
        program_db    = p_row[2] if p_row else program
        user_type_db  = p_row[3] if p_row else None

        if program_db and user_type_db:
            if user_type_db in ('faculty', 'external'):
                profile_complete = True
            else:
                profile_complete = bool(batch_year_db)
        else:
            profile_complete = False

        conn.commit()
        cur.close()

        session['user_id']  = user_id
        session['username'] = user[1]
        session['role']     = role  # use the updated role variable

        return jsonify({
            "success": True,
            "message": f"Welcome, {user[1]}!",
            "user": {
                "id": user_id, "username": user[1], "role": role,
                "displayName": display_name, "photoURL": photo_url, "email": email,
                "studentId": student_id_db,
                "batchYear": batch_year_db,
                "program": program_db,
                "userType": user_type_db,
                "profileComplete": profile_complete
            }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Auth error: {e}"}), 500
    finally:
        conn.close()



# ─────────────────────────────────────────────────────────────────────────────
# POST /api/signup  — native email/password signup (profile upsert)
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/signup', methods=['POST'])
def signup():
    import re
    data         = request.get_json() or {}
    email        = data.get('email', '').strip().lower()
    password     = data.get('password', '').strip()
    display_name = data.get('displayName', '').strip()
    student_id   = data.get('studentId', '').strip() or None
    batch_year   = data.get('batchYear', None)
    program      = data.get('program', '').strip() or None

    # ── Input validation ──────────────────────────────────────────────────────
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400

    email_regex = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    if not email_regex.match(email):
        return jsonify({"success": False, "message": "Please enter a valid email address."}), 400

    if not display_name:
        return jsonify({"success": False, "message": "Full name is required."}), 400

    if password and len(password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()

        # Check if user already exists by email — reject duplicates clearly
        cur.execute("SELECT user_id, username, firebase_uid FROM users WHERE email = %s;", (email,))
        existing = cur.fetchone()

        if existing:
            user_id  = existing[0]
            username = existing[1]
            # If they already have a Firebase UID, this is a returning user — just upsert profile
            # (This path is hit when /api/auth/firebase already created the row and calls /api/signup
            #  as the second step to save profile data. That's the normal flow.)
        else:
            # Fallback: direct DB creation (should rarely happen — Firebase creates the row first)
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

        # Upsert into user_profiles
        cur.execute(
            """INSERT INTO user_profiles (user_id, display_name, student_id, batch_year, program)
               VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT (user_id) DO UPDATE
                 SET display_name = EXCLUDED.display_name,
                     student_id   = COALESCE(EXCLUDED.student_id,  user_profiles.student_id),
                     batch_year   = COALESCE(EXCLUDED.batch_year,  user_profiles.batch_year),
                     program      = COALESCE(EXCLUDED.program,     user_profiles.program),
                     updated_at   = CURRENT_TIMESTAMP;""",
            (user_id, display_name or username, student_id, batch_year, program)
        )

        conn.commit()
        cur.close()

        return jsonify({
            "success": True,
            "message": "Account created successfully.",
            "user": {
                "id": user_id, "username": username,
                "displayName": display_name or username, "email": email
            }
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Signup error: {e}"}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/login  — username/password login
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/login', methods=['POST'])
def login():
    data     = request.get_json() or {}
    # Accept email OR username
    login_id = (data.get('email', '') or data.get('username', '') or '').strip().lower()
    password = (data.get('password', '') or '').strip()

    if not login_id or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        # Try email first, then username (case-insensitive)
        cur.execute(
            """SELECT u.user_id, u.username, u.password, u.role, u.display_name, u.photo_url, u.email,
                      up.batch_year, up.program, up.user_type
               FROM users u
               LEFT JOIN user_profiles up ON u.user_id = up.user_id
               WHERE LOWER(u.email) = %s OR LOWER(u.username) = %s;""",
            (login_id, login_id)
        )
        user = cur.fetchone()
        cur.close()

        # user[2] is the hashed password — Google-only users have NULL here
        if not user or not user[2] or not check_password_hash(user[2], password):
            return jsonify({"success": False, "message": "Invalid email or password."}), 401

        batch_year, program, user_type = user[7], user[8], user[9]
        if program and user_type:
            if user_type in ('faculty', 'external'):
                profile_complete = True
            else:
                profile_complete = bool(batch_year)
        else:
            profile_complete = False

        session['user_id']  = user[0]
        session['username'] = user[1]
        session['role']     = user[3]
        return jsonify({
            "success": True,
            "message": f"Welcome back, {user[4] or user[1]}!",
            "user": {
                "id": user[0], "username": user[1], "role": user[3],
                "displayName": user[4] or user[1], "photoURL": user[5], "email": user[6],
                "profileComplete": profile_complete
            }
        })
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
                          up.display_name, up.student_id, up.batch_year, up.program, up.user_type, up.gpa_public
                   FROM users u
                   LEFT JOIN user_profiles up ON u.user_id = up.user_id
                   WHERE u.user_id = %s;""",
                (session['user_id'],)
            )
            row = cur.fetchone()
            cur.close()

            # Prefer profile display_name for native users, fall back to users.display_name or username
            display_name = (row[3] or row[2] or session['username']) if row else session['username']

            batch_year  = row[5] if row else None
            program     = row[6] if row else None
            user_type   = row[7] if row else None
            gpa_public  = row[8] if row else False

            # profileComplete = user has set program AND
            # (batch_year is set if they're a student/graduate, or user_type is faculty/external)
            if program and user_type:
                if user_type in ('faculty', 'external'):
                    profile_complete = True
                else:
                    profile_complete = bool(batch_year)
            else:
                profile_complete = False

            return jsonify({
                "is_logged_in": True,
                "user": {
                    "id":              session['user_id'],
                    "username":        session['username'],
                    "role":            session['role'],
                    "email":           row[0] if row else None,
                    "photoURL":        row[1] if row else None,
                    "displayName":     display_name,
                    # These are only set for native (email/password) users
                    "studentId":       row[4] if row else None,
                    "batchYear":       batch_year,
                    "program":         program,
                    "userType":        user_type,
                    "gpaPublic":       gpa_public,
                    "profileComplete": profile_complete,
                }
            })
        except Exception as e:
            return jsonify({"is_logged_in": True, "user": {"id": session['user_id'], "username": session['username'], "role": session['role'], "profileComplete": False}})
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



