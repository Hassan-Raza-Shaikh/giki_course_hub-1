-- =====================================
-- 1. USERS
-- =====================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 2. COURSES
-- =====================================
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- =====================================
-- 3. SUBJECTS
-- =====================================
CREATE TABLE subjects (
    subject_id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

-- =====================================
-- 4. PREREQUISITES (SELF RELATION)
-- =====================================
CREATE TABLE prerequisites (
    course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
    prerequisite_course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, prerequisite_course_id)
);

-- =====================================
-- 5. CATEGORIES
-- =====================================
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- =====================================
-- 6. FILES (MAIN TABLE)
-- =====================================
CREATE TABLE files (
    file_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    subject_id INT REFERENCES subjects(subject_id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(category_id),
    uploaded_by INT REFERENCES users(user_id),
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    file_url TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Duplicate prevention
ALTER TABLE files
ADD CONSTRAINT unique_file UNIQUE (title, subject_id, category_id);

-- =====================================
-- 7. FILE METADATA
-- =====================================
CREATE TABLE file_metadata (
    metadata_id SERIAL PRIMARY KEY,
    file_id INT REFERENCES files(file_id) ON DELETE CASCADE,
    file_size INT,
    file_type TEXT
);

-- =====================================
-- 8. BOOKMARKS
-- =====================================
CREATE TABLE bookmarks (
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    file_id INT REFERENCES files(file_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, file_id)
);

-- =====================================
-- 9. DOWNLOADS
-- =====================================
CREATE TABLE downloads (
    download_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    file_id INT REFERENCES files(file_id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 10. DOWNLOAD SUMMARY (AGGREGATION TABLE)
-- =====================================
CREATE TABLE download_summary (
    file_id INT PRIMARY KEY REFERENCES files(file_id),
    total_downloads INT DEFAULT 0
);

-- =====================================
-- 11. RATINGS
-- =====================================
CREATE TABLE ratings (
    user_id INT REFERENCES users(user_id),
    file_id INT REFERENCES files(file_id),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    PRIMARY KEY (user_id, file_id)
);

-- =====================================
-- 12. COMMENTS
-- =====================================
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    file_id INT REFERENCES files(file_id),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 13. TAGS
-- =====================================
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- =====================================
-- 14. FILE TAGS (MANY TO MANY)
-- =====================================
CREATE TABLE file_tags (
    file_id INT REFERENCES files(file_id) ON DELETE CASCADE,
    tag_id INT REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (file_id, tag_id)
);

-- =====================================
-- 15. NOTIFICATIONS
-- =====================================
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 16. REPORTS
-- =====================================
CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    file_id INT REFERENCES files(file_id),
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'resolved')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 17. AUDIT LOGS
-- =====================================
CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT,
    action TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- INDEXES (FOR PERFORMANCE)
-- =====================================
CREATE INDEX idx_files_subject ON files(subject_id);
CREATE INDEX idx_files_category ON files(category_id);
CREATE INDEX idx_downloads_file ON downloads(file_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_ratings_file ON ratings(file_id);
CREATE INDEX idx_comments_file ON comments(file_id);