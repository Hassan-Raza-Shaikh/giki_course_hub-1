-- Migration 013: File notes by admins
CREATE TABLE IF NOT EXISTS file_notes (
    note_id     SERIAL PRIMARY KEY,
    file_id     INT NOT NULL REFERENCES files(file_id) ON DELETE CASCADE,
    admin_email VARCHAR(255) NOT NULL,
    note_text   TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(file_id)  -- one active note per file
);
