-- ==========================================
-- TRIGGER FUNCTIONS
-- ==========================================

-- 1. Function to log new file inserts
CREATE OR REPLACE FUNCTION log_new_file_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action)
    VALUES (NEW.uploaded_by, 'Uploaded a new file: ' || NEW.title);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to log file status changes
CREATE OR REPLACE FUNCTION log_file_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_logs (user_id, action)
        VALUES (NULL, 'File status for "' || NEW.title || '" changed from ' || COALESCE(OLD.status, 'none') || ' to ' || NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to log new reports
CREATE OR REPLACE FUNCTION log_new_report()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action)
    VALUES (NEW.user_id, 'Reported file_id ' || NEW.file_id || ' for: ' || NEW.reason);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to update download summary
CREATE OR REPLACE FUNCTION update_download_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- UPSERT logic for download_summary
    IF EXISTS (SELECT 1 FROM download_summary WHERE file_id = NEW.file_id) THEN
        UPDATE download_summary
        SET total_downloads = total_downloads + 1
        WHERE file_id = NEW.file_id;
    ELSE
        INSERT INTO download_summary (file_id, total_downloads)
        VALUES (NEW.file_id, 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to notify uploader on new comment
CREATE OR REPLACE FUNCTION notify_on_new_comment()
RETURNS TRIGGER AS $$
DECLARE
    v_uploader_id INT;
    v_commenter_name TEXT;
    v_file_title TEXT;
BEGIN
    -- Get necessary details
    SELECT uploaded_by, title INTO v_uploader_id, v_file_title FROM files WHERE file_id = NEW.file_id;
    
    -- If the user isn't commenting on their own file, notify the uploader
    IF v_uploader_id IS NOT NULL AND v_uploader_id != NEW.user_id THEN
        SELECT username INTO v_commenter_name FROM users WHERE user_id = NEW.user_id;
        
        INSERT INTO notifications (user_id, message)
        VALUES (v_uploader_id, COALESCE(v_commenter_name, 'Someone') || ' commented on your file "' || v_file_title || '".');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS BINDING
-- ==========================================

-- Drop them first in case we are modifying
DROP TRIGGER IF EXISTS trg_log_new_file ON files;
DROP TRIGGER IF EXISTS trg_file_status_audit ON files;
DROP TRIGGER IF EXISTS trg_log_new_report ON reports;
DROP TRIGGER IF EXISTS trg_update_download_summary ON downloads;
DROP TRIGGER IF EXISTS trg_notify_on_comment ON comments;

-- Bind Trigger 1
CREATE TRIGGER trg_log_new_file
AFTER INSERT ON files
FOR EACH ROW
EXECUTE FUNCTION log_new_file_insert();

-- Bind Trigger 2
CREATE TRIGGER trg_file_status_audit
AFTER UPDATE OF status ON files
FOR EACH ROW
EXECUTE FUNCTION log_file_status_change();

-- Bind Trigger 3
CREATE TRIGGER trg_log_new_report
AFTER INSERT ON reports
FOR EACH ROW
EXECUTE FUNCTION log_new_report();

-- Bind Trigger 4
CREATE TRIGGER trg_update_download_summary
AFTER INSERT ON downloads
FOR EACH ROW
EXECUTE FUNCTION update_download_summary();

-- Bind Trigger 5
CREATE TRIGGER trg_notify_on_comment
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_comment();
