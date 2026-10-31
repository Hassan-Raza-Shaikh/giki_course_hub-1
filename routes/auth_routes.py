from flask import Blueprint, request, session, jsonify
from db import get_connection
from firebase_admin_init import is_initialized
import firebase_admin.auth as fb_auth
from config import BOOTSTRAP_ADMIN_EMAILS
import logging
import os

logger = logging.getLogger(__name__)

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
        # Degraded mode (local dev without the service account key): the client's
        # uid/email are trusted as-is, so it is opt-in and must never be on in production.
        return None

    try:
        decoded = fb_auth.verify_id_token(id_token)
        return {
            "uid":     decoded.get("uid") or decoded.get("user_id"),
            "email":   decoded.get("email", ""),
            "name":    decoded.get("name", ""),
            "picture": decoded.get("picture", ""),
            # Google sign-ins are verified; email/password sign-ups are not until the
            # user clicks Firebase's verification link.
            "email_verified": bool(decoded.get("email_verified")),
        }
    except fb_auth.ExpiredIdTokenError:
        raise ValueError("Session expired. Please sign in again.")
    except fb_auth.InvalidIdTokenError as e:
        raise ValueError(f"Invalid token: {e}")
    except Exception as e:
        logger.exception("Unexpected error verifying Firebase ID token")
        raise ValueError(f"Token verification failed: {e}")


def _unverified_auth_allowed():
    """Local dev only: trust client-sent uid/email when there is no service account key."""
    return os.environ.get('ALLOW_UNVERIFIED_AUTH', '').strip().lower() in ('1', 'true', 'yes')


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/auth/firebase  — Google Sign-In (token verified server-side)
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/auth/firebase', methods=['POST'])
def firebase_auth():
    data = request.get_json() or {}

    id_token     = data.get('idToken')
    uid_fallback = data.get('uid')
    email        = (data.get('email', '') or '').strip().lower()
    display_name = ' '.join((data.get('displayName', '') or '').split())[:60]
    photo_url    = (data.get('photoURL', '') or '').strip()

    # Optional profile fields — only sent during native email/password sign-up
    student_id = data.get('studentId', '').strip() or None  if data.get('studentId') else None
    batch_year = data.get('batchYear', None)
    program    = data.get('program', '').strip()  or None   if data.get('program')    else None

    # ── Verify the token ──────────────────────────────────────────────────────
    if not is_initialized():
        if not _unverified_auth_allowed():
            logger.error("Firebase Admin is not initialised; refusing sign-in")
            return jsonify({"success": False, "message": "Sign-in is temporarily unavailable. Please try again later."}), 503
        uid = uid_fallback
        email_verified = True
    elif id_token:
        try:
            decoded = _verify_id_token(id_token)
        except ValueError as e:
            return jsonify({"success": False, "message": str(e)}), 401
        uid            = decoded['uid']
        email          = decoded['email']
        email_verified = decoded['email_verified']
        display_name   = ' '.join((decoded.get('name') or display_name).split())[:60]
        photo_url      = decoded.get('picture') or photo_url
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
                # Taking over an existing account by email needs proof the caller owns
                # that inbox: anyone can create a Firebase password account for any address.
                if not email_verified:
                    return jsonify({
                        "success": False,
                        "message": "An account with this email already exists. Sign in with Google, "
                                   "or verify your email address first.",
                    }), 409
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

        # 4. Check if user is an admin to sync role (admin is granted by email, so the
        #    email must be verified)
        cur.execute("SELECT 1 FROM admins WHERE email = %s;", (email,))
        is_admin_in_db = email_verified and (cur.fetchone() is not None or email.lower() in BOOTSTRAP_ADMIN_EMAILS)
        
        if is_admin_in_db and role != 'admin':
            cur.execute("UPDATE users SET role = 'admin' WHERE user_id = %s;", (user_id,))
            role = 'admin'
        elif not is_admin_in_db and role == 'admin':
            cur.execute("UPDATE users SET role = 'user' WHERE user_id = %s;", (user_id,))
            role = 'user'

        # This runs on every app load, so only write what actually changed. The
        # Google name only fills an empty display name: a name the user set on
        # their profile is theirs and must not be reverted at each sign-in.
        if display_name or photo_url:
            cur.execute(
                """UPDATE users
                   SET display_name = COALESCE(NULLIF(display_name, ''), NULLIF(%s, '')),
                       photo_url    = COALESCE(NULLIF(%s, ''), photo_url)
                   WHERE user_id = %s
                     AND (COALESCE(display_name, '') = '' AND %s <> ''
                          OR %s <> '' AND photo_url IS DISTINCT FROM %s);""",
                (display_name, photo_url, user_id, display_name, photo_url, photo_url)
            )

        # Create the profile row on first sign-in; afterwards only fill in the
        # sign-up fields when they were sent.
        cur.execute(
            """INSERT INTO user_profiles (user_id, display_name, student_id, batch_year, program)
               VALUES (%s, COALESCE(NULLIF(%s, ''), %s), %s, %s, %s)
               ON CONFLICT (user_id) DO UPDATE
                 SET display_name = COALESCE(NULLIF(user_profiles.display_name, ''), EXCLUDED.display_name),
                     student_id   = COALESCE(EXCLUDED.student_id,   user_profiles.student_id),
                     batch_year   = COALESCE(EXCLUDED.batch_year,   user_profiles.batch_year),
                     program      = COALESCE(EXCLUDED.program,      user_profiles.program),
                     updated_at   = CURRENT_TIMESTAMP
                 WHERE EXCLUDED.student_id IS NOT NULL OR EXCLUDED.batch_year IS NOT NULL
                    OR EXCLUDED.program IS NOT NULL OR COALESCE(user_profiles.display_name, '') = '';""",
            (user_id, display_name, user[1], student_id, batch_year, program)
        )

        # Fetch latest profile data to return complete state
        cur.execute("""SELECT up.student_id, up.batch_year, up.program, up.user_type,
                              COALESCE(NULLIF(up.display_name, ''), NULLIF(u.display_name, ''), u.username), u.photo_url
                       FROM users u LEFT JOIN user_profiles up ON up.user_id = u.user_id
                       WHERE u.user_id = %s;""", (user_id,))
        p_row = cur.fetchone()
        display_name = p_row[4] or display_name
        photo_url    = p_row[5] or photo_url
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
        session['email_verified'] = email_verified
        session['_fb_uid']  = uid

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

    except Exception:
        conn.rollback()
        logger.exception("%s %s failed", request.method, request.path)
        return jsonify({"success": False, "message": "Sign-in failed due to a server error. Please try again."}), 500
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
        except Exception:
            logger.exception("Could not load profile for user %s; returning session data only", session.get('user_id'))
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
            logger.warning("Could not count bookmarks for user %s", uid, exc_info=True)
            bookmarks = 0

        cur.close()
        resp = jsonify({"success": True, "uploads": uploads, "bookmarks": bookmarks})
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        return resp
    except Exception:
        logger.exception("%s %s failed", request.method, request.path)
        return jsonify({"success": False, "message": "An unexpected error occurred. Please try again."}), 500
    finally:
        conn.close()



