-- 001_baseline.sql
-- This represents the schema exactly as it is in production today.
-- It initializes the schema migrations table but we don't drop/recreate anything.

-- For actual SQL, let's just create a dummy table to represent the real baseline,
-- since the tables are already created and we don't want to re-run CREATE TABLE.
-- If someone runs this on a fresh database, they should run schema.sql first instead,
-- but migrate.py needs this file to exist to mark baseline as done.

SELECT 1;
