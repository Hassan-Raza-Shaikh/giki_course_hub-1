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
        cur.execute("""
            SELECT
                f.faculty_id, f.name AS faculty_name, f.full_name, f.icon AS faculty_icon,
                p.program_id, p.name AS program_name,
                c.course_id, c.name AS course_name, c.code, c.description, c.year, c.semester
            FROM faculties f
            JOIN programs p ON p.faculty_id = f.faculty_id
            JOIN courses c ON c.program_id = p.program_id
            ORDER BY f.faculty_id, p.program_id, c.semester, c.name;
        """)
        rows = cur.fetchall()
        cur.close()

        # Build nested structure: faculty → program → year → courses
        faculties_map = {}
        for row in rows:
            (fac_id, fac_name, fac_full, fac_icon,
             prog_id, prog_name,
             course_id, course_name, code, desc, year, semester) = row

            if fac_id not in faculties_map:
                faculties_map[fac_id] = {
                    "id": fac_id, "name": fac_name, "full_name": fac_full, "icon": fac_icon,
                    "programs": {}
                }

            progs = faculties_map[fac_id]["programs"]
            if prog_id not in progs:
                progs[prog_id] = {"id": prog_id, "name": prog_name, "years": {}}

            years = progs[prog_id]["years"]
            if year not in years:
                years[year] = {"year": year, "semesters": {}}

            sems = years[year]["semesters"]
            if semester not in sems:
                sems[semester] = {"semester": semester, "courses": []}

            sems[semester]["courses"].append({
                "id": course_id, "name": course_name, "code": code,
                "description": desc, "year": year, "semester": semester
            })

        # Serialize to list structure
        result = []
        for fac in faculties_map.values():
            fac_out = {
                "id": fac["id"], "name": fac["name"], "full_name": fac["full_name"],
                "icon": fac["icon"], "programs": []
            }
            for prog in fac["programs"].values():
                prog_out = {"id": prog["id"], "name": prog["name"], "years": []}
                for year_num in sorted(prog["years"].keys()):
                    yr = prog["years"][year_num]
                    sems_out = []
                    for sem_num in sorted(yr["semesters"].keys()):
                        sems_out.append({
                            "semester": sem_num,
                            "courses": yr["semesters"][sem_num]["courses"]
                        })
                    prog_out["years"].append({"year": year_num, "semesters": sems_out})
                fac_out["programs"].append(prog_out)
            result.append(fac_out)

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

        # Files for this course (via subjects linked to course, or directly by course_id)
        cur.execute("""
            SELECT f.file_id, f.title, cat.name AS category, u.username, f.upload_date, f.file_url
            FROM files f
            LEFT JOIN subjects s ON f.subject_id = s.subject_id
            LEFT JOIN categories cat ON f.category_id = cat.category_id
            LEFT JOIN users u ON f.uploaded_by = u.user_id
            WHERE s.course_id = %s AND f.status = 'approved'
            ORDER BY cat.name, f.upload_date DESC;
        """, (course_id,))
        file_rows = cur.fetchall()

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

        # Group files by category
        by_category = {}
        for f in file_rows:
            cat = f[2] or "General"
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append({
                "id": f[0], "title": f[1], "category": f[2],
                "uploader": f[3],
                "date": f[4].isoformat() if f[4] else None,
                "file_url": f[5]
            })

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


@file_bp.route('/api/courses/<int:course_id>/upload', methods=['POST'])
def upload_to_course(course_id):
    """Upload a file to a specific course."""
    title       = request.form.get('title', '').strip()
    category_id = request.form.get('category_id', type=int)
    subject_id  = request.form.get('subject_id', type=int)
    file        = request.files.get('file')

    if not title or not category_id or not subject_id:
        return jsonify({"success": False, "message": "Title, category, and subject are required."}), 400

    file_url, file_size, file_type = None, None, None
    if file and file.filename:
        if not allowed_file(file.filename):
            return jsonify({"success": False, "message": "File type not allowed. Use PDF, DOCX, PPTX, etc."}), 400
        file_type = file.filename.rsplit('.', 1)[1].lower()
        file_size = len(file.read())
        file.seek(0)
        file_url = f'/uploads/{file.filename}'

    conn = get_connection()
    try:
        cur = conn.cursor()
        uploader = session.get('user_id', 1)
        cur.execute("""
            INSERT INTO files (title, subject_id, category_id, uploaded_by, status, file_url)
            VALUES (%s, %s, %s, %s, 'approved', %s) RETURNING file_id;
        """, (title, subject_id, category_id, uploader, file_url))
        new_file_id = cur.fetchone()[0]

        if file_size or file_type:
            cur.execute(
                "INSERT INTO file_metadata (file_id, file_size, file_type) VALUES (%s, %s, %s);",
                (new_file_id, file_size, file_type)
            )
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Material uploaded successfully!", "file_id": new_file_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Upload failed: {e}"}), 500
    finally:
        conn.close()


# ── Legacy bookmark + rate ──────────────────────────────────────────────────

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
