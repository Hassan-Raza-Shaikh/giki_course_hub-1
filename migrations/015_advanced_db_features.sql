-- =====================================
-- 15. ADVANCED DATABASE FEATURES
-- =====================================

-- 1. VIEW: Approved Materials
-- This view provides a consolidated view of all approved files with their 
-- associated course name, category, and uploader's username.
CREATE OR REPLACE VIEW vw_approved_materials AS
SELECT 
    f.file_id,
    f.title,
    c.name AS course_name,
    c.code AS course_code,
    cat.name AS category_name,
    u.username AS uploader,
    f.file_url,
    f.upload_date
FROM files f
JOIN courses c ON f.course_code = c.code
JOIN categories cat ON f.category_id = cat.category_id
JOIN users u ON f.uploaded_by = u.user_id
WHERE f.status = 'approved';

-- 2. VIEW: User Activity Summary
-- Shows a summary of files uploaded and bookmarked by each user.
CREATE OR REPLACE VIEW vw_user_activity AS
SELECT 
    u.user_id,
    u.username,
    COUNT(DISTINCT f.file_id) AS total_uploads,
    COUNT(DISTINCT b.file_id) AS total_bookmarks
FROM users u
LEFT JOIN files f ON u.user_id = f.uploaded_by
LEFT JOIN bookmarks b ON u.user_id = b.user_id
GROUP BY u.user_id, u.username;

-- 3. STORED PROCEDURE: Handle File Approval
-- A procedure to approve a file and log the action (if an admin_logs table exists).
CREATE OR REPLACE PROCEDURE sp_approve_file(p_file_id INT, p_admin_email TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update file status
    UPDATE files SET status = 'approved' WHERE file_id = p_file_id;
    
    -- Log the action if admin_logs exists (from migration 010)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_logs') THEN
        INSERT INTO admin_logs (admin_email, action, target_id, target_type)
        VALUES (p_admin_email, 'APPROVE', p_file_id, 'file');
    END IF;
    
    COMMIT;
END;
$$;

-- 4. STORED PROCEDURE: Batch Delete Files by Course
-- Useful for administrative cleanup.
CREATE OR REPLACE PROCEDURE sp_delete_course_files(p_course_code TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM files WHERE course_code = p_course_code;
    COMMIT;
END;
$$;
