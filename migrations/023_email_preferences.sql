-- =====================================
-- Migration 023: Email notification preferences
-- One row per email address, created the first time someone changes a setting
-- or unsubscribes. No row means every category is on.
-- Keyed by email (lowercased) so it covers admins, who are identified by email.
-- =====================================

CREATE TABLE IF NOT EXISTS email_preferences (
    email        TEXT PRIMARY KEY,
    my_uploads   BOOLEAN NOT NULL DEFAULT TRUE,  -- upload received / approved / rejected
    my_reports   BOOLEAN NOT NULL DEFAULT TRUE,  -- outcome of reports and issues I filed
    admin_alerts BOOLEAN NOT NULL DEFAULT TRUE,  -- new uploads, reports and issues (admins only)
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
