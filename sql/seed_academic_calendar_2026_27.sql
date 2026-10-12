-- =============================================
-- Seed: GIKI Academic Calendar 2026-2027
-- Source: official Academic Calendar 2026-2027 (Fall 2026 to Fall 2027).
-- All-day events in campus time (PKT). Regular "Classes" blocks are left
-- out so they don't cover every day of the month grid.
--
-- Safe to re-run: an event is skipped if one with the same title and
-- start date already exists. Requires migrations/024_calendar_events.sql.
-- =============================================

INSERT INTO calendar_events (title, event_type, start_at, end_at, all_day, description, created_by)
SELECT v.title, v.event_type, v.start_at::timestamptz, v.end_at::timestamptz, true, v.description, 'academic-calendar-2026-27'
FROM (VALUES
    -- Fall 2026
    ('Fresh-person Orientation',            'event',    '2026-08-29 00:00+05', '2026-08-30 00:00+05', NULL),
    ('Fall 2026 semester starts',           'semester', '2026-08-31 00:00+05', NULL,                  'Classes run Aug 31 to Oct 23 and Nov 9 to Dec 25.'),
    ('Fall 2026 Midterm Examinations',      'midterm',  '2026-10-26 00:00+05', '2026-10-30 00:00+05', NULL),
    ('Mid Semester Break',                  'holiday',  '2026-11-02 00:00+05', '2026-11-06 00:00+05', NULL),
    ('Makeup classes (Quaid-e-Azam Day)',   'event',    '2026-12-20 00:00+05', NULL,                  'Sunday makeup classes in lieu of the closed day on Quaid-e-Azam Day, Friday December 25.'),
    ('Quaid-e-Azam Day',                    'holiday',  '2026-12-25 00:00+05', NULL,                  'Closed. Makeup classes are held on Sunday December 20.'),
    ('Fall 2026 Final Examinations',        'final',    '2026-12-28 00:00+05', '2027-01-03 00:00+05', NULL),
    ('End of Semester Break',               'holiday',  '2027-01-04 00:00+05', '2027-01-15 00:00+05', NULL),

    -- Spring 2027
    ('Spring 2027 semester begins',         'semester', '2027-01-18 00:00+05', NULL,                  'Classes run Jan 18 to Mar 5, Mar 15 to 19 and Mar 29 to May 14.'),
    ('Makeup classes (Kashmir Day)',        'event',    '2027-01-31 00:00+05', NULL,                  'Sunday makeup classes, as no classes will be held on Kashmir Day, Friday February 5.'),
    ('Kashmir Day',                         'holiday',  '2027-02-05 00:00+05', NULL,                  'No classes. Makeup classes are held on Sunday January 31.'),
    ('Eid-ul-Fitr Break',                   'holiday',  '2027-03-08 00:00+05', '2027-03-12 00:00+05', 'Eid-ul-Fitr (Shawwal 01, 1448 A.H.) is expected on Wednesday March 10, 2027.'),
    ('Spring 2027 Midterm Examinations',    'midterm',  '2027-03-22 00:00+05', '2027-03-26 00:00+05', 'No examination on Tuesday March 23 (Pakistan Day).'),
    ('Pakistan Day',                        'holiday',  '2027-03-23 00:00+05', NULL,                  'No midterm examination on this day.'),
    ('Eid-ul-Adha Break',                   'holiday',  '2027-05-17 00:00+05', '2027-05-21 00:00+05', 'Eid-ul-Adha (Dhul Hijjah 10, 1448 A.H.) is expected on Monday May 17, 2027.'),
    ('Spring 2027 Final Examinations',      'final',    '2027-05-26 00:00+05', '2027-05-31 00:00+05', NULL),
    ('End of Semester Break',               'holiday',  '2027-06-01 00:00+05', '2027-06-11 00:00+05', NULL),

    -- Summer 2027
    ('Summer School begins',                'semester', '2027-06-14 00:00+05', NULL,                  'Classes run Jun 14 to Aug 6.'),
    ('Ashura (closed)',                     'holiday',  '2027-06-15 00:00+05', '2027-06-16 00:00+05', 'Ashura Muharram (Muharram 9-10, 1449 A.H.) is expected on Tuesday and Wednesday June 15-16, 2027 and will be observed as closed days.'),
    ('Convocation 2027',                    'event',    '2027-06-29 00:00+05', NULL,                  'Tentatively scheduled.'),
    ('Summer 2027 Final Examination',       'final',    '2027-08-09 00:00+05', '2027-08-13 00:00+05', NULL),
    ('End of Summer Break',                 'holiday',  '2027-08-16 00:00+05', '2027-08-27 00:00+05', NULL),

    -- Fall 2027
    ('Orientation of freshmen',             'event',    '2027-08-28 00:00+05', '2027-08-29 00:00+05', NULL),
    ('Fall 2027 semester starts',           'semester', '2027-08-30 00:00+05', NULL,                  NULL)
) AS v(title, event_type, start_at, end_at, description)
WHERE NOT EXISTS (
    SELECT 1 FROM calendar_events e
    WHERE e.title = v.title AND e.start_at = v.start_at::timestamptz
);
