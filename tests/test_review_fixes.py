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
