import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(override=True)

def get_connection():
    """Returns a new psycopg2 connection using DATABASE_URL or individual env vars."""
    db_url = os.environ.get('DATABASE_URL')
    
    if db_url:
        # Connect using DATABASE_URL
        try:
            return psycopg2.connect(db_url)
        except Exception as e:
            if "could not translate host name" in str(e):
                # DNS Resolution failed. Attempting IP-level connection fallback.
                # Force resolution for the known Supabase Singapore Pooler IP
                # We use the 'host' for routing and 'hostaddr' for the actual IP
                return psycopg2.connect(
                    db_url, 
                    hostaddr='13.213.241.248' # Direct IP for aws-1-ap-southeast-1.pooler.supabase.com
                )
            raise e
    
    # Fallback to individual variables
    host = os.environ.get('DB_HOST', 'localhost')
    user = os.environ.get('DB_USER', 'postgres')
    # Establishing connection...
    
    return psycopg2.connect(
        host=host,
        database=os.environ.get('DB_NAME', 'giki_course_hub'),
        user=user,
        password=os.environ.get('DB_PASSWORD', ''),
        port=os.environ.get('DB_PORT', '5432')
    )