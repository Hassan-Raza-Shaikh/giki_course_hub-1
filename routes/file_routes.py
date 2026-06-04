import random
import time
import threading
from flask import Blueprint, request, session, jsonify, current_app
import boto3
from botocore.exceptions import NoCredentialsError
from db import get_connection
from werkzeug.utils import secure_filename
import os
import uuid
from config import (
    ALLOWED_EXTENSIONS, R2_BUCKET, R2_ENDPOINT_URL, R2_ACCESS_KEY,
    R2_SECRET_KEY, R2_PUBLIC_URL_PREFIX,
    DEFAULT_MAX_FILE_SIZE, REFERENCE_MAX_FILE_SIZE, REFERENCE_CATEGORY_NAME,
    BULK_MAX_FILES, BULK_MAX_FILES_ADMIN, BULK_MAX_TOTAL_SIZE, BULK_BATCH_TTL,
)
from utils.validators import validate_file_magic_bytes, compute_file_hash, get_file_extension

file_bp = Blueprint('files', __name__)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

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


def _get_max_file_size(category_name, is_admin=False):
    """Return the max allowed file size based on category."""
    if is_admin:
        return 10 * 1024 * 1024 * 1024  # 10 GB
    if category_name and category_name.strip().lower() == REFERENCE_CATEGORY_NAME.lower():
        return REFERENCE_MAX_FILE_SIZE
    return DEFAULT_MAX_FILE_SIZE


def _resolve_category_name(cur, category_id):
    """Look up the category name by ID. Returns name or None."""
    if not category_id:
        return None
    cur.execute("SELECT name FROM categories WHERE category_id = %s;", (category_id,))
    row = cur.fetchone()
    return row[0] if row else None


# ─────────────────────────────────────────────────────────────────────────────
# In-memory bulk upload batch store (with auto-expiry)
# In production, replace with Redis for multi-worker support.
# ─────────────────────────────────────────────────────────────────────────────




