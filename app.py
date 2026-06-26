from flask import Flask, jsonify, session, request
from flask_cors import CORS
from flask_compress import Compress
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from config import SECRET_KEY, MAX_CONTENT_LENGTH
from firebase_admin_init import init_firebase_admin

from routes.auth_routes  import auth_bp
from routes.file_routes  import file_bp
from routes.admin_routes import admin_bp
from routes.user_routes import user_bp
from routes.issue_routes import issue_bp
from routes.instructor_routes import instructor_bp
from routes.gpa_routes import gpa_bp


import os

def create_app():
    app = Flask(__name__)
    Compress(app)
    app.secret_key = SECRET_KEY
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

    # ── Security headers via Talisman ─────────────────────────────────────────
    # force_https is False here because Render/Vercel handle TLS termination
    # upstream; the Python process itself sits behind a proxy on plain HTTP.
    # HSTS is still sent because Talisman will set it on all responses.
    Talisman(
        app,
        force_https=False,
        strict_transport_security=True,
        strict_transport_security_max_age=31536000,  # 1 year
        content_security_policy={
            'default-src': "'self'",
            'script-src': "'self'",
            'style-src': "'self' 'unsafe-inline'",
            'img-src': "*",
            'connect-src': "*",
            'frame-src': "'none'",
            'object-src': "'none'",
        },
        content_security_policy_nonce_in=['script-src'],
        x_content_type_options=True,
        x_xss_protection=True,
        referrer_policy='strict-origin-when-cross-origin',
        feature_policy={
            'geolocation': "'none'",
            'microphone': "'none'",
            'camera': "'none'",
        },
    )

    # ── Rate limiter ──────────────────────────────────────────────────────────
    # Uses Redis when REDIS_URL is set (distributed — correct for multi-worker),
    # falls back to in-memory (acceptable for single-worker dev/staging).
    def _rate_limit_key():
        return str(session.get('user_id', '')) or get_remote_address()

    redis_url = os.environ.get('REDIS_URL')
    limiter = Limiter(
        key_func=_rate_limit_key,
        app=app,
        default_limits=["200 per minute"],   # generous global default
        storage_uri=redis_url if redis_url else "memory://",
    )
    app.limiter = limiter  # expose for route decorators

    # Critical for cross-domain sessions (Vercel → Render) on Mobile
    app.config.update(
        SESSION_COOKIE_SAMESITE='None',
        SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
    )

    # Support production and local origins
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
    CORS(app, supports_credentials=True, origins=allowed_origins)

    # Initialize Firebase Admin SDK (for ID token verification)
    init_firebase_admin()

    app.register_blueprint(auth_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(issue_bp)
    app.register_blueprint(instructor_bp)
    app.register_blueprint(gpa_bp)

    # Apply strict rate limits to sensitive endpoints
    limiter.limit("5 per minute")(app.view_functions['auth.login'])
    limiter.limit("5 per minute")(app.view_functions['auth.signup'])
    limiter.limit("10 per minute")(app.view_functions['files.upload_to_course'])
    limiter.limit("10 per minute")(app.view_functions['files.bulk_upload_init'])
    limiter.limit("10 per minute")(app.view_functions['gpa.save_gpa'])

    @app.before_request
    def handle_mobile_auth():
        """
        Mobile browsers (Safari/iOS) aggressively block cross-domain cookies.
        This intercepts Firebase Bearer tokens sent from the frontend and injects
        the internal user_id into the Flask session for the duration of the request,
        making all existing routes work seamlessly across all devices.

        Performance: The DB lookup is cached in the session cookie keyed by
        firebase_uid — so a DB query is only made once per Firebase session
        (first request with a new token), not on every single request.
        """
        auth_header = request.headers.get('Authorization')
        if not (auth_header and auth_header.startswith('Bearer ')):
            return
        token = auth_header.split('Bearer ')[1]
        try:
            import firebase_admin.auth as fb_auth
            from firebase_admin_init import is_initialized
            if not is_initialized():
                return
            decoded = fb_auth.verify_id_token(token)
            uid = decoded.get('uid') or decoded.get('user_id')
            if not uid:
                return

            # ── Session cache: skip DB if we already resolved this UID ────────
            # The session stores the firebase_uid we last resolved. If it matches,
            # user_id is already in the session — no DB round-trip needed.
            if session.get('_fb_uid') == uid and session.get('user_id'):
                return  # cache hit — nothing to do

            # Cache miss: resolve Firebase UID → internal DB user_id
            from db import get_connection
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    "SELECT user_id, email, role, username FROM users WHERE firebase_uid = %s;",
                    (uid,)
                )
                row = cur.fetchone()
                if row:
                    session['user_id']  = row[0]
                    session['email']    = row[1]
                    session['role']     = row[2]
                    session['username'] = row[3]
                    session['_fb_uid']  = uid   # mark as resolved
            finally:
                conn.close()
        except Exception as e:
            print(f"Token verification failed in before_request: {e}")

        # Purge stale session cookies where user_id is a string Firebase UID
        # instead of the expected integer (can happen after a schema migration).
        if 'user_id' in session and isinstance(session['user_id'], str):
            try:
                int(session['user_id'])
            except ValueError:
                session.clear()

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "success": False,
            "message": "Resource not found. Please report this issue so the developers can get on it—your reporting helps us improve the app experience!"
        }), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({
            "success": False,
            "message": "Internal server error. Please report this issue so the developers can get on it—your reporting helps us improve the app experience!"
        }), 500

    @app.route('/')
    def index():
        return jsonify({"message": "GIKI Course Hub API v3.0"})

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)
