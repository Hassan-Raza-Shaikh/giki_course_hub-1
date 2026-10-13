import psycopg2
import psycopg2.extras
import json

import os
from dotenv import load_dotenv

load_dotenv(override=True)

# Expects SOURCE_DATABASE_URL and STAGING_DATABASE_URL in .env
source_url = os.environ.get("SOURCE_DATABASE_URL")
target_url = os.environ.get("STAGING_DATABASE_URL")

if not source_url or not target_url:
    print("Error: SOURCE_DATABASE_URL and STAGING_DATABASE_URL must be set in .env")
    exit(1)

def copy_data():
    print("Connecting to databases...")
    conn_src = psycopg2.connect(source_url)
    conn_dst = psycopg2.connect(target_url)
    
    cur_src = conn_src.cursor()
    cur_dst = conn_dst.cursor()
    
    print("Fetching tables...")
    cur_src.execute("""
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
    """)
    tables = [r[0] for r in cur_src.fetchall()]
    
    if not tables:
        print("No tables found.")
        return
        
    print(f"Found {len(tables)} tables: {', '.join(tables)}")
    
    print("Truncating destination tables...")
    truncate_sql = "TRUNCATE TABLE " + ", ".join([f'"{t}"' for t in tables]) + " CASCADE;"
    cur_dst.execute(truncate_sql)
    
    print("Disabling triggers...")
    cur_dst.execute("SET session_replication_role = 'replica';")
    
    for table in tables:
        print(f"Copying {table}...")
        cur_src.execute(f'SELECT * FROM "{table}";')
        rows = cur_src.fetchall()
        
        if not rows:
            print(f"  No rows in {table}.")
            continue
            
        print(f"  Found {len(rows)} rows. Inserting...")
        colnames = [desc[0] for desc in cur_src.description]
        col_str = '", "'.join(colnames)
        
        processed_rows = []
        for row in rows:
            processed_row = tuple(psycopg2.extras.Json(val) if isinstance(val, (dict, list)) else val for val in row)
            processed_rows.append(processed_row)
            
        insert_query = f'INSERT INTO "{table}" ("{col_str}") VALUES %s'
        psycopg2.extras.execute_values(cur_dst, insert_query, processed_rows)
        
    print("Re-enabling triggers...")
    cur_dst.execute("SET session_replication_role = 'origin';")
    conn_dst.commit()
    
    cur_src.close()
    cur_dst.close()
    conn_src.close()
    conn_dst.close()
    print("Database copy completed successfully!")

if __name__ == "__main__":
    copy_data()
