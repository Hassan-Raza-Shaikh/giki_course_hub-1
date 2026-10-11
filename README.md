# GIKI Course Hub Back-End Engine - Flask REST API

![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

The backend REST API engine powering the GIKI Course Hub platform. Manages resource directories, courses, instructors, and syllabus uploads.

## Tech Stack
*   **API Framework**: Flask (Python) with CORS and Request Limiting integrations.
*   **Relational Database**: PostgreSQL mapped via `psycopg2-binary`.
*   **NoSQL Database**: Firebase Admin SDK managing Firestore indexes.
*   **Cloud Storage**: AWS S3 mapped via `boto3`.

## Key Features
*   **Secure API Endpoints**: Student auth token validations.
*   **Database Seeding**: Python script utilities (`seed_from_json.py`) populating course catalogues.
*   **Deployment Configuration**: Vercel integrations (`vercel.json`) and Heroku web process mappings (`Procfile`).

## Running locally
1. Install packages:
   ```bash
   pip install -r requirements.txt
   ```
2. Configure credentials in `.env` (Postgres URL, Firebase config, AWS access keys).
3. Run the development server:
   ```bash
   python app.py
   ```

## Email notifications
Branded emails go out when material is uploaded, approved or rejected, when reports and issues are filed or resolved, and to admins when something needs review. Templates live in `email_templates.py`, events in `email_events.py`.

*   `RESEND_API_KEY` — required to send. Without it, emails are skipped.
*   `EMAIL_DRY_RUN=1` — log instead of sending. Use this locally and on staging.
*   `EMAIL_REDIRECT_TO=you@example.com` — send every email to one inbox for testing.
*   `FRONTEND_URL` — base URL for links in emails (default `https://gikicoursehub.app`).
*   Run `migrations/023_email_preferences.sql` so users can opt out at `/email-settings`.
*   `python preview_emails.py` writes every template to `email_previews/` to look at in a browser.
