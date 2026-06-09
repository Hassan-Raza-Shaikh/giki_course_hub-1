CREATE TABLE IF NOT EXISTS manual_course_links (
    link_id SERIAL PRIMARY KEY,
    course_code_1 TEXT NOT NULL,
    course_code_2 TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_code_1, course_code_2)
);
