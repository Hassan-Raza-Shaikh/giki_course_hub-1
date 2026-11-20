import os
import boto3
import psycopg2
import hashlib
from dotenv import load_dotenv

load_dotenv()

# DB Config
DB_URL = os.environ.get('DATABASE_URL')

# R2 Config
R2_ENDPOINT_URL = os.environ.get('R2_ENDPOINT_URL')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY')
R2_BUCKET = os.environ.get('R2_BUCKET')

def compute_hash_from_stream(stream):
    hasher = hashlib.sha256()
    for chunk in iter(lambda: stream.read(8192), b''):
        hasher.update(chunk)
    return hasher.hexdigest()

def backfill_hashes():
    print("Connecting to DB...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    print("Connecting to R2...")
    s3 = boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        region_name='auto'
    )
    
    cur.execute("SELECT file_id, storage_path, title FROM files WHERE content_hash IS NULL;")
    rows = cur.fetchall()
    print(f"Found {len(rows)} files missing hashes.")
    
    updated_count = 0
    error_count = 0
    
    for file_id, storage_path, title in rows:
        print(f"Processing ID {file_id}: {title} ({storage_path})")
        
        # In case storage_path is empty (e.g. some manual db insert or error)
        if not storage_path:
            print("  -> SKIPPED (no storage_path)")
            error_count += 1
            continue
            
        try:
            # Download file to a temp local file to avoid holding too much in memory
            local_path = f"/tmp/backfill_{file_id}.tmp"
            s3.download_file(R2_BUCKET, storage_path, local_path)
            
            # Compute hash
            with open(local_path, 'rb') as f:
                file_hash = compute_hash_from_stream(f)
                
            # Update DB
            cur.execute("UPDATE files SET content_hash = %s WHERE file_id = %s;", (file_hash, file_id))
            conn.commit()
            
            # Clean up
            os.remove(local_path)
            
            updated_count += 1
            print(f"  -> SUCCESS (Hash: {file_hash[:8]}...)")
            
        except Exception as e:
            print(f"  -> ERROR: {e}")
            error_count += 1
            
    print(f"\nCompleted! Updated: {updated_count}, Errors: {error_count}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    backfill_hashes()
