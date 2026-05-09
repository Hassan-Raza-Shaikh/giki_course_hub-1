-- =====================================
-- 1. USERS
-- =====================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT, -- Can be null for Firebase-only users
    email TEXT UNIQUE,
    firebase_uid TEXT UNIQUE,
    role TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 2. CATEGORIES
-- =====================================
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_lab_category BOOLEAN DEFAULT FALSE
);

-- =====================================
-- 3. FACULTIES & PROGRAMS
-- =====================================
CREATE TABLE faculties (
    faculty_id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    icon TEXT
);

CREATE TABLE programs (
    program_id SERIAL PRIMARY KEY,
    faculty_id INT REFERENCES faculties(faculty_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE (faculty_id, name)
);

-- =====================================
-- 4. COURSES
-- =====================================
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    year INT,
    semester INT,
    program_id INT REFERENCES programs(program_id) ON DELETE CASCADE,
    faculty_id INT REFERENCES faculties(faculty_id) ON DELETE CASCADE,
    is_lab BOOLEAN DEFAULT FALSE,
    UNIQUE (code, program_id)
);

-- =====================================
-- 5. INSTRUCTORS
-- =====================================
CREATE TABLE instructors (
    instructor_id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    faculty_name TEXT -- Contextual display (e.g., FCSE)
);

CREATE TABLE course_instructors (
    course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
    instructor_id INT REFERENCES instructors(instructor_id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, instructor_id)
);

-- =====================================
-- 6. FILES (MAIN TABLE)
-- =====================================
CREATE TABLE files (
    file_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    course_code TEXT NOT NULL,
    category_id INT REFERENCES categories(category_id),
    uploaded_by INT REFERENCES users(user_id),
    instructor_id INT REFERENCES instructors(instructor_id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    file_url TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    storage_path TEXT,
    CONSTRAINT unique_file UNIQUE (title, course_code, category_id)
);

-- =====================================
-- 7. FILE METADATA & NOTES
-- =====================================
CREATE TABLE file_metadata (
    metadata_id SERIAL PRIMARY KEY,
    file_id INT REFERENCES files(file_id) ON DELETE CASCADE,
    file_size INT,
    file_type TEXT
);

CREATE TABLE file_notes (
    note_id SERIAL PRIMARY KEY,
    file_id INT REFERENCES files(file_id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 8. USER FEATURES (BOOKMARKS, DOWNLOADS)
-- =====================================
CREATE TABLE bookmarks (
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    file_id INT REFERENCES files(file_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, file_id)
);

CREATE TABLE file_downloads (
    download_id SERIAL PRIMARY KEY,
    file_id INT REFERENCES files(file_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 9. SYSTEM (ADMINS, REPORTS, ISSUES)
-- =====================================
CREATE TABLE admins (
    email TEXT PRIMARY KEY,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    file_id INT REFERENCES files(file_id) ON DELETE CASCADE,
    reported_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'resolved', 'dismissed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_notes TEXT
);

CREATE TABLE issues (
    issue_id SERIAL PRIMARY KEY,
    reporter_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'bug', 'feature_request', 'other'
    status TEXT CHECK (status IN ('open', 'resolved', 'dismissed')) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_notes TEXT
);

-- =====================================
-- INDEXES (FOR PERFORMANCE)
-- =====================================
CREATE INDEX idx_files_course_code ON files(course_code);
CREATE INDEX idx_files_category ON files(category_id);
CREATE INDEX idx_files_instructor ON files(instructor_id);