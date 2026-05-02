-- =====================================
-- Migration: User Profiles table
-- Stores additional account information collected at sign-up
-- =====================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS student_id   TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS batch_year   INT,
    ADD COLUMN IF NOT EXISTS program      TEXT,
    ADD COLUMN IF NOT EXISTS bio          TEXT,
    ADD COLUMN IF NOT EXISTS photo_url    TEXT,
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Trigger to auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for lookups by student ID
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_batch_year  ON users(batch_year);
