from flask import Blueprint, jsonify, request
from db import get_connection

instructor_bp = Blueprint('instructors', __name__)

@instructor_bp.route('/api/courses/<int:course_id>/instructors', methods=['GET'])
def get_course_instructors(course_id):
    """Fetch instructors associated with a specific course."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT i.instructor_id, i.name, i.faculty_name
            FROM instructors i
            JOIN course_instructors ci ON i.instructor_id = ci.instructor_id
            WHERE ci.course_id = %s
            ORDER BY i.name;
        """, (course_id,))
        rows = cur.fetchall()
        cur.close()
        
        instructors = [{"id": r[0], "name": r[1], "faculty": r[2]} for r in rows]
        return jsonify({"success": True, "instructors": instructors})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@instructor_bp.route('/api/instructors', methods=['GET'])
def get_all_instructors():
    """Fetch all instructors (useful for the global autocomplete dropdown)."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT instructor_id, name, faculty_name FROM instructors ORDER BY name;")
        rows = cur.fetchall()
        cur.close()
        
        instructors = [{"id": r[0], "name": r[1], "faculty": r[2]} for r in rows]
        return jsonify({"success": True, "instructors": instructors})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@instructor_bp.route('/api/instructors', methods=['POST'])
def add_instructor():
    """Add a new instructor to the database."""
    name = (request.json.get('name') or '').strip()
    faculty_name = (request.json.get('faculty_name') or '').strip()
    
    if not name:
        return jsonify({"success": False, "message": "Instructor name is required."}), 400
        
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO instructors (name, faculty_name) 
            VALUES (%s, %s) 
            ON CONFLICT (name) DO NOTHING
            RETURNING instructor_id;
        """, (name, faculty_name))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        
        if not row:
            return jsonify({"success": False, "message": "Instructor already exists."}), 409
            
        return jsonify({"success": True, "message": "Instructor added.", "id": row[0]})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()
