# GIKI Course Hub

![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

A course resource hub for GIKI students: browse courses by faculty/program/semester,
upload and download notes, slides, past papers and reference books (singly or as a zip),
bookmark files, compare on a leaderboard, calculate GPA, and follow the GIKI academic
calendar. Uploads go through an admin approval queue; users get in-app and email
notifications.

## Architecture

| Layer | Stack | Lives in |
|---|---|---|
| Frontend | React 18 + Vite, React Router, axios | `frontend/` |
| Backend API | Flask + gunicorn (Talisman, Flask-Limiter, Flask-Compress, CORS) | `app.py`, `routes/`, `utils/` |
| Database | PostgreSQL on Supabase (connection pool in `db.py`) | schema history in `migrations/` |
| File storage | Cloudflare R2 (S3-compatible, via `boto3`) | `config.py` |
| Auth | Firebase Auth (Google sign-in); the backend verifies the ID token sent as `Authorization: Bearer` | `firebase_admin_init.py`, `app.py` |
| Notifications | In-app notification centre | `notifications.py`, `routes/notification_routes.py` |
| Email | Resend (optional — skipped when `RESEND_API_KEY` is unset) | `email_service.py`, `email_events.py`, `email_templates.py` |

## Hosting

**Pushing or merging to `main` deploys to production.** The `CI` workflow
(`.github/workflows/ci.yml`) runs on every PR and push to `main` — frontend build, a
backend compile and ruff check (syntax errors, undefined names, unused imports), and the
backend tests — but nothing blocks a merge if it fails.

| What | Where | Deploys from |
|---|---|---|
| Frontend | Vercel project `frontend` — https://www.gikicoursehub.app (also https://frontend-xi-pink-10.vercel.app) | `main` → Production; any other branch / PR → Preview. Built from the repo root using the root `vercel.json`. |
| Backend | Render (free tier, `Dockerfile`) — https://giki-course-hub-backend.onrender.com | `main` (auto-deploy — confirm in Render → Settings) |
| Keep-awake | GitHub Actions `keepalive.yml` and `cron.yml` ping the backend so the free tier doesn't sleep | — |

`frontend/vercel.json` mirrors the root `vercel.json` (same rewrites and headers) in case
the Vercel project's Root Directory is ever set to `frontend/`. Keep the two in sync.

GitHub disables scheduled workflows after 60 days without repo activity. If the
backend starts cold-starting again, re-enable them under the **Actions** tab.

### Workflow

1. Work on `feature/staging-setup` (or another feature branch). Locally, `.env`
   points at the **staging** database.
2. Push the branch and check the Vercel Preview deploy.
3. Open a PR into `main`. Merging it is the production deploy.

## Running locally

Backend (http://127.0.0.1:5001):

```bash
pip install -r requirements.txt
cp .env.example .env   # then fill in values — use the staging DATABASE_URL
python app.py
```

Frontend (http://localhost:5173 — proxies `/api` to the local backend):

```bash
cd frontend && npm install && npm run dev
```

## Environment variables

Backend (`.env` locally, Render dashboard in production):

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Flask session signing key (required — the app refuses to start without it) |
| `DATABASE_URL` | Postgres connection string (use the Supabase pooler port 6543). Falls back to `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_PORT` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (the frontend URLs) |
| `BOOTSTRAP_ADMIN_EMAILS` | Comma-separated emails that are always admin |
| `FIREBASE_CREDENTIALS` | Path to the Firebase service-account JSON (kept out of git in `firebase/`) |
| `FIREBASE_BUCKET` | Firebase storage bucket name |
| `R2_BUCKET`, `R2_ENDPOINT_URL`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_PUBLIC_URL_PREFIX` | Cloudflare R2 storage |
| `REDIS_URL` | Optional — shared rate-limit storage across gunicorn workers (in-memory otherwise) |
| `LOG_LEVEL` | Optional — application log level (default `INFO`) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_DRY_RUN`, `EMAIL_REDIRECT_TO`, `FRONTEND_URL` | Email — see [Email notifications](#email-notifications) |

Frontend (Vercel dashboard):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL including `/api`. Defaults to the production Render backend when unset — set it for the Preview environment so previews don't use production data. |

## Email notifications

Branded emails go out when material is uploaded, approved or rejected, when reports and issues are filed or resolved, and to admins when something needs review. Templates live in `email_templates.py`, events in `email_events.py`.

*   `RESEND_API_KEY` — required to send. Without it, emails are skipped.
*   `EMAIL_FROM` — optional sender address (defaults to the one set in `email_service.py`).
*   `EMAIL_DRY_RUN=1` — log instead of sending. Use this locally and on staging.
*   `EMAIL_REDIRECT_TO=you@example.com` — send every email to one inbox for testing.
*   `FRONTEND_URL` — base URL for links in emails (default `https://gikicoursehub.app`).
*   Run `migrations/025_email_preferences.sql` so users can opt out at `/email-settings`.
*   `python preview_emails.py` writes every template to `email_previews/` to look at in a browser.

## Backend tests
`tests/` runs the API against a throwaway Postgres built from `migrations/`. CI does this on every PR. Locally, point it at an empty database you don't mind wiping:

```
pip install -r requirements.txt -r requirements-dev.txt
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/coursehub_test pytest -q tests
```

## Repo layout

```
app.py, config.py, db.py   Flask app, config, DB pool
notifications.py           In-app notification helper (notify())
email_*.py                 Email sending, events and templates
routes/                    API blueprints (files, admin, auth, users, gpa, issues, instructors,
                           calendar, notifications, email)
utils/                     Validators, calendar and other helpers
migrations/                Numbered SQL migrations (applied manually, in order)
sql/                       Reference schema, SQL functions and seeds
tests/                     Backend API tests (pytest, throwaway Postgres)
scripts/                   Maintenance scripts — see scripts/README.md (some are destructive)
frontend/                  React app (src/pages, src/components, src/services/api.js)
```
