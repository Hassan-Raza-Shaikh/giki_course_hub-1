# GIKI Course Hub Project Schema and Features

## Project Overview
GIKI Course Hub is a course-material platform for GIKI students. It lets users browse the course catalog, open course pages, view downloadable materials by category, sign in with Firebase or email/password, and upload new resources for review.

## Core Features
- React + Vite single-page frontend with a Flask REST API backend.
- Course browsing by faculty, program, year, semester, and course.
- Course detail pages with categorized materials such as notes, papers, slides, assignments, and lab reports.
- Google/Firebase authentication plus local session-based login support.
- File uploads for course resources with metadata tracking and moderation status.
- Admin-oriented moderation for approving or rejecting submissions.
- Responsive navigation, search, and dashboard-style UI.

## Database Schema


### users
Stores every authenticated user, including password-based users and Firebase-only users.

- `user_id`: primary key.
- `username`: unique username.
- `password`: hashed password, nullable for Firebase-only accounts.
- `email`: unique email address.
- `firebase_uid`: unique Firebase user ID.
- `role`: `user` or `admin`.
- `created_at`: timestamp when the user was created.

### user_profiles
Stores extended profile data for native email/password signups.

- `profile_id`: primary key.
- `user_id`: unique foreign key to `users.user_id`.
- `display_name`: profile display name.
- `student_id`: unique student identifier.
- `batch_year`: optional batch year.
- `program`: optional program name.
- `bio`: optional biography.
- `phone`: optional phone number.
- `created_at`: creation timestamp.
- `updated_at`: auto-refreshed on update.

### faculties
Top-level academic groupings.

- `faculty_id`: primary key.
- `name`: unique short name.
- `full_name`: human-readable full name.
- `icon`: optional icon identifier.

### programs
Programs belong to a faculty.

- `program_id`: primary key.
- `faculty_id`: foreign key to `faculties.faculty_id` with cascade delete.
- `name`: program name.

### courses
Represents the catalog of courses.

- `course_id`: primary key.
- `name`: course name.
- `code`: optional course code.
- `description`: optional description.
- `year`: academic year.
- `semester`: semester number.
- `program_id`: foreign key to `programs.program_id` with cascade delete.
- `faculty_id`: foreign key to `faculties.faculty_id` with cascade delete.

### categories
Stores file categories used for grouping course materials.

- `category_id`: primary key.
- `name`: unique category name.

### files
Main content table for uploaded course materials.

- `file_id`: primary key.
- `title`: file title.
- `course_code`: course code or course name reference used to match files to a course.
- `category_id`: foreign key to `categories.category_id`.
- `uploaded_by`: foreign key to `users.user_id`.
- `status`: `pending`, `approved`, or `rejected`.
- `file_url`: public or served download URL.
- `upload_date`: upload timestamp.
- `storage_path`: internal storage path.

Constraints and indexes:
- Unique constraint on `(title, course_code, category_id)` prevents duplicate uploads in the same course/category.
- Index on `course_code` improves course-level lookups.
- Index on `category_id` improves category filtering.

### file_metadata
Extra file information stored separately from the main file record.

- `metadata_id`: primary key.
- `file_id`: foreign key to `files.file_id` with cascade delete.
- `file_size`: file size in bytes.
- `file_type`: file extension or MIME-style type label.

## Schema Relationships
- One faculty can have many programs.
- One faculty can also be linked directly to many courses.
- One program can have many courses.
- One course can have many uploaded files.
- One category can group many files.
- One user can upload many files.
- One user can have at most one native profile row in `user_profiles`.

## SQL Functions Backing the API

### get_api_courses_hierarchy()
Returns the full nested catalog as JSON:
faculty -> programs -> years -> semesters -> courses.

### get_api_course_files(p_course_id)
Returns approved files for a course grouped by category.

- Each file entry includes the file ID, title, category, uploader username, upload date, file URL, file size, and file type.
- Files are grouped under the category name, with uncategorized items treated as `General`.

## Current Stack
- Frontend: React + Vite
- Backend: Flask
- Database: PostgreSQL
- Auth: Firebase plus local session login
- Storage: local upload directory under `static/uploads/`
