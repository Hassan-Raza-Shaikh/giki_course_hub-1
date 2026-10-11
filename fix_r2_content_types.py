"""
One-off: rewrite the Content-Type of files already in R2 so it comes from the
file extension (see utils/validators.safe_content_type) instead of whatever the
uploader's browser sent. Uploads made after this change are already stored this way.

Dry run by default; pass --apply to actually update the objects.
    python fix_r2_content_types.py
    python fix_r2_content_types.py --apply
"""
import os
import sys
import boto3
import psycopg2
from dotenv import load_dotenv

from utils.validators import safe_content_type, get_file_extension

load_dotenv()

DB_URL = os.environ.get('DATABASE_URL')
R2_ENDPOINT_URL = os.environ.get('R2_ENDPOINT_URL')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY')
R2_BUCKET = os.environ.get('R2_BUCKET')


def fix_content_types(apply):
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    s3 = boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        region_name='auto'
    )

    cur.execute("SELECT file_id, storage_path FROM files WHERE storage_path IS NOT NULL AND storage_path != '';")
    rows = cur.fetchall()
    print(f"Checking {len(rows)} files ({'APPLY' if apply else 'dry run'})...")

    changed = errors = 0
    for file_id, storage_path in rows:
        wanted = safe_content_type(get_file_extension(storage_path))
        try:
            current = s3.head_object(Bucket=R2_BUCKET, Key=storage_path).get('ContentType', '')
            if current == wanted:
                continue
            print(f"  {file_id}: {storage_path}  {current!r} -> {wanted!r}")
            changed += 1
            if apply:
                s3.copy_object(
                    Bucket=R2_BUCKET, Key=storage_path,
                    CopySource={'Bucket': R2_BUCKET, 'Key': storage_path},
                    ContentType=wanted, MetadataDirective='REPLACE',
                )
                cur.execute("UPDATE file_metadata SET file_type = %s WHERE file_id = %s;", (wanted, file_id))
                conn.commit()
        except Exception as e:
            errors += 1
            print(f"  {file_id}: {storage_path}  ERROR {e}")

    cur.close(); conn.close()
    print(f"Done. {'Updated' if apply else 'Would update'} {changed}, errors {errors}.")


if __name__ == '__main__':
    fix_content_types(apply='--apply' in sys.argv)
