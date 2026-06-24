-- =============================================
-- Migration 021: GPA Records
-- Stores per-semester GPA snapshots for users
-- =============================================

CREATE TABLE IF NOT EXISTS semester_gpas (
    gpa_id        SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    faculty       TEXT NOT NULL,
    program       TEXT NOT NULL,
    semester      INT NOT NULL,
    gpa           NUMERIC(3,2) NOT NULL,
    total_credits INT NOT NULL,
    courses_json  JSONB NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, faculty, program, semester)
);

CREATE INDEX IF NOT EXISTS idx_semester_gpas_user ON semester_gpas(user_id);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_semester_gpas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_semester_gpas_updated ON semester_gpas;
CREATE TRIGGER trg_semester_gpas_updated
    BEFORE UPDATE ON semester_gpas
    FOR EACH ROW
    EXECUTE FUNCTION update_semester_gpas_updated_at();
