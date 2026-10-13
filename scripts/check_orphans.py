import os
import boto3
import db
from dotenv import load_dotenv

load_dotenv(override=True)

r2_endpoint = os.environ.get('R2_ENDPOINT_URL')
r2_access = os.environ.get('R2_ACCESS_KEY')
r2_secret = os.environ.get('R2_SECRET_KEY')
r2_bucket = os.environ.get('R2_BUCKET')

print("Connecting to R2...")
s3 = boto3.client(
    's3',
    endpoint_url=r2_endpoint,
    aws_access_key_id=r2_access,
    aws_secret_access_key=r2_secret,
    region_name='auto'
)

# Paginate to get all objects in R2
r2_files = set()
paginator = s3.get_paginator('list_objects_v2')
for page in paginator.paginate(Bucket=r2_bucket):
    if 'Contents' in page:
        for obj in page['Contents']:
            r2_files.add(obj['Key'])

print(f"Found {len(r2_files)} total files in R2 bucket.")

print("Connecting to PostgreSQL using db.py...")
conn = db.get_connection()
cur = conn.cursor()
cur.execute("SELECT storage_path FROM files WHERE storage_path IS NOT NULL;")
db_files = set(row[0] for row in cur.fetchall())
cur.close()
conn.close()

print(f"Found {len(db_files)} files in Database.")

orphans = r2_files - db_files
print(f"Found {len(orphans)} orphaned files (in R2 but missing from DB).")

if orphans:
    print(f"\nDeleting {len(orphans)} orphaned files...")
    for f in orphans:
        print(" - Deleting", f)
        s3.delete_object(Bucket=r2_bucket, Key=f)
    print("Cleanup complete!")

