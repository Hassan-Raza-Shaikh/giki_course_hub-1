-- =====================================
-- Migration: Add GPA Privacy
-- =====================================

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS gpa_public BOOLEAN DEFAULT false;
