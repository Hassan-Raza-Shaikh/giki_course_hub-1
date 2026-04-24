-- 003_json_api_functions.sql

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
                                                            'description', c3.description,
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



CREATE OR REPLACE FUNCTION get_api_course_files(p_course_id INT)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
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
                    'title', f.title,
                    'category', COALESCE(cat.name, 'General'),
                    'uploader', u.username,
                    'date', f.upload_date,
                    'file_url', f.file_url
                ) ORDER BY f.upload_date DESC
            ) AS files
        FROM files f
        LEFT JOIN subjects s ON f.subject_id = s.subject_id
        LEFT JOIN categories cat ON f.category_id = cat.category_id
        LEFT JOIN users u ON f.uploaded_by = u.user_id
        WHERE s.course_id = p_course_id AND f.status = 'approved'
        GROUP BY COALESCE(cat.name, 'General')
    ) cat_group;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