def _format_size(size_bytes):
    """Human-readable file size."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


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


@file_bp.route('/api/courses/list', methods=['GET'])
def list_courses_flat():
    """Return a flat list of all courses (id, code, name) for dropdowns."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT course_id, code, name, icon FROM courses ORDER BY code;")
        rows = cur.fetchall()
        cur.close()
        courses = [{"id": r[0], "code": r[1], "name": r[2], "icon": r[3] or '📘'} for r in rows]
        return jsonify({"success": True, "courses": courses})
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
            SELECT c.course_id, c.name, c.code, c.year, c.semester,
                   f.icon AS faculty_icon, f.name AS faculty_name
            FROM courses c
            JOIN faculties f ON c.faculty_id = f.faculty_id
            ORDER BY RANDOM() LIMIT %s;
        """, (n,))
        rows = cur.fetchall()
        cur.close()
        courses = [{
            "id": r[0], "name": r[1], "code": r[2], 
            "year": r[3], "semester": r[4], "icon": r[5], "faculty": r[6]
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
            SELECT c.course_id, c.name, c.code, c.year, c.semester,
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

        is_lab = c[8]

        # Files grouped by category
        cur.execute("SELECT get_api_course_files(%s);", (course_id,))
        by_category = cur.fetchone()[0] or {}

        # Return categories matching the course type.
        # Lab courses also get 'Reference' since reference materials apply to both.
        if is_lab:
            cur.execute(
                """SELECT category_id, name FROM categories
                   WHERE is_lab_category = TRUE OR name = 'Reference'
                   ORDER BY category_id;""",
            )
        else:
            cur.execute(
                "SELECT category_id, name FROM categories WHERE is_lab_category = FALSE ORDER BY category_id;",
            )
        categories = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

        # Instructors linked to this course (admin-assigned relationship)
        cur.execute("""
            SELECT i.instructor_id, i.name, i.faculty_name
            FROM instructors i
            JOIN course_instructors ci ON i.instructor_id = ci.instructor_id
            WHERE ci.course_id = %s
            ORDER BY i.name;
        """, (course_id,))
        course_instructors = [{"id": r[0], "name": r[1], "faculty": r[2]} for r in cur.fetchall()]

        # Instructors who actually have approved files in this course
        # (used for the header chips and filter dropdown)
        # files table stores course_code (string), not course_id
        cur.execute("""
            SELECT DISTINCT i.instructor_id, i.name, i.faculty_name
            FROM instructors i
            JOIN files f ON f.instructor_id = i.instructor_id
            WHERE f.course_code = (SELECT COALESCE(code, name) FROM courses WHERE course_id = %s)
              AND f.status = 'approved'
            ORDER BY i.name;
        """, (course_id,))
        file_instructors = [{"id": r[0], "name": r[1], "faculty": r[2]} for r in cur.fetchall()]

        # All instructors (for the upload dropdown autocomplete)
        cur.execute("SELECT instructor_id, name, faculty_name FROM instructors ORDER BY name;")
        all_instructors = [{"id": r[0], "name": r[1], "faculty": r[2]} for r in cur.fetchall()]

        cur.close()

        return jsonify({
            "success": True,
            "course": {
                "id": c[0], "name": c[1], "code": c[2], 
                "year": c[3], "semester": c[4], "faculty": c[5], "icon": c[6], "program": c[7],
                "is_lab": is_lab
            },
            "files_by_category": by_category,
            "categories": categories,
            "course_instructors": course_instructors,
            "file_instructors": file_instructors,
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

        # ── Magic byte verification ───────────────────────────────────────────
        ext = get_file_extension(file.filename)
        if not validate_file_magic_bytes(file, ext):
            return jsonify({"success": False, "message": "File content does not match its extension. The file may be corrupted or mislabeled."}), 400

        # Get file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        conn = get_connection()
        cur = conn.cursor()

        # ── Category-aware size limit ─────────────────────────────────────────
        category_name = _resolve_category_name(cur, category_id)
        is_admin = (session.get('role') == 'admin')
        max_size = _get_max_file_size(category_name, is_admin)
        if file_size > max_size:
            cur.close()
            limit_mb = max_size // (1024 * 1024)
            return jsonify({"success": False, "message": f"File size exceeds the {limit_mb}MB limit for {category_name or 'this category'}. Reference materials allow up to 50MB."}), 400

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

        # ── Global content-hash deduplication ────────────────────────────────
        content_hash = compute_file_hash(file)
        cur.execute(
            "SELECT file_id, title, course_code FROM files WHERE content_hash = %s AND status != 'rejected' LIMIT 1;",
            (content_hash,)
        )
        dup = cur.fetchone()
        if dup:
            dup_file_id, dup_title, dup_course = dup
            # Check if this course already has it (natively or via link)
            cur.execute(
                "SELECT 1 FROM files WHERE file_id = %s AND (course_code = %s);",
                (dup_file_id, course_code)
            )
            native_match = cur.fetchone()
            cur.execute(
                "SELECT 1 FROM file_course_links WHERE file_id = %s AND course_id = %s;",
                (dup_file_id, course_id)
            )
            link_match = cur.fetchone()

            if native_match or link_match:
                cur.close()
                return jsonify({"success": False, "message": f'This file already exists in this course as "{dup_title}".'}), 409

            # Different course — create a cross-link instead of re-uploading
            custom_title = title if title != dup_title else None
            cur.execute(
                """INSERT INTO file_course_links (file_id, course_id, category_id, custom_title, linked_by)
                   VALUES (%s, %s, %s, %s, %s) ON CONFLICT (file_id, course_id) DO NOTHING;""",
                (dup_file_id, course_id, category_id, custom_title, uploader)
            )
            conn.commit(); cur.close()
            return jsonify({
                "success": True,
                "deduplicated": True,
                "message": f'♻️ This file already exists (uploaded in {dup_course}). It has been linked here as "{title}" — no extra storage used!',
                "file_id": dup_file_id,
                "status": "approved"
            })

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
            INSERT INTO files (title, course_code, category_id, uploaded_by, status, file_url, storage_path, instructor_id, content_hash)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING file_id;
        """, (title, course_code, category_id, uploader, initial_status, file_url, unique_filename, instructor_id, content_hash))
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
               LEFT JOIN categories cat ON cat.category_id = f.category_id
               LEFT JOIN courses    c   ON c.code = f.course_code
                                       OR c.name = f.course_code
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


