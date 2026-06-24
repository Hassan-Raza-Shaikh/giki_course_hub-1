# ==========================================
# GPA Routes — CRUD for semester GPA records
# ==========================================

from flask import Blueprint, request, session, jsonify
from db import get_connection
import json

gpa_bp = Blueprint('gpa', __name__)


def _require_login():
    """Return user_id if logged in, else (None, error_response)."""
    uid = session.get('user_id')
    if not uid:
        return None, (jsonify({"success": False, "message": "Login required"}), 401)
    return uid, None


@gpa_bp.route('/api/gpa/save', methods=['POST'])
def save_gpa():
    """Save or update a semester GPA record."""
    uid, err = _require_login()
    if err:
        return err

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400

    faculty   = (data.get('faculty') or '').strip()
    program   = (data.get('program') or '').strip()
    semester  = data.get('semester')
    gpa       = data.get('gpa')
    total_credits = data.get('total_credits')
    courses   = data.get('courses')

    # Validate required fields
    if not faculty or not program or semester is None or gpa is None or total_credits is None or courses is None:
        return jsonify({"success": False, "message": "Missing required fields: faculty, program, semester, gpa, total_credits, courses"}), 400

    try:
        semester = int(semester)
        gpa = round(float(gpa), 2)
        total_credits = int(total_credits)
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Invalid data types for semester, gpa, or total_credits"}), 400

    if gpa < 0 or gpa > 4:
        return jsonify({"success": False, "message": "GPA must be between 0.00 and 4.00"}), 400

    if total_credits < 1:
        return jsonify({"success": False, "message": "Total credits must be at least 1"}), 400

    courses_json = json.dumps(courses)

    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO semester_gpas (user_id, faculty, program, semester, gpa, total_credits, courses_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                ON CONFLICT (user_id, faculty, program, semester)
                DO UPDATE SET
                    gpa = EXCLUDED.gpa,
                    total_credits = EXCLUDED.total_credits,
                    courses_json = EXCLUDED.courses_json,
                    updated_at = NOW()
                RETURNING gpa_id;
            """, (uid, faculty, program, semester, gpa, total_credits, courses_json))
            row = cur.fetchone()
            conn.commit()
            return jsonify({
                "success": True,
                "message": "GPA saved successfully",
                "gpa_id": row[0] if row else None
            })
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500


@gpa_bp.route('/api/gpa/records', methods=['GET'])
def get_my_gpa_records():
    """Get all GPA records for the logged-in user, plus computed CGPA."""
    uid, err = _require_login()
    if err:
        return err

    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT gpa_id, faculty, program, semester, gpa, total_credits, courses_json, created_at, updated_at
                FROM semester_gpas
                WHERE user_id = %s
                ORDER BY faculty, program, semester;
            """, (uid,))
            rows = cur.fetchall()

            records = []
            total_weighted = 0.0
            total_credits_all = 0

            for r in rows:
                gpa_val = float(r[4])
                credits_val = int(r[5])
                total_weighted += gpa_val * credits_val
                total_credits_all += credits_val

                # r[6] (courses_json) could be a string if psycopg2 doesn't auto-parse jsonb
                courses_val = r[6]
                if isinstance(courses_val, str):
                    try:
                        courses_val = json.loads(courses_val)
                    except:
                        courses_val = []

                records.append({
                    "gpa_id": r[0],
                    "faculty": r[1],
                    "program": r[2],
                    "semester": r[3],
                    "gpa": gpa_val,
                    "total_credits": credits_val,
                    "courses": courses_val,
                    "created_at": r[7].isoformat() if r[7] else None,
                    "updated_at": r[8].isoformat() if r[8] else None,
                })

            cgpa = round(total_weighted / total_credits_all, 2) if total_credits_all > 0 else None

            return jsonify({
                "success": True,
                "records": records,
                "cgpa": cgpa,
                "total_credits": total_credits_all,
                "total_semesters": len(records),
            })
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500


@gpa_bp.route('/api/gpa/records/<int:gpa_id>', methods=['DELETE'])
def delete_gpa_record(gpa_id):
    """Delete a specific GPA record (only if owned by the logged-in user)."""
    uid, err = _require_login()
    if err:
        return err

    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM semester_gpas WHERE gpa_id = %s AND user_id = %s RETURNING gpa_id;", (gpa_id, uid))
            deleted = cur.fetchone()
            conn.commit()

            if not deleted:
                return jsonify({"success": False, "message": "Record not found or not owned by you"}), 404

            return jsonify({"success": True, "message": "GPA record deleted"})
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500


@gpa_bp.route('/api/gpa/user/<username>', methods=['GET'])
def get_user_gpa(username):
    """Get GPA records for a user's public profile."""
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            # First resolve username to user_id and get gpa_public
            cur.execute("""
                SELECT u.user_id, COALESCE(up.gpa_public, false)
                FROM users u
                LEFT JOIN user_profiles up ON u.user_id = up.user_id
                WHERE LOWER(u.username) = LOWER(%s);
            """, (username,))
            user_row = cur.fetchone()
            if not user_row:
                return jsonify({"success": False, "message": "User not found"}), 404

            target_uid = user_row[0]
            gpa_public = user_row[1]

            from flask import session
            session_uid = session.get('user_id')

            if not gpa_public and target_uid != session_uid:
                return jsonify({
                    "success": True,
                    "records": [],
                    "cgpa": None,
                    "total_credits": 0,
                    "total_semesters": 0,
                    "is_private": True
                })

            cur.execute("""
                SELECT gpa_id, faculty, program, semester, gpa, total_credits, created_at, updated_at
                FROM semester_gpas
                WHERE user_id = %s
                ORDER BY faculty, program, semester;
            """, (target_uid,))
            rows = cur.fetchall()

            records = []
            total_weighted = 0.0
            total_credits_all = 0

            for r in rows:
                gpa_val = float(r[4])
                credits_val = int(r[5])
                total_weighted += gpa_val * credits_val
                total_credits_all += credits_val

                records.append({
                    "gpa_id": r[0],
                    "faculty": r[1],
                    "program": r[2],
                    "semester": r[3],
                    "gpa": gpa_val,
                    "total_credits": credits_val,
                    "created_at": r[6].isoformat() if r[6] else None,
                    "updated_at": r[7].isoformat() if r[7] else None,
                })

            cgpa = round(total_weighted / total_credits_all, 2) if total_credits_all > 0 else None

            return jsonify({
                "success": True,
                "records": records,
                "cgpa": cgpa,
                "total_credits": total_credits_all,
                "total_semesters": len(records),
            })
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500
