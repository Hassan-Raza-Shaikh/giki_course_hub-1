"""
Low-level email transport (Resend HTTPS API).

Behaviour is controlled by environment variables:
  RESEND_API_KEY     — required to actually send. Without it every email is skipped.
  EMAIL_DRY_RUN=1    — never send; log recipient + subject instead. Use this locally
                       and on staging so real users never get test emails.
  EMAIL_REDIRECT_TO  — send every email to this address instead of the real
                       recipient (the original recipient is shown in the subject).
  EMAIL_FROM         — override the From header.

Higher-level, branded notifications live in email_events.py.
"""
import os
import json
import urllib.request
import urllib.error
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_FROM = "GIKI Course Hub <notifications@gikicoursehub.app>"

# Small shared pool so a burst of notifications (e.g. bulk approve) never spawns
# dozens of threads or blocks the request that triggered them.
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="email")


def _truthy(value):
    return str(value or "").strip().lower() in ("1", "true", "yes", "on")


def is_dry_run():
    return _truthy(os.environ.get("EMAIL_DRY_RUN"))


def send_email_sync(to_email, subject, body_html, body_text=None, headers=None):
    """Send one email right now (blocking). Returns True if it was handed to Resend."""
    if not to_email:
        return False

    redirect_to = (os.environ.get("EMAIL_REDIRECT_TO") or "").strip()
    if redirect_to:
        subject = f"[to {to_email}] {subject}"
        to_email = redirect_to

    if is_dry_run():
        logger.info("DRY RUN: would send to %s: %s", to_email, subject)
        return False

    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.info("Skipping email to %s: RESEND_API_KEY is not configured.", to_email)
        return False

    message = {
        "from": os.environ.get("EMAIL_FROM") or DEFAULT_FROM,
        "to": [to_email],
        "subject": subject,
        "html": body_html,
    }
    if body_text:
        message["text"] = body_text
    if headers:
        message["headers"] = headers

    req = urllib.request.Request(
        RESEND_API_URL,
        data=json.dumps(message).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            logger.info("Email sent to %s (status %s)", to_email, response.status)
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.error("Failed to send email to %s: HTTP %s - %s", to_email, e.code, body)
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
    return False


def run_in_background(fn, *args, **kwargs):
    """Run fn on the email pool; exceptions are logged, never raised to the caller."""
    def _safe():
        try:
            fn(*args, **kwargs)
        except Exception:
            logger.exception("Background email task failed")
    _executor.submit(_safe)


def send_email(to_email, subject, body_html, body_text=None, headers=None):
    """
    Fire-and-forget email sender.
    Uses Resend's HTTPS API — works on Render (SMTP port 587 is blocked there).
    """
    if not to_email:
        return
    run_in_background(send_email_sync, to_email, subject, body_html, body_text, headers)
