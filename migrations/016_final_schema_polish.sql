-- =====================================
-- Migration 016: Final Schema Polish
-- =====================================

-- 1. Add icon column to courses table (Admin panel expects this)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📘';

-- 2. Ensure files table has rejection tracking (redundant safety check)
ALTER TABLE files ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
