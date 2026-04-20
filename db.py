import psycopg2
from config import DB_CONFIG

def get_connection():
    """Returns a new psycopg2 connection. Caller is responsible for closing it."""
    return psycopg2.connect(**DB_CONFIG)