-- ============================================================
-- Migration 031: "Possibly misfiled" admin list
--
-- Files an admin has checked and marked as correctly filed, so the list
-- (GET /api/admin/misfiled) stops showing them. Removing a row brings the
-- file back. Deleting the file removes its row.
-- Safe to run twice.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS misfile_dismissals (
    file_id      INT PRIMARY KEY REFERENCES files(file_id) ON DELETE CASCADE,
    course_code  TEXT,             -- the course it was checked under; moving the file shows it again
    dismissed_by TEXT,
    dismissed_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE misfile_dismissals ENABLE ROW LEVEL SECURITY;

COMMIT;
