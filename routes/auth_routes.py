from flask import Blueprint, request, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_connection

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
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


@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT user_id, password, role FROM users WHERE username = %s;", (username,))
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
        else:
            return jsonify({"success": False, "message": "Invalid username or password."}), 401
    except Exception as e:
        return jsonify({"success": False, "message": f"Login error: {e}"}), 500
    finally:
        conn.close()


@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully."})


@auth_bp.route('/api/me', methods=['GET'])
def get_me():
    if 'user_id' in session:
        return jsonify({
            "is_logged_in": True,
            "user": {
                "id": session['user_id'],
                "username": session['username'],
                "role": session['role']
            }
        })
    return jsonify({"is_logged_in": False}), 200
