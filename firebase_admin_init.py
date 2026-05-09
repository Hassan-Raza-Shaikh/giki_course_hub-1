"""
firebase_admin_init.py
Initializes the Firebase Admin SDK once at app startup.

SETUP:
  1. Go to Firebase Console → Project Settings → Service Accounts
  2. Click "Generate new private key" → download JSON
  3. Save it as  firebase/serviceAccountKey.json  (already in .gitignore)

If the key file is NOT found, the app falls back to token-verification-disabled
mode and prints a warning — useful during development before the key is added.
"""
import os
import firebase_admin
from firebase_admin import credentials

_initialized = False


def init_firebase_admin():
    global _initialized
    if _initialized:
        return True

    # Locations to check for the key
    possible_paths = [
        os.environ.get('FIREBASE_CREDENTIALS'),
        os.path.join(os.path.dirname(__file__), 'firebase', 'serviceAccountKey.json'),
        os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json'),  # Check root for Render/Vercel
    ]
    
    key_path = None
    for p in possible_paths:
        if p and os.path.exists(p):
            key_path = p
            break

    if not key_path:
        # For the error message, show the primary expected path
        fallback_path = possible_paths[1]
        print(f"\n⚠️  [Firebase Admin] Service account key NOT found at: {fallback_path}")
        print("   Token verification is DISABLED — sign-in still works but UIDs are not verified.")
        print("   To enable: Firebase Console → Project Settings → Service Accounts → Generate key\n")
        return False

    bucket = os.environ.get('FIREBASE_BUCKET', 'gikicoursehub.firebasestorage.app')
    try:
        cred = credentials.Certificate(key_path)

        firebase_admin.initialize_app(cred, {'storageBucket': bucket})
        _initialized = True
        print(f"✅ [Firebase Admin] Initialized with key: {key_path}")
        return True
    except Exception as e:
        print(f"⚠️  [Firebase Admin] Initialization failed: {e}")
        return False


def is_initialized():
    return _initialized
