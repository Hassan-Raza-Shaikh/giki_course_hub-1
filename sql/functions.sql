-- ==========================================
-- FUNCTIONS (PL/pgSQL)
-- ==========================================

-- 1. Function to get download count for a specific file
CREATE OR REPLACE FUNCTION get_download_count(p_file_id INT)
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COALESCE(total_downloads, 0) INTO v_count
    FROM download_summary
    WHERE file_id = p_file_id;
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 2. Function to get number of files contributed by a specific user
CREATE OR REPLACE FUNCTION get_user_contrib_count(p_user_id INT)
RETURNS INT AS $$
DECLARE
    v_contrib_count INT;
BEGIN
    SELECT COUNT(*) INTO v_contrib_count
    FROM files
    WHERE uploaded_by = p_user_id AND status = 'approved';
    
    RETURN COALESCE(v_contrib_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 3. [NEW] Function to get average rating for a file
CREATE OR REPLACE FUNCTION get_average_rating(p_file_id INT)
RETURNS NUMERIC AS $$
DECLARE
    v_avg NUMERIC;
BEGIN
    SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0) INTO v_avg
    FROM ratings
    WHERE file_id = p_file_id;
    
    RETURN v_avg;
END;
$$ LANGUAGE plpgsql;

-- 4. [NEW] Function to extract file tags as a string array (or comma separated)
CREATE OR REPLACE FUNCTION get_file_tags(p_file_id INT)
RETURNS TEXT AS $$
DECLARE
    v_tags TEXT;
BEGIN
    SELECT string_agg(t.name, ', ') INTO v_tags
    FROM file_tags ft
    JOIN tags t ON ft.tag_id = t.tag_id
    WHERE ft.file_id = p_file_id;
    
    RETURN COALESCE(v_tags, 'No tags');
END;
$$ LANGUAGE plpgsql;
