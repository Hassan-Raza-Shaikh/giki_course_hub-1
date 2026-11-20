from utils.misfiled import codes_in_name, find_misfiled, original_name

# The 2025 switch-over in miniature: DLD was CE221/CS221, DSA is CS222 (and was
# CS221 for earlier batches), COAL is CS223.
COURSES = [
    {"course_id": 1, "code": "CS221", "name": "Digital Logic Design", "old_code": "CE221"},
    {"course_id": 2, "code": "CE221", "name": "Digital Logic Design", "old_code": None},
    {"course_id": 3, "code": "CS222", "name": "Data Structures & Algorithms", "old_code": "CS221"},
    {"course_id": 4, "code": "CS223", "name": "Computer Organization & Assembly Language", "old_code": None},
    {"course_id": 5, "code": "PH101", "name": "Applied Physics", "old_code": None},
    {"course_id": 6, "code": "PH101L", "name": "Applied Physics Lab", "old_code": None},
]
LINKS = [("CE221", "CS221")]
INSTRUCTORS = [(1, 10), (3, 20), (4, 20)]  # 10 teaches DLD; 20 teaches DSA and COAL


def _file(fid, code, name, folder, instructor=None):
    return {"file_id": fid, "course_code": code, "title": f"File {fid}", "instructor_id": instructor,
            "status": "approved", "path": f"course_{folder}/0123456789abcdef0123456789abcdef_{name}"}


def _run(files, dismissed=()):
    return {r["file_id"]: r for r in find_misfiled(COURSES, LINKS, INSTRUCTORS, files, {10: "Dr. A"}, dismissed)}


def test_name_parsing():
    assert original_name("course_1/0123456789abcdef0123456789abcdef_CE-221-wk01.pdf") == "CE-221-wk01.pdf"
    assert codes_in_name("CE-221-wk01-L01L02.pdf") == {"CE221"}
    assert codes_in_name("CE221L_Mid_Sol.pdf") == {"CE221L"}
    assert codes_in_name("PH101_Lecture_Slides_1.pdf") == {"PH101"}  # "_Lecture" is not a lab suffix
    assert codes_in_name("CS 222 L manual.pdf") == {"CS222L"}
    assert codes_in_name("notes_2024.pdf") == set()


def test_dld_files_moved_to_dsa_are_likely_misfiled():
    # What the 2025 script did: DLD slides uploaded on the DLD page, moved to CS222
    found = _run([_file(1, "CS222", "CE-221-wk01.pdf", 1, instructor=10)])
    assert found[1]["confidence"] == "likely"
    assert {r["kind"] for r in found[1]["reasons"]} == {"name", "instructor", "page"}


def test_correctly_filed_files_are_not_listed():
    files = [
        _file(1, "CS221", "CE-221-wk01.pdf", 1, instructor=10),   # old code of the same subject
        _file(2, "CE221", "CS221_notes.pdf", 2),                   # linked code
        _file(3, "PH101L", "PH101_Lab_1.pdf", 6),                  # theory code on its lab
        _file(4, "CS222", "stack.pdf", 3, instructor=20),
    ]
    assert _run(files) == {}


def test_instructor_teaching_another_course_alone_is_not_listed():
    # Instructors teach several courses; a new one shows up on DSA
    assert _run([_file(1, "CS222", "week1.pdf", 3, instructor=10)]) == {}


def test_admin_move_alone_is_not_listed():
    # Uploaded on the wrong page and fixed by an admin
    assert _run([_file(1, "CS223", "coal_quiz.pdf", 5)]) == {}


def test_reused_code_in_name_alone_is_only_worth_a_check():
    # Before 2025 COAL was printed as CS222, so a COAL file named CS222 may be fine
    found = _run([_file(1, "CS223", "CS222_COAL_Final.pdf", 4, instructor=20)])
    assert found[1]["confidence"] == "check"


def test_dismissed_files_are_hidden():
    files = [_file(1, "CS222", "CE-221-wk01.pdf", 1, instructor=10)]
    assert _run(files, dismissed=[1]) == {}


def test_admin_list_and_dismiss(client, db, login, make_user, course):
    db.execute("SELECT faculty_id FROM courses WHERE course_id = %s;", (course['id'],))
    fac = db.fetchone()[0]
    db.execute("SELECT COALESCE(MAX(course_id), 0) FROM courses;")
    n = db.fetchone()[0] % 900 + 100
    home, other, third = f"QZ{n}", f"QY{n}", f"QX{n}"
    ids = {}
    for code in (home, other, third):
        db.execute("INSERT INTO courses (name, code, faculty_id) VALUES (%s, %s, %s) RETURNING course_id;",
                   (f"Course {code}", code, fac))
        ids[code] = db.fetchone()[0]
    uploader = make_user()
    # A file named for `other`, uploaded on `other`'s page, now sitting under `home`
    db.execute("""INSERT INTO files (title, course_code, category_id, uploaded_by, status, file_url, storage_path)
                  VALUES ('Week 1', %s, %s, %s, 'approved', 'https://example.com/f', %s) RETURNING file_id;""",
               (home, course['category_id'], uploader,
                f"course_{ids[other]}/0123456789abcdef0123456789abcdef_{other}_week1.pdf"))
    fid = db.fetchone()[0]

    login(make_user())
    assert client.get('/api/admin/misfiled').status_code == 403

    login(make_user(admin=True))
    body = client.get('/api/admin/misfiled').get_json()
    row = next(f for f in body['files'] if f['file_id'] == fid)
    assert row['confidence'] == 'likely' and body['can_dismiss']

    assert client.post(f'/api/admin/misfiled/{fid}/dismiss').status_code == 200
    assert fid not in {f['file_id'] for f in client.get('/api/admin/misfiled').get_json()['files']}

    # Moving the file somewhere else makes it worth a fresh look
    db.execute("UPDATE files SET course_code = %s WHERE file_id = %s;", (third, fid))
    assert fid in {f['file_id'] for f in client.get('/api/admin/misfiled').get_json()['files']}
