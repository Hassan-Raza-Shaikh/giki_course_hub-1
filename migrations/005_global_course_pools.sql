-- =========================================================
-- Migration 005: Global Course Pools
-- Description: Unlinks files from rigid subjects and maps
--              them directly to a global course_code pool.
-- =========================================================

BEGIN;

-- 1. Add new column to files
ALTER TABLE files ADD COLUMN IF NOT EXISTS course_code TEXT;

-- 2. Migrate existing data (if any) to the course code
-- UPDATE files f ... (skipped for fresh DBs since subjects doesn't exist)

-- 3. Remove constraints tied to subject_id
ALTER TABLE files DROP CONSTRAINT IF EXISTS unique_file;
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_subject_id_fkey;

-- 4. Drop the old column
ALTER TABLE files DROP COLUMN IF EXISTS subject_id;

-- 5. Drop the obsolete subjects table (CASCADE drops views/triggers if any exist)
DROP TABLE IF EXISTS subjects CASCADE;

-- 6. Add the new uniqueness constraint logic based on the code pool
-- Need to check if it exists before adding, or just let 014 handle the final constraint
-- We will drop it here and add it back
ALTER TABLE files DROP CONSTRAINT IF EXISTS unique_file;
ALTER TABLE files ADD CONSTRAINT unique_file UNIQUE (title, course_code, category_id);

-- 7. Add index for extremely fast retrieval during global pool loading
CREATE INDEX IF NOT EXISTS idx_files_course_code ON files(course_code);

COMMIT;
