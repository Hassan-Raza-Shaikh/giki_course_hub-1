"""
Email notifications for things that happen on GIKI Course Hub.

Routes call one function per event *after* their transaction commits, e.g.

    email_events.upload_approved(uploader_id, [("Midterm 2023", "CS101")])

Each call returns immediately. The work (looking up the recipient, checking
their email preferences, rendering the branded template, sending) runs on the
background email pool, so a slow mail API or a missing table can never break
or slow down the request.

Every event belongs to one preference category. Users can switch a category
off from the Email settings page or with the one-click unsubscribe link at the
bottom of each email. The in-app notification centre can call these same
functions from its notify() hook so both channels fire on the same events.
"""
import os
from itsdangerous import URLSafeSerializer, BadSignature

from db import get_connection
from email_service import run_in_background, send_email_sync
from email_templates import render_email

FRONTEND_URL = (os.environ.get("FRONTEND_URL") or "https://gikicoursehub.app").rstrip("/")

# category key -> (DB column, label shown to users)
CATEGORIES = {
    "my_uploads":   ("my_uploads",   "Updates on my uploads"),
    "my_reports":   ("my_reports",   "Updates on reports and issues I submit"),
    "admin_alerts": ("admin_alerts", "Admin alerts: new uploads, reports and issues"),
}

_UNSUB_SALT = "email-unsubscribe"


# ─────────────────────────────────────────────────────────────────────────────
# Unsubscribe tokens and preferences
# ─────────────────────────────────────────────────────────────────────────────

def _serializer():
    from config import SECRET_KEY
    return URLSafeSerializer(SECRET_KEY, salt=_UNSUB_SALT)


def make_token(email, category=None):
    """Signed token identifying an email address (and optionally one category)."""
    return _serializer().dumps({"e": email.strip().lower(), "c": category})


def read_token(token):
    """Return (email, category) for a valid token, or (None, None)."""
    try:
        data = _serializer().loads(token)
        return data.get("e"), data.get("c")
    except (BadSignature, AttributeError, TypeError):
        return None, None


def get_preferences(email):
    """All categories default to on when the user has never changed anything."""
    prefs = {key: True for key in CATEGORIES}
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT my_uploads, my_reports, admin_alerts FROM email_preferences WHERE email = %s;",
            (email.strip().lower(),),
        )
        row = cur.fetchone()
        cur.close()
    if row:
        prefs = dict(zip(("my_uploads", "my_reports", "admin_alerts"), (bool(v) for v in row)))
    return prefs


