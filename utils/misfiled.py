"""Spot uploads that may sit under the wrong course.

A file belongs to a "subject": its course code plus every code that shares its
files (same course name, or a manual course link, followed transitively). That
is the same grouping the course page uses to pool files.

Signals, checked against the file's subject:
  * name:       the original file name carries a course code (e.g.
                "CE-221-wk01.pdf") that belongs to a different subject.
                A theory code on its lab (or the reverse) counts as a match.
  * instructor: the file's instructor is not listed for any course of this
                subject. Instructors teach several courses and change from
                term to term, so this never lists a file on its own.
  * page:       the file was uploaded from a course page of a different
                subject and later moved (by an admin edit or a script).
                Most moves are deliberate fixes, so this never lists a file
                on its own either.

Two or more signals: "likely" misfiled. The name signal alone: "check", since
codes get reused (a file named CS222 from before 2025 may well be COAL). Everything here is pure Python on plain rows so it can be
tested without a database.
"""
import re
from collections import defaultdict

# "CE221", "CE-221", "ce_221L", "CS 222 L" ... but not inside longer words or numbers
_CODE_RE = re.compile(r'(?<![A-Za-z0-9])([A-Za-z]{2,3})[\s_\-]?(\d{3})(?:[\s_\-]?(L)(?![A-Za-z]))?(?![0-9])')
# Upload folder: <bucket>/course_<id>/<uuid>_<original name>
_FOLDER_RE = re.compile(r'course_(\d+)/')
_UUID_PREFIX_RE = re.compile(r'^[0-9a-f]{32}_', re.I)


def _norm(code):
    return (code or '').strip().upper()


def original_name(path):
    """The uploader's file name, from a storage path or public URL."""
    base = (path or '').rsplit('/', 1)[-1]
    return _UUID_PREFIX_RE.sub('', base)


def upload_course_id(path):
    m = _FOLDER_RE.search(path or '')
    return int(m.group(1)) if m else None


def codes_in_name(name):
    """Course-code-like tokens in a file name, normalised (e.g. {'CE221'})."""
    stem = name.rsplit('.', 1)[0] if '.' in name else name
    return {f"{a.upper()}{n}{'L' if l else ''}" for a, n, l in _CODE_RE.findall(stem)}


class _Subjects:
    """Union-find over course codes and names, mirroring course-page pooling."""

    def __init__(self, courses, links):
        self.parent = {}
        for c in courses:
            self._union(_norm(c['code'] or c['name']), 'name:' + c['name'])
        for a, b in links:
            self._union(_norm(a), _norm(b))

    def _find(self, x):
        self.parent.setdefault(x, x)
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def _union(self, a, b):
        ra, rb = self._find(a), self._find(b)
        if ra != rb:
            self.parent[ra] = rb

    def of(self, code):
        return self._find(_norm(code))


def find_misfiled(courses, links, course_instructors, files, instructor_names=None, dismissed=()):
    """
    courses:            dicts with course_id, code, name, old_code
    links:              (code_1, code_2) pairs from manual_course_links
    course_instructors: (course_id, instructor_id) pairs
    files:              dicts with file_id, course_code, title, path, instructor_id, status
    Returns one dict per suspicious file, strongest first.
    """
    instructor_names = instructor_names or {}
    dismissed = set(dismissed)
    subjects = _Subjects(courses, links)
    by_id = {c['course_id']: c for c in courses}

    # Courses a code can mean: its current owner(s) and any course that used it before
    code_courses = defaultdict(list)
    for c in courses:
        if c['code']:
            code_courses[_norm(c['code'])].append(c)
        if c.get('old_code'):
            code_courses[_norm(c['old_code'])].append(c)

    def subject_of_course(c):
        return subjects.of(c['code'] or c['name'])

    def label(code):
        names = sorted({c['name'] for c in code_courses.get(code, []) if _norm(c['code']) == code}
                       or {c['name'] for c in code_courses.get(code, [])})
        return f"{code} ({names[0]})" if names else code

    instructor_subjects = defaultdict(set)
    for course_id, instructor_id in course_instructors:
        c = by_id.get(course_id)
        if c:
            instructor_subjects[instructor_id].add(subject_of_course(c))

    out = []
    for f in files:
        if f['file_id'] in dismissed:
            continue
        code = _norm(f['course_code'])
        subject = subjects.of(code)
        reasons, strong, weak = [], False, 0

        name = original_name(f.get('path'))
        named = [k for k in codes_in_name(name) if k in code_courses]
        variants = lambda k: (k, k[:-1] if k.endswith('L') else k + 'L')
        if named and not any(subject_of_course(c) == subject
                             for k in named for v in variants(k) for c in code_courses.get(v, [])):
            strong = True
            reasons.append({"kind": "name", "text": f"File name “{name}” points to {', '.join(label(k) for k in sorted(named))}"})

        iid = f.get('instructor_id')
        if iid and instructor_subjects.get(iid) and subject not in instructor_subjects[iid]:
            weak += 1
            reasons.append({"kind": "instructor",
                            "text": f"{instructor_names.get(iid, 'The instructor')} is not listed for any course that shares this one's files"})

        up = by_id.get(upload_course_id(f.get('path')))
        if up and subject_of_course(up) != subject:
            weak += 1
            reasons.append({"kind": "page", "text": f"Uploaded from the {up['code'] or up['name']} {up['name']} page, then moved"})

        score = weak + (1 if strong else 0)
        if score >= 2 or strong:
            out.append({
                "file_id": f['file_id'], "title": f['title'], "course_code": f['course_code'],
                "course_name": label(code).split(' (', 1)[-1].rstrip(')') if code in code_courses else None,
                "status": f.get('status'), "instructor_id": iid, "category_id": f.get('category_id'),
                "file_url": f.get('file_url'), "confidence": "likely" if score >= 2 else "check",
                "reasons": reasons,
            })
    out.sort(key=lambda r: (r['confidence'] != 'likely', r['course_code'] or '', r['title'] or ''))
    return out
