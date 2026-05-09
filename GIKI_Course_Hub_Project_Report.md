# GIKI Course Hub - Comprehensive Project Report

## 1. Project Title
**GIKI Course Hub** (Advanced Academic Resource Management System)

## 2. Group Members
(i) **Hassan Raza Shaikh** (Project Lead & Backend Architect)  
(ii) (Group Member 2 Name) (Registration Number)  
(iii) (Group Member 3 Name) (Registration Number)

## 3. Project Description
GIKI Course Hub is a premium, centralized academic repository designed specifically for the GIK Institute community. Unlike simple file-sharing sites, this platform implements a structured academic hierarchy (Faculty → Program → Course) to ensure resources are logically organized and easily discoverable. 

The system leverages a hybrid storage architecture, using **PostgreSQL** for structured metadata and **Cloudflare R2 (S3-Compatible)** for high-performance binary file delivery. The platform features a high-fidelity "Neo-brutalist" interface, live statistics tracking, and a robust administrative moderation layer to maintain the quality of academic contributions.

---

## 4. Technical Architecture & Database Design

### I. Relational Schema & Integrity
The system is built on a highly normalized relational schema in **PostgreSQL**. Key features include:
-   **Cascading Actions**: Use of `ON DELETE CASCADE` to maintain referential integrity across the academic hierarchy.
-   **Triggers**: Automated audit triggers that track every status change for uploaded files and log them into the `admin_logs` table for accountability.

### II. Advanced Database Features
To meet production standards, the project implements several advanced database features:
-   **SQL Views**: Virtual tables like `vw_approved_materials` abstract complex multi-table joins, providing the frontend with a simplified, high-performance interface for browsing public content.
-   **Stored Procedures**: Procedures such as `sp_approve_file` encapsulate multi-step business logic (status updates, log generation, and notification flags) into atomic transactions.
-   **Database Cursors**: Implemented within backend functions for **iterative row processing**. Cursors are specifically used in reporting modules and batch data operations to process large result sets (such as yearly audit logs) sequentially, ensuring minimal memory footprint and preventing server timeouts.

### III. Performance Optimization (Indexes)
To ensure the platform remains responsive as the database grows, several **B-Tree Indexes** have been strategically implemented:
-   **Search Index**: An index on `files(course_code)` ensures that course-specific resource lookups are instantaneous.
-   **Relational Indexes**: Indexes on `category_id` and `instructor_id` optimize the filtering of materials during student browsing.
-   **Unique Constraints**: Multi-column unique indexes prevent duplicate file uploads and maintain data cleanliness.

---

## 5. System Modules & Features

### I. Authentication Module
Powered by **Firebase Google Authentication**, providing secure, zero-password login. User roles are synchronized in real-time, granting instant administrative access to authorized developers.

### II. Academic Discovery Engine
A hierarchical navigation system that allows students to drill down from their Faculty into specific Programs and Semesters.

### III. Moderation & Audit System
A specialized workflow where community uploads remain in a "Pending" state until reviewed by an admin. All actions are tracked via the system audit logs.

---

## 6. Technology Stack
-   **Frontend**: React.js (Vite) with a custom "Neo-brutalist" Design System.
-   **Backend**: Flask (Python) with SQLAlchemy & Psycopg2.
-   **Storage**: Cloudflare R2 (Object Storage) & PostgreSQL (Metadata).
-   **Auth**: Firebase Admin SDK.
-   **Deployment**: Vercel (Frontend) & Render (Backend).
