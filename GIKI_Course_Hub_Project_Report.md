# GIKI Course Hub Project Report

## 1. Project Title
**GIKI Course Hub**

## 2. Group Members
(i) Hassan Raza Shaikh (Registration Number)
(ii) (Group Member 2 Name) (Registration Number)
(iii) (Group Member 3 Name) (Registration Number)

## 3. Project Description
The GIKI Course Hub is a centralized academic repository designed for students to discover and share study materials like notes and past papers. 
It implements a structured university hierarchy (Faculty, Program, Course) to ensure resources are logically organized and easily accessible. 
The platform features a secure moderation workflow and live statistics to maintain a high-quality academic environment for all users.

## 4. Types of Users
(i) Student User
(ii) Teacher / Instructor User
(iii) Admin User

## 5. User Specific Detailed Requirements

### (i) Student (specific requirements)
a. Students can browse the academic catalog by faculty, program, and semester.
b. Students can search for specific courses using alphanumeric codes (e.g., CS101) or names.
c. Students can view, download, and contribute academic materials (Notes, Slides, Past Papers).
d. Students can bookmark important files for quick access via their personal dashboard.
e. Students can report incorrect or malicious materials to the administrative team.

### (ii) Teacher / Instructor (specific requirements)
a. Teachers can be associated with specific courses they are currently teaching.
b. Teachers can provide "Official" verified course materials and lecture slides.
c. Teachers can review materials uploaded by students for their specific courses.

### (iii) Admin (specific requirements)
a. Admins can moderate community uploads by approving, rejecting, or deleting pending files.
b. Admins can manage the academic infrastructure (Adding/Editing Faculties, Programs, and Courses).
c. Admins can view and resolve system-wide issues and bug reports submitted by students.
d. Admins can access a master dashboard to track total platform metrics and user activity.

## 6. Major Modules of the Project
(i) **Authentication Module**: Manages secure Google/Firebase login and account role synchronization.
(ii) **Academic Discovery Module**: Handles the hierarchical navigation and course categorization engine.
(iii) **File Management Module**: Manages file uploads, metadata extraction, and storage on Cloudflare R2.
(iv) **Moderation & Audit Module**: Provides the interface for admins to review contributions and tracks all system actions.

## 7. Technical Details

### (i) List of tables with column names
a) **users** (user_id, username, password, email, firebase_uid, role, created_at)
b) **faculties** (faculty_id, name, full_name, icon)
c) **programs** (program_id, faculty_id, name)
d) **courses** (course_id, name, code, description, year, semester, program_id, faculty_id, is_lab)
e) **instructors** (instructor_id, name, faculty_name)
f) **course_instructors** (course_id, instructor_id)
g) **files** (file_id, title, course_code, category_id, uploaded_by, instructor_id, status, file_url, upload_date, storage_path)
h) **categories** (category_id, name, is_lab_category)
i) **file_metadata** (metadata_id, file_id, file_size, file_type)
j) **file_notes** (note_id, file_id, note_text, created_at)
k) **bookmarks** (user_id, file_id, created_at)
l) **file_downloads** (download_id, file_id, user_id, downloaded_at)
m) **admins** (email, added_at, notes)
n) **reports** (report_id, file_id, reported_by, reason, status, created_at)
o) **issues** (issue_id, reporter_id, title, description, type, status, created_at)

### (ii) Types of databases used as backend
a) Postgres (Primary relational database hosted on Supabase)
b) Firebase (Used for Identity Management and real-time Authentication)

### (iii) Types of front end used
a) HTML, CSS, JS using React + Vite (Custom Neo-brutalist and Glassmorphism design)

### (iv) Use of advanced database features

**a) Postgres Functions**
1. To aggregate complex course hierarchies into a single nested JSON object for high-speed delivery.
2. To calculate real-time download counts and uploader rankings across the entire platform.

**b) Stored Procedures**
1. To handle the atomic "Approve File" transaction which updates status, logs the action, and notifies the user.
2. To perform scheduled database maintenance like cleaning up orphaned metadata or resetting system logs.

**c) Views**
1. To show a consolidated list of approved materials by joining the files, categories, and users tables.
2. To provide read-only academic statistics (Total courses vs. Total materials) for the public landing page.

**d) Database Cursors**
1. To iterate through large sets of administrative audit logs for generating yearly activity reports.
2. To process bulk file moderation requests sequentially without overloading server memory.

**e) B-Tree Indexes**
1. To optimize course search performance using an index on the `course_code` column.
2. To speed up user-specific lookups using indexes on `uploaded_by` and `user_id` fields.