# ─────────────────────────────────────────────────────────────────────────────
# Bulk Upload — Sequential, secure multi-file upload
# ─────────────────────────────────────────────────────────────────────────────

@file_bp.route('/api/courses/<int:course_id>/bulk-upload/init', methods=['POST'])
def bulk_upload_init(course_id):
    """
    Initialize a bulk upload session.
    Accepts a manifest of files to upload, pre-validates them, and returns a
    batch_id for the sequential upload pipeline.
    Rate limited to 3 per hour per user.
    """
    # Rate limiting — accessed via current_app.limiter set up in app.py
    try:
        limiter = current_app.limiter
        limiter.check()  # Uses the global limit; we add a specific decorator-free check below
    except Exception:
        pass  # If limiter not configured, allow through

    uploader = session.get('user_id')
    if not uploader:
        return jsonify({"success": False, "message": "You must be logged in to upload files."}), 401

    data = request.get_json() or {}
    files_manifest = data.get('files', [])

    if not files_manifest:
        return jsonify({"success": False, "message": "No files provided."}), 400

    is_admin = session.get('role') == 'admin'
    max_files_allowed = BULK_MAX_FILES_ADMIN if is_admin else BULK_MAX_FILES

    if len(files_manifest) > max_files_allowed:
        return jsonify({"success": False, "message": f"Maximum {max_files_allowed} files per bulk upload."}), 400

    # Pre-validate each file in the manifest
    conn = get_connection()
    try:
        cur = conn.cursor()

        # Verify course exists
        cur.execute("SELECT name, code, is_lab FROM courses WHERE course_id = %s;", (course_id,))
        course_row = cur.fetchone()
        if not course_row:
            cur.close()
            return jsonify({"success": False, "message": "Course not found."}), 404

        c_name, c_code, is_lab = course_row
        course_code = c_code or c_name

        accepted = []
        rejected = []
        total_size = 0

        for idx, f in enumerate(files_manifest):
            name = f.get('name', '')
            size = f.get('size', 0)
            cat_id = f.get('category_id')
            title = f.get('title', '').strip()

            # Auto-generate title from filename if not provided
            if not title and name:
                title = name.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').strip()

            # Extension check
            if not allowed_file(name):
                ext = name.rsplit('.', 1)[-1] if '.' in name else 'unknown'
                rejected.append({"index": idx, "name": name, "reason": f".{ext} files are not allowed"})
                continue

            # Category check
            if not cat_id:
                rejected.append({"index": idx, "name": name, "reason": "Category is required"})
                continue

            cat_name = _resolve_category_name(cur, cat_id)
            if not cat_name:
                rejected.append({"index": idx, "name": name, "reason": "Invalid category"})
                continue

            # Lab category vs non-lab course check
            cur.execute("SELECT is_lab_category FROM categories WHERE category_id = %s;", (cat_id,))
            cat_row = cur.fetchone()
            if cat_row and cat_row[0] and not is_lab:
                rejected.append({"index": idx, "name": name, "reason": "Lab materials can only be uploaded to lab courses"})
                continue

            # Size limit check
            is_admin = (session.get('role') == 'admin')
            max_size = _get_max_file_size(cat_name, is_admin)
            if size > max_size:
                limit_mb = max_size // (1024 * 1024)
                rejected.append({"index": idx, "name": name, "reason": f"File too large ({_format_size(size)}). Limit: {limit_mb}MB"})
                continue

            total_size += size
            if total_size > BULK_MAX_TOTAL_SIZE and not is_admin:
                rejected.append({"index": idx, "name": name, "reason": f"Total batch size would exceed {BULK_MAX_TOTAL_SIZE // (1024*1024)}MB"})
                continue

            accepted.append({
                "index": idx,
                "name": name,
                "title": title,
                "category_id": cat_id,
                "category_name": cat_name,
                "instructor_id": f.get('instructor_id'),
                "size": size,
            })

        cur.close()
    finally:
        conn.close()

    if not accepted:
        return jsonify({
            "success": False,
            "message": "No valid files to upload.",
            "rejected": rejected,
        }), 400

    # Generate unique batch ID
    batch_id = f"bulk_{uuid.uuid4().hex[:12]}"

    return jsonify({
        "success": True,
        "batch_id": batch_id,
        "accepted": accepted,
        "rejected": rejected,
        "total_accepted": len(accepted),
        "total_rejected": len(rejected),
    })


