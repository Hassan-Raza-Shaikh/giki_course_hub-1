from flask import Flask, jsonify
from flask_cors import CORS
from config import SECRET_KEY, MAX_CONTENT_LENGTH

from routes.auth_routes  import auth_bp
from routes.file_routes  import file_bp
from routes.user_routes  import user_bp
from routes.admin_routes import admin_bp

def create_app():
    app = Flask(__name__)
    app.secret_key = SECRET_KEY
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
    
    # Enable CORS for React frontend (default port 5173 for Vite)
    CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)

    # ── Error handlers ─────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "message": "Resource not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"success": False, "message": "Internal server error"}), 500

    # ── Root ──────────────────────────────────────────────────
    @app.route('/')
    def index():
        return jsonify({
            "message": "GIKI Course Hub API is live!",
            "version": "2.0 (React Migration)"
        })

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
