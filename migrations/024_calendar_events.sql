-- =============================================
-- Migration 024: GIKI Calendar
-- Admin-managed academic events (midterms, finals,
-- holidays, deadlines…) shown on /calendar.
-- =============================================

CREATE TABLE IF NOT EXISTS calendar_events (
    event_id      SERIAL PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    event_type    VARCHAR(30) NOT NULL DEFAULT 'event'
                  CHECK (event_type IN ('midterm', 'final', 'exam', 'holiday', 'deadline', 'registration', 'semester', 'event')),
    start_at      TIMESTAMPTZ NOT NULL,
    end_at        TIMESTAMPTZ,
    all_day       BOOLEAN NOT NULL DEFAULT false,
    location      VARCHAR(200),
    -- Pinned events get a live countdown at the top of the calendar page
    show_countdown BOOLEAN NOT NULL DEFAULT false,
    created_by    VARCHAR(255),           -- admin email
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_at IS NULL OR end_at >= start_at)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_at);

CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_calendar_events_updated_at();
