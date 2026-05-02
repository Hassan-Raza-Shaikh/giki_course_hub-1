-- =====================================
-- Migration 009: Revamp categories + add is_lab to courses
-- =====================================

-- 1. Clear all uploaded material (files, metadata, bookmarks)
DELETE FROM bookmarks;
DELETE FROM file_metadata;
DELETE FROM files;

-- 2. Add is_lab flag to courses (true if course code ends with 'L')
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_lab BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE courses SET is_lab = TRUE  WHERE code ILIKE '%L';
UPDATE courses SET is_lab = FALSE WHERE NOT (code ILIKE '%L');

-- 3. Add is_lab_category to categories table (so we know which categories apply to lab/non-lab)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_lab_category BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Replace all old categories with the new set
TRUNCATE categories RESTART IDENTITY CASCADE;

INSERT INTO categories (category_id, name, is_lab_category) VALUES
  (1, 'Outline',          FALSE),
  (2, 'Notes',            FALSE),
  (3, 'Slides',           FALSE),
  (4, 'Quizzes',          FALSE),
  (5, 'Assignments',      FALSE),
  (6, 'Lab Manuals',      TRUE),
  (7, 'Lab Tasks',        TRUE),
  (8, 'Reference Books',  FALSE)
ON CONFLICT (category_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('categories', 'category_id'), 8, true);
