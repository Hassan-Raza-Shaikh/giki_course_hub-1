"""
Backend tests run against a real, throwaway Postgres built from the migrations.

Set TEST_DATABASE_URL to an empty database you don't mind wiping, e.g.
    TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/coursehub_test pytest
CI starts a Postgres service for this (see .github/workflows/ci.yml).
"""
import os
import pathlib
import sys

import psycopg2
import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

TEST_DB = os.environ.get('TEST_DATABASE_URL')
if not TEST_DB:
    pytest.skip("TEST_DATABASE_URL is not set", allow_module_level=True)

os.environ['DATABASE_URL'] = TEST_DB
os.environ.setdefault('SECRET_KEY', 'test-secret')
os.environ['ALLOWED_ORIGINS'] = 'https://www.gikicoursehub.app,https://gikicoursehub.app'
os.environ['BOOTSTRAP_ADMIN_EMAILS'] = 'boss@giki.edu.pk'
os.environ['EMAIL_DRY_RUN'] = '1'


def _schema_files():
    migrations = sorted((ROOT / 'migrations').glob('0*.sql'))
    before = [m for m in migrations if m.name < '027']
    after = [m for m in migrations if m.name >= '027']
    # sql/functions.sql holds the course-files function that 027/028 build on
    return before + [ROOT / 'sql' / 'functions.sql'] + after


@pytest.fixture(scope='session', autouse=True)
def database():
    conn = psycopg2.connect(TEST_DB)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    for path in _schema_files():
        cur.execute(path.read_text())
    cur.close()
    conn.close()
    yield


@pytest.fixture(scope='session')
def app(database):
    import logging
    logging.disable(logging.WARNING)
    from app import app as flask_app
    flask_app.config['TESTING'] = True
    # Rate limits would make tests order-dependent
    flask_app.limiter.enabled = False
    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db():
    conn = psycopg2.connect(TEST_DB)
    conn.autocommit = True
    cur = conn.cursor()
    yield cur
    cur.close()
    conn.close()


_counter = [0]


def unique(prefix):
    _counter[0] += 1
    return f"{prefix}{_counter[0]}"


@pytest.fixture
def make_user(db):
    def _make(email=None, admin=False):
        name = unique('user')
        email = email or f"{name}@giki.edu.pk"
        db.execute("INSERT INTO users (username, email) VALUES (%s, %s) RETURNING user_id;", (name, email))
        uid = db.fetchone()[0]
        if admin:
            db.execute("INSERT INTO admins (email, granted_by) VALUES (%s, 'test') ON CONFLICT DO NOTHING;", (email,))
        return uid
    return _make


@pytest.fixture
def login(client):
    def _login(user_id, verified=True):
        with client.session_transaction() as s:
            s.clear()
            s['user_id'] = user_id
            s['username'] = 'u'
            s['role'] = 'user'
            s['email_verified'] = verified
    return _login


@pytest.fixture
def course(db):
    """A course with one approved file in it; returns dict of ids."""
    db.execute("SELECT faculty_id FROM faculties LIMIT 1;")
    row = db.fetchone()
    if row:
        fac = row[0]
    else:
        db.execute("INSERT INTO faculties (name, full_name) VALUES ('FCSE', 'Computer Science') RETURNING faculty_id;")
        fac = db.fetchone()[0]
    code = unique('CS').upper()
    db.execute("INSERT INTO courses (name, code, faculty_id) VALUES (%s, %s, %s) RETURNING course_id;",
               (f"Course {code}", code, fac))
    course_id = db.fetchone()[0]
    db.execute("SELECT category_id FROM categories ORDER BY category_id LIMIT 1;")
    cat = db.fetchone()[0]
    return {"id": course_id, "code": code, "category_id": cat}


@pytest.fixture
def make_file(db):
    def _make(course, uploader, status='approved'):
        db.execute("""INSERT INTO files (title, course_code, category_id, uploaded_by, status, file_url, storage_path)
                      VALUES (%s, %s, %s, %s, %s, 'https://example.com/f', %s) RETURNING file_id;""",
                   (unique('File '), course['code'], course['category_id'], uploader, status, unique('key/')))
        return db.fetchone()[0]
    return _make
