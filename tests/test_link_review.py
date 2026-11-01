import hashlib
import io


def _pdf(course):
    # One distinct file per test course, so re-uploads match only that test's file
    return b'%PDF-1.4 notes ' + course['code'].encode()


def _second_course(db, course):
    db.execute("SELECT faculty_id FROM courses WHERE course_id = %s;", (course['id'],))
    fac = db.fetchone()[0]
    code = course['code'] + 'B'
    db.execute("INSERT INTO courses (name, code, faculty_id) VALUES (%s, %s, %s) RETURNING course_id;",
               (f"Course {code}", code, fac))
    return db.fetchone()[0]


def _existing_file(db, make_file, make_user, course):
    fid = make_file(course, make_user())
    db.execute("UPDATE files SET content_hash = %s WHERE file_id = %s;", (hashlib.sha256(_pdf(course)).hexdigest(), fid))
    return fid


def _reupload(client, course, course_id, title="My copy"):
    return client.post(f'/api/courses/{course_id}/upload', content_type='multipart/form-data', data={
        'title': title, 'category_id': str(course['category_id']), 'file': (io.BytesIO(_pdf(course)), 'notes.pdf'),
    })


def _course_file_ids(client, course_id):
    body = client.get(f'/api/courses/{course_id}?instructors=0').get_json()
    return {f['file_id'] for files in body['files_by_category'].values() for f in files}


def test_reupload_by_student_waits_for_review_then_shows(client, db, login, make_user, make_file, course):
    fid = _existing_file(db, make_file, make_user, course)
    other = _second_course(db, course)
    student = make_user()

    login(student)
    r = _reupload(client, course, other).get_json()
    assert r['deduplicated'] and r['status'] == 'pending'
    assert fid not in _course_file_ids(client, other)
    assert client.get(f'/api/files/{fid}/links').get_json()['links'] == []

    login(make_user(admin=True))
    links = client.get('/api/admin/links/pending').get_json()['links']
    link = next(l for l in links if l['file_id'] == fid)
    assert link['title'] == 'My copy'
    assert client.get('/api/admin/stats').get_json()['stats']['pending_links'] >= 1
    assert client.post(f"/api/admin/links/{link['link_id']}/approve").status_code == 200
    assert client.post(f"/api/admin/links/{link['link_id']}/approve").status_code == 404
    assert fid in _course_file_ids(client, other)
    db.execute("SELECT COUNT(*) FROM notifications WHERE user_id = %s AND type = 'upload_approved';", (student,))
    assert db.fetchone()[0] == 1


def test_rejected_link_is_removed_and_can_be_retried(client, db, login, make_user, make_file, course):
    fid = _existing_file(db, make_file, make_user, course)
    other = _second_course(db, course)
    student = make_user()
    login(student)
    _reupload(client, course, other)

    login(make_user(admin=True))
    link = next(l for l in client.get('/api/admin/links/pending').get_json()['links'] if l['file_id'] == fid)
    assert client.post(f"/api/admin/links/{link['link_id']}/reject", json={"reason": "wrong course"}).status_code == 200
    db.execute("SELECT COUNT(*) FROM file_course_links WHERE file_id = %s;", (fid,))
    assert db.fetchone()[0] == 0

    login(student)
    assert _reupload(client, course, other).get_json()['status'] == 'pending'


def test_admin_reupload_is_live_at_once(client, db, login, make_user, make_file, course):
    fid = _existing_file(db, make_file, make_user, course)
    other = _second_course(db, course)
    login(make_user(admin=True))
    assert _reupload(client, course, other).get_json()['status'] == 'approved'
    assert fid in _course_file_ids(client, other)


def test_non_admins_cannot_review_links(client, login, make_user):
    login(make_user())
    assert client.get('/api/admin/links/pending').status_code == 403
    assert client.post('/api/admin/links/1/approve').status_code == 403
