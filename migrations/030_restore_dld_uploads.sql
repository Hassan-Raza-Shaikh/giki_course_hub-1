-- ============================================================
-- Migration 030: put Digital Logic Design uploads back under CS221
--
-- The 2025 catalogue script (sql/prospectus_2025/apply_catalog_2025.sql,
-- step 5) assumed uploads under CS221 / CS221L were Data Structures, because
-- the old catalogue listed DSA as CS221, and moved them to CS222 / CS222L.
-- They were in fact Digital Logic Design: every one is by a DLD instructor
-- (Adnan Shah, Salman Ashraf, Ahsan Shah, Qadeer ul Hasan, M. Abu Bakar) or a
-- DLD topic (Canonical Forms, Combinational Logic). So since the rollout the
-- DSA page shows DLD files, and the DLD page (CS221 / CE221) shows none.
--
-- This moves exactly those files back, using the record the script kept in
-- files_course_code_backup_027 (49 files: 46 CS221, 3 CS221L). Files that
-- were already on CS222 before the rollout, and anything uploaded since, are
-- not touched. A file is only moved if it is still where the script put it.
--
-- Each move is recorded in files_course_code_backup_030 so it can be undone:
--   UPDATE files f SET course_code = b.old_course_code
--     FROM files_course_code_backup_030 b
--    WHERE f.file_id = b.file_id AND f.course_code = b.new_course_code;
-- Safe to run twice; the second run changes nothing.
-- ============================================================

BEGIN;

-- Made by the catalogue script; created empty here so a fresh database
-- built from migrations/ (CI) can run this file too
CREATE TABLE IF NOT EXISTS files_course_code_backup_027 (file_id INT PRIMARY KEY, old_course_code TEXT, new_course_code TEXT, moved_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE IF NOT EXISTS files_course_code_backup_030 (
    file_id         INT PRIMARY KEY,
    old_course_code TEXT,
    new_course_code TEXT,
    moved_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE files_course_code_backup_030 ENABLE ROW LEVEL SECURITY;

INSERT INTO files_course_code_backup_030 (file_id, old_course_code, new_course_code)
SELECT f.file_id, f.course_code, b.old_course_code
  FROM files f
  JOIN files_course_code_backup_027 b ON b.file_id = f.file_id
 WHERE (b.old_course_code, b.new_course_code) IN (('CS221', 'CS222'), ('CS221L', 'CS222L'))
   AND f.course_code = b.new_course_code
ON CONFLICT (file_id) DO NOTHING;

UPDATE files f SET course_code = b.new_course_code
  FROM files_course_code_backup_030 b
 WHERE f.file_id = b.file_id AND f.course_code = b.old_course_code;

COMMIT;

-- Check (expect CS221 46, CS221L 3 after the first run):
-- SELECT course_code, COUNT(*) FROM files WHERE course_code IN ('CS221','CS221L','CS222','CS222L') GROUP BY 1 ORDER BY 1;
