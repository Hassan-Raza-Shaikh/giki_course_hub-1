import os
import json
import threading
import urllib.request
import urllib.error

RESEND_API_URL = "https://api.resend.com/emails"

def send_email_async(to_email, subject, body_html):
    api_key = os.environ.get('RESEND_API_KEY')

    if not api_key:
        print(f"[EmailService] Skipping email to {to_email}. RESEND_API_KEY environment variable is not configured.")
        return

    payload = json.dumps({
        "from": "GIKI Course Hub <notifications@gikicoursehub.app>",
        "to": [to_email],
        "subject": subject,
        "html": body_html,
    }).encode("utf-8")

    req = urllib.request.Request(
        RESEND_API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            print(f"[EmailService] Email successfully sent to {to_email} (status {response.status})")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[EmailService] Failed to send email to {to_email}: HTTP {e.code} - {body}")
    except Exception as e:
        print(f"[EmailService] Failed to send email to {to_email}: {e}")


def send_email(to_email, subject, body_html):
    """
    Fire-and-forget email sender using threads.
    Uses Resend's HTTPS API — works on Render (SMTP port 587 is blocked there).
    """
    if not to_email:
        return
    thread = threading.Thread(target=send_email_async, args=(to_email, subject, body_html))
    thread.daemon = True
    thread.start()
