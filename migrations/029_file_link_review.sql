-- ============================================================
-- Migration 029: shared-file links go through review
-- A re-upload of a file that already exists elsewhere (or a manual cross-link)
-- becomes a link row instead of a new file. Until now those links went live
-- straight away, with the uploader's own title. Links from non-admins now start
-- 'pending' and appear in the admin review queue; existing links stay approved.
-- Safe to run more than once.
-- ============================================================

BEGIN;

ALTER TABLE file_course_links
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_course_links_status_check') THEN
        ALTER TABLE file_course_links
            ADD CONSTRAINT file_course_links_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- (content_hash, used to spot re-uploads, came from sql/002_bulk_upload.sql and
-- was never a numbered migration; already there in production)
ALTER TABLE files ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_files_content_hash ON files(content_hash);

CREATE INDEX IF NOT EXISTS idx_fcl_pending ON file_course_links(linked_at) WHERE status = 'pending';

-- Course page files: same as 028, but only approved links are listed
CREATE OR REPLACE FUNCTION get_api_course_files(p_course_id INT)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    v_code TEXT;
    v_name TEXT;
BEGIN
    -- Fetch both code and name so we can match files uploaded either way
    SELECT COALESCE(code, name), name
      INTO v_code, v_name
      FROM courses
     WHERE course_id = p_course_id;

    SELECT 
        COALESCE(
            jsonb_object_agg(
                cat_group.category,
                cat_group.files
            ) FILTER (WHERE cat_group.category IS NOT NULL), 
            '{}'::jsonb
        ) INTO result
    FROM (
        WITH RECURSIVE course_aliases AS (
            -- Base cases
            SELECT code::text AS course_code FROM courses WHERE name = v_name AND code IS NOT NULL
            UNION
            SELECT v_name::text AS course_code
            
            UNION
            
            -- Recursive step
            SELECT 
                CASE 
                    WHEN mcl.course_code_1 = ca.course_code THEN mcl.course_code_2
                    ELSE mcl.course_code_1
                END
            FROM manual_course_links mcl
            INNER JOIN course_aliases ca 
                ON mcl.course_code_1 = ca.course_code OR mcl.course_code_2 = ca.course_code
        ),
        matched_files AS (
            -- Native files
            SELECT f.file_id, COALESCE(cat.name, 'General') AS category_name, f.category_id, f.title, 
                   (f.course_code != v_code AND f.course_code != v_name) AS is_shared,
                   CASE WHEN (f.course_code != v_code AND f.course_code != v_name) THEN f.course_code ELSE null::text END AS shared_from
            FROM files f
            LEFT JOIN categories cat ON f.category_id = cat.category_id
            WHERE f.course_code IN (SELECT course_code FROM course_aliases)
              AND f.status = 'approved'
            
            UNION ALL
            
            -- Files explicitly linked via file_course_links
            SELECT fcl.file_id, COALESCE(link_cat.name, 'General') AS category_name, fcl.category_id, COALESCE(fcl.custom_title, f.title) AS title,
                   true AS is_shared,
                   origin_c.code AS shared_from
            FROM file_course_links fcl
            JOIN files f ON f.file_id = fcl.file_id
            LEFT JOIN courses origin_c ON origin_c.code = f.course_code OR origin_c.name = f.course_code
            LEFT JOIN categories link_cat ON link_cat.category_id = fcl.category_id
            WHERE fcl.course_id = p_course_id
              AND fcl.status = 'approved'
              AND f.status = 'approved'
        ),
        unique_files AS (
            SELECT DISTINCT ON (file_id) *
            FROM matched_files
        )
        SELECT 
            uf.category_name AS category,
            jsonb_agg(
                jsonb_build_object(
                    'id', uf.file_id,
                    'file_id', uf.file_id,
                    'title', uf.title,
                    'category', uf.category_name,
                    'category_id', uf.category_id,
                    'uploader', u.username,
                    'date', f.upload_date,
                    'file_url', f.file_url,
                    'file_size', m.file_size,
                    'file_type', m.file_type,
                    'admin_note', fn.note_text,
                    'instructor_name', i.name,
                    'instructor_id', f.instructor_id,
                    'is_shared', uf.is_shared,
                    'shared_from', uf.shared_from,
                    'downloads', (SELECT COUNT(*) FROM file_downloads d WHERE d.file_id = f.file_id)
                ) ORDER BY uf.title ASC
            ) AS files
        FROM unique_files uf
        JOIN files f ON uf.file_id = f.file_id
        LEFT JOIN users u ON f.uploaded_by = u.user_id
        LEFT JOIN file_metadata m ON f.file_id = m.file_id
        LEFT JOIN file_notes fn ON fn.file_id = f.file_id
        LEFT JOIN instructors i ON f.instructor_id = i.instructor_id
        GROUP BY uf.category_name
    ) cat_group;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;

-- Check: SELECT status, COUNT(*) FROM file_course_links GROUP BY 1;