@file_bp.route('/api/courses/<int:course_id>/bulk-upload/<batch_id>/file', methods=['POST'])
def bulk_upload_file(course_id, batch_id):
    """
    Upload a single file within a bulk upload batch.
    Called sequentially for each file — server only holds one file in memory at a time.
    """
    uploader = session.get('user_id')
    if not uploader:
        return jsonify({"success": False, "message": "You must be logged in."}), 401

    file = request.files.get('file')
    file_index = request.form.get('file_index', type=int)
    title = request.form.get('title', '').strip()
    category_id = request.form.get('category_id', type=int)
    instructor_id = request.form.get('instructor_id', type=int)

    if not file or file.filename == '':
        return jsonify({"success": False, "message": "No file provided."}), 400

    if file_index is None:
        return jsonify({"success": False, "message": "file_index is required."}), 400

    # Extension check
    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": f"File type not allowed."}), 400

    # Magic byte verification
    ext = get_file_extension(file.filename)
    if not validate_file_magic_bytes(file, ext):
        return jsonify({"success": False, "message": "File content does not match its extension. The file may be corrupted or mislabeled."}), 400

    # Get file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    conn = get_connection()
    try:
        cur = conn.cursor()

        # Category-aware size limit
        category_name = _resolve_category_name(cur, category_id)
        is_admin = (session.get('role') == 'admin')
        max_size = _get_max_file_size(category_name, is_admin)
        if file_size > max_size:
            cur.close()
            limit_mb = max_size // (1024 * 1024)
            return jsonify({"success": False, "message": f"File exceeds {limit_mb}MB limit for {category_name}."}), 400

        cur.execute("SELECT code, name FROM courses WHERE course_id = %s;", (course_id,))
        course_row = cur.fetchone()
        if not course_row:
            cur.close()
            return jsonify({"success": False, "message": "Course not found."}), 404
        course_code = course_row[0] or course_row[1]

        # ── Global content-hash deduplication ────────────────────────────────
        content_hash = compute_file_hash(file)
        cur.execute(
            "SELECT file_id, title, course_code FROM files WHERE content_hash = %s AND status != 'rejected' LIMIT 1;",
            (content_hash,)
        )
        dup = cur.fetchone()
        if dup:
            dup_file_id, dup_title, dup_course = dup
            cur.execute("SELECT 1 FROM files WHERE file_id = %s AND course_code = %s;", (dup_file_id, course_code))
            native_match = cur.fetchone()
            cur.execute("SELECT 1 FROM file_course_links WHERE file_id = %s AND course_id = %s;", (dup_file_id, course_id))
            link_match = cur.fetchone()

            if native_match or link_match:
                cur.close()
                return jsonify({"success": False, "skipped": True, "file_index": file_index,
                                "message": f'Duplicate: "{dup_title}" already in this course.'}), 409

            custom_title = title if title != dup_title else None
            cur.execute(
                """INSERT INTO file_course_links (file_id, course_id, category_id, custom_title, linked_by)
                   VALUES (%s, %s, %s, %s, %s) ON CONFLICT (file_id, course_id) DO NOTHING;""",
                (dup_file_id, course_id, category_id, custom_title, uploader)
            )
            conn.commit(); cur.close()
            return jsonify({
                "success": True,
                "deduplicated": True,
                "skipped": False,
                "file_index": file_index,
                "message": f'♻️ Linked from {dup_course} as "{title}" — no re-upload needed.',
                "file_id": dup_file_id,
            })

        # Upload to R2
        s3_client = get_s3_client()
        if not s3_client:
            cur.close()
            return jsonify({"success": False, "message": "Storage is not configured."}), 500

        file_type = file.content_type
        unique_filename = f"course_{course_id}/{uuid.uuid4().hex}_{secure_filename(file.filename)}"

        try:
            s3_client.upload_fileobj(
                file, R2_BUCKET, unique_filename,
                ExtraArgs={"ContentType": file_type}
            )
        except Exception as e:
            cur.close()
            return jsonify({"success": False, "message": f"Storage upload failed: {str(e)}"}), 500

        # R2 Public URL
        if R2_PUBLIC_URL_PREFIX:
            file_url = f"{R2_PUBLIC_URL_PREFIX.rstrip('/')}/{unique_filename}"
        else:
            file_url = f"{R2_ENDPOINT_URL.rstrip('/')}/{R2_BUCKET}/{unique_filename}"

        # Auto-approve for admins
        role = session.get('role', 'user')
        is_admin = (role == 'admin')
        initial_status = 'approved' if is_admin else 'pending'

        # Use provided title, or fall back to filename
        if not title:
            title = file.filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').strip()

        cur.execute("""
            INSERT INTO files (title, course_code, category_id, uploaded_by, status, file_url, storage_path, instructor_id, content_hash, batch_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING file_id;
        """, (title, course_code, category_id, uploader, initial_status, file_url, unique_filename, instructor_id, content_hash, batch_id))
        new_file_id = cur.fetchone()[0]

        if instructor_id:
            cur.execute(
                "INSERT INTO course_instructors (course_id, instructor_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;",
                (course_id, instructor_id)
            )

        cur.execute(
            "INSERT INTO file_metadata (file_id, file_size, file_type) VALUES (%s, %s, %s);",
            (new_file_id, file_size, file_type)
        )

        conn.commit()
        cur.close()

        # Stateless bulk upload: no memory tracking needed

        return jsonify({
            "success": True,
            "file_index": file_index,
            "file_id": new_file_id,
            "title": title,
            "status": initial_status,
            "message": "Uploaded successfully.",
        })

    except Exception as e:
        conn.rollback()
        err_msg = str(e)
        if "unique_file" in err_msg:
            return jsonify({"success": False, "message": "A file with this title already exists in this category.", "file_index": file_index}), 400
        return jsonify({"success": False, "message": f"Upload error: {err_msg}", "file_index": file_index}), 500
    finally:
        conn.close()


