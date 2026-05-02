-- =====================================
-- Migration 011: Reports + Download tracking
-- =====================================

-- 1. File reports — users flag problematic content
CREATE TABLE IF NOT EXISTS reports (
    report_id   SERIAL PRIMARY KEY,
    file_id     INT  NOT NULL REFERENCES files(file_id)  ON DELETE CASCADE,
    reporter_id INT  NOT NULL REFERENCES users(user_id)  ON DELETE CASCADE,
    reason      TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'resolved', 'dismissed')),
    admin_notes TEXT,
    resolved_by TEXT,        -- admin email
    resolved_at TIMESTAMP,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (file_id, reporter_id)  -- one report per user per file
);

CREATE INDEX IF NOT EXISTS idx_reports_status  ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_file_id ON reports(file_id);

-- 2. Download tracking
CREATE TABLE IF NOT EXISTS file_downloads (
    download_id   SERIAL PRIMARY KEY,
    file_id       INT NOT NULL REFERENCES files(file_id) ON DELETE CASCADE,
    user_id       INT REFERENCES users(user_id) ON DELETE SET NULL,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_downloads_file_id ON file_downloads(file_id);
