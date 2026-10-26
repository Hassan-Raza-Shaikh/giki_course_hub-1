"""File links, bulk uploads, reports, uploads and course edits."""


def test_only_owner_linker_or_admin_can_remove_a_link(client, login, make_user, make_file, course, db):
    owner, stranger, admin = make_user(), make_user(), make_user(admin=True)
    file_id = make_file(course, owner)
    other = dict(course)
    db.execute("INSERT INTO courses (name, code, faculty_id) SELECT 'Other', 'OTH' || %s, faculty_id FROM courses WHERE course_id = %s RETURNING course_id;",
               (course['id'], course['id']))
    other_id = db.fetchone()[0]

    def link():
        db.execute("INSERT INTO file_course_links (file_id, course_id, category_id) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING;",
                   (file_id, other_id, other['category_id']))

    link()
    login(stranger)
    assert client.delete(f'/api/files/{file_id}/links/{other_id}').status_code == 403
    login(owner)
    assert client.delete(f'/api/files/{file_id}/links/{other_id}').status_code == 200
    link()
    login(admin)
    assert client.delete(f'/api/files/{file_id}/links/{other_id}').status_code == 200


def test_bulk_done_only_once_per_issued_batch(client, login, make_user, course):
    login(make_user())
    url = f"/api/courses/{course['id']}/bulk-upload/bulk_test/done"
    assert client.post(url).status_code == 403
    with client.session_transaction() as s:
        s['_bulk_batches'] = ['bulk_test']
    assert client.post(url).status_code == 200
    assert client.post(url).status_code == 403


def test_report_on_missing_file_is_404(client, login, make_user):
    login(make_user())
    assert client.post('/api/reports/987654', json={"reason": "spam"}).status_code == 404


def test_oversized_upload_rejected_before_reading(app, make_user):
    from flask import session
    user = make_user()
    with app.test_request_context('/api/courses/1/upload', method='POST',
                                  environ_overrides={'CONTENT_LENGTH': str(500 * 1024 * 1024)}):
        session['user_id'] = user
        response = app.preprocess_request()
    assert response is not None and response[1] == 413


def test_renaming_last_course_with_a_code_moves_its_files(client, login, make_user, make_file, course, db):
    admin = make_user(admin=True)
    file_id = make_file(course, admin)
    login(admin)
    r = client.put(f"/api/admin/courses/{course['id']}", json={"name": "Renamed", "code": course['code'] + 'X'})
    assert r.status_code == 200
    db.execute("SELECT course_code FROM files WHERE file_id = %s;", (file_id,))
    assert db.fetchone()[0] == course['code'] + 'X'
    assert client.put(f"/api/admin/courses/{course['id']}", json={"name": "", "code": "Y"}).status_code == 400


def test_course_page_can_skip_instructor_list(client, course):
    full = client.get(f"/api/courses/{course['id']}").json
    lite = client.get(f"/api/courses/{course['id']}?instructors=0").json
    assert lite['success'] and lite['all_instructors'] == []
    assert lite['files_by_category'] == full['files_by_category']


def test_bad_pagination_params_do_not_error(client, login, make_user):
    login(make_user())
    assert client.get('/api/files/my-uploads?page=-2&limit=0').status_code == 200
    assert client.get('/api/courses/random?n=100000').status_code == 200


def test_catalogue_responses_are_cacheable(client):
    assert client.get('/api/categories').headers['Cache-Control'] == 'private, max-age=300'


def test_uploader_can_withdraw_pending_but_not_approved(client, db, make_user, login, course, make_file, monkeypatch):
    import routes.admin_routes as admin_routes
    deleted = []
    monkeypatch.setattr(admin_routes, '_delete_stored_file', deleted.append)

    owner, stranger = make_user(), make_user()
    pending = make_file(course, owner, status='pending')
    approved = make_file(course, owner, status='approved')

    login(stranger)
    assert client.delete(f'/api/files/{pending}').status_code == 404

    login(owner)
    assert client.delete(f'/api/files/{approved}').status_code == 409
    assert client.delete(f'/api/files/{pending}').status_code == 200
    db.execute("SELECT file_id FROM files WHERE file_id IN (%s, %s);", (pending, approved))
    assert [r[0] for r in db.fetchall()] == [approved]
    assert len(deleted) == 1
