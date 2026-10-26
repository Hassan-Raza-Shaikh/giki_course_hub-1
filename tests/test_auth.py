"""Sign-in, admin access and the cross-site write guard."""
import pytest

import routes.auth_routes as auth_routes


@pytest.fixture
def firebase(monkeypatch):
    """Pretend Firebase Admin is set up and return whatever token claims a test sets."""
    claims = {}
    monkeypatch.setattr(auth_routes, 'is_initialized', lambda: True)
    monkeypatch.setattr(auth_routes, '_verify_id_token', lambda token: dict(claims))
    return claims


def sign_in(client, firebase, **claims):
    firebase.clear()
    firebase.update({"name": "", "picture": "", "email_verified": True, **claims})
    return client.post('/api/auth/firebase', json={"idToken": "token"})


def test_legacy_signup_and_login_are_gone(client):
    assert client.post('/api/signup', json={"email": "x@y.z", "displayName": "x", "password": "secret1"}).status_code == 404
    assert client.post('/api/login', json={"email": "x@y.z", "password": "secret1"}).status_code == 404


def test_sign_in_refused_without_firebase_key(client):
    r = client.post('/api/auth/firebase', json={"uid": "abc", "email": "someone@giki.edu.pk"})
    assert r.status_code == 503


def test_unverified_email_cannot_take_over_existing_account(client, firebase, make_user):
    make_user(email='victim@giki.edu.pk')
    r = sign_in(client, firebase, uid='attacker-uid', email='victim@giki.edu.pk', email_verified=False)
    assert r.status_code == 409


def test_unverified_admin_email_gets_no_admin_role(client, firebase):
    r = sign_in(client, firebase, uid='fake-boss', email='boss@giki.edu.pk', email_verified=False)
    assert r.status_code == 200
    assert r.json['user']['role'] == 'user'
    assert client.get('/api/admin/stats').status_code == 403


def test_verified_admin_email_is_admin(client, firebase):
    r = sign_in(client, firebase, uid='real-boss', email='boss2@giki.edu.pk')
    assert r.status_code == 200
    # Not an admin yet; bootstrap list only has boss@
    assert r.json['user']['role'] == 'user'


def test_sign_in_keeps_a_name_the_user_chose(client, firebase, db):
    r = sign_in(client, firebase, uid='namer', email='namer@giki.edu.pk', name='Google Name')
    assert r.json['user']['displayName'] == 'Google Name'
    assert client.patch('/api/me/profile', json={"displayName": "My Own Name"}).status_code == 200

    r = sign_in(client, firebase, uid='namer', email='namer@giki.edu.pk', name='Google Name')
    assert r.json['user']['displayName'] == 'My Own Name'
    db.execute("SELECT display_name FROM users WHERE firebase_uid = 'namer';")
    assert db.fetchone()[0] == 'My Own Name'


def test_admin_needs_verified_email(client, login, make_user):
    admin = make_user(admin=True)
    login(admin, verified=False)
    assert client.get('/api/admin/stats').status_code == 403
    assert client.get('/api/admin/check').json['is_admin'] is False
    login(admin, verified=True)
    assert client.get('/api/admin/stats').status_code == 200
    assert client.get('/api/admin/check').json['is_admin'] is True


def test_revoked_admin_loses_access_immediately(client, login, make_user, db):
    admin = make_user(admin=True)
    login(admin)
    assert client.get('/api/admin/stats').status_code == 200
    db.execute("DELETE FROM admins WHERE email = (SELECT email FROM users WHERE user_id = %s);", (admin,))
    assert client.get('/api/admin/stats').status_code == 403


@pytest.mark.parametrize("origin, expected", [
    ("https://evil.example", 403),
    ("https://www.gikicoursehub.app", 200),
    ("https://gikicoursehub.app", 200),
    (None, 200),
])
def test_cross_site_writes_are_blocked(client, origin, expected):
    headers = {"Origin": origin} if origin else {}
    assert client.post('/api/logout', headers=headers).status_code == expected
