-- 004_purge_dead_tables.sql
-- Forcefully clean up all unused tables, views, triggers, and functions from the legacy architecture.

-- 1. DROP DEAD TABLES (CASCADE will handle triggers & views binding to them)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS file_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS download_summary CASCADE;
DROP TABLE IF EXISTS downloads CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS prerequisites CASCADE;

-- 2. DROP DEAD VIEWS explicitly just in case CASCADE missed standalone ones
DROP VIEW IF EXISTS approved_files_view CASCADE;
DROP VIEW IF EXISTS user_bookmarks_view CASCADE;
DROP VIEW IF EXISTS popular_files_view CASCADE;
DROP VIEW IF EXISTS file_details_view CASCADE;
DROP VIEW IF EXISTS admin_pending_files_view CASCADE;
DROP VIEW IF EXISTS admin_reports_view CASCADE;
DROP VIEW IF EXISTS course_hierarchy_view CASCADE;
DROP TABLE IF EXISTS monthly_download_report CASCADE;

-- 3. DROP DEAD FUNCTIONS explicitly
DROP FUNCTION IF EXISTS get_download_count(INT) CASCADE;
DROP FUNCTION IF EXISTS get_user_contrib_count(INT) CASCADE;
DROP FUNCTION IF EXISTS get_average_rating(INT) CASCADE;
DROP FUNCTION IF EXISTS get_file_tags(INT) CASCADE;
DROP FUNCTION IF EXISTS log_new_file_insert() CASCADE;
DROP FUNCTION IF EXISTS log_file_status_change() CASCADE;
DROP FUNCTION IF EXISTS log_new_report() CASCADE;
DROP FUNCTION IF EXISTS update_download_summary() CASCADE;
DROP FUNCTION IF EXISTS notify_on_new_comment() CASCADE;
DROP PROCEDURE IF EXISTS approve_file(INT) CASCADE;
DROP PROCEDURE IF EXISTS reject_file(INT) CASCADE;
DROP PROCEDURE IF EXISTS soft_delete_file(INT) CASCADE;
DROP PROCEDURE IF EXISTS process_report(INT, TEXT) CASCADE;
