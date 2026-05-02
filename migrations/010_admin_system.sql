-- =====================================
-- Migration 010: Admin system
-- =====================================

-- 1. Admins table — stores email of every privileged user
CREATE TABLE IF NOT EXISTS admins (
    admin_id    SERIAL PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    granted_by  TEXT NOT NULL DEFAULT 'system',   -- email of the admin who granted access
    granted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes       TEXT                               -- optional: role description
);

-- 2. Admin activity log — full audit trail
CREATE TABLE IF NOT EXISTS admin_logs (
    log_id      SERIAL PRIMARY KEY,
    admin_email TEXT NOT NULL,
    action      TEXT NOT NULL,   -- 'approve_file', 'reject_file', 'delete_file', 'grant_admin', 'revoke_admin'
    target_id   INT,             -- file_id, user_id, etc.
    target_desc TEXT,            -- human-readable target name
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Files uploaded by users start as 'pending' — only approved ones are visible
-- (existing files stay approved; new uploads via the user form will be 'pending')
-- Add rejection fields to files
ALTER TABLE files ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS reviewed_by TEXT;   -- admin email
ALTER TABLE files ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

-- Index for fast pending-file queries
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);

-- 4. Seed: bootstrap first admin (replace with your email)
-- INSERT INTO admins (email, granted_by, notes) VALUES ('your@email.com', 'system', 'Superadmin');
