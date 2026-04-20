-- ==========================================
-- STORED PROCEDURES
-- ==========================================

-- 1. Approve a file
CREATE OR REPLACE PROCEDURE approve_file(p_file_id INT, p_admin_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE files SET status = 'approved' WHERE file_id = p_file_id;
    -- The trg_file_status_audit trigger handles logging automatically now
    COMMIT;
END;
$$;

-- 2. Reject a file
CREATE OR REPLACE PROCEDURE reject_file(p_file_id INT, p_admin_id INT, p_reason TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE files SET status = 'rejected' WHERE file_id = p_file_id;
    -- Note: reason can also be logged specifically via audit table directly if desired,
    -- but for now the status change is caught via trigger. If explicit logging is needed:
    INSERT INTO audit_logs (user_id, action) VALUES (p_admin_id, 'Explicit reason for rejection of file ' || p_file_id || ': ' || p_reason);
    COMMIT;
END;
$$;

-- 3. [NEW] Submit a file report
CREATE OR REPLACE PROCEDURE submit_report(p_user_id INT, p_file_id INT, p_reason TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- The trg_log_new_report trigger will log this to audit_logs automatically!
    INSERT INTO reports (user_id, file_id, reason, status)
    VALUES (p_user_id, p_file_id, p_reason, 'pending');
    
    COMMIT;
END;
$$;

-- 4. [NEW] Resolve a report
CREATE OR REPLACE PROCEDURE resolve_report(p_report_id INT, p_admin_id INT, p_take_down_file BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
    v_file_id INT;
BEGIN
    SELECT file_id INTO v_file_id FROM reports WHERE report_id = p_report_id;
    UPDATE reports SET status = 'resolved' WHERE report_id = p_report_id;
    
    IF p_take_down_file THEN
        -- The status change caught by trg_file_status_audit handles baseline logging
        UPDATE files SET status = 'rejected' WHERE file_id = v_file_id;
        INSERT INTO audit_logs (user_id, action) 
        VALUES (p_admin_id, 'Resolved report ' || p_report_id || ' and TOOK DOWN file ' || v_file_id);
    ELSE
        INSERT INTO audit_logs (user_id, action) 
        VALUES (p_admin_id, 'Resolved report ' || p_report_id || ' without taking down file ' || v_file_id);
    END IF;
    
    COMMIT;
END;
$$;

-- 5. [NEW] Upsert a rating for a file
CREATE OR REPLACE PROCEDURE rate_file(p_user_id INT, p_file_id INT, p_rating INT)
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM ratings WHERE user_id = p_user_id AND file_id = p_file_id) THEN
        UPDATE ratings SET rating = p_rating WHERE user_id = p_user_id AND file_id = p_file_id;
    ELSE
        INSERT INTO ratings (user_id, file_id, rating) VALUES (p_user_id, p_file_id, p_rating);
    END IF;
    
    COMMIT;
END;
$$;

-- 6. [NEW] Add comment & Notify uploader
CREATE OR REPLACE PROCEDURE add_comment(p_user_id INT, p_file_id INT, p_comment TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert the new comment. The trg_notify_on_comment trigger will automatically
    -- fire after this insert to handle alerting the uploader via notifications table!
    INSERT INTO comments (user_id, file_id, comment) VALUES (p_user_id, p_file_id, p_comment);
    
    COMMIT;
END;
$$;

-- 7. [NEW] CURSOR-based Monthly Analytics Report Generator
-- Iterates over every approved file, counts downloads for the current month,
-- and stores a snapshot into monthly_download_report for historical analysis.
CREATE OR REPLACE PROCEDURE generate_monthly_analytics_report()
LANGUAGE plpgsql
AS $$
DECLARE
    -- Declare a cursor to iterate over all approved files
    file_cursor CURSOR FOR
        SELECT file_id, title FROM files WHERE status = 'approved';
    
    v_file_id       INT;
    v_title         TEXT;
    v_dl_count      INT;
    v_report_month  DATE := DATE_TRUNC('month', CURRENT_DATE);
BEGIN
    -- Open the cursor and iterate row by row
    OPEN file_cursor;
    
    LOOP
        FETCH file_cursor INTO v_file_id, v_title;
        EXIT WHEN NOT FOUND;

        -- Count downloads for this file in the current month
        SELECT COUNT(*) INTO v_dl_count
        FROM downloads
        WHERE file_id = v_file_id
          AND DATE_TRUNC('month', timestamp) = v_report_month;

        -- Only record files that had at least some activity, or record all (for completeness)
        INSERT INTO monthly_download_report (report_month, file_id, monthly_downloads)
        VALUES (v_report_month, v_file_id, v_dl_count);

    END LOOP;

    CLOSE file_cursor;

    -- Log the report generation
    INSERT INTO audit_logs (user_id, action)
    VALUES (NULL, 'Monthly analytics report generated for ' || TO_CHAR(v_report_month, 'YYYY-MM'));

    COMMIT;
END;
$$;
