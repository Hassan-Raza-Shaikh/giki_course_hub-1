"""
Render every notification email to HTML files so you can look at them in a
browser — no database, no API key, and nothing is ever sent.

    python preview_emails.py            # writes ./email_previews/*.html
    python preview_emails.py out_dir
"""
import os
import sys

os.environ.setdefault("SECRET_KEY", "preview-only")
os.environ["EMAIL_DRY_RUN"] = "1"

import email_events  # noqa: E402

out_dir = sys.argv[1] if len(sys.argv) > 1 else "email_previews"
os.makedirs(out_dir, exist_ok=True)

# Fake data instead of the database, and render synchronously
email_events._user = lambda user_id: ("student@giki.edu.pk", "Ayesha Khan")
email_events._admin_emails = lambda: ["admin@giki.edu.pk"]
email_events._course_url = lambda code: f"{email_events.FRONTEND_URL}/course/42"
email_events._wants = lambda email, category: True
email_events.run_in_background = lambda fn, *a, **k: fn(*a, **k)

current = {}


def capture(to_email, subject, html, text=None, headers=None):
    path = os.path.join(out_dir, f"{current['name']}.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"{path}  —  {subject}")


email_events.send_email_sync = capture

samples = {
    "upload_received": lambda: email_events.upload_received(1, [("Midterm Paper 2024", "CS101")]),
    "upload_received_bulk": lambda: email_events.upload_received(1, [("Lecture 1 Slides", "MT101"), ("Lecture 2 Slides", "MT101"), ("Quiz 1 Solution", "MT101")]),
    "upload_approved": lambda: email_events.upload_approved(1, [("Midterm Paper 2024", "CS101")]),
    "upload_approved_bulk": lambda: email_events.upload_approved(1, [("Lecture 1 Slides", "MT101"), ("Lecture 2 Slides", "MT101")]),
    "upload_rejected": lambda: email_events.upload_rejected(1, [("Final Notes", "PH102")], "The file is blurry and pages 3 to 6 are missing.\nPlease upload a clearer scan."),
    "report_resolved": lambda: email_events.report_resolved(1, "Assignment 2 Solution", "CS221", "Removed the duplicate copy."),
    "report_dismissed": lambda: email_events.report_dismissed(1, "Assignment 2 Solution", "CS221"),
    "issue_resolved": lambda: email_events.issue_resolved(1, "Search doesn't find course codes with spaces", "Fixed, thanks!"),
    "admin_new_upload": lambda: email_events.admin_new_uploads(1, "CS101", ["Midterm Paper 2024"]),
    "admin_new_uploads_bulk": lambda: email_events.admin_new_uploads(1, "MT101", ["Lecture 1 Slides", "Lecture 2 Slides", "Quiz 1 Solution"]),
    "admin_new_report": lambda: email_events.admin_new_report(1, "Assignment 2 Solution", "CS221", "This is a copy of another upload."),
    "admin_new_issue": lambda: email_events.admin_new_issue(1, "bug", "Upload button does nothing on Safari", "Tapping Upload on iPhone does nothing."),
}

for name, fire in samples.items():
    current["name"] = name
    fire()
