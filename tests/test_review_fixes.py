import io

import pytest

from utils.validators import validate_file_magic_bytes


@pytest.mark.parametrize("ext,header", [
    ('csv', b'name,score\n'),
    ('xls', b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'),
    ('gif', b'GIF89a\x01\x00'),
    ('webp', b'RIFF\x24\x00\x00\x00WEBPVP8 '),
    ('mp4', b'\x00\x00\x00\x18ftypmp42'),
    ('webm', b'\x1a\x45\xdf\xa3\x9f\x42'),
])
def test_allowed_types_with_real_content_pass(ext, header):
    # These are all in ALLOWED_EXTENSIONS but used to fail the magic-byte check
    assert validate_file_magic_bytes(io.BytesIO(header + b'\x00' * 32), ext)


@pytest.mark.parametrize("ext", ['xls', 'gif', 'webp', 'mp4', 'webm', 'pdf'])
def test_mislabelled_content_still_rejected(ext):
    assert not validate_file_magic_bytes(io.BytesIO(b'MZ\x90\x00 an exe, not media'), ext)


def test_huge_json_body_refused_before_reading(app):
    with app.test_request_context('/api/gpa/save', method='POST',
                                  environ_overrides={'CONTENT_LENGTH': str(50 * 1024 * 1024)}):
        response = app.preprocess_request()
    assert response is not None and response[1] == 413


def test_public_file_note_hides_admin_email(client, db, make_user, make_file, course):
    fid = make_file(course, make_user())
    db.execute("INSERT INTO file_notes (file_id, note_text, admin_email) VALUES (%s, 'Outdated', 'boss@giki.edu.pk');", (fid,))
    note = client.get(f'/api/files/{fid}/note').get_json()['note']
    assert note['text'] == 'Outdated'
    assert 'boss@giki.edu.pk' not in str(note)


def test_bad_upcoming_limit_does_not_error(client):
    assert client.get('/api/calendar/upcoming?limit=abc').status_code == 200


def test_approving_twice_does_not_renotify(client, db, login, make_user, make_file, course):
    uploader = make_user()
    fid = make_file(course, uploader, status='pending')
    login(make_user(admin=True))
    assert client.post(f'/api/admin/files/{fid}/approve').status_code == 200
    assert client.post(f'/api/admin/files/{fid}/approve').status_code == 404
    r = client.post('/api/admin/files/bulk-approve', json={"file_ids": [fid]}).get_json()
    assert r['approved'] == 0
    db.execute("SELECT COUNT(*) FROM notifications WHERE user_id = %s AND type = 'upload_approved';", (uploader,))
    assert db.fetchone()[0] == 1


def test_pending_upload_does_not_list_instructor_until_approved(client, db, login, make_user, make_file, course):
    db.execute("INSERT INTO instructors (name) VALUES ('Dr Test Pending') RETURNING instructor_id;")
    iid = db.fetchone()[0]
    fid = make_file(course, make_user(), status='pending')
    db.execute("UPDATE files SET instructor_id = %s WHERE file_id = %s;", (iid, fid))

    def listed():
        db.execute("SELECT 1 FROM course_instructors WHERE course_id = %s AND instructor_id = %s;",
                   (course['id'], iid))
        return db.fetchone() is not None

    assert not listed()
    login(make_user(admin=True))
    assert client.post(f'/api/admin/files/{fid}/approve').status_code == 200
    assert listed()


@pytest.mark.parametrize("name,ok", [("Ali Khan", True), ("  Admin  ", False), ("Course-Hub", False),
                                     ("x" * 61, False), ("Moderator!", False), ("Admiral Ali", True)])
def test_display_name_rules(client, login, make_user, name, ok):
    login(make_user())
    r = client.patch('/api/me/profile', json={"displayName": name})
    assert (r.status_code == 200) is ok


def test_download_of_pending_file_not_counted(client, db, make_user, make_file, course):
    fid = make_file(course, make_user(), status='pending')
    client.post(f'/api/files/{fid}/download')
    db.execute("SELECT COUNT(*) FROM file_downloads WHERE file_id = %s;", (fid,))
    assert db.fetchone()[0] == 0


def test_unverified_email_cannot_report_or_file_issues(client, login, make_user, make_file, course):
    fid = make_file(course, make_user())
    login(make_user(), verified=False)
    r = client.post(f'/api/reports/{fid}', json={"reason": "spam"})
    assert r.status_code == 403 and r.get_json()['code'] == 'email_unverified'
    r = client.post('/api/issues', json={"title": "t", "description": "d"})
    assert r.status_code == 403
    r = client.post(f"/api/courses/{course['id']}/bulk-upload/init", json={"files": [{"name": "a.pdf"}]})
    assert r.status_code == 403
