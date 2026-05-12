import random
from flask import Blueprint, request, session, jsonify
import boto3
from botocore.exceptions import NoCredentialsError
from db import get_connection
from werkzeug.utils import secure_filename
import os
import uuid
from config import ALLOWED_EXTENSIONS, R2_BUCKET, R2_ENDPOINT_URL, R2_ACCESS_KEY, R2_SECRET_KEY, R2_PUBLIC_URL_PREFIX

file_bp = Blueprint('files', __name__)

def get_s3_client():
    if not R2_ENDPOINT_URL or not R2_ACCESS_KEY or not R2_SECRET_KEY:
        return None
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        region_name='auto'  # R2 requires this or similar
    )



def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@file_bp.route('/api/search', methods=['GET'])
def search_all():
    """Universal search for files and courses."""
    query       = request.args.get('q', '').strip()
    category_id = request.args.get('category_id', type=int)
    faculty_id  = request.args.get('faculty_id', type=int)

    if not query and not category_id and not faculty_id:
        return jsonify({"success": True, "files": [], "courses": []})

    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # 1. Search Files — DISTINCT ON file_id prevents duplicates when a course
        #    appears in multiple programs or faculties.
        file_sql = """
            SELECT DISTINCT ON (f.file_id)
                   f.file_id, f.title, f.file_url, cat.name as category, f.upload_date,
                   c.name as course_name, c.course_id, m.file_size, i.name as instructor_name
            FROM files f
            LEFT JOIN categories cat ON f.category_id = cat.category_id
            LEFT JOIN (SELECT DISTINCT ON (code) name, code, course_id FROM courses ORDER BY code, course_id) c
                   ON f.course_code = COALESCE(c.code, c.name)
            LEFT JOIN file_metadata m ON f.file_id = m.file_id
            LEFT JOIN instructors i ON f.instructor_id = i.instructor_id
            WHERE f.status = 'approved'
        """
        params = []
        if query:
            file_sql += " AND (f.title ILIKE %s OR c.name ILIKE %s OR f.course_code ILIKE %s OR i.name ILIKE %s)"
            params.extend([f'%{query}%', f'%{query}%', f'%{query}%', f'%{query}%'])
        if category_id:
            file_sql += " AND f.category_id = %s"
            params.append(category_id)
        if faculty_id:
            file_sql = file_sql.replace("WHERE", "JOIN courses c2 ON f.course_code = COALESCE(c2.code, c2.name) WHERE")
            file_sql += " AND c2.faculty_id = %s"
            params.append(faculty_id)

        file_sql += " ORDER BY f.file_id, f.upload_date DESC LIMIT 50"
        cur.execute(file_sql, params)
        files = [{
            "id": r[0], "title": r[1], "file_url": r[2], "category": r[3],
            "date": r[4], "course_name": r[5], "course_id": r[6], "file_size": r[7], "instructor_name": r[8]
        } for r in cur.fetchall()]

        # 2. Search Courses (Distinct by name and code to avoid multi-program duplicates)
        course_sql = """
            SELECT DISTINCT ON (c.name, c.code) 
                   c.course_id, c.name, c.code, f.name as faculty_name, f.icon
            FROM courses c
            JOIN faculties f ON c.faculty_id = f.faculty_id
            WHERE 1=1
        """
        c_params = []
        if query:
            course_sql += " AND (c.name ILIKE %s OR c.code ILIKE %s)"
            c_params.extend([f'%{query}%', f'%{query}%'])
        if faculty_id:
            course_sql += " AND c.faculty_id = %s"
            c_params.append(faculty_id)
            
        course_sql += " LIMIT 20"
        cur.execute(course_sql, c_params)
        courses = [{
            "id": r[0], "name": r[1], "code": r[2], "faculty": r[3], "icon": r[4]
        } for r in cur.fetchall()]

        cur.close()
        return jsonify({"success": True, "files": files, "courses": courses})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/stats', methods=['GET'])
