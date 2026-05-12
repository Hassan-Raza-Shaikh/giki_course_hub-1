from flask import Blueprint, request, session, jsonify
from db import get_connection

admin_bp = Blueprint('admin', __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helper: require admin
# ─────────────────────────────────────────────────────────────────────────────

def _require_admin():
    """Return (user_email, None) if the session user is an admin, else (None, error_response)."""
    if 'user_id' not in session:
        return None, (jsonify({"success": False, "message": "Not logged in."}), 401)

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT email FROM users WHERE user_id = %s;", (session['user_id'],))
        row = cur.fetchone()
        cur.close()
        if not row:
            return None, (jsonify({"success": False, "message": "User not found."}), 401)
        
        email = row[0].lower().strip()
        
        # OWNER BOOTSTRAP: Always allow the primary developers
        if email in ['ammarbatman9@gmail.com', 'hassan.raza.shaikh.hrs@gmail.com']:
            return email, None

        cur2 = conn.cursor()
        cur2.execute("SELECT 1 FROM admins WHERE email = %s;", (email,))
        is_admin = cur2.fetchone() is not None
        cur2.close()
        if not is_admin:
            return None, (jsonify({"success": False, "message": "Admin access required."}), 403)
        return email, None
    finally:
        conn.close()


def _log(admin_email, action, target_id=None, target_desc=None):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO admin_logs (admin_email, action, target_id, target_desc) VALUES (%s, %s, %s, %s);",
            (admin_email, action, target_id, target_desc)
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/check — is the current session user an admin?
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/check', methods=['GET'])
def admin_check():
    if 'user_id' not in session:
        return jsonify({"is_admin": False})
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT email FROM users WHERE user_id = %s;", (session['user_id'],))
        row = cur.fetchone()
        cur.close()
        if not row:
            return jsonify({"is_admin": False})
        
        email = row[0].lower().strip()
        
        cur2 = conn.cursor()
        cur2.execute("SELECT granted_by, notes FROM admins WHERE email = %s;", (email,))
        admin_row = cur2.fetchone()
        cur2.close()
        
        is_admin = admin_row is not None or email in ['ammarbatman9@gmail.com', 'hassan.raza.shaikh.hrs@gmail.com']
        
        return jsonify({
            "is_admin": is_admin,
            "email": email,
            "granted_by": admin_row[0] if admin_row else ('System' if email in ['ammarbatman9@gmail.com', 'hassan.raza.shaikh.hrs@gmail.com'] else None),
            "notes": admin_row[1] if admin_row else ('Bootstrap Admin' if email in ['ammarbatman9@gmail.com', 'hassan.raza.shaikh.hrs@gmail.com'] else None),
        })
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/stats — site-wide statistics
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    admin_email, err = _require_admin()
    if err: return err

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM files WHERE status = 'pending';")
        pending = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM files WHERE status = 'approved';")
        approved = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM files WHERE status = 'rejected';")
        rejected = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM users;")
        users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM bookmarks;")
        bookmarks = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM admins;")
        admins = cur.fetchone()[0]
        cur.close()
        return jsonify({
            "success": True,
            "stats": {
                "pending_files": pending,
                "approved_files": approved,
                "rejected_files": rejected,
                "total_users": users,
                "total_bookmarks": bookmarks,
                "total_admins": admins,
            }
        })
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/files/pending — list all pending files
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/files/pending', methods=['GET'])
def admin_pending_files():
    admin_email, err = _require_admin()
    if err: return err

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT f.file_id, f.title, f.file_url, f.course_code,
                   f.upload_date, cat.name AS category,
                   u.email AS uploader_email, u.username AS uploader
            FROM files f
            JOIN categories cat ON cat.category_id = f.category_id
            LEFT JOIN users u   ON u.user_id = f.uploaded_by
            WHERE f.status = 'pending'
            ORDER BY f.upload_date ASC;
        """)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        cur.close()
        return jsonify({"success": True, "files": [dict(zip(cols, r)) for r in rows]})
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/files/all — list all files (any status) with pagination
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/files/all', methods=['GET'])
def admin_all_files():
    admin_email, err = _require_admin()
    if err: return err

    status_filter = request.args.get('status', '')  # '' = all
    page          = request.args.get('page', 1, type=int)
    per_page      = 30
    offset        = (page - 1) * per_page

    conn = get_connection()
    try:
        cur = conn.cursor()
        where = "WHERE f.status = %s" if status_filter else ""
        params = [status_filter] if status_filter else []

        cur.execute(f"""
            SELECT f.file_id, f.title, f.file_url, f.course_code, f.status,
                   f.upload_date, f.reviewed_at, f.reviewed_by,
                   cat.name AS category,
                   u.email AS uploader_email, u.username AS uploader,
                   m.file_size, fn.note_text AS admin_note
            FROM files f
            JOIN categories cat ON cat.category_id = f.category_id
            LEFT JOIN users u   ON u.user_id = f.uploaded_by
            LEFT JOIN file_metadata m ON m.file_id = f.file_id
            LEFT JOIN file_notes fn ON fn.file_id = f.file_id
            {where}
            ORDER BY f.upload_date DESC
            LIMIT %s OFFSET %s;
        """, params + [per_page, offset])
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]

        cur.execute(f"SELECT COUNT(*) FROM files f {where};", params)
        total = cur.fetchone()[0]
        cur.close()
        return jsonify({
            "success": True,
            "files": [dict(zip(cols, r)) for r in rows],
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page,
        })
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/admin/files/<id>/approve
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/files/<int:file_id>/approve', methods=['POST'])
def admin_approve_file(file_id):
    admin_email, err = _require_admin()
    if err: return err

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE files SET status='approved', reviewed_by=%s, reviewed_at=NOW() WHERE file_id=%s RETURNING title, course_code, uploaded_by;",
            (admin_email, file_id)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "File not found."}), 404
        
        file_title, course_code, uploader_id = row
        
        # Send email to the submitter
        if uploader_id:
            try:
                cur.execute("SELECT email, username FROM users WHERE user_id = %s;", (uploader_id,))
                user_row = cur.fetchone()
                if user_row:
                    uploader_email, uploader_name = user_row
                    from email_service import send_email
                    subject = "Your Material was Approved! - GIKI Course Hub"
                    body = f"""
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #059669;">Material Approved! 🎉</h2>
                        <p>Hi {uploader_name},</p>
                        <p>Great news! Your recent material submission has been reviewed and approved by an admin. It is now live and visible to all students on the GIKI Course Hub.</p>
                        <ul style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <li><strong>Title:</strong> {file_title}</li>
                            <li><strong>Course:</strong> {course_code}</li>
                        </ul>
                        <p>Thank you for contributing to the community!</p>
                    </div>
                    """
                    send_email(uploader_email, subject, body)
            except Exception as e:
                print(f"Failed to send approval email: {e}")

        conn.commit()
        cur.close()
        _log(admin_email, 'approve_file', file_id, file_title)
        return jsonify({"success": True, "message": f"'{file_title}' approved."})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/admin/files/<id>/reject
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/files/<int:file_id>/reject', methods=['POST'])
def admin_reject_file(file_id):
    admin_email, err = _require_admin()
    if err: return err

    reason = (request.get_json() or {}).get('reason', 'No reason provided.')
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE files SET status='rejected', rejection_reason=%s, reviewed_by=%s, reviewed_at=NOW() WHERE file_id=%s RETURNING title, course_code, uploaded_by;",
            (reason, admin_email, file_id)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "File not found."}), 404
            
        file_title, course_code, uploader_id = row
        
        # Send email to the submitter
        if uploader_id:
            try:
                cur.execute("SELECT email, username FROM users WHERE user_id = %s;", (uploader_id,))
                user_row = cur.fetchone()
                if user_row:
                    uploader_email, uploader_name = user_row
                    from email_service import send_email
                    subject = "Update on Your Material Submission - GIKI Course Hub"
                    body = f"""
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #DC2626;">Material Update</h2>
                        <p>Hi {uploader_name},</p>
                        <p>Your recent material submission has been reviewed by an admin and was unfortunately <strong>rejected</strong>.</p>
                        <ul style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <li><strong>Title:</strong> {file_title}</li>
                            <li><strong>Course:</strong> {course_code}</li>
                        </ul>
                        <div style="background: #FEF2F2; color: #991B1B; padding: 16px; border-left: 4px solid #DC2626; margin-top: 20px;">
                            <strong>Reason from Admin:</strong><br/>
                            {reason}
                        </div>
                        <p>If you have any questions or wish to correct the material, feel free to upload a revised version.</p>
                    </div>
                    """
                    send_email(uploader_email, subject, body)
            except Exception as e:
                print(f"Failed to send rejection email: {e}")

        conn.commit()
        cur.close()
        _log(admin_email, 'reject_file', file_id, file_title)
        return jsonify({"success": True, "message": f"'{file_title}' rejected."})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# PUT /api/admin/files/<id> — Update file metadata (Admin only)
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/files/<int:file_id>', methods=['PUT'])
def admin_update_file(file_id):
    admin_email, err = _require_admin()
    if err: return err

    d = request.get_json() or {}
    new_title         = d.get('title', '').strip()
    new_category_id   = d.get('category_id')
    new_instructor_id = d.get('instructor_id')

    if not new_title:
        return jsonify({"success": False, "message": "Title cannot be empty."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Verify file exists
        cur.execute("SELECT title, uploaded_by FROM files WHERE file_id = %s;", (file_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "File not found."}), 404
        
        old_title = row[0]

        # Update the file (uploaded_by remains UNCHANGED)
        cur.execute("""
            UPDATE files 
            SET title = %s, category_id = %s, instructor_id = %s 
            WHERE file_id = %s;
        """, (new_title, new_category_id, new_instructor_id, file_id))

        conn.commit()
        cur.close()

        _log(admin_email, 'update_file', file_id, f"Changed title from '{old_title}' to '{new_title}'")
        return jsonify({"success": True, "message": "File details updated successfully."})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/admin/files/<id>
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/files/<int:file_id>', methods=['DELETE'])
def admin_delete_file(file_id):
    admin_email, err = _require_admin()
    if err: return err

    import os
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT title, storage_path FROM files WHERE file_id = %s;", (file_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "File not found."}), 404
        title, storage_path = row

        # Delete DB rows (bookmarks + metadata cascade via FK)
        cur.execute("DELETE FROM bookmarks    WHERE file_id = %s;", (file_id,))
        cur.execute("DELETE FROM file_metadata WHERE file_id = %s;", (file_id,))
        cur.execute("DELETE FROM files         WHERE file_id = %s;", (file_id,))
        conn.commit()
        cur.close()

        # Remove physical file or R2 object
        if storage_path:
            # Check if it's a local file path
            if os.path.exists(storage_path):
                try:
                    os.remove(storage_path)
                except Exception as e:
                    print(f"Error deleting local file: {e}")
            else:
                # Attempt to delete from R2 (storage_path is the unique_filename object key)
                try:
                    from routes.file_routes import get_s3_client
                    from config import R2_BUCKET
                    s3_client = get_s3_client()
                    if s3_client:
                        s3_client.delete_object(Bucket=R2_BUCKET, Key=storage_path)
                except Exception as e:
                    print(f"Error deleting from R2: {e}")

        _log(admin_email, 'delete_file', file_id, title)
        return jsonify({"success": True, "message": f"'{title}' deleted."})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/users — list all users
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/users', methods=['GET'])
def admin_list_users():
    admin_email, err = _require_admin()
    if err: return err

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT u.user_id, u.username, u.email, u.role, u.created_at,
                   EXISTS(SELECT 1 FROM admins a WHERE a.email = u.email) AS is_admin
            FROM users u
            ORDER BY u.created_at DESC;
        """)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        cur.close()
        return jsonify({"success": True, "users": [dict(zip(cols, r)) for r in rows]})
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/admins — list all admins
# POST /api/admin/admins — grant admin (body: {email, notes})
# DELETE /api/admin/admins/<email> — revoke admin
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/admins', methods=['GET'])
def admin_list_admins():
    admin_email, err = _require_admin()
    if err: return err

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT email, granted_by, granted_at, notes FROM admins ORDER BY granted_at;")
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        cur.close()
        return jsonify({"success": True, "admins": [dict(zip(cols, r)) for r in rows]})
    finally:
        conn.close()


