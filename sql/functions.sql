-- ==========================================
-- FUNCTIONS (PL/pgSQL)
-- ==========================================

-- =====================================
-- 1. API: GET COURSES HIERARCHY (JSON)
-- =====================================
CREATE OR REPLACE FUNCTION get_api_courses_hierarchy()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_agg(fac_obj) INTO result
    FROM (
        SELECT jsonb_build_object(
            'id', f.faculty_id,
            'name', f.name,
            'full_name', f.full_name,
            'icon', f.icon,
            'programs', COALESCE((
                SELECT jsonb_agg(prog_obj)
                FROM (
                    SELECT jsonb_build_object(
                        'id', p.program_id,
                        'name', p.name,
                        'years', COALESCE((
                            SELECT jsonb_agg(year_obj)
                            FROM (
                                SELECT jsonb_build_object(
                                    'year', c.year,
                                    'semesters', (
                                        SELECT jsonb_agg(sem_obj)
                                        FROM (
                                            SELECT jsonb_build_object(
                                                'semester', c2.semester,
                                                'courses', (
                                                    SELECT jsonb_agg(course_obj)
                                                    FROM (
                                                        SELECT jsonb_build_object(
                                                            'id', c3.course_id,
                                                            'name', c3.name,
                                                            'code', c3.code,
                                                            'year', c3.year,
                                                            'semester', c3.semester
                                                        ) AS course_obj
                                                        FROM courses c3
                                                        WHERE c3.program_id = p.program_id 
                                                          AND c3.year = c.year 
                                                          AND c3.semester = c2.semester
                                                        ORDER BY c3.name
                                                    ) sub
                                                )
                                            ) AS sem_obj
                                            FROM courses c2
                                            WHERE c2.program_id = p.program_id AND c2.year = c.year
                                            GROUP BY c2.semester
                                            ORDER BY c2.semester
                                        ) sub_sem
                                    )
                                ) AS year_obj
                                FROM courses c
                                WHERE c.program_id = p.program_id
                                GROUP BY c.year
                                ORDER BY c.year
                            ) sub_year
                        ), '[]'::jsonb)
                    ) AS prog_obj
                    FROM programs p
                    WHERE p.faculty_id = f.faculty_id
                    ORDER BY p.program_id
                ) sub_prog
            ), '[]'::jsonb)
        ) AS fac_obj
        FROM faculties f
        ORDER BY f.faculty_id
    ) sub_fac;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;


-- =====================================
-- 2. API: GET COURSE FILES BY CATEGORY (JSON)
-- =====================================
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
        SELECT 
            COALESCE(cat.name, 'General') AS category,
            jsonb_agg(
                jsonb_build_object(
                    'id', f.file_id,
                    'file_id', f.file_id,
                    'title', f.title,
                    'category', COALESCE(cat.name, 'General'),
                    'category_id', f.category_id,
                    'uploader', u.username,
                    'date', f.upload_date,
                    'file_url', f.file_url,
                    'file_size', m.file_size,
                    'file_type', m.file_type,
                    'admin_note', fn.note_text,
                    'instructor_name', i.name,
                    'instructor_id', f.instructor_id,
                    'is_shared', false,
                    'shared_from', null::text,
                    'downloads', COALESCE(fd.download_count, 0)
                ) ORDER BY f.title ASC
            ) AS files
        FROM files f
        LEFT JOIN categories cat ON f.category_id = cat.category_id
        LEFT JOIN users u ON f.uploaded_by = u.user_id
        LEFT JOIN file_metadata m ON f.file_id = m.file_id
        LEFT JOIN file_notes fn ON fn.file_id = f.file_id
        LEFT JOIN instructors i ON f.instructor_id = i.instructor_id
        LEFT JOIN (
            SELECT file_id, COUNT(*) AS download_count
            FROM file_downloads
            GROUP BY file_id
        ) fd ON f.file_id = fd.file_id
        WHERE (f.course_code = v_code OR f.course_code = v_name)
          AND f.status = 'approved'
        GROUP BY COALESCE(cat.name, 'General')

        UNION ALL

        -- Cross-linked files from other courses
        SELECT 
            COALESCE(link_cat.name, 'General') AS category,
            jsonb_agg(
                jsonb_build_object(
                    'id', f.file_id,
                    'file_id', f.file_id,
                    'title', COALESCE(fcl.custom_title, f.title),
                    'category', COALESCE(link_cat.name, 'General'),
                    'category_id', fcl.category_id,
                    'uploader', u.username,
                    'date', f.upload_date,
                    'file_url', f.file_url,
                    'file_size', m.file_size,
                    'file_type', m.file_type,
                    'admin_note', fn.note_text,
                    'instructor_name', i.name,
                    'instructor_id', f.instructor_id,
                    'is_shared', true,
                    'shared_from', origin_c.code,
                    'downloads', COALESCE(fd.download_count, 0)
                ) ORDER BY COALESCE(fcl.custom_title, f.title) ASC
            ) AS files
        FROM file_course_links fcl
        JOIN files f          ON f.file_id      = fcl.file_id
        JOIN courses origin_c ON origin_c.code  = f.course_code
                              OR origin_c.name  = f.course_code
        LEFT JOIN categories link_cat ON link_cat.category_id = fcl.category_id
        LEFT JOIN users u             ON f.uploaded_by = u.user_id
        LEFT JOIN file_metadata m     ON f.file_id = m.file_id
        LEFT JOIN file_notes fn       ON fn.file_id = f.file_id
        LEFT JOIN instructors i       ON f.instructor_id = i.instructor_id
        LEFT JOIN (
            SELECT file_id, COUNT(*) AS download_count
            FROM file_downloads
            GROUP BY file_id
        ) fd ON f.file_id = fd.file_id
        WHERE fcl.course_id = p_course_id
          AND f.status = 'approved'
        GROUP BY COALESCE(link_cat.name, 'General')
    ) cat_group;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