@file_bp.route('/api/courses/<int:course_id>/bulk-upload/<batch_id>/done', methods=['POST'])
def bulk_upload_done(course_id, batch_id):
    """
    Finalize a bulk upload batch.
    Sends a single consolidated notification email to admins (instead of per-file spam).
    Cleans up the batch from memory.
    """
    uploader = session.get('user_id')
    if not uploader:
        return jsonify({"success": False, "message": "You must be logged in."}), 401

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT title, status, course_code FROM files WHERE batch_id = %s AND uploaded_by = %s;", (batch_id, uploader))
        uploaded_files = cur.fetchall()
        cur.close()
    finally:
        conn.close()

    if not uploaded_files:
        return jsonify({
            "success": True, 
            "summary": {"total_uploaded": 0, "pending": 0, "approved": 0},
            "message": "No files were uploaded in this batch."
        })

    course_code = uploaded_files[0][2] if uploaded_files else '?'
    uploaded = [{"title": r[0], "status": r[1]} for r in uploaded_files]
    
    pending_files = [u for u in uploaded if u['status'] == 'pending']
    approved_files = [u for u in uploaded if u['status'] == 'approved']

    # Send ONE consolidated email to admins if there are pending files
    if pending_files:
        try:
            from email_service import send_email
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT email FROM admins;")
                admin_emails = [r[0] for r in cur.fetchall()]

                # Get uploader name
                cur.execute("SELECT username FROM users WHERE user_id = %s;", (uploader,))
                uploader_name = cur.fetchone()
                uploader_name = uploader_name[0] if uploader_name else 'Unknown'
                cur.close()
            finally:
                conn.close()

            file_list_html = ''.join(
                f"<li>{f['title']}</li>" for f in pending_files
            )

            for admin_email in admin_emails:
                subject = f"Bulk Upload: {len(pending_files)} files pending review - GIKI Course Hub"
                body = f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563EB;">📦 Bulk Upload — {len(pending_files)} Files Pending</h2>
                    <p><strong>{uploader_name}</strong> uploaded {len(uploaded)} file(s) to <strong>{course_code}</strong>.</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 16px 0;">
                        <strong>Files awaiting review:</strong>
                        <ol style="margin: 8px 0; padding-left: 20px;">{file_list_html}</ol>
                    </div>
                    <p>Please log in to the <a href="https://gikicoursehub.app/admin" style="color: #F59E0B; font-weight: bold;">Admin Panel</a> to review.</p>
                </div>
                """
                send_email(admin_email, subject, body)
        except Exception as e:
            print(f"Failed to send bulk upload notification: {e}")

    return jsonify({
        "success": True,
        "summary": {
            "total_uploaded": len(uploaded),
            "pending": len(pending_files),
            "approved": len(approved_files),
        },
        "message": f"Bulk upload complete: {len(uploaded)} file(s) uploaded successfully.",
    })


# ─────────────────────────────────────────────────────────────────────────────
# File Cross-Link Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@file_bp.route('/api/files/<int:file_id>/links', methods=['GET'])
def get_file_links(file_id):
    """Return all courses this file is cross-linked to."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT fcl.link_id, fcl.course_id, c.name AS course_name, c.code AS course_code,
                   cat.name AS category, fcl.custom_title, fcl.linked_at
            FROM file_course_links fcl
            JOIN courses c ON c.course_id = fcl.course_id
            LEFT JOIN categories cat ON cat.category_id = fcl.category_id
            WHERE fcl.file_id = %s
            ORDER BY fcl.linked_at DESC;
        """, (file_id,))
        rows = cur.fetchall()
        cur.close()
        links = [{
            "link_id": r[0], "course_id": r[1], "course_name": r[2],
            "course_code": r[3], "category": r[4],
            "custom_title": r[5], "linked_at": str(r[6])
        } for r in rows]
        return jsonify({"success": True, "links": links})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/files/<int:file_id>/links', methods=['POST'])
def add_file_link(file_id):
    """Manually cross-link a file to another course (admin or any logged-in user)."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"success": False, "message": "Login required."}), 401

    d = request.get_json() or {}
    target_course_id = d.get('course_id')
    category_id      = d.get('category_id')
    custom_title     = (d.get('custom_title') or '').strip() or None

    if not target_course_id or not category_id:
        return jsonify({"success": False, "message": "course_id and category_id are required."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        # Verify file exists and is approved
        cur.execute("SELECT title, course_code FROM files WHERE file_id = %s AND status = 'approved';", (file_id,))
        file_row = cur.fetchone()
        if not file_row:
            cur.close()
            return jsonify({"success": False, "message": "File not found or not yet approved."}), 404

        # Verify target course exists
        cur.execute("SELECT name, code FROM courses WHERE course_id = %s;", (target_course_id,))
        course_row = cur.fetchone()
        if not course_row:
            cur.close()
            return jsonify({"success": False, "message": "Target course not found."}), 404

        # Prevent linking a file to its own origin course
        origin_code = file_row[1]
        if course_row[1] == origin_code or course_row[0] == origin_code:
            cur.close()
            return jsonify({"success": False, "message": "This file already belongs to that course."}), 409

        cur.execute(
            """INSERT INTO file_course_links (file_id, course_id, category_id, custom_title, linked_by)
               VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT (file_id, course_id) DO NOTHING;""",
            (file_id, target_course_id, category_id, custom_title, user_id)
        )
        conn.commit(); cur.close()
        return jsonify({"success": True, "message": f'📌 File linked to {course_row[0]} successfully!'})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@file_bp.route('/api/files/<int:file_id>/links/<int:course_id>', methods=['DELETE'])
def remove_file_link(file_id, course_id):
    """Remove a cross-link. Does NOT delete the physical file."""
    if not session.get('user_id'):
        return jsonify({"success": False, "message": "Login required."}), 401

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM file_course_links WHERE file_id = %s AND course_id = %s RETURNING link_id;",
            (file_id, course_id)
        )
        deleted = cur.fetchone()
        if not deleted:
            cur.close()
            return jsonify({"success": False, "message": "Link not found."}), 404
        conn.commit(); cur.close()
        return jsonify({"success": True, "message": "Link removed."})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()
