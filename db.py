import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(override=True)

def get_connection():
    """Returns a new psycopg2 connection using DATABASE_URL or individual env vars."""
    db_url = os.environ.get('DATABASE_URL')
    
    if db_url:
        print("DEBUG: Connecting using DATABASE_URL...")
        return psycopg2.connect(db_url)
    
    # Fallback to individual variables
    host = os.environ.get('DB_HOST', 'localhost')
    user = os.environ.get('DB_USER', 'postgres')
    print(f"DEBUG: Connecting to {host} as user {user}...")
    
    return psycopg2.connect(
        host=host,
        database=os.environ.get('DB_NAME', 'giki_course_hub'),
        user=user,
        password=os.environ.get('DB_PASSWORD', ''),
        port=os.environ.get('DB_PORT', '5432')
    )