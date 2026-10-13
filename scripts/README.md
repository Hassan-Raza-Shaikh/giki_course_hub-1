# Maintenance scripts

One-off and maintenance scripts. None of these are imported by the Flask app, and
`scripts/` is excluded from the Docker image.

Run them **from the repo root** as modules so imports like `db` and
`firebase_admin_init` resolve:

```bash
python -m scripts.check_routes
```

Scripts that touch a database use whatever `DATABASE_URL` is in `.env`.
Check it points at **staging** before running anything marked destructive.

| Script | What it does | Touches |
|---|---|---|
| `seed_from_json.py` | ⚠️ **Destructive** — `DELETE`s all files, courses, programs, faculties, instructors and categories, then re-seeds from `giki_courses_with_codes.json` + `instructors_by_faculty.json` | Postgres (write) |
| `copy_db.py` | ⚠️ **Destructive** — `TRUNCATE`s every table in `STAGING_DATABASE_URL`, then copies all rows from `SOURCE_DATABASE_URL` | Postgres (write) |
| `check_orphans.py` | ⚠️ **Destructive** — lists R2 objects with no matching `files` row and deletes them | R2 (delete), Postgres (read) |
| `delete_electives_pg.py` | ⚠️ **Destructive** — deletes generic elective placeholder courses | Postgres (write) |
| `remove_electives_db.py` | ⚠️ **Destructive** — removes elective placeholders from the JSON and from Firestore (legacy) | JSON file, Firestore (write) |
| `backfill_hashes.py` | Downloads files missing `content_hash` from R2 and fills the hash in | R2 (read), Postgres (write) |
| `check_random_courses_query.py` | Tests the `TABLESAMPLE` query behind `/api/courses/random` | Postgres (read) |
| `peek_firestore.py` | Prints one document from the legacy Firestore `courses` collection | Firestore (read) |
| `list_elective_placeholders.py` | Lists placeholder/elective courses in the JSON | Local file (read) |
| `check_routes.py`, `check_routes2.py`, `check_routes3.py` | Rough static scan of `routes/` for endpoints missing auth/admin checks | Local files (read) |
| `generate_sprites.py` | Regenerates theme SVG sprites into `frontend/public/` | Local files (write) |
| `apply_styles.py`, `fix_bulk_upload.py` | One-time codemods that rewrite `AdminPanel.jsx` / `file_routes.py` in place; kept for reference — read before re-running | Local files (write) |

Frontend one-off codemods and checks live in `frontend/scripts/` and are run from
`frontend/` (they reference `src/...` paths).
