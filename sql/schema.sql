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
-- 1a. FACULTIES & PROGRAMS
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
    name TEXT NOT NULL
);

-- =====================================
-- 2. COURSES
-- =====================================
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    year INT,
    semester INT,
    program_id INT REFERENCES programs(program_id) ON DELETE CASCADE,
    faculty_id INT REFERENCES faculties(faculty_id) ON DELETE CASCADE
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
-- INDEXES (FOR PERFORMANCE)
-- =====================================
CREATE INDEX idx_files_subject ON files(subject_id);
CREATE INDEX idx_files_category ON files(category_id);