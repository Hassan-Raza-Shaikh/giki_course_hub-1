-- ============================================================
-- Migration 027: 2025 prospectus course catalogue
--
-- Courses now carry both plans. A course in both keeps one row (so its
-- uploads, bookmarks and links stay) with its 2025 code, name and semester,
-- and the values earlier batches knew it by in old_code / old_name /
-- old_semester (NULL when unchanged).
--   curriculum = 'both'  in the 2025 plan and the earlier one
--                '2025'  new in the 2025 plan
--                'old'   only taken by earlier batches
-- Also adds the prospectus description, credit hours and prerequisites.
--
-- The course data itself is loaded by sql/prospectus_2025/apply_catalog_2025.sql,
-- run after this file.
-- ============================================================

BEGIN;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS old_code     TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS old_name     TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS old_semester INT CHECK (old_semester BETWEEN 1 AND 8);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS curriculum   TEXT NOT NULL DEFAULT 'both'
    CHECK (curriculum IN ('both', '2025', 'old'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS credit_hours INT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prereq       TEXT;

CREATE INDEX IF NOT EXISTS idx_courses_old_code ON courses(old_code);

-- Course tree for the Courses page, for one plan.
-- '2025' (default): courses in the 2025 plan, by their 2025 semester.
-- 'old': what earlier batches took, by their old code, name and semester.
-- Each course also has alt_code: its code in the other plan, when different.
DROP FUNCTION IF EXISTS get_api_courses_hierarchy();
DROP FUNCTION IF EXISTS get_api_courses_hierarchy(TEXT);
CREATE FUNCTION get_api_courses_hierarchy(p_curriculum TEXT DEFAULT '2025')
RETURNS jsonb AS $$
    WITH v AS (
        SELECT c.course_id, c.program_id, c.curriculum,
               CASE WHEN p_curriculum = 'old' THEN COALESCE(c.old_code, c.code) ELSE c.code END AS code,
               CASE WHEN p_curriculum = 'old' THEN COALESCE(c.old_name, c.name) ELSE c.name END AS name,
               CASE WHEN p_curriculum = 'old' THEN COALESCE(c.old_semester, c.semester) ELSE c.semester END AS semester,
               CASE WHEN p_curriculum = 'old' THEN (CASE WHEN c.old_code IS NOT NULL THEN c.code END)
                    ELSE c.old_code END AS alt_code
          FROM courses c
         WHERE c.curriculum IN ('both', CASE WHEN p_curriculum = 'old' THEN 'old' ELSE '2025' END)
    ),
    sem AS (
        SELECT program_id, semester,
               jsonb_agg(jsonb_build_object(
                   'id', course_id, 'name', name, 'code', code,
                   'year', (semester + 1) / 2, 'semester', semester,
                   'alt_code', alt_code, 'curriculum', curriculum
               ) ORDER BY name) AS courses
          FROM v GROUP BY program_id, semester
    ),
    yr AS (
        SELECT program_id, (semester + 1) / 2 AS year,
               jsonb_agg(jsonb_build_object('semester', semester, 'courses', courses) ORDER BY semester) AS semesters
          FROM sem GROUP BY program_id, (semester + 1) / 2
    ),
    pr AS (
        SELECT p.faculty_id,
               jsonb_agg(jsonb_build_object(
                   'id', p.program_id, 'name', p.name,
                   'years', (SELECT jsonb_agg(jsonb_build_object('year', yr.year, 'semesters', yr.semesters)
                                              ORDER BY yr.year)
                               FROM yr WHERE yr.program_id = p.program_id)
               ) ORDER BY p.program_id) AS programs
          FROM programs p
         WHERE EXISTS (SELECT 1 FROM v WHERE v.program_id = p.program_id)
         GROUP BY p.faculty_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', f.faculty_id, 'name', f.name, 'full_name', f.full_name, 'icon', f.icon,
               'programs', COALESCE(pr.programs, '[]'::jsonb)
           ) ORDER BY f.faculty_id), '[]'::jsonb)
      FROM faculties f
      LEFT JOIN pr ON pr.faculty_id = f.faculty_id;
$$ LANGUAGE sql STABLE;

COMMIT;
