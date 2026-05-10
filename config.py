# ==========================================
# config.py — Central configuration
# ==========================================

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Flask
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-123')

# PostgreSQL
# Note: db.py now handles DATABASE_URL connection logic
DB_CONFIG = {
    "host":     os.environ.get('DB_HOST', 'localhost'),
    "database": os.environ.get('DB_NAME', 'postgres'),
    "user":     os.environ.get('DB_USER', 'postgres'),
    "password": os.environ.get('DB_PASSWORD', ''),
    "port":     os.environ.get('DB_PORT', '5432'),
}



# Firebase (placeholder — wired in Day 10)
FIREBASE_CREDENTIALS_PATH = os.environ.get('FIREBASE_CREDENTIALS', 'firebase/serviceAccountKey.json')
FIREBASE_STORAGE_BUCKET   = os.environ.get('FIREBASE_BUCKET', 'your-project.appspot.com')

# Upload settings
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'txt', 'zip', 'png', 'jpg', 'jpeg'}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB

# Cloudflare R2 (S3 Compatible)
R2_BUCKET = os.environ.get('R2_BUCKET', 'gikicoursehub')
R2_ENDPOINT_URL = os.environ.get('R2_ENDPOINT_URL', '')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY', '')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY', '')
R2_PUBLIC_URL_PREFIX = os.environ.get('R2_PUBLIC_URL_PREFIX', '')
