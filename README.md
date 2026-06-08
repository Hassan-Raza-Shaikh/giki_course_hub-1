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
