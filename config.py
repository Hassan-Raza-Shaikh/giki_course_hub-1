# ==========================================
# config.py — Central configuration
# ==========================================

import os

# Flask
SECRET_KEY = os.environ.get('SECRET_KEY', 'giki-course-hub-secret-2024')

# PostgreSQL
DB_CONFIG = {
    "host":     os.environ.get('DB_HOST', 'localhost'),
    "database": os.environ.get('DB_NAME', 'giki course hub'),
    "user":     os.environ.get('DB_USER', 'postgres'),
    "password": os.environ.get('DB_PASSWORD', 'ammar.12?'),
    "port":     os.environ.get('DB_PORT', '5432'),
}

# Firebase (placeholder — wired in Day 10)
FIREBASE_CREDENTIALS_PATH = os.environ.get('FIREBASE_CREDENTIALS', 'firebase/serviceAccountKey.json')
FIREBASE_STORAGE_BUCKET   = os.environ.get('FIREBASE_BUCKET', 'your-project.appspot.com')

# Upload settings
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'txt', 'zip', 'png', 'jpg', 'jpeg'}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB
