import api from '../../services/api';

/*
 * App tour definitions.
 *
 * ── Adding a step ──────────────────────────────────────────
 * 1. Put a `data-tour="your-id"` attribute on the element to highlight.
 * 2. Add a step object to the tour's `steps` array below:
 *
 *    {
 *      id:     'notifications',                       // unique within the tour
 *      target: ['[data-tour="nav-notifications"]'],   // CSS selectors, first VISIBLE match wins
 *                                                     // (list desktop + mobile variants); omit for a centred card
 *      route:  '/calendar',                           // optional: page to open first (string or async fn)
 *      title:  'Notification Centre',
 *      body:   'Approvals, replies and new uploads land here.',
 *      when:   ({ user, width }) => !!user,           // optional: skip the step when false
 *    }                                                // (width = window.innerWidth at tour start)
 *
 * If no selector matches within a few seconds the step is shown as a
 * centred card, so a missing element never breaks the tour.
 *
 * ── Re-showing the tour after big changes ──────────────────
 * Bump a tour's `version` and everyone who has finished or dismissed it
 * gets the "take the tour" prompt again on their next visit.
 */

// Pick a real course to demo the course page. Stay put if already on one.
const demoCourseRoute = async ({ pathname }) => {
  if (pathname.startsWith('/course/')) return pathname;
  try {
    const res = await api.get('/courses/random?n=1', { timeout: 8000 });
    const c = res.data?.courses?.[0];
    if (c) return `/course/${c.course_id || c.id || c.code}`;
  } catch { /* fall through */ }
  return '/courses';
};

// Between 769px and 1399px the secondary navbar links fold into "More"
// (see NavLinks.jsx), so those steps point at the More button instead.
const MORE_MENU = ({ width }) => width > 768 && width < 1400;
const OWN_BUTTON = (ctx) => !MORE_MENU(ctx);

export const TOURS = {
  main: {
    version: 1,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to GIKI Course Hub',
        body: 'Past papers, notes, slides and outlines for every GIKI course, shared by students. This quick tour shows you where everything lives.',
      },
      {
        id: 'nav-courses',
        target: ['[data-tour="nav-courses"]', '[data-tour="tab-courses"]'],
        title: 'Browse courses',
        body: 'Every course, organised by faculty, program and semester.',
      },
      {
        id: 'courses-search',
        route: '/courses',
        target: ['[data-tour="courses-search"]'],
        title: 'Find your course fast',
        body: 'Type a course name or code, like "MT101", to jump straight to it.',
      },
      {
        id: 'courses-types',
        route: '/courses',
        target: ['[data-tour="courses-types"]'],
        title: 'Browse by resource type',
        body: 'Want every past paper or every lab manual at once? Pick a type to see it across all courses.',
      },
      {
        id: 'courses-faculties',
        route: '/courses',
        target: ['[data-tour="faculty-header"]'],
        title: 'Faculties and programs',
        body: 'Open a faculty to see its programs and semesters, then pick a course.',
      },
      {
        id: 'course-sections',
        route: demoCourseRoute,
        target: ['[data-tour="course-sections"]'],
        title: 'Course sections',
        body: 'Each course is split into sections such as Outlines, Slides and Past Papers. The number shows how many files are in each.',
      },
      {
        id: 'course-files',
        route: demoCourseRoute,
        target: ['[data-tour="course-files"] .file-actions-row', '[data-tour="course-files"]'],
        title: 'Preview, save, download',
        body: 'Click a file to preview it right here. You can also bookmark it, copy a link, download it, or report a problem.',
      },
      {
        id: 'download-all',
        route: demoCourseRoute,
        target: ['[data-tour="download-section"]', '[data-tour="download-course"]'],
        title: 'Download everything at once',
        body: '"Download all" zips every file in the section you are viewing. "Download course", at the top of the page, zips the whole course with a folder for each section.',
      },
      {
        id: 'course-upload',
        route: demoCourseRoute,
        target: ['[data-tour="course-upload"]'],
        title: 'Share your own material',
        body: 'Upload notes, papers or slides for this course. An admin reviews each upload before it goes live.',
      },
      {
        id: 'nav-search',
        target: ['[data-tour="nav-search"]', '[data-tour="tab-search"]'],
        title: 'Search everything',
        body: 'Search files across every course. On a keyboard, press / from any page to jump here.',
      },
      {
        id: 'nav-upload',
        target: ['[data-tour="nav-upload"]', '[data-tour="tab-upload"]'],
        title: 'Upload from anywhere',
        body: 'Upload files for any course without opening it first.',
      },
      {
        id: 'nav-more',
        when: MORE_MENU,
        target: ['[data-tour="nav-more"]'],
        title: 'More pages',
        body: 'Your bookmarks, the leaderboard, the GPA calculator and the GIKI Calendar are in this menu.',
      },
      {
        id: 'nav-bookmarks',
        when: OWN_BUTTON,
        target: ['[data-tour="nav-bookmarks"]', '[data-tour="tab-bookmarks"]'],
        title: 'Your bookmarks',
        body: 'Everything you bookmark is collected here so you can find it before exams.',
      },
      {
        id: 'nav-leaderboard',
        when: OWN_BUTTON,
        target: ['[data-tour="nav-leaderboard"]', '[data-tour="tab-leaderboard"]'],
        title: 'Leaderboard',
        body: 'Top contributors by approved uploads. Share material to climb it.',
      },
      {
        id: 'nav-calculator',
        when: OWN_BUTTON,
        target: ['[data-tour="nav-calculator"]', '[data-tour="tab-calculator"]'],
        title: 'GPA calculator',
        body: 'Work out your GPA and CGPA, and save your records if you are signed in.',
      },
      {
        id: 'nav-calendar',
        when: OWN_BUTTON,
        target: ['[data-tour="nav-calendar"]', '[data-tour="tab-calendar"]'],
        title: 'GIKI Calendar',
        body: 'Exams, deadlines, holidays and campus events in one place.',
      },
      {
        id: 'calendar',
        route: '/calendar',
        target: ['[data-tour="calendar-countdowns"]', '[data-tour="calendar-header"]'],
        title: 'Countdowns and reminders',
        body: 'See exactly how long is left until midterms and finals. Open any event to add it to Google Calendar or your phone, or tap Subscribe to get the whole calendar.',
      },
      {
        id: 'notifications',
        when: ({ user }) => !!user,
        target: ['[data-tour="notifications"]'],
        title: 'Notifications',
        body: 'The bell shows a badge when your upload is approved, a report you made is handled, or a calendar event is coming up. Open it for the latest, or view them all.',
      },
      {
        id: 'email-settings',
        when: ({ user }) => !!user,
        route: '/email-settings',
        target: ['[data-tour="email-prefs"]'],
        title: 'Email updates',
        body: 'Choose which updates we also send to your inbox. You can come back here any time from Email Settings in your account menu.',
      },
      {
        id: 'theme',
        target: ['[data-tour="theme"]'],
        title: 'Make it yours',
        body: 'Pick from 30 themes, from Light and Dark to Mario, Matrix and Pokémon.',
      },
      {
        id: 'account',
        target: ['[data-tour="account"]'],
        when: ({ user }) => !!user,
        title: 'Your account menu',
        body: 'Your profile, uploads, bookmarks, notifications and settings are here. You can replay this tour from here too.',
      },
      {
        id: 'sign-in',
        target: ['[data-tour="sign-in"]'],
        when: ({ user }) => !user,
        title: 'Sign in to contribute',
        body: 'Browsing is open to everyone. Sign in to upload, bookmark files, get notifications and email updates, and appear on the leaderboard.',
      },
      {
        id: 'done',
        title: "You're all set",
        body: 'You can replay this tour any time from "Take the Tour" in your account menu or at the bottom of the home page.',
      },
    ],
  },
};
