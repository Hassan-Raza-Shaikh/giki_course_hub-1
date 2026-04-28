# What This Project Does

## Project Purpose
GIKI Course Hub is a student-focused academic resource platform for GIKI. It helps students:
- Browse courses by faculty, program, year, and semester.
- Open a course page to see study materials grouped by category (Past Papers, Notes, Slides, Assignments, Lab Reports, etc.).
- Sign in with Google (Firebase Auth) and contribute files to a course.
- Download shared materials uploaded by the community.

In short, this project is a centralized, searchable course-material hub for GIKI students.

## How It Is Built
The system has two main parts:

1. Frontend (React + Vite)
- Single-page app in `frontend/`.
- Handles navigation, UI, and user interactions.
- Calls backend API routes through `/api`.

2. Backend (Flask API)
- Exposes REST-style endpoints for authentication, course listing, course details, random featured courses, and file uploads.
- Uses session cookies for login state.
- Verifies Firebase ID tokens (when Firebase Admin is configured).

3. Database (PostgreSQL)
- Stores users, faculties, programs, courses, categories, files, and file metadata.
- Uses SQL functions/UDFs (see migrations and SQL files) to return nested API-ready course/file structures.

## End-to-End User Flow
1. User lands on the home page and sees featured/random courses.
2. User opens the courses catalog and can search courses by name/code.
3. User opens a course detail page.
4. App fetches course metadata + files grouped by category.
5. User can download existing materials.
6. If user wants to upload, they sign in with Google.
7. User submits title + category + file.
8. Backend validates file type/size constraints, stores file under `static/uploads/`, records metadata in PostgreSQL, and returns success.
9. Course page refreshes and shows the newly uploaded material.

## Core Functional Areas
### 1) Authentication
- Google login via Firebase popup on frontend.
- Backend endpoint receives Firebase `idToken`, verifies it (if Admin SDK credentials are present), and upserts the user in PostgreSQL.
- Session data (`user_id`, `username`, `role`) is stored server-side.

### 2) Course Catalog
- Backend returns a hierarchical structure:
  faculty -> program -> year -> semester -> courses.
- Frontend renders this as expandable accordions with search.

### 3) Course Materials
- Each course has categorized files.
- Files include title, uploader, date, and downloadable URL.
- Categories are loaded from DB and shown as tabs.

### 4) File Contribution
- Upload endpoint accepts multipart form data.
- Allowed formats are controlled in config (`pdf`, `docx`, `pptx`, `xlsx`, `txt`, `zip`).
- Upload metadata is saved in `files` + `file_metadata` tables.

## API Capabilities (Current)
- `GET /api/courses`: full hierarchy of faculties/programs/years/semesters/courses.
- `GET /api/courses/random?n=3`: random featured courses for landing page.
- `GET /api/courses/<course_id>`: course info + files grouped by category.
- `POST /api/courses/<course_id>/upload`: upload a file into a specific course.
- `POST /api/auth/firebase`: Google/Firebase auth.
- `POST /api/signup`, `POST /api/login`, `POST /api/logout`, `GET /api/me`: session auth endpoints.

## Key Value This Project Delivers
- Makes study resources easy to discover across all departments/programs.
- Encourages peer-to-peer material sharing.
- Reduces dependency on scattered WhatsApp groups/drive links.
- Creates a reusable academic knowledge base for current and future batches.

## Notes on Current State
- The repository includes some legacy/older files and docs, but the active experience is centered on:
  - React frontend in `frontend/src`
  - Flask API in `app.py` + `routes/`
  - PostgreSQL schema/migrations in `sql/` and `migrations/`

This overview reflects the implemented flow visible in the current codebase.