import random
from flask import Blueprint, request, session, jsonify
from db import get_connection
from config import ALLOWED_EXTENSIONS

file_bp = Blueprint('files', __name__)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ── Courses ────────────────────────────────────────────────────────────────

@file_bp.route('/api/courses', methods=['GET'])
def list_courses():
    """All courses grouped by faculty → program → year (2 semesters per year)."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        # Offload heavy data aggregation to PostgreSQL UDF
        cur.execute("SELECT get_api_courses_hierarchy();")
        result = cur.fetchone()[0] or []
        cur.close()
        return jsonify({"success": True, "faculties": result})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/courses/random', methods=['GET'])
def random_courses():
    """Return n random courses for the landing page hero."""
    n = request.args.get('n', 3, type=int)
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT c.course_id, c.name, c.code, c.description, c.year, c.semester,
                   f.icon AS faculty_icon, f.name AS faculty_name
            FROM courses c
            JOIN faculties f ON c.faculty_id = f.faculty_id
            ORDER BY RANDOM() LIMIT %s;
        """, (n,))
        rows = cur.fetchall()
        cur.close()
        courses = [{
            "id": r[0], "name": r[1], "code": r[2], "description": r[3],
            "year": r[4], "semester": r[5], "icon": r[6], "faculty": r[7]
        } for r in rows]
        return jsonify({"success": True, "courses": courses})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/courses/<int:course_id>', methods=['GET'])
def course_detail(course_id):
    """Course info + all approved files grouped by category."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        # Course info
        # Course info with faculty/program context
        cur.execute("""
            SELECT c.course_id, c.name, c.code, c.description, c.year, c.semester,
                   f.name AS faculty_name, f.icon AS faculty_icon,
                   p.name AS program_name
            FROM courses c
            LEFT JOIN faculties f ON c.faculty_id = f.faculty_id
            LEFT JOIN programs p  ON c.program_id = p.program_id
            WHERE c.course_id = %s;
        """, (course_id,))
        c = cur.fetchone()
        if not c:
            return jsonify({"success": False, "message": "Course not found."}), 404

        # Files grouped by category natively in Postgres UDF
        cur.execute("SELECT get_api_course_files(%s);", (course_id,))
        by_category = cur.fetchone()[0] or {}

        # Categories available
        cur.execute("SELECT category_id, name FROM categories ORDER BY name;")
        categories = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

        # Get or create subject for this course (needed for uploads)
        cur.execute("SELECT subject_id FROM subjects WHERE course_id = %s LIMIT 1;", (course_id,))
        subject = cur.fetchone()
        subject_id = subject[0] if subject else None

        if not subject_id:
            cur.execute(
                "INSERT INTO subjects (course_id, name) VALUES (%s, %s) RETURNING subject_id;",
                (course_id, c[1])
            )
            subject_id = cur.fetchone()[0]
            conn.commit()

        cur.close()

        return jsonify({
            "success": True,
            "course": {
                "id": c[0], "name": c[1], "code": c[2], "description": c[3],
                "year": c[4], "semester": c[5],
                "faculty": c[6], "icon": c[7], "program": c[8]
            },
            "files_by_category": by_category,
            "categories": categories,
            "subject_id": subject_id
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


import os
import uuid
from werkzeug.utils import secure_filename

@file_bp.route('/api/courses/<int:course_id>/upload', methods=['POST'])
def upload_to_course(course_id):
    """
    Handle local file upload.
    Saves file to static/uploads/ and records in DB.
    """
    title       = request.form.get('title', '').strip()
    category_id = request.form.get('category_id', type=int)
    subject_id  = request.form.get('subject_id', type=int)
    file        = request.files.get('file')

    if not title or not category_id or not subject_id or not file:
        return jsonify({"success": False, "message": "Title, category, subject, and file are required."}), 400

    if not file.filename or not allowed_file(file.filename):
        return jsonify({"success": False, "message": "File type not allowed."}), 400

    ext       = file.filename.rsplit('.', 1)[1].lower()
    file_type = ext
    
    # Ensure upload directory exists
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename to prevent clashing
    unique_filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    file_path       = os.path.join(upload_dir, unique_filename)
    
    # Save physically
    file.save(file_path)
    file_size = os.path.getsize(file_path)
    
    # Public URL served by Flask's static folder
    file_url  = f"/static/uploads/{unique_filename}"
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        uploader = session.get('user_id', 1)

        cur.execute("""
            INSERT INTO files (title, subject_id, category_id, uploaded_by, status, file_url, storage_path)
            VALUES (%s, %s, %s, %s, 'approved', %s, %s) RETURNING file_id;
        """, (title, subject_id, category_id, uploader, file_url, file_path))
        new_file_id = cur.fetchone()[0]

        cur.execute(
            "INSERT INTO file_metadata (file_id, file_size, file_type) VALUES (%s, %s, %s);",
            (new_file_id, file_size, file_type)
        )

        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Material uploaded successfully!", "file_id": new_file_id})
    except Exception as e:
        conn.rollback()
        # Clean up local file on error
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({"success": False, "message": f"Upload failed: {e}"}), 500
    finally:
        conn.close()