def get_public_stats():
    """Return public statistics for the landing page."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM courses;")
        courses = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM faculties;")
        faculties = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM programs;")
        programs = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM files WHERE status = 'approved';")
        materials = cur.fetchone()[0]
        cur.close()
        return jsonify({
            "success": True,
            "stats": {
                "courses": courses,
                "faculties": faculties,
                "programs": programs,
                "materials": materials
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/categories', methods=['GET'])
def list_categories():
    """Return all categories for filter dropdowns."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT category_id, name, is_lab_category FROM categories ORDER BY category_id;")
        categories = [{"id": r[0], "name": r[1], "is_lab": r[2]} for r in cur.fetchall()]
        cur.close()
        return jsonify({"success": True, "categories": categories})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


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
        # Course info with faculty/program context
        cur.execute("""
            SELECT c.course_id, c.name, c.code, c.description, c.year, c.semester,
                   f.name AS faculty_name, f.icon AS faculty_icon,
                   p.name AS program_name, c.is_lab
            FROM courses c
            LEFT JOIN faculties f ON c.faculty_id = f.faculty_id
            LEFT JOIN programs p  ON c.program_id = p.program_id
            WHERE c.course_id = %s;
        """, (course_id,))
        c = cur.fetchone()
        if not c:
            return jsonify({"success": False, "message": "Course not found."}), 404

        is_lab = c[9]

        # Files grouped by category
        cur.execute("SELECT get_api_course_files(%s);", (course_id,))
        by_category = cur.fetchone()[0] or {}

        # Only return categories that match the course type
        cur.execute(
            "SELECT category_id, name FROM categories WHERE is_lab_category = %s ORDER BY category_id;",
            (is_lab,)
        )
        categories = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

        # Instructors linked to this course
        cur.execute("""
            SELECT i.instructor_id, i.name, i.faculty_name
            FROM instructors i
            JOIN course_instructors ci ON i.instructor_id = ci.instructor_id
            WHERE ci.course_id = %s;
        """, (course_id,))
        course_instructors = [{"id": r[0], "name": r[1], "faculty": r[2]} for r in cur.fetchall()]

        # All instructors (for the upload dropdown autocomplete)
        cur.execute("SELECT instructor_id, name, faculty_name FROM instructors ORDER BY name;")
        all_instructors = [{"id": r[0], "name": r[1], "faculty": r[2]} for r in cur.fetchall()]

        cur.close()

        return jsonify({
            "success": True,
            "course": {
                "id": c[0], "name": c[1], "code": c[2], "description": c[3],
                "year": c[4], "semester": c[5],
                "faculty": c[6], "icon": c[7], "program": c[8],
                "is_lab": is_lab
            },
            "files_by_category": by_category,
            "categories": categories,
            "course_instructors": course_instructors,
            "all_instructors": all_instructors
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()





@file_bp.route('/api/courses/<int:course_id>/upload', methods=['POST'])
def upload_to_course(course_id):
    """Securely upload file to R2 and record metadata in PostgreSQL."""
    conn = None
    try:
        title         = request.form.get('title', '').strip()
        category_id   = request.form.get('category_id', type=int)
        instructor_id = request.form.get('instructor_id', type=int)
        file          = request.files.get('file')
        
        if not file or file.filename == '':
            return jsonify({"success": False, "message": "No file part or no file selected."}), 400

        if not allowed_file(file.filename):
            return jsonify({"success": False, "message": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

        if not title or not category_id or not file:
            return jsonify({"success": False, "message": "Title, category, and file are required."}), 400

        uploader = session.get('user_id')
        if not uploader:
            return jsonify({"success": False, "message": "You must be logged in to upload files."}), 401

        # Get file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        # Enforce 100MB limit
        if file_size > 100 * 1024 * 1024:
            return jsonify({"success": False, "message": "File size exceeds the 100MB limit."}), 400

        conn = get_connection()
        cur = conn.cursor()
        
        # Verify course exists BEFORE uploading to R2 to prevent orphaned files
        cur.execute("SELECT name, code FROM courses WHERE course_id = %s;", (course_id,))
        course_row = cur.fetchone()
        if not course_row:
            cur.close()
            return jsonify({"success": False, "message": "Course not found."}), 404

        # Validate: lab-only categories cannot be uploaded to non-lab courses
        cur.execute(
            "SELECT is_lab_category FROM categories WHERE category_id = %s;",
            (category_id,)
        )
        cat_res = cur.fetchone()
        if cat_res and cat_res[0]:  # is_lab_category = True
            cur.execute("SELECT is_lab FROM courses WHERE course_id = %s;", (course_id,))
            course_is_lab = cur.fetchone()
            if not course_is_lab or not course_is_lab[0]:
                cur.close()
                return jsonify({"success": False, "message": "Lab materials can only be uploaded to lab courses."}), 400

        c_name, c_code = course_row
        course_code    = c_code or c_name

        s3_client = get_s3_client()
        if not s3_client:
            cur.close()
            return jsonify({"success": False, "message": "Storage is not configured on the server."}), 500

        file_type = file.content_type
        unique_filename = f"course_{course_id}/{uuid.uuid4().hex}_{secure_filename(file.filename)}"
        
        try:
            s3_client.upload_fileobj(
                file, 
                R2_BUCKET, 
                unique_filename,
                ExtraArgs={"ContentType": file.content_type}
            )
        except Exception as e:
            cur.close()
            return jsonify({"success": False, "message": f"Failed to upload to storage: {str(e)}"}), 500
        
        # R2 Public URL
        if R2_PUBLIC_URL_PREFIX:
            file_url = f"{R2_PUBLIC_URL_PREFIX.rstrip('/')}/{unique_filename}"
        else:
            file_url = f"{R2_ENDPOINT_URL.rstrip('/')}/{R2_BUCKET}/{unique_filename}"


        # Auto-approve if the uploader is an admin
        role = session.get('role', 'user')
        is_admin = (role == 'admin')
        initial_status = 'approved' if is_admin else 'pending'

        cur.execute("""
            INSERT INTO files (title, course_code, category_id, uploaded_by, status, file_url, storage_path, instructor_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING file_id;
        """, (title, course_code, category_id, uploader, initial_status, file_url, unique_filename, instructor_id))
        new_file_id = cur.fetchone()[0]

        # Automatically associate the instructor with this course if not already linked
        if instructor_id:
            cur.execute(
                "INSERT INTO course_instructors (course_id, instructor_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;",
                (course_id, instructor_id)
            )

        cur.execute(
            "INSERT INTO file_metadata (file_id, file_size, file_type) VALUES (%s, %s, %s);",
            (new_file_id, file_size, file_type)
        )

        # Notify admins if the file requires review
        if initial_status == 'pending':
            try:
                from email_service import send_email
                cur.execute("SELECT email FROM admins;")
                admins = cur.fetchall()
                for admin in admins:
                    admin_email = admin[0]
                    subject = "New Material Pending Review - GIKI Course Hub"
                    body = f"""
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563EB;">New Material Uploaded</h2>
                        <p>A student has uploaded a new material that is waiting for your review.</p>
                        <ul style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <li><strong>Title:</strong> {title}</li>
                            <li><strong>Course:</strong> {course_code}</li>
                        </ul>
                        <p>Please log in to the <a href="https://gikicoursehub.app/admin" style="color: #F59E0B; font-weight: bold;">Admin Panel</a> to approve or reject it.</p>
                    </div>
                    """
                    send_email(admin_email, subject, body)
            except Exception as e:
                print(f"Failed to trigger admin notification email: {e}")

        conn.commit()
        cur.close()
        msg = "Material published!" if initial_status == 'approved' else "Submitted for review — visible once an admin approves it."
        return jsonify({"success": True, "message": msg, "file_id": new_file_id, "status": initial_status})
    except Exception as e:
        if conn:
            conn.rollback()
        err_msg = str(e)
        if "unique_file" in err_msg:
            return jsonify({"success": False, "message": "A file with this title already exists in this category for this course."}), 400
        return jsonify({"success": False, "message": f"Database error during upload: {err_msg}"}), 500
    finally:
        if conn:
            conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# Bookmark routes
# ─────────────────────────────────────────────────────────────────────────────

@file_bp.route('/api/bookmarks', methods=['GET'])
def get_bookmarks():
    """Return all bookmarked files for the logged-in user, with full file info."""
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT DISTINCT ON (b.file_id)
                      f.file_id, f.title, f.file_url, cat.name AS category,
                      c.course_id, c.name AS course_name,
                      m.file_size,
                      b.created_at AS bookmarked_at
               FROM bookmarks b
               JOIN files      f   ON f.file_id      = b.file_id
               JOIN categories cat ON cat.category_id = f.category_id
               JOIN courses    c   ON c.code          = f.course_code
               LEFT JOIN file_metadata m ON m.file_id = f.file_id
               WHERE b.user_id = %s AND f.status = 'approved'
               ORDER BY b.file_id, b.created_at DESC;""",
            (session['user_id'],)
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        cur.close()
        return jsonify({"success": True, "bookmarks": [dict(zip(cols, r)) for r in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/bookmarks/<int:file_id>', methods=['POST'])
def add_bookmark(file_id):
    """Add a file to the logged-in user's bookmarks."""
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO bookmarks (user_id, file_id)
               VALUES (%s, %s)
               ON CONFLICT (user_id, file_id) DO NOTHING;""",
            (session['user_id'], file_id)
        )
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Bookmarked."})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/bookmarks/<int:file_id>', methods=['DELETE'])
def remove_bookmark(file_id):
    """Remove a file from the logged-in user's bookmarks."""
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM bookmarks WHERE user_id = %s AND file_id = %s;",
            (session['user_id'], file_id)
        )
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Bookmark removed."})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# Download tracking
# ─────────────────────────────────────────────────────────────────────────────

@file_bp.route('/api/files/<int:file_id>/download', methods=['POST'])
def track_download(file_id):
    """Record a download event. Silent fail — never blocks the actual download."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO file_downloads (file_id, user_id) VALUES (%s, %s);",
            (file_id, session.get('user_id'))
        )
        conn.commit()
        cur.close()
    except Exception:
        pass
    finally:
        conn.close()
    return jsonify({"success": True})


# ─────────────────────────────────────────────────────────────────────────────
# Report a file
# ─────────────────────────────────────────────────────────────────────────────

@file_bp.route('/api/reports/<int:file_id>', methods=['POST'])
def report_file(file_id):
    """Submit a content report for a file. One report per user per file."""
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Must be logged in to report."}), 401

    reason = (request.get_json() or {}).get('reason', '').strip()
    if not reason:
        return jsonify({"success": False, "message": "A reason is required."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO reports (file_id, reporter_id, reason) VALUES (%s, %s, %s) ON CONFLICT (file_id, reporter_id) DO NOTHING RETURNING report_id;",
            (file_id, session['user_id'], reason)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        if not row:
            return jsonify({"success": False, "message": "You have already reported this file."}), 409

        # Notify all admins
        try:
            from email_service import send_email
            cur.execute("""
                SELECT a.email, f.title, f.course_code, u.username
                FROM admins a, files f, users u
                WHERE f.file_id = %s AND u.user_id = %s;
            """, (file_id, session['user_id']))
            info = cur.fetchall()
            if info:
                file_title = info[0][1]
                course_code = info[0][2]
                reporter_name = info[0][3]
                for row_info in info:
                    send_email(
                        row_info[0],
                        "Content Report Filed - GIKI Course Hub",
                        f"""
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #DC2626;">⚠️ New Content Report</h2>
                            <p>A user has flagged a file for review.</p>
                            <ul style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                                <li><strong>File:</strong> {file_title}</li>
                                <li><strong>Course:</strong> {course_code}</li>
                                <li><strong>Reported by:</strong> {reporter_name}</li>
                                <li><strong>Reason:</strong> {reason}</li>
                            </ul>
                            <p>Please log in to the <a href="https://gikicoursehub.app/admin" style="color: #F59E0B; font-weight: bold;">Admin Panel</a> to review this report.</p>
                        </div>
                        """
                    )
        except Exception as e:
            print(f"Failed to send report notification email: {e}")

        return jsonify({"success": True, "message": "Report submitted. Thank you for keeping the platform safe."})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# Public: get admin note for a file (shown to all users)
# ─────────────────────────────────────────────────────────────────────────────

@file_bp.route('/api/files/<int:file_id>/note', methods=['GET'])
def get_file_note(file_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT note_text, admin_email, updated_at FROM file_notes WHERE file_id = %s;",
            (file_id,)
        )
        row = cur.fetchone()
        cur.close()
        if not row:
            return jsonify({"success": True, "note": None})
        return jsonify({"success": True, "note": {"text": row[0], "by": row[1], "at": str(row[2])}})
    finally:
        conn.close()
