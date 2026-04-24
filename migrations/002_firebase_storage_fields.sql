-- 002_firebase_storage_fields.sql
-- Adds storage_path to files table so we can delete from Firebase Storage later.

ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_path TEXT;
