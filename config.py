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
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB (Flask-level cap, must be >= largest allowed single file)

# Per-file size limits (enforced by application logic)
DEFAULT_MAX_FILE_SIZE  = 10 * 1024 * 1024   # 10 MB for most categories
REFERENCE_MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB for Reference (books are heavy)
REFERENCE_CATEGORY_NAME = 'Reference'       # Must match the category name in the DB

# Bulk upload settings
BULK_MAX_FILES       = 10                          # Max files per bulk batch
BULK_MAX_TOTAL_SIZE  = 200 * 1024 * 1024           # 200 MB total per bulk upload
BULK_BATCH_TTL       = 30 * 60                     # 30 minutes before a batch expires
BULK_RATE_LIMIT      = "3 per hour"                # Per-user rate limit for bulk init

# Cloudflare R2 (S3 Compatible)
R2_BUCKET = os.environ.get('R2_BUCKET', 'gikicoursehub')
R2_ENDPOINT_URL = os.environ.get('R2_ENDPOINT_URL', '')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY', '')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY', '')
R2_PUBLIC_URL_PREFIX = os.environ.get('R2_PUBLIC_URL_PREFIX', '')
