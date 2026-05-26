-- ==========================================
-- Migration: Bulk Upload Support
-- Adds content_hash for dedup + batch_id for tracking
-- ==========================================

-- SHA-256 hash of file content — used to detect duplicate uploads
ALTER TABLE files ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_files_content_hash ON files(content_hash);

-- Batch identifier — groups files from a single bulk upload session
ALTER TABLE files ADD COLUMN IF NOT EXISTS batch_id TEXT;
