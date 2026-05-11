 # 🗄️ Database Deep Dive: GIKI Course Hub

This document explains the "Internal Engine" of the GIKI Course Hub. It details the PostgreSQL architecture, the reasoning behind the table structures, and the hidden logic that ensures data integrity.

---

## 1. Core Philosophy: Why Relational?
We use **PostgreSQL** because the data in this project is highly interconnected. A simple list of files wouldn't work because a file belongs to a **Category**, is taught by an **Instructor**, and is part of a **Course**, which itself belongs to a **Program** and a **Faculty**. 

PostgreSQL allows us to create these "links" (Foreign Keys) to ensure that if you delete a Course, the system knows exactly what to do with the files inside it.

---

## 2. Table-by-Table Technical Analysis

### 🏛️ The Academic Skeleton (`faculties`, `programs`, `courses`)
These three tables form a "Parent-Child" tree.
*   **`faculties`**: The root (e.g., FCSE). It holds the branding (Icons).
*   **`programs`**: The specific degree paths. It has a `faculty_id` that points back to its parent.
*   **`courses`**: The most complex part of the skeleton. 
    *   **The Pooling Logic**: Notice that `files` link to `courses` using the `course_code` (e.g., `CS101`), not just a numeric ID. 
    *   **Why?** This allows us to share materials across different programs. If CS and EE both take "Linear Algebra," they both see the same pool of files automatically.

### 📄 The Content Engine (`files`, `categories`, `file_metadata`)
*   **`files`**: This is the "Master Record." It doesn't store the actual PDF; it stores a **pointer** (`file_url`) to Cloudflare R2 and a **status** (`pending`, `approved`, `rejected`).
*   **`categories`**: This table contains a "logic switch" called `is_lab_category`. This allows the database to tell the frontend: *"Don't show Lab Manuals for this theory course."*
*   **`file_metadata`**: We split this into its own table to keep the main `files` table fast. It stores technical data like `file_size` and `file_type`.

### 👥 The Social & Security Layer (`users`, `bookmarks`, `admin_logs`)
*   **`users`**: This table bridges Firebase and PostgreSQL. We store the `firebase_uid` so we can identify who is logged in without storing sensitive passwords ourselves.
*   **`bookmarks`**: A "Junction Table." It essentially says: *"This User likes This File."* It’s a simple mapping that powers the personalized dashboard.
*   **`admin_logs`**: This is an **immutable** record. Every time an admin approves or deletes something, a row is added here. It can never be edited, ensuring a permanent audit trail.

---

## 3. The "Glue" (Relationships & Integrity)

### 🔗 Foreign Keys & Cascades
Most tables have `ON DELETE CASCADE`. 
*   **What this means**: If an admin deletes a **Program**, the database is smart enough to automatically delete all **Courses** inside that program, and all **Files** inside those courses. 
*   **Result**: No "Orphaned Data" (files that belong to a course that no longer exists) is left behind, which keeps the database small and fast.

### 🛡️ Constraints
We use `UNIQUE` constraints to prevent user errors:
*   **`unique_file`**: Prevents a student from uploading the exact same paper twice in the same category for the same course.
*   **Unique Emails**: Ensures that one email address cannot create multiple accounts.

---

## 4. Automation: Triggers & Functions

### ⚡ Triggers
A Trigger is a "Ghost Function" that runs automatically.
*   **`user_profiles_updated_at`**: You don't have to write code to update the "Last Modified" date on a user profile. PostgreSQL sees the update happening and refreshes the timestamp itself.

### 🧩 PL/pgSQL Functions
These are high-speed scripts written in PostgreSQL's own language.
*   **Hierarchy Builder**: Instead of making 50 different requests to the database to build the Faculty/Program list, we run **one function** (`get_api_courses_hierarchy`). It processes the entire tree inside the database and hands the frontend a perfectly formatted JSON object in milliseconds.

---

## 🔍 How to query this?
If you want to see which instructor has the most materials, you can run:
```sql
SELECT i.name, COUNT(f.file_id) as material_count
FROM instructors i
JOIN files f ON f.instructor_id = i.instructor_id
GROUP BY i.name
ORDER BY material_count DESC;
```
This query "hops" across the `instructors` and `files` tables using their shared ID to give you the answer.
