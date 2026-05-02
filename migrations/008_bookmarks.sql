-- =====================================
-- Migration 008: Bookmarks table
-- Tracks which files each user has bookmarked.
-- One row per user-file pair (unique constraint prevents duplicates).
-- =====================================

CREATE TABLE IF NOT EXISTS bookmarks (
    bookmark_id SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(user_id)  ON DELETE CASCADE,
    file_id     INT NOT NULL REFERENCES files(file_id)  ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- A user can only bookmark a file once
    CONSTRAINT unique_bookmark UNIQUE (user_id, file_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_file_id ON bookmarks(file_id);
