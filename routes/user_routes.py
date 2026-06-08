from flask import Blueprint, jsonify, request
from db import get_connection

user_bp = Blueprint('user', __name__)

@user_bp.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get the top 50 users by approved file upload count."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        query = """
            SELECT u.user_id, u.username, 
                   COALESCE(up.display_name, u.display_name, u.username) AS display_name,
                   u.photo_url, up.batch_year, up.program,
                   COUNT(f.file_id) AS upload_count
            FROM users u
            JOIN files f ON u.user_id = f.uploaded_by
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            WHERE f.status = 'approved'
            GROUP BY u.user_id, u.username, up.display_name, u.display_name, u.photo_url, up.batch_year, up.program
            ORDER BY upload_count DESC
            LIMIT 50;
        """
        cur.execute(query)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        
        users = [dict(zip(cols, r)) for r in rows]
        
        return jsonify({"success": True, "leaderboard": users})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@user_bp.route('/api/users/<username>', methods=['GET'])
def get_user_profile(username):
    """Get public profile information for a specific user."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        query = """
            SELECT u.user_id, u.username, 
                   COALESCE(up.display_name, u.display_name, u.username) AS display_name,
                   u.photo_url, up.batch_year, up.program, u.role,
                   (SELECT COUNT(*) FROM files WHERE uploaded_by = u.user_id AND status = 'approved') AS upload_count
            FROM users u
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            WHERE LOWER(u.username) = LOWER(%s);
        """
        cur.execute(query, (username,))
        row = cur.fetchone()
        
        if not row:
            return jsonify({"success": False, "message": "User not found"}), 404
            
        cols = [d[0] for d in cur.description]
        user_data = dict(zip(cols, row))
        
        return jsonify({"success": True, "user": user_data})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@user_bp.route('/api/users/<username>/uploads', methods=['GET'])
def get_user_uploads(username):
    """Get paginated approved uploads for a specific user."""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        if page < 1: page = 1
        if limit < 1 or limit > 100: limit = 20
    except ValueError:
        page = 1
        limit = 20

    offset = (page - 1) * limit

    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # First, find the user ID
        cur.execute("SELECT user_id FROM users WHERE LOWER(username) = LOWER(%s);", (username,))
        user_row = cur.fetchone()
        if not user_row:
            return jsonify({"success": False, "message": "User not found"}), 404
            
        user_id = user_row[0]

        # Get total count
        cur.execute("SELECT COUNT(*) FROM files WHERE uploaded_by = %s AND status = 'approved';", (user_id,))
        total_count = cur.fetchone()[0]

        # Get paginated files
        query = """
            SELECT f.file_id, f.title, f.file_url, f.upload_date, f.course_code,
                   c.name AS course_name, cat.name AS category, m.file_size
            FROM files f
            LEFT JOIN courses c ON c.code = f.course_code OR c.name = f.course_code
            LEFT JOIN categories cat ON cat.category_id = f.category_id
            LEFT JOIN file_metadata m ON m.file_id = f.file_id
            WHERE f.uploaded_by = %s AND f.status = 'approved'
            ORDER BY f.upload_date DESC
            LIMIT %s OFFSET %s;
        """
        cur.execute(query, (user_id, limit, offset))
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        
        files = [dict(zip(cols, r)) for r in rows]
        
        import math
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

        return jsonify({
            "success": True, 
            "files": files,
            "page": page,
            "total_pages": total_pages,
            "total_count": total_count
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()
