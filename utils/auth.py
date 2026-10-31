from flask import jsonify, session

VERIFY_EMAIL_CODE = 'email_unverified'


def require_verified_email(action="do this"):
    """None if the signed-in user's email is verified, else a 403 response.
    Google sign-ins are always verified; email/password accounts are once the
    user opens Firebase's verification link (the next request then carries a
    fresh token, see the retry in frontend/src/services/api.js)."""
    if session.get('email_verified'):
        return None
    return jsonify({
        "success": False,
        "code": VERIFY_EMAIL_CODE,
        "message": f"Please verify your email address to {action}. Use the link we emailed you, "
                   "or send a new one from your profile page.",
    }), 403
