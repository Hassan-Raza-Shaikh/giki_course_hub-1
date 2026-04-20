from flask import Blueprint, request, session, jsonify
from psycopg2 import errors as pg_errors
from db import get_connection
from config import ALLOWED_EXTENSIONS

file_bp = Blueprint('files', __name__)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@file_bp.route('/api/files', methods=['GET'])
def list_files():
    subject_id  = request.args.get('subject_id', type=int)
    category_id = request.args.get('category_id', type=int)
    query       = request.args.get('q', '').strip()
    page        = request.args.get('page', 1, type=int)
    per_page    = 10
    offset      = (page - 1) * per_page

    conn = get_connection()
    try:
        cur = conn.cursor()
        conditions, params = [], []
        if subject_id:
            conditions.append("subject_id = %s"); params.append(subject_id)
        if category_id:
            conditions.append("category_id = %s"); params.append(category_id)
        if query:
            conditions.append("title ILIKE %s"); params.append(f'%{query}%')
        
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        sql = f"""
            SELECT file_id, title, subject_name, category_name, uploaded_by, upload_date
            FROM approved_files_view {where}
            ORDER BY upload_date DESC LIMIT %s OFFSET %s;
        """
        params += [per_page, offset]
        cur.execute(sql, params)
        files = cur.fetchall()
        
        cur.execute("SELECT subject_id, name FROM subjects ORDER BY name;")
        subjects = [{"id": s[0], "name": s[1]} for s in cur.fetchall()]
        
        cur.execute("SELECT category_id, name FROM categories ORDER BY name;")
        categories = [{"id": c[0], "name": c[1]} for c in cur.fetchall()]
        
        cur.close()
        return jsonify({
            "success": True,
            "files": [
                {
                    "id": f[0], 
                    "title": f[1], 
                    "subject": f[2], 
                    "category": f[3], 
                    "uploader": f[4], 
                    "date": f[5].isoformat() if f[5] else None
                }
                for f in files
            ],
            "subjects": subjects,
            "categories": categories,
            "page": page
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/files/<int:file_id>', methods=['GET'])
def file_detail(file_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM file_details_view WHERE file_id = %s;", (file_id,))
        file = cur.fetchone()
        if not file:
            return jsonify({"success": False, "message": "File not found."}), 404
        
        is_bookmarked = False
        if session.get('user_id'):
            cur.execute("SELECT 1 FROM bookmarks WHERE user_id=%s AND file_id=%s;",
                        (session['user_id'], file_id))
            is_bookmarked = cur.fetchone() is not None
        
        cur.execute("""
            SELECT u.username, c.comment, c.created_at
            FROM comments c JOIN users u ON c.user_id = u.user_id
            WHERE c.file_id = %s ORDER BY c.created_at DESC;
        """, (file_id,))
        comments = [
            {"username": c[0], "comment": c[1], "date": c[2].isoformat() if c[2] else None}
            for c in cur.fetchall()
        ]
        cur.close()
        return jsonify({
            "success": True,
            "file": {
                "id": file[0], "title": file[1], "file_url": file[2], "uploader": file[3],
                "avg_rating": float(file[4]) if file[4] else 0, "subject": file[5], "category": file[6]
            },
            "is_bookmarked": is_bookmarked,
            "comments": comments
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/upload', methods=['POST'])
def upload_file():
    title       = request.form.get('title', '').strip()
    subject_id  = request.form.get('subject_id', type=int)
    category_id = request.form.get('category_id', type=int)
    file        = request.files.get('file')

    if not title or not subject_id:
        return jsonify({"success": False, "message": "Title and subject are required."}), 400

    file_url, file_size, file_type = None, None, None
    if file and file.filename:
        if not allowed_file(file.filename):
            return jsonify({"success": False, "message": "File type not allowed."}), 400
        file_type = file.filename.rsplit('.', 1)[1].lower()
        file_size = len(file.read())
        file.seek(0)
        file_url = f'/placeholder/{file.filename}'

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 1 FROM files
            WHERE title=%s AND subject_id=%s AND COALESCE(category_id,0)=COALESCE(%s,0);
        """, (title, subject_id, category_id))
        if cur.fetchone():
            return jsonify({"success": False, "message": "A file with the same title, subject, and category already exists."}), 409

        uploader = session.get('user_id', 1) 
        cur.execute("""
            INSERT INTO files (title, subject_id, category_id, uploaded_by, status, file_url)
            VALUES (%s, %s, %s, %s, 'pending', %s) RETURNING file_id;
        """, (title, subject_id, category_id, uploader, file_url))
        new_file_id = cur.fetchone()[0]
        
        if file_size or file_type:
            cur.execute("INSERT INTO file_metadata (file_id, file_size, file_type) VALUES (%s, %s, %s);",
                        (new_file_id, file_size, file_type))
        
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "File uploaded successfully! Pending admin approval."})
    except pg_errors.UniqueViolation:
        conn.rollback()
        return jsonify({"success": False, "message": "Duplicate file detected."}), 409
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Upload failed: {e}"}), 500
    finally:
        conn.close()


@file_bp.route('/api/files/<int:file_id>/bookmark', methods=['POST'])
def toggle_bookmark(file_id):
    if not session.get('user_id'):
        return jsonify({"success": False, "message": "Log in required."}), 401
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM bookmarks WHERE user_id=%s AND file_id=%s;",
                    (session['user_id'], file_id))
        is_added = False
        if cur.fetchone():
            cur.execute("DELETE FROM bookmarks WHERE user_id=%s AND file_id=%s;",
                        (session['user_id'], file_id))
            message = "Bookmark removed."
        else:
            cur.execute("INSERT INTO bookmarks (user_id, file_id) VALUES (%s, %s);",
                        (session['user_id'], file_id))
            message = "Bookmarked!"
            is_added = True
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": message, "is_bookmarked": is_added})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/files/<int:file_id>/report', methods=['POST'])
def report_file(file_id):
    data = request.get_json()
    reason = data.get('reason', '').strip() if data else ""
    if not reason:
        return jsonify({"success": False, "message": "Please provide a reason."}), 400
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        uid = session.get('user_id', 1)
        cur.execute("CALL submit_report(%s, %s, %s);", (uid, file_id, reason))
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Report submitted!"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/files/<int:file_id>/rate', methods=['POST'])
def rate_file(file_id):
    data = request.get_json()
    rating = data.get('rating') if data else None
    if not rating or not (1 <= rating <= 5):
        return jsonify({"success": False, "message": "Rating must be between 1 and 5."}), 400
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        uid = session.get('user_id', 1)
        cur.execute("CALL rate_file(%s, %s, %s);", (uid, file_id, rating))
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Rating saved!"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/files/<int:file_id>/comment', methods=['POST'])
def add_comment(file_id):
    data = request.get_json()
    comment = data.get('comment', '').strip() if data else ""
    if not comment:
        return jsonify({"success": False, "message": "Comment cannot be empty."}), 400
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        uid = session.get('user_id', 1)
        cur.execute("CALL add_comment(%s, %s, %s);", (uid, file_id, comment))
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Comment posted!"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()
