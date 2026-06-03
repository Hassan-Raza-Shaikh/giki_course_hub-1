-- ============================================================
-- Migration 019: File cross-course linking & global dedup
-- Files can now appear in multiple courses without re-uploading.
-- custom_title allows a different display name per course.
-- ============================================================

CREATE TABLE IF NOT EXISTS file_course_links (
    link_id      SERIAL PRIMARY KEY,
    file_id      INT  REFERENCES files(file_id)       ON DELETE CASCADE,
    course_id    INT  REFERENCES courses(course_id)    ON DELETE CASCADE,
    category_id  INT  REFERENCES categories(category_id),
    custom_title TEXT,           -- Optional per-course title override
    linked_by    INT  REFERENCES users(user_id)        ON DELETE SET NULL,
    linked_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (file_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_fcl_course ON file_course_links(course_id);
CREATE INDEX IF NOT EXISTS idx_fcl_file   ON file_course_links(file_id);
