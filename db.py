import os
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv(override=True)

class PooledConnection:
    def __init__(self, db_pool, conn):
        self._pool = db_pool
        self._conn = conn

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def close(self):
        if self._conn:
            self._pool.putconn(self._conn)
            self._conn = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

_db_pool = None

def init_pool():
    global _db_pool
    if _db_pool is not None:
        return

    db_url = os.environ.get('DATABASE_URL')
    
    try:
        if db_url:
            _db_pool = pool.ThreadedConnectionPool(1, 20, db_url)
        else:
            _db_pool = pool.ThreadedConnectionPool(
                1, 20,
                host=os.environ.get('DB_HOST', 'localhost'),
                database=os.environ.get('DB_NAME', 'giki_course_hub'),
                user=os.environ.get('DB_USER', 'postgres'),
                password=os.environ.get('DB_PASSWORD', ''),
                port=os.environ.get('DB_PORT', '5432')
            )
    except Exception as e:
        if db_url and "could not translate host name" in str(e):
            # DNS Resolution failed. Fallback to direct IP for Supabase Pooler
            _db_pool = pool.ThreadedConnectionPool(1, 20, db_url, hostaddr='13.213.241.248')
        else:
            raise e

def get_connection():
    """Returns a connection from the ThreadedConnectionPool wrapped to intercept close()."""
    if _db_pool is None:
        init_pool()
    conn = _db_pool.getconn()
    return PooledConnection(_db_pool, conn)