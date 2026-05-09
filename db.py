import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(override=True)

def get_connection():
    """Returns a new psycopg2 connection using environment variables."""
    host = os.environ.get('DB_HOST')
    user = os.environ.get('DB_USER')
    print(f"DEBUG: Connecting to {host} as user {user}...")
    return psycopg2.connect(
        host=host,
        database=os.environ.get('DB_NAME'),
        user=user,
        password=os.environ.get('DB_PASSWORD'),
        port=os.environ.get('DB_PORT')
    )