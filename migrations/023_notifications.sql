-- =====================================
-- Migration 023: In-app notifications
-- One row per notification per user. Written through notifications.notify()
-- (upload approved/rejected, and later calendar events, new files, etc.).
-- =====================================

CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,          -- e.g. 'upload_approved', 'upload_rejected'
    title           VARCHAR(200) NOT NULL,
    body            TEXT,
    link            VARCHAR(500),                  -- in-app path to open, e.g. '/course/CS101'
    data            JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Newest-first listing per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_newest
    ON notifications(user_id, notification_id DESC);

-- Fast unread badge count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id) WHERE is_read = false;
