-- =====================================
-- Migration 007: Dedicated native sign-up profile table
-- Only populated when a user registers via email/password.
-- Google/Firebase-only users will NOT have a row here.
-- The users table remains the universal log for all authenticated users.
-- =====================================

CREATE TABLE IF NOT EXISTS user_profiles (
    profile_id   SERIAL PRIMARY KEY,
    user_id      INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Identity
    display_name TEXT NOT NULL,
    student_id   TEXT UNIQUE,                         -- e.g. "2021-CS-001"
    batch_year   INT  CHECK (batch_year BETWEEN 2000 AND 2100),
    program      TEXT,                                -- e.g. "BS Computer Science"

    -- Optional extras (filled in or updated later)
    bio          TEXT,
    phone        TEXT,

    -- Timestamps
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_user_profiles_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_student_id ON user_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_batch_year  ON user_profiles(batch_year);
CREATE INDEX IF NOT EXISTS idx_user_profiles_program     ON user_profiles(program);
