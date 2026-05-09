-- 014_instructors.sql
-- Adds the instructors schema and links to courses and files

-- 1. Create Instructors table
CREATE TABLE instructors (
    instructor_id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    faculty_name TEXT -- Optional context
);

-- 2. Create junction table for course <-> instructor relationship
CREATE TABLE course_instructors (
    course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
    instructor_id INT REFERENCES instructors(instructor_id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, instructor_id)
);

-- 3. Update files table to link to instructors
ALTER TABLE files 
ADD COLUMN instructor_id INT REFERENCES instructors(instructor_id) ON DELETE SET NULL;

-- 4. Update the unique constraint on files to include instructor_id
-- We must drop the old constraint and create a new one.
-- Old constraint: CONSTRAINT unique_file UNIQUE (title, course_code, category_id)
ALTER TABLE files DROP CONSTRAINT IF EXISTS unique_file;
ALTER TABLE files ADD CONSTRAINT unique_file UNIQUE (title, course_code, category_id, instructor_id);
