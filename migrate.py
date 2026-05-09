import os
import glob
from db import get_connection

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), 'migrations')

def init_migrations(cur):
    """Ensure the schema_migrations table exists."""
    cur.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            migration_name TEXT UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

def get_applied_migrations(cur):
    cur.execute("SELECT migration_name FROM schema_migrations;")
    return {row[0] for row in cur.fetchall()}

def run_migrations():
    conn = get_connection()
    try:
        cur = conn.cursor()
        init_migrations(cur)
        conn.commit()

        applied = get_applied_migrations(cur)
        
        # Determine if this is a fresh setup where we shouldn't fail if 001_baseline runs
        cur.execute("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';")
        has_users = bool(cur.fetchone())

        if has_users and '001_baseline.sql' not in applied:
            # We are applying migrations to a database that already has the baseline schema!
            # Mark 001 as applied silently.
            cur.execute("INSERT INTO schema_migrations (migration_name) VALUES ('001_baseline.sql');")
            conn.commit()
            applied.add('001_baseline.sql')

        migration_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, '*.sql')))
        
        count = 0
        for filepath in migration_files:
            filename = os.path.basename(filepath)
            if filename not in applied:
                print(f"Applying {filename}...")
                with open(filepath, 'r') as f:
                    sql = f.read()
                
                cur.execute(sql)
                cur.execute("INSERT INTO schema_migrations (migration_name) VALUES (%s);", (filename,))
                conn.commit()
                count += 1
                
        if count == 0:
            print("All migrations up to date.")
        else:
            print(f"Successfully applied {count} migrations.")
            
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    run_migrations()
