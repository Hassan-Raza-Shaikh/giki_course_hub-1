# GIKI Course Hub

![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

A course resource hub for GIKI students: browse courses by faculty/program/semester,
upload and download notes, slides, past papers and reference books, bookmark files,
compare on a leaderboard, and calculate GPA. Uploads go through an admin approval queue.

## Architecture

| Layer | Stack | Lives in |
|---|---|---|
| Frontend | React 18 + Vite, React Router, axios | `frontend/` |
| Backend API | Flask + gunicorn (Talisman, Flask-Limiter, Flask-Compress, CORS) | `app.py`, `routes/`, `utils/` |
| Database | PostgreSQL on Supabase (connection pool in `db.py`) | schema history in `migrations/` |
| File storage | Cloudflare R2 (S3-compatible, via `boto3`) | `config.py` |
| Auth | Firebase Auth (Google sign-in); the backend verifies the ID token sent as `Authorization: Bearer` | `firebase_admin_init.py`, `app.py` |
| Email | Resend (optional — skipped when `RESEND_API_KEY` is unset) | `email_service.py` |

## Hosting

**Pushing or merging to `main` deploys to production.** There is no CI gate.

| What | Where | Deploys from |
|---|---|---|
| Frontend | Vercel project `frontend` — https://frontend-xi-pink-10.vercel.app | `main` → Production; any other branch / PR → Preview. Built from the repo root using the root `vercel.json`. |
| Backend | Render (free tier, `Dockerfile`) — https://giki-course-hub-backend.onrender.com | `main` (auto-deploy — confirm in Render → Settings) |
| Keep-awake | GitHub Actions `keepalive.yml` and `cron.yml` ping the backend so the free tier doesn't sleep | — |

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
| `RESEND_API_KEY` | Optional — enables notification emails |

Frontend (Vercel dashboard):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL including `/api`. Defaults to the production Render backend when unset — set it for the Preview environment so previews don't use production data. |

## Repo layout

```
app.py, config.py, db.py   Flask app, config, DB pool
routes/                    API blueprints (files, admin, auth, users, gpa, issues, instructors)
utils/                     Validators and helpers
migrations/                Numbered SQL migrations (applied manually, in order)
sql/                       Reference schema and SQL functions
scripts/                   Maintenance scripts — see scripts/README.md (some are destructive)
frontend/                  React app (src/pages, src/components, src/services/api.js)
```