def set_preferences(email, changes):
    """Upsert the given {category: bool} changes for this email."""
    changes = {k: bool(v) for k, v in changes.items() if k in CATEGORIES}
    if not changes:
        return get_preferences(email)
    current = get_preferences(email)
    current.update(changes)
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO email_preferences (email, my_uploads, my_reports, admin_alerts, updated_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT (email) DO UPDATE
                SET my_uploads = EXCLUDED.my_uploads,
                    my_reports = EXCLUDED.my_reports,
                    admin_alerts = EXCLUDED.admin_alerts,
                    updated_at = NOW();
            """,
            (email.strip().lower(), current["my_uploads"], current["my_reports"], current["admin_alerts"]),
        )
        conn.commit()
        cur.close()
    return current


def _wants(email, category):
    try:
        return get_preferences(email).get(category, True)
    except Exception as e:
        # e.g. migration 025 not applied yet — fall back to sending, as before this feature
        print(f"[EmailEvents] Could not read email preferences for {email}: {e}")
        return True


# ─────────────────────────────────────────────────────────────────────────────
# Recipient lookups (run on the background pool)
# ─────────────────────────────────────────────────────────────────────────────

def _user(user_id):
    """(email, friendly name) for a user, or (None, None)."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT u.email, COALESCE(NULLIF(up.display_name, ''), NULLIF(u.display_name, ''), u.username)
               FROM users u LEFT JOIN user_profiles up ON up.user_id = u.user_id
               WHERE u.user_id = %s;""",
            (user_id,),
        )
        row = cur.fetchone()
        cur.close()
    return (row[0], row[1]) if row else (None, None)


def _admin_emails():
    """Everyone with admin access: the admins table plus BOOTSTRAP_ADMIN_EMAILS."""
    from config import BOOTSTRAP_ADMIN_EMAILS
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT email FROM admins;")
        emails = {r[0].strip().lower() for r in cur.fetchall() if r[0]}
        cur.close()
    return sorted(emails | BOOTSTRAP_ADMIN_EMAILS)


def _course_url(course_code):
    """Link to the course page for a course code, falling back to the catalogue."""
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT course_id FROM courses WHERE code = %s ORDER BY course_id LIMIT 1;", (course_code,))
            row = cur.fetchone()
            cur.close()
        if row:
            return f"{FRONTEND_URL}/course/{row[0]}"
    except Exception as e:
        print(f"[EmailEvents] Could not resolve course link for {course_code}: {e}")
    return f"{FRONTEND_URL}/courses"


# ─────────────────────────────────────────────────────────────────────────────
# Sending
# ─────────────────────────────────────────────────────────────────────────────

_FOOTER_REASONS = {
    "my_uploads":   "You're receiving this because you uploaded material to GIKI Course Hub.",
    "my_reports":   "You're receiving this because you submitted a report on GIKI Course Hub.",
    "admin_alerts": "You're receiving this because you're a GIKI Course Hub admin.",
}


def _deliver(category, to_email, subject, **content):
    """Check preferences, render and send one email (blocking; call from the pool)."""
    if not to_email:
        return
    if not _wants(to_email, category):
        print(f"[EmailEvents] {to_email} opted out of {category}; not sending '{subject}'.")
        return
    token = make_token(to_email, category)
    unsubscribe_url = f"{FRONTEND_URL}/email-settings?token={token}&unsubscribe={category}"
    manage_url = f"{FRONTEND_URL}/email-settings?token={make_token(to_email)}"
    html, text = render_email(
        footer_reason=_FOOTER_REASONS[category],
        manage_url=manage_url,
        unsubscribe_url=unsubscribe_url,
        **content,
    )
    headers = {"List-Unsubscribe": f"<{unsubscribe_url}>"}
    send_email_sync(to_email, subject, html, text, headers)


def _files_noun(n):
    return "file" if n == 1 else "files"


# ─────────────────────────────────────────────────────────────────────────────
# Events for uploaders
# files = list of (title, course_code)
# ─────────────────────────────────────────────────────────────────────────────

def upload_received(user_id, files):
    """Uploader confirmation: their material is waiting for review."""
    def task():
        email, name = _user(user_id)
        n = len(files)
        course = files[0][1] if files else ""
        content = dict(
            preheader="We've got it. An admin will review it soon.",
            tone="warning", badge="Pending review",
            heading="Thanks, we've got your upload" if n == 1 else f"Thanks, we've got your {n} uploads",
            greeting=f"Hi {name}," if name else "Hi,",
            paragraphs=[
                "Your material has been submitted and is waiting for an admin to review it. "
                "We'll email you as soon as it's approved and live for everyone.",
            ],
            cta_label="Track my uploads", cta_url=f"{FRONTEND_URL}/my-uploads",
        )
        if n == 1:
            content["details"] = [("Title", files[0][0]), ("Course", course)]
        else:
            content["details"] = [("Course", course)]
            content["items"] = [t for t, _ in files]
            content["items_title"] = "Files submitted"
        subject = "Upload received: pending review" if n == 1 else f"{n} uploads received: pending review"
        _deliver("my_uploads", email, subject, **content)
    run_in_background(task)


def upload_approved(user_id, files):
    """Uploader: their material is approved and live."""
    def task():
        email, name = _user(user_id)
        n = len(files)
        course = files[0][1] if files else ""
        content = dict(
            preheader="It's now live for every student on GIKI Course Hub.",
            tone="success", badge="Approved",
            heading="Your upload is live 🎉" if n == 1 else f"{n} of your uploads are live 🎉",
            greeting=f"Hi {name}," if name else "Hi,",
            paragraphs=[
                "Great news! An admin reviewed your material and approved it. "
                "It's now visible to every student on GIKI Course Hub.",
            ],
            outro="Thank you for helping your juniors and batchmates out.",
            cta_label="View the course", cta_url=_course_url(course) if course else f"{FRONTEND_URL}/my-uploads",
        )
        if n == 1:
            content["details"] = [("Title", files[0][0]), ("Course", course)]
        else:
            content["items"] = [f"{t} ({c})" for t, c in files]
            content["items_title"] = "Approved files"
            content["cta_label"], content["cta_url"] = "View my uploads", f"{FRONTEND_URL}/my-uploads"
        subject = "Your upload was approved 🎉" if n == 1 else f"{n} of your uploads were approved 🎉"
        _deliver("my_uploads", email, subject, **content)
    run_in_background(task)


def upload_rejected(user_id, files, reason):
    """Uploader: their material was not approved, with the admin's reason."""
    def task():
        email, name = _user(user_id)
        n = len(files)
        content = dict(
            preheader="An admin left a note explaining why.",
            tone="danger", badge="Not approved",
            heading="Your upload wasn't approved" if n == 1 else f"{n} of your uploads weren't approved",
            greeting=f"Hi {name}," if name else "Hi,",
            paragraphs=["An admin reviewed your submission and couldn't approve it this time."],
            callout=reason or "No reason was given.", callout_title="Reason from the admin",
            outro="You're welcome to fix it and upload it again. Thanks for contributing!",
            cta_label="Upload a revised version", cta_url=f"{FRONTEND_URL}/upload",
        )
        if n == 1:
            content["details"] = [("Title", files[0][0]), ("Course", files[0][1])]
        else:
            content["items"] = [f"{t} ({c})" for t, c in files]
            content["items_title"] = f"Rejected {_files_noun(n)}"
        subject = "Update on your upload" if n == 1 else f"Update on {n} of your uploads"
        _deliver("my_uploads", email, subject, **content)
    run_in_background(task)


# ─────────────────────────────────────────────────────────────────────────────
# Events for people who reported content or filed an issue
# ─────────────────────────────────────────────────────────────────────────────

def report_resolved(user_id, file_title, course_code, notes=None):
    def task():
        email, name = _user(user_id)
        _deliver(
            "my_reports", email, "Your report has been resolved",
            preheader="Thanks for helping keep GIKI Course Hub accurate.",
            tone="success", badge="Report resolved",
            heading="Your report has been resolved",
            greeting=f"Hi {name}," if name else "Hi,",
            paragraphs=["An admin looked into the file you flagged and took action. Thanks for helping keep GIKI Course Hub safe and accurate!"],
            details=[("File", file_title), ("Course", course_code)],
            callout=notes or None, callout_title="Admin notes",
        )
    run_in_background(task)


def report_dismissed(user_id, file_title, course_code):
    def task():
        email, name = _user(user_id)
        _deliver(
            "my_reports", email, "Update on your report",
            preheader="An admin reviewed the file you flagged.",
            tone="neutral", badge="Report reviewed",
            heading="We reviewed your report",
            greeting=f"Hi {name}," if name else "Hi,",
            paragraphs=["An admin reviewed the file you flagged and found it to be within the platform guidelines, so it will stay up."],
            outro="If you think this was a mistake, let us know through the Report an Issue page.",
            details=[("File", file_title), ("Course", course_code)],
            cta_label="Report an issue", cta_url=f"{FRONTEND_URL}/report-issue",
        )
    run_in_background(task)


def issue_resolved(user_id, issue_title, notes=None):
    def task():
        email, name = _user(user_id)
        _deliver(
            "my_reports", email, "Your issue has been resolved",
            preheader="Thanks for helping us improve GIKI Course Hub.",
            tone="success", badge="Issue resolved",
            heading="We've resolved your issue",
            greeting=f"Hi {name}," if name else "Hi,",
            paragraphs=["Thanks for taking the time to report this. An admin has marked it as resolved."],
            details=[("Issue", issue_title)],
            callout=notes or None, callout_title="Admin notes",
        )
    run_in_background(task)


# ─────────────────────────────────────────────────────────────────────────────
# Admin alerts
# ─────────────────────────────────────────────────────────────────────────────

def _to_admins(build):
    """build() -> (subject, content). Built once, then sent to every admin."""
    def task():
        subject, content = build()
        for admin_email in _admin_emails():
            _deliver("admin_alerts", admin_email, subject, **content)
    run_in_background(task)


def _name(user_id):
    return (_user(user_id)[1] if user_id else None) or "Someone"


def admin_new_uploads(uploader_id, course_code, titles):
    """Admins: material is waiting for review (one email per upload or bulk batch)."""
    def build():
        uploader = _name(uploader_id)
        n = len(titles)
        content = dict(
            preheader=f"{uploader} submitted material for {course_code}.",
            tone="info", badge="Needs review",
            heading="New upload to review" if n == 1 else f"{n} new uploads to review",
            paragraphs=[f"{uploader} uploaded material that's waiting for approval."],
            cta_label="Open the admin panel", cta_url=f"{FRONTEND_URL}/admin",
        )
        if n == 1:
            content["details"] = [("Title", titles[0]), ("Course", course_code), ("Uploaded by", uploader)]
        else:
            content["details"] = [("Course", course_code), ("Uploaded by", uploader)]
            content["items"], content["items_title"] = titles, "Files awaiting review"
        subject = f"New upload to review: {course_code}" if n == 1 else f"{n} new uploads to review: {course_code}"
        return subject, content
    _to_admins(build)


def admin_new_report(reporter_id, file_title, course_code, reason):
    """Admins: a user flagged a file."""
    def build():
        reporter = _name(reporter_id)
        return f"Content report: {file_title}", dict(
            preheader=f"{reporter} flagged a file in {course_code}.",
            tone="danger", badge="Content report",
            heading="A file has been reported",
            paragraphs=["A user flagged a file for review."],
            details=[("File", file_title), ("Course", course_code), ("Reported by", reporter)],
            callout=reason, callout_title="Reason",
            cta_label="Review the report", cta_url=f"{FRONTEND_URL}/admin",
        )
    _to_admins(build)


def admin_new_issue(reporter_id, issue_type, title, description):
    """Admins: someone used the Report an Issue page."""
    def build():
        reporter = _name(reporter_id)
        return f"New issue: {title}", dict(
            preheader=f"{reporter} reported a {issue_type} issue.",
            tone="warning", badge=f"Issue · {issue_type}",
            heading="A new issue was reported",
            details=[("Title", title), ("Type", issue_type), ("Reported by", reporter)],
            callout=description, callout_title="Description",
            cta_label="Open the admin panel", cta_url=f"{FRONTEND_URL}/admin",
        )
    _to_admins(build)
