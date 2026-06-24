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
                   u.photo_url, up.batch_year, up.program, u.role, up.gpa_public,
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
            LEFT JOIN (SELECT DISTINCT ON (code) name, code FROM courses ORDER BY code) c ON c.code = f.course_code OR c.name = f.course_code
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

@user_bp.route('/api/me/profile', methods=['PATCH'])
def update_my_profile():
    """Update the logged-in user's profile (program, batch_year, user_type).
    Works for ALL users — Google OAuth and native email/password alike.
    Upserts into user_profiles so it works even if the row doesn't exist yet.
    """
    from flask import session
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Not authenticated"}), 401

    data = request.get_json(force=True) or {}

    user_type  = (data.get('userType')  or '').strip() or None
    program    = (data.get('program')   or '').strip() or None
    batch_year = data.get('batchYear')
    gpa_public = data.get('gpaPublic')
    req_display_name = data.get('displayName')

    if gpa_public is not None:
        gpa_public = bool(gpa_public)

    # Validate user_type
    allowed_types = ('student', 'faculty', 'graduate', 'external')
    if user_type and user_type not in allowed_types:
        return jsonify({"success": False, "message": f"user_type must be one of {allowed_types}"}), 400

    # Validate batch_year: only required for student/graduate
    if user_type in ('student', 'graduate') and not batch_year:
        return jsonify({"success": False, "message": "batch_year is required for students and graduates"}), 400

    try:
        batch_year = int(batch_year) if batch_year else None
        if batch_year and not (2000 <= batch_year <= 2100):
            return jsonify({"success": False, "message": "Invalid batch year"}), 400
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "batch_year must be a valid integer"}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()

        # Get current display_name for the upsert (required column)
        cur.execute(
            """SELECT COALESCE(up.display_name, u.display_name, u.username)
               FROM users u
               LEFT JOIN user_profiles up ON up.user_id = u.user_id
               WHERE u.user_id = %s;""",
            (session['user_id'],)
        )
        row = cur.fetchone()
        
        # Determine the display name to save
        final_display_name = req_display_name if req_display_name is not None and req_display_name.strip() != "" else (row[0] if row else session.get('username', 'User'))

        # Upsert user_profiles
        cur.execute(
            """
            INSERT INTO user_profiles (user_id, display_name, batch_year, program, user_type, gpa_public)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE
                SET batch_year = COALESCE(EXCLUDED.batch_year, user_profiles.batch_year),
                    program    = COALESCE(EXCLUDED.program,    user_profiles.program),
                    user_type  = COALESCE(EXCLUDED.user_type,  user_profiles.user_type),
                    gpa_public = COALESCE(EXCLUDED.gpa_public, user_profiles.gpa_public),
                    display_name = EXCLUDED.display_name,
                    updated_at = CURRENT_TIMESTAMP;
            """,
            (session['user_id'], final_display_name, batch_year, program, user_type, gpa_public)
        )
        
        # Also update users table to keep it fully synced
        cur.execute("UPDATE users SET display_name = %s WHERE user_id = %s;", (final_display_name, session['user_id']))

        conn.commit()
        return jsonify({"success": True, "message": "Profile updated"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@user_bp.route('/api/faculties-programs', methods=['GET'])
def get_faculties_programs():
    """Public endpoint: returns all faculties and their programs for dropdown population."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT f.faculty_id, f.name AS faculty_abbr, f.full_name,
                   p.program_id, p.name AS program_name
            FROM faculties f
            LEFT JOIN programs p ON p.faculty_id = f.faculty_id
            ORDER BY f.faculty_id, p.name;
        """)
        rows = cur.fetchall()

        # Group programs under their faculty
        faculties = {}
        for fid, fabbr, ffull, pid, pname in rows:
            if fid not in faculties:
                faculties[fid] = {"id": fid, "abbr": fabbr, "full_name": ffull, "programs": []}
            if pid and pname:
                faculties[fid]["programs"].append({"id": pid, "name": pname})

        return jsonify({"success": True, "faculties": list(faculties.values())})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()
