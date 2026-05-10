from flask import Flask, jsonify
from flask_cors import CORS
from config import SECRET_KEY, MAX_CONTENT_LENGTH
from firebase_admin_init import init_firebase_admin

from routes.auth_routes  import auth_bp
from routes.file_routes  import file_bp
from routes.admin_routes import admin_bp
from routes.issue_routes import issue_bp
from routes.instructor_routes import instructor_bp


import os

def create_app():
    app = Flask(__name__)
    app.secret_key = SECRET_KEY
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
    
    # Critical for cross-domain sessions (Vercel -> Render) on Mobile
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
    app.register_blueprint(issue_bp)
    app.register_blueprint(instructor_bp)

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

    @app.route('/debug/hierarchy')
    def debug_hierarchy():
        from db import get_connection
        try:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("SELECT get_api_courses_hierarchy();")
            res = cur.fetchone()[0]
            cur.close()
            conn.close()
            return jsonify({"success": True, "count": len(res) if res else 0, "data_sample": res[:1] if res else []})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)

