# GIKI Course Hub Project Report

## 1. Project Title
GIKI Course Hub (Academic Resource Management System)

## 2. Group Members
(i) 
Hassan Raza Shaikh (Registration Number) 
(ii) 
(Group Member 2) (Registration Number) 
(iii) 
(Group Member 3) (Registration Number)

## 3. Project Description
GIKI Course Hub is a centralized academic resource platform designed for GIKI students to discover and share study materials. It provides a searchable course catalog organized by faculty and program, allowing users to upload and download notes, past papers, and slides.

## 4. User Types
(i) 
Student User 
(ii) 
Teacher / Instructor User 
(iii) 
Admin User

## 5. User Specific Detailed Requirements

### (i) Student (specific requirements)
a. Students can browse courses by faculty, program, and semester.
b. Students can search for specific courses using codes (e.g., CS101) or names.
c. Students can view and download academic materials (Notes, Slides, Past Papers).
d. Students can upload materials to specific courses (requires authentication).
e. Students can bookmark files for quick access in their dashboard.
f. Students can report issues or incorrect materials.

### (ii) Teacher / Instructor (specific requirements)
a. Teachers can be associated with specific courses they teach.
b. Teachers can view materials uploaded for their courses.
c. Teachers can provide official course materials to the platform.

### (iii) Admin (specific requirements)
a. Admins can moderate uploaded files (Approve, Reject, or Delete).
b. Admins can manage the academic hierarchy (Faculties, Programs, Courses).
c. Admins can view and resolve platform issues reported by users.
d. Admins can track system statistics like total downloads and user activity.

## 6. Major Modules
(i) 
**Authentication Module**: Handles user registration, Google/Firebase login, and session management.
(ii) 
**Course Catalog Module**: Manages the hierarchical organization of faculties, programs, and courses.
(iii) 
**File Management Module**: Handles file uploads, secure storage on Cloudflare R2, and categorized retrieval.
(iv) 
**Moderation Module**: Provides an interface for admins to review and approve community contributions.

## 7. Technical Details

### (i) List of tables with column names
a) **users** (user_id, username, password, email, firebase_uid, role, created_at)
b) **faculties** (faculty_id, name, full_name, icon)
c) **programs** (program_id, faculty_id, name)
d) **courses** (course_id, name, code, description, year, semester, program_id, faculty_id, is_lab)
e) **instructors** (instructor_id, name, faculty_name)
f) **files** (file_id, title, course_code, category_id, uploaded_by, instructor_id, status, file_url, upload_date, storage_path)
g) **categories** (category_id, name, is_lab_category)
h) **file_metadata** (metadata_id, file_id, file_size, file_type)
i) **admins** (email, added_at, notes)
j) **reports** (report_id, file_id, reported_by, reason, status, created_at)
k) **issues** (issue_id, reporter_id, title, description, type, status, created_at)

### (ii) Types of databases used as backend
a) Postgres (Primary relational database hosted on Supabase)
b) Firebase (Used for Authentication and User Management)

### (iii) Types of front end used
a) HTML, CSS, JS using React + Vite (Premium glassmorphism design with Tailwind CSS)

### (iv) Use of Advanced Backend Features
- **Live Statistics API**: A public endpoint (`/api/stats`) provides real-time counts of courses, materials, and academic units, ensuring the landing page reflects the actual state of the database.
- **Custom Postgres Functions**: Functions like `get_api_courses_hierarchy` and `get_api_course_files` aggregate complex relational data into nested JSON structures for high-performance frontend delivery.
- **Stored Procedures**: Administrative procedures such as `sp_approve_file` and `sp_delete_course_files` automate management tasks and maintain audit logs.
- **Views**: Database views like `vw_approved_materials` provide read-only, consolidated result sets for frequent public queries.

d) **Triggers & Constraints**
1. Automated timestamps for `created_at` and `upload_date` fields using trigger functions.
2. Cascading deletes to maintain referential integrity across the academic hierarchy.
