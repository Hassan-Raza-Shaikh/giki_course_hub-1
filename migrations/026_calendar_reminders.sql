-- =============================================
-- Migration 026: Calendar reminders
-- Records which reminder (e.g. '7d', '1d') has gone out for each calendar
-- event, so the reminder job never sends the same one twice.
-- =============================================

CREATE TABLE IF NOT EXISTS calendar_reminders (
    event_id  INT NOT NULL REFERENCES calendar_events(event_id) ON DELETE CASCADE,
    kind      VARCHAR(10) NOT NULL,
    sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, kind)
);
