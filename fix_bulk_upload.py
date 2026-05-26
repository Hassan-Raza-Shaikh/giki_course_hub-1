import sys

def replace_all(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Chunk 1
    content = content.replace("""_bulk_batches = {}        # batch_id -> { user_id, course_id, files: [...], created_at, ... }
_batches_lock = threading.Lock()


def _cleanup_expired_batches():
    \"\"\"Remove batches older than BULK_BATCH_TTL.\"\"\"
    now = time.time()
    with _batches_lock:
        expired = [bid for bid, b in _bulk_batches.items() if now - b['created_at'] > BULK_BATCH_TTL]
        for bid in expired:
            del _bulk_batches[bid]


def _get_batch(batch_id, user_id):
    \"\"\"Retrieve a batch if it exists and belongs to the user. Returns (batch, error_response).\"\"\"
    _cleanup_expired_batches()
    with _batches_lock:
        batch = _bulk_batches.get(batch_id)
    if not batch:
        return None, (jsonify({"success": False, "message": "Batch not found or expired."}), 404)
    if batch['user_id'] != user_id:
        return None, (jsonify({"success": False, "message": "Unauthorized."}), 403)
    return batch, None""", "")

    # Chunk 2
    content = content.replace("""    # Create batch
    batch_id = f"bulk_{uuid.uuid4().hex[:12]}"
    batch = {
        "batch_id": batch_id,
        "user_id": uploader,
        "course_id": course_id,
        "course_code": course_code,
        "accepted": accepted,
        "uploaded": [],           # Tracks successfully uploaded files
        "created_at": time.time(),
    }

    with _batches_lock:
        _bulk_batches[batch_id] = batch""", """    # Generate unique batch ID
    batch_id = f"bulk_{uuid.uuid4().hex[:12]}\"""")

    # Chunk 3
    content = content.replace("""    batch, err = _get_batch(batch_id, uploader)
    if err:
        return err

    if batch['course_id'] != course_id:
        return jsonify({"success": False, "message": "Course ID mismatch."}), 400

    file = request.files.get('file')
    file_index = request.form.get('file_index', type=int)
    title = request.form.get('title', '').strip()
    category_id = request.form.get('category_id', type=int)
    instructor_id = request.form.get('instructor_id', type=int)

    if not file or file.filename == '':
        return jsonify({"success": False, "message": "No file provided."}), 400

    if file_index is None:
        return jsonify({"success": False, "message": "file_index is required."}), 400

    # Validate the file_index is in the accepted list
    accepted_indices = [a['index'] for a in batch['accepted']]
    if file_index not in accepted_indices:
        return jsonify({"success": False, "message": f"File index {file_index} was not accepted in this batch."}), 400

    # Check if this index was already uploaded
    uploaded_indices = [u['file_index'] for u in batch['uploaded']]
    if file_index in uploaded_indices:
        return jsonify({"success": False, "message": f"File index {file_index} was already uploaded."}), 409""", """    file = request.files.get('file')
    file_index = request.form.get('file_index', type=int)
    title = request.form.get('title', '').strip()
    category_id = request.form.get('category_id', type=int)
    instructor_id = request.form.get('instructor_id', type=int)

    if not file or file.filename == '':
        return jsonify({"success": False, "message": "No file provided."}), 400

    if file_index is None:
        return jsonify({"success": False, "message": "file_index is required."}), 400""")

    # Chunk 4
    content = content.replace("""        course_code = batch['course_code']""", """        cur.execute("SELECT code, name FROM courses WHERE course_id = %s;", (course_id,))
        course_row = cur.fetchone()
        if not course_row:
            cur.close()
            return jsonify({"success": False, "message": "Course not found."}), 404
        course_code = course_row[0] or course_row[1]""")

    # Chunk 5
    content = content.replace("""        # Use provided title, or fall back to the one from the manifest
        if not title:
            for a in batch['accepted']:
                if a['index'] == file_index:
                    title = a.get('title', file.filename)
                    break""", """        # Use provided title, or fall back to filename
        if not title:
            title = file.filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').strip()""")

    # Chunk 6
    content = content.replace("""        # Track in batch
        with _batches_lock:
            batch['uploaded'].append({
                "file_index": file_index,
                "file_id": new_file_id,
                "title": title,
                "status": initial_status,
            })""", """        # Stateless bulk upload: no memory tracking needed""")

    # Chunk 7
    content = content.replace("""    batch, err = _get_batch(batch_id, uploader)
    if err:
        return err

    uploaded = batch.get('uploaded', [])
    accepted = batch.get('accepted', [])
    course_code = batch.get('course_code', '?')

    # Count statuses
    pending_files = [u for u in uploaded if u['status'] == 'pending']
    approved_files = [u for u in uploaded if u['status'] == 'approved']""", """    conn = get_connection()
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
    approved_files = [u for u in uploaded if u['status'] == 'approved']""")

    # Chunk 8
    content = content.replace("""    # Clean up batch from memory
    with _batches_lock:
        _bulk_batches.pop(batch_id, None)

    return jsonify({
        "success": True,
        "summary": {
            "total_accepted": len(accepted),
            "total_uploaded": len(uploaded),
            "total_skipped": len(accepted) - len(uploaded),
            "pending": len(pending_files),
            "approved": len(approved_files),
        },""", """    return jsonify({
        "success": True,
        "summary": {
            "total_uploaded": len(uploaded),
            "pending": len(pending_files),
            "approved": len(approved_files),
        },""")

    with open(file_path, 'w') as f:
        f.write(content)
        
    print("Replacements executed.")

replace_all('routes/file_routes.py')
