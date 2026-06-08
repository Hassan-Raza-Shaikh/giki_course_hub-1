-- 020_user_type.sql
-- Adds user_type to user_profiles so we can distinguish students from
-- faculty, graduates, and external contributors.

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS user_type TEXT
        CHECK (user_type IN ('student', 'faculty', 'graduate', 'external'))
        DEFAULT 'student';

-- Also add user_type directly on the users table as a fast lookup
-- (mirrored via trigger below so they stay in sync)
ALTER TABLE user_profiles ALTER COLUMN user_type SET DEFAULT 'student';

-- Update any existing rows to have a default user_type
UPDATE user_profiles SET user_type = 'student' WHERE user_type IS NULL;