@admin_bp.route('/api/admin/admins', methods=['POST'])
def admin_grant():
    admin_email, err = _require_admin()
    if err: return err

    data  = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    notes = data.get('notes', '')
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO admins (email, granted_by, notes) VALUES (%s, %s, %s) ON CONFLICT (email) DO NOTHING;",
            (email, admin_email, notes)
        )
        conn.commit()
        cur.close()
        _log(admin_email, 'grant_admin', target_desc=email)
        return jsonify({"success": True, "message": f"Admin access granted to {email}."})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/admin/admins/<path:target_email>', methods=['DELETE'])
def admin_revoke(target_email):
    admin_email, err = _require_admin()
    if err: return err

    if target_email == admin_email:
        return jsonify({"success": False, "message": "You cannot revoke your own admin access."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM admins WHERE email = %s;", (target_email,))
        conn.commit()
        cur.close()
        _log(admin_email, 'revoke_admin', target_desc=target_email)
        return jsonify({"success": True, "message": f"Admin access revoked from {target_email}."})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/logs — recent admin activity log
# ─────────────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/logs', methods=['GET'])
def admin_activity_logs():
    admin_email, err = _require_admin()
    if err: return err

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT log_id, admin_email, action, target_id, target_desc, performed_at
            FROM admin_logs
            ORDER BY performed_at DESC
            LIMIT 100;
        """)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        cur.close()
        return jsonify({"success": True, "logs": [dict(zip(cols, r)) for r in rows]})
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Reports
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route('/api/admin/reports', methods=['GET'])
def admin_list_reports():
    admin_email, err = _require_admin()
    if err: return err
    status_filter = request.args.get('status', 'pending')
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT r.report_id, r.reason, r.status, r.created_at, r.admin_notes,
                   f.file_id, f.title AS file_title, f.course_code, f.file_url,
                   u.email AS reporter_email, u.username AS reporter
            FROM reports r
            JOIN files f ON f.file_id = r.file_id
            JOIN users u ON u.user_id = r.reporter_id
            WHERE r.status = %s ORDER BY r.created_at ASC;
        """, (status_filter,))
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        cur.execute("SELECT status, COUNT(*) FROM reports GROUP BY status;")
        counts = {row[0]: row[1] for row in cur.fetchall()}
        cur.close()
        return jsonify({"success": True, "reports": [dict(zip(cols, r)) for r in rows], "counts": counts})
    finally:
        conn.close()


@admin_bp.route('/api/admin/reports/<int:report_id>/resolve', methods=['POST'])
def admin_resolve_report(report_id):
    admin_email, err = _require_admin()
    if err: return err
    notes = (request.get_json() or {}).get('notes', '')
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE reports SET status='resolved', resolved_by=%s, resolved_at=NOW(), admin_notes=%s WHERE report_id=%s RETURNING file_id;",
            (admin_email, notes, report_id))
        if not cur.fetchone():
            return jsonify({"success": False, "message": "Report not found."}), 404
        conn.commit(); cur.close()
        _log(admin_email, 'resolve_report', report_id)
        return jsonify({"success": True, "message": "Report resolved."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/admin/reports/<int:report_id>/dismiss', methods=['POST'])
def admin_dismiss_report(report_id):
    admin_email, err = _require_admin()
    if err: return err
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE reports SET status='dismissed', resolved_by=%s, resolved_at=NOW() WHERE report_id=%s;",
                    (admin_email, report_id))
        conn.commit(); cur.close()
        _log(admin_email, 'dismiss_report', report_id)
        return jsonify({"success": True, "message": "Report dismissed."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Bulk approve / reject
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route('/api/admin/files/bulk-approve', methods=['POST'])
def admin_bulk_approve():
    admin_email, err = _require_admin()
    if err: return err
    file_ids = (request.get_json() or {}).get('file_ids', [])
    if not file_ids:
        return jsonify({"success": False, "message": "No file IDs provided."}), 400
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE files SET status='approved', reviewed_by=%s, reviewed_at=NOW() WHERE file_id = ANY(%s) RETURNING file_id, title;",
            (admin_email, file_ids))
        updated = cur.fetchall()
        conn.commit(); cur.close()
        for fid, title in updated:
            _log(admin_email, 'approve_file', fid, title)
        return jsonify({"success": True, "approved": len(updated), "message": f"{len(updated)} file(s) approved."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/admin/files/bulk-reject', methods=['POST'])
def admin_bulk_reject():
    admin_email, err = _require_admin()
    if err: return err
    data = request.get_json() or {}
    file_ids = data.get('file_ids', [])
    reason   = data.get('reason', 'Bulk rejection.')
    if not file_ids:
        return jsonify({"success": False, "message": "No file IDs provided."}), 400
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE files SET status='rejected', rejection_reason=%s, reviewed_by=%s, reviewed_at=NOW() WHERE file_id = ANY(%s) RETURNING file_id, title;",
            (reason, admin_email, file_ids))
        updated = cur.fetchall()
        conn.commit(); cur.close()
        for fid, title in updated:
            _log(admin_email, 'reject_file', fid, title)
        return jsonify({"success": True, "rejected": len(updated), "message": f"{len(updated)} file(s) rejected."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Course management
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route('/api/admin/faculties-programs', methods=['GET'])
def admin_faculties_programs():
    admin_email, err = _require_admin()
    if err: return err
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT faculty_id, name, icon FROM faculties ORDER BY name;")
        faculties = [{"id": r[0], "name": r[1], "icon": r[2]} for r in cur.fetchall()]
        cur.execute("SELECT program_id, name, faculty_id FROM programs ORDER BY name;")
        cur.execute("SELECT category_id, name FROM categories ORDER BY name;")
        categories = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
        cur.close()
        return jsonify({"success": True, "faculties": faculties, "programs": programs, "categories": categories})
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Course Management
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route('/api/admin/courses/by-code/<code>', methods=['GET'])
def admin_get_course_by_code(code):
    admin_email, err = _require_admin()
    if err: return err
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        # Find the most recent/common definition of this course code
        cur.execute("""
            SELECT name, description, icon, is_lab 
            FROM courses 
            WHERE code = %s 
            ORDER BY course_id DESC LIMIT 1;
        """, (code.strip().upper(),))
        row = cur.fetchone()
        cur.close()
        
        if row:
            return jsonify({
                "success": True, 
                "course": {
                    "name": row[0],
                    "description": row[1],
                    "icon": row[2],
                    "is_lab": row[3]
                }
            })
        return jsonify({"success": False, "message": "Course not found."}), 404
    finally:
        conn.close()

@admin_bp.route('/api/admin/courses', methods=['GET'])
def admin_list_courses():
    admin_email, err = _require_admin()
    if err: return err
    q = request.args.get('q', '').strip()
    page = request.args.get('page', 1, type=int)
    per = 40; offset = (page - 1) * per
    conn = get_connection()
    try:
        cur = conn.cursor()
        where  = "WHERE (c.name ILIKE %s OR c.code ILIKE %s)" if q else ""
        params = [f'%{q}%', f'%{q}%'] if q else []
        cur.execute(f"""
            SELECT c.course_id, c.name, c.code, c.description, c.year, c.semester,
                   c.is_lab, c.icon, f.name AS faculty_name, p.name AS program_name,
                   c.faculty_id, c.program_id
            FROM courses c
            LEFT JOIN faculties f ON f.faculty_id = c.faculty_id
            LEFT JOIN programs  p ON p.program_id  = c.program_id
            {where} ORDER BY c.name LIMIT %s OFFSET %s;
        """, params + [per, offset])
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        cur.execute(f"SELECT COUNT(*) FROM courses c {where};", params)
        total = cur.fetchone()[0]
        cur.close()
        return jsonify({"success": True, "courses": [dict(zip(cols, r)) for r in rows],
                        "total": total, "page": page, "pages": (total + per - 1) // per})
    finally:
        conn.close()


@admin_bp.route('/api/admin/courses', methods=['POST'])
def admin_create_course():
    admin_email, err = _require_admin()
    if err: return err
    d = request.get_json() or {}
    name = d.get('name', '').strip(); code = d.get('code', '').strip()
    if not name or not code:
        return jsonify({"success": False, "message": "Name and code are required."}), 400
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Enforce "one code = one name" rule
        cur.execute("SELECT name FROM courses WHERE code = %s LIMIT 1;", (code,))
        existing = cur.fetchone()
        if existing and existing[0].lower() != name.lower():
            return jsonify({
                "success": False, 
                "message": f"Course code '{code}' is already assigned to '{existing[0]}'. To keep resources synced, please use the exact same name."
            }), 400

        cur.execute(
            "INSERT INTO courses (name, code, description, year, semester, is_lab, icon, faculty_id, program_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING course_id;",
            (name, code, d.get('description') or None, d.get('year') or None, d.get('semester') or None,
             bool(d.get('is_lab', False)), d.get('icon', '📘') or '📘',
             d.get('faculty_id') or None, d.get('program_id') or None))
        new_id = cur.fetchone()[0]
        conn.commit(); cur.close()
        _log(admin_email, 'create_course', new_id, name)
        return jsonify({"success": True, "course_id": new_id, "message": f"Course '{name}' created."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/admin/courses/<int:course_id>', methods=['PUT'])
def admin_update_course(course_id):
    admin_email, err = _require_admin()
    if err: return err
    d = request.get_json() or {}
    conn = get_connection()
    try:
        cur = conn.cursor()
        name = d.get('name', '').strip()
        code = d.get('code', '').strip()
        
        # 1. Update the specific course record
        cur.execute("""
            UPDATE courses 
            SET name=%s, code=%s, description=%s, year=%s, semester=%s, is_lab=%s, icon=%s, faculty_id=%s, program_id=%s
            WHERE course_id=%s RETURNING name;
        """, (name, code, d.get('description'), d.get('year'), d.get('semester'), 
              bool(d.get('is_lab')), d.get('icon'), d.get('faculty_id'), d.get('program_id'), course_id))
        
        row = cur.fetchone()
        if not row: return jsonify({"success": False, "message": "Course not found."}), 404
        
        # 2. Sync Shared Details (Name, Icon, Description, Is_Lab) to all other programs using this code
        # This fulfills the "one code = one name" requirement
        cur.execute("""
            UPDATE courses 
            SET name=%s, description=%s, icon=%s, is_lab=%s
            WHERE code=%s AND course_id != %s;
        """, (name, d.get('description'), d.get('icon'), bool(d.get('is_lab')), code, course_id))

        conn.commit(); cur.close()
        _log(admin_email, 'update_course', course_id, row[0])
        return jsonify({"success": True, "message": f"Course '{row[0]}' updated and synced across programs."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/admin/courses/<int:course_id>', methods=['DELETE'])
def admin_delete_course(course_id):
    admin_email, err = _require_admin()
    if err: return err
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT name FROM courses WHERE course_id = %s;", (course_id,))
        row = cur.fetchone()
        if not row: return jsonify({"success": False, "message": "Course not found."}), 404
        name = row[0]
        cur.execute("DELETE FROM courses WHERE course_id = %s;", (course_id,))
        conn.commit(); cur.close()
        _log(admin_email, 'delete_course', course_id, name)
        return jsonify({"success": True, "message": f"Course '{name}' deleted."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Upload statistics
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route('/api/admin/stats/detailed', methods=['GET'])
def admin_detailed_stats():
    admin_email, err = _require_admin()
    if err: return err
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT f.file_id, f.title, f.course_code, COUNT(b.bookmark_id) AS cnt
            FROM files f JOIN bookmarks b ON b.file_id = f.file_id
            WHERE f.status = 'approved'
            GROUP BY f.file_id, f.title, f.course_code ORDER BY cnt DESC LIMIT 10;
        """)
        most_bookmarked = [{"file_id": r[0], "title": r[1], "course_code": r[2], "count": r[3]} for r in cur.fetchall()]

        cur.execute("""
            SELECT f.file_id, f.title, f.course_code, COUNT(d.download_id) AS cnt
            FROM files f JOIN file_downloads d ON d.file_id = f.file_id
            GROUP BY f.file_id, f.title, f.course_code ORDER BY cnt DESC LIMIT 10;
        """)
        most_downloaded = [{"file_id": r[0], "title": r[1], "course_code": r[2], "count": r[3]} for r in cur.fetchall()]

        cur.execute("""
            SELECT f.course_code, COUNT(*) AS cnt FROM files f
            WHERE f.status = 'approved' GROUP BY f.course_code ORDER BY cnt DESC LIMIT 10;
        """)
        per_course = [{"course_code": r[0], "count": r[1]} for r in cur.fetchall()]

        cur.execute("""
            SELECT cat.name, COUNT(*) AS cnt FROM files f
            JOIN categories cat ON cat.category_id = f.category_id
            WHERE f.status = 'approved' GROUP BY cat.name ORDER BY cnt DESC;
        """)
        per_category = [{"category": r[0], "count": r[1]} for r in cur.fetchall()]

        cur.execute("""
            SELECT DATE(upload_date) AS day, COUNT(*) AS cnt FROM files
            WHERE upload_date >= NOW() - INTERVAL '30 days'
            GROUP BY day ORDER BY day;
        """)
        uploads_by_day = [{"day": str(r[0]), "count": r[1]} for r in cur.fetchall()]

        cur.close()
        return jsonify({"success": True, "most_bookmarked": most_bookmarked,
                        "most_downloaded": most_downloaded, "per_course": per_course,
                        "per_category": per_category, "uploads_by_day": uploads_by_day})
    finally:
        conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# Platform Issues
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route('/api/admin/issues', methods=['GET'])
def admin_list_issues():
    admin_email, err = _require_admin()
    if err: return err
    status_filter = request.args.get('status', 'open')
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT i.issue_id, i.type, i.title, i.description, i.status, i.created_at, i.admin_notes,
                   u.email AS reporter_email, u.username AS reporter
            FROM issues i
            LEFT JOIN users u ON u.user_id = i.user_id
            WHERE i.status = %s ORDER BY i.created_at DESC;
        """, (status_filter,))
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        cur.execute("SELECT status, COUNT(*) FROM issues GROUP BY status;")
        counts = {row[0]: row[1] for row in cur.fetchall()}
        cur.close()
        return jsonify({"success": True, "issues": [dict(zip(cols, r)) for r in rows], "counts": counts})
    finally:
        conn.close()


@admin_bp.route('/api/admin/issues/<int:issue_id>/resolve', methods=['POST'])
def admin_resolve_issue(issue_id):
    admin_email, err = _require_admin()
    if err: return err
    notes = (request.get_json() or {}).get('notes', '')
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE issues SET status='resolved', resolved_by=%s, updated_at=NOW(), admin_notes=%s WHERE issue_id=%s;",
            (admin_email, notes, issue_id)
        )
        conn.commit(); cur.close()
        _log(admin_email, 'resolve_issue', issue_id)
        return jsonify({"success": True, "message": "Issue marked as resolved."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/admin/issues/<int:issue_id>', methods=['DELETE'])
def admin_delete_issue(issue_id):
    admin_email, err = _require_admin()
    if err: return err
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM issues WHERE issue_id = %s;", (issue_id,))
        conn.commit(); cur.close()
        _log(admin_email, 'delete_issue', issue_id)
        return jsonify({"success": True, "message": "Issue deleted."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# File Notes (admin → visible to all users)
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route('/api/admin/files/<int:file_id>/note', methods=['POST'])
def admin_set_note(file_id):
    admin_email, err = _require_admin()
    if err: return err
    note_text = (request.get_json() or {}).get('note', '').strip()
    if not note_text:
        return jsonify({"success": False, "message": "Note text is required."}), 400
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO file_notes (file_id, admin_email, note_text)
            VALUES (%s, %s, %s)
            ON CONFLICT (file_id) DO UPDATE
              SET note_text = EXCLUDED.note_text,
                  admin_email = EXCLUDED.admin_email,
                  updated_at = NOW()
            RETURNING note_id;
        """, (file_id, admin_email, note_text))
        conn.commit(); cur.close()
        _log(admin_email, 'set_note', file_id)
        return jsonify({"success": True, "message": "Note saved."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@admin_bp.route('/api/admin/files/<int:file_id>/note', methods=['DELETE'])
def admin_delete_note(file_id):
    admin_email, err = _require_admin()
    if err: return err
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM file_notes WHERE file_id = %s;", (file_id,))
        conn.commit(); cur.close()
        _log(admin_email, 'remove_note', file_id)
        return jsonify({"success": True, "message": "Note removed."})
    except Exception as e:
        conn.rollback(); return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()
