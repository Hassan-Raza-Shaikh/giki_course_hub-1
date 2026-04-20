-- ==========================================
-- VIEWS
-- ==========================================

-- 1. View for all approved files (Basic details)
CREATE OR REPLACE VIEW approved_files_view AS
SELECT 
    f.file_id, 
    f.title, 
    c.name AS course_name, 
    s.name AS subject_name, 
    cat.name AS category_name, 
    u.username AS uploaded_by, 
    f.file_url, 
    f.upload_date
FROM files f
LEFT JOIN subjects s ON f.subject_id = s.subject_id
LEFT JOIN courses c ON s.course_id = c.course_id
LEFT JOIN categories cat ON f.category_id = cat.category_id
LEFT JOIN users u ON f.uploaded_by = u.user_id
WHERE f.status = 'approved';

-- 2. View for popular files (ranked by total downloads)
CREATE OR REPLACE VIEW popular_files_view AS
SELECT 
    f.file_id, 
    f.title, 
    cat.name AS category,
    COALESCE(ds.total_downloads, 0) AS total_downloads
FROM files f
LEFT JOIN download_summary ds ON f.file_id = ds.file_id
LEFT JOIN categories cat ON f.category_id = cat.category_id
WHERE f.status = 'approved'
ORDER BY total_downloads DESC;

-- 3. View for a user's bookmarks
CREATE OR REPLACE VIEW user_bookmarks_view AS
SELECT 
    b.user_id, 
    f.file_id, 
    f.title, 
    f.file_url,
    s.name AS subject_name,
    cat.name AS category
FROM bookmarks b
JOIN files f ON b.file_id = f.file_id
LEFT JOIN subjects s ON f.subject_id = s.subject_id
LEFT JOIN categories cat ON f.category_id = cat.category_id;

-- 4. [NEW] file_details_view: Ultimate view joining ratings, metadata, and tags
CREATE OR REPLACE VIEW file_details_view AS
SELECT 
    f.file_id,
    f.title,
    s.name AS subject,
    cat.name AS category,
    u.username AS uploader,
    fm.file_size,
    fm.file_type,
    f.upload_date,
    COALESCE(AVG(r.rating), 0) AS average_rating,
    COUNT(DISTINCT c.comment_id) AS total_comments,
    string_agg(DISTINCT t.name, ', ') AS tags
FROM files f
LEFT JOIN subjects s ON f.subject_id = s.subject_id
LEFT JOIN categories cat ON f.category_id = cat.category_id
LEFT JOIN users u ON f.uploaded_by = u.user_id
LEFT JOIN file_metadata fm ON f.file_id = fm.file_id
LEFT JOIN ratings r ON f.file_id = r.file_id
LEFT JOIN comments c ON f.file_id = c.file_id
LEFT JOIN file_tags ft ON f.file_id = ft.file_id
LEFT JOIN tags t ON ft.tag_id = t.tag_id
GROUP BY f.file_id, s.name, cat.name, u.username, fm.file_size, fm.file_type;

-- 5. [NEW] admin_pending_files_view: For the admin dashboard
CREATE OR REPLACE VIEW admin_pending_files_view AS
SELECT 
    f.file_id,
    f.title,
    u.username AS uploader,
    fm.file_type,
    fm.file_size,
    f.upload_date,
    s.name AS subject
FROM files f
LEFT JOIN users u ON f.uploaded_by = u.user_id
LEFT JOIN file_metadata fm ON f.file_id = fm.file_id
LEFT JOIN subjects s ON f.subject_id = s.subject_id
WHERE f.status = 'pending';

-- 6. [NEW] admin_reports_view: Actionable view for resolving reports
CREATE OR REPLACE VIEW admin_reports_view AS
SELECT 
    rep.report_id,
    f.file_id,
    f.title AS file_title,
    f.status AS file_status,
    u.username AS reporter,
    rep.reason,
    rep.status AS report_status,
    rep.created_at
FROM reports rep
LEFT JOIN files f ON rep.file_id = f.file_id
LEFT JOIN users u ON rep.user_id = u.user_id
WHERE rep.status = 'pending';

-- 7. [NEW] course_hierarchy_view: Useful for dropdowns and navigation
CREATE OR REPLACE VIEW course_hierarchy_view AS
SELECT 
    c.course_id,
    c.name AS course_name,
    s.subject_id,
    s.name AS subject_name
FROM courses c
LEFT JOIN subjects s ON c.course_id = s.course_id
ORDER BY c.name, s.name;
