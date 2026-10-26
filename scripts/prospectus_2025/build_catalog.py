"""
Build the 2025 course catalogue update from the prospectus data.

    python scripts/prospectus_2025/build_catalog.py

Reads data/prospectus_2025/ (the 2025 plan, descriptions, overrides.json and
a snapshot of the live /api/courses response) and writes:

  sql/prospectus_2025/apply_catalog_2025.sql   data changes, run after migration 027
  data/prospectus_2025/catalog_changes.csv     every change, for review
  frontend/src/data/giki_courses_2025.json     2025 plan for the GPA calculator

How the live data changes:
  * A course in both plans keeps its row (uploads, bookmarks and links stay)
    and gets its 2025 code, name and semester. The previous values go in
    old_code / old_name / old_semester and curriculum = 'both'.
  * Courses only earlier batches take keep their values, curriculum = 'old'.
  * New 2025 courses and the Materials Engineering programmes are inserted
    with curriculum = '2025'.
  * Uploads are pooled by course code. When a code changes, the old and new
    codes are linked (manual_course_links) so a course shows uploads under
    both. When the old code now belongs to a different course (CS221 was
    Data Structures and is now Digital Logic Design), its uploads are moved
    to the new code instead, and every move is backed up.
"""
import csv
import json
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from match import (DATA, ROOT, is_lab, live_programs, load,  # noqa: E402
                   match_program, norm, plan_programs, similarity)

SQL_OUT = os.path.join(ROOT, 'sql', 'prospectus_2025', 'apply_catalog_2025.sql')
CSV_OUT = os.path.join(DATA, 'catalog_changes.csv')
GPA_OUT = os.path.join(ROOT, 'frontend', 'src', 'data', 'giki_courses_2025.json')

DESCRIPTION_MATCH = 0.5  # a description is used only if its course name is this close


# ── Descriptions ─────────────────────────────────────────────────────────────

def description_index():
    index = defaultdict(list)
    for key, entry in load('giki_course_descriptions_2025.json').items():
        base = re.sub(r'\s*\(.*\)$|#\d+$', '', key)
        codes = set(entry.get('codes') or base.split('/'))
        codes |= set(entry.get('also_listed_as') or [])
        for code in codes:
            index[code.strip().upper()].append(entry)
    return index


def find_description(index, code, name, faculty):
    """Best description for a course, or None. Checks the name, since codes get reused."""
    def best(c, n):
        scored = [(similarity(n, e['name']) + (0.05 if e['faculty'] == faculty else 0), e)
                  for e in index.get((c or '').upper(), [])]
        scored.sort(key=lambda s: s[0], reverse=True)
        if scored and scored[0][0] >= DESCRIPTION_MATCH:
            return scored[0][1]
        return None

    found = best(code, name)
    if not found and is_lab(code, name):
        # Labs are described with their theory course
        theory_name = re.sub(r'\s*\blab(oratory)?\b\.?', '', name, flags=re.I).strip()
        found = best(re.sub(r'-?L$', '', code or ''), theory_name)
    return found['description'].strip() if found else None


# ── SQL helpers ──────────────────────────────────────────────────────────────

def q(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def is_placeholder(code):
    return not code or bool(re.search(r'X', code[2:], re.I))


def prereq_text(value):
    if not value or str(value).strip().lower() in ('none', '-', '—', 'nil'):
        return None
    return str(value).strip()


# ── Build ────────────────────────────────────────────────────────────────────

def build():
    overrides = load('overrides.json')
    live = live_programs()
    plan = plan_programs(overrides)
    descriptions = description_index()
    old_plan_ch = {}
    with open(os.path.join(ROOT, 'frontend', 'src', 'data', 'giki_courses_with_codes.json'),
              encoding='utf-8') as f:
        for fac in json.load(f)['faculties']:
            for prog in fac['programs']:
                for sem in prog['semesters']:
                    for c in sem['courses']:
                        old_plan_ch[(prog['program_name'], c['code'])] = c.get('ch')

    updates, old_only, inserts, new_programs = [], [], [], []
    review = []

    for prog_name, p in plan.items():
        faculty = p['faculty']
        if prog_name not in live:
            new_programs.append((faculty, prog_name))
            for n in p['courses']:
                inserts.append((faculty, prog_name, n, find_description(descriptions, n['code'], n['name'], faculty)))
                review.append([prog_name, 'new programme', '', '', '', n['code'], n['name'], n['semester']])
            continue

        pairs, olds, news = match_program(prog_name, live[prog_name]['courses'], p['courses'], overrides)
        for o, n, why in pairs:
            if is_placeholder(n['code']) and not is_placeholder(o['code']):
                n = dict(n, code=o['code'])  # keep the real code students already know
            changed_code = o['code'] != n['code']
            changed_name = o['name'] != n['name']
            changed_sem = o['semester'] != n['semester']
            updates.append({
                'program': prog_name, 'id': o['id'], 'from_code': o['code'],
                'code': n['code'], 'name': n['name'], 'semester': n['semester'],
                'old_code': o['code'] if changed_code else None,
                'old_name': o['name'] if changed_name else None,
                'old_semester': o['semester'] if changed_sem else None,
                'credit_hours': n['ch'], 'prereq': prereq_text(n['prereq']),
                'description': find_description(descriptions, n['code'], n['name'], faculty)
                or find_description(descriptions, o['code'], o['name'], faculty),
            })
            if changed_code or changed_name or changed_sem:
                kind = ('renamed' if changed_code else 'retitled' if changed_name else 'moved semester')
                review.append([prog_name, kind, o['code'], o['name'], o['semester'],
                               n['code'], n['name'], n['semester']])
        for o in olds:
            old_only.append({
                'program': prog_name, 'id': o['id'], 'code': o['code'],
                'credit_hours': old_plan_ch.get((prog_name, o['code'])),
                'description': find_description(descriptions, o['code'], o['name'], faculty),
            })
            review.append([prog_name, 'earlier batches only', o['code'], o['name'], o['semester'], '', '', ''])
        for n in news:
            inserts.append((faculty, prog_name, n, find_description(descriptions, n['code'], n['name'], faculty)))
            review.append([prog_name, 'new course', '', '', '', n['code'], n['name'], n['semester']])

    # ── Final catalogue, for checks and the upload pools ─────────────────────
    final = []  # (program, code, normalised subject, origin code)
    for u in updates:
        final.append((u['program'], u['code'], norm(u['name']), u['from_code']))
    for o in old_only:
        name = next(c['name'] for c in live[o['program']]['courses'] if c['id'] == o['id'])
        final.append((o['program'], o['code'], norm(name), o['code']))
    for _, prog_name, n, _ in inserts:
        final.append((prog_name, n['code'], norm(n['name']), None))

    seen, problems = set(), []
    for prog_name, code, _, _ in final:
        if (prog_name, code) in seen:
            problems.append(f'{prog_name}: code {code} used twice')
        seen.add((prog_name, code))

    # Upload pools. For each code that changed: link it to the new code, or,
    # when the old code now names another course, move its uploads.
    renamed = defaultdict(set)    # old code -> new codes
    subject_of = {}               # old code -> the course it named
    for u in updates:
        if u['old_code']:
            renamed[u['old_code']].add(u['code'])
            subject_of[u['old_code']] = norm(u['old_name'] or u['name'])
    links, moves, pool_notes = [], [], []
    for old_code, new_codes in sorted(renamed.items()):
        rows_now = [r for r in final if r[1] == old_code]
        same = [old_code in overrides['same_course_codes'] or r[3] == old_code
                or similarity(r[2], subject_of[old_code]) >= 0.6 for r in rows_now]
        reused = [r for r, s in zip(rows_now, same) if not s]  # another course took the code
        kept = [r for r, s in zip(rows_now, same) if s]        # same course, same code elsewhere
        if not reused:
            for new_code in sorted(new_codes):
                links.append((old_code, new_code))
        elif not kept and len(new_codes) == 1:
            moves.append((old_code, next(iter(new_codes))))
        else:
            problems.append(f'uploads under {old_code} cannot be split: it is now {sorted(new_codes)} '
                            f'and also {sorted({r[1] + " in " + r[0] for r in reused})}')

    # Courses with the exact same name share uploads. Where a retitle splits
    # such a group (SE201 "Software Engineering" -> "Introduction to Software
    # Engineering"), link the codes so no page loses uploads it shows today.
    moved_to = dict(moves)
    names_now = defaultdict(set)
    for u in updates:
        names_now[u['code']].add(u['name'])
    for o in old_only:
        names_now[o['code']].add(next(c['name'] for c in live[o['program']]['courses'] if c['id'] == o['id']))
    for _, _, n, _ in inserts:
        names_now[n['code']].add(n['name'])
    groups = defaultdict(set)
    for p in live.values():
        for c in p['courses']:
            groups[c['name']].add(moved_to.get(c['code'], c['code']))
    linked = {frozenset(l) for l in links}
    for name, codes in sorted(groups.items()):
        for a in sorted(codes):
            for b in sorted(codes):
                if a < b and not names_now[a] & names_now[b] and frozenset((a, b)) not in linked:
                    links.append((a, b))
                    linked.add(frozenset((a, b)))

    # Codes that name different courses in different programmes share one upload pool
    subjects = defaultdict(set)
    for prog_name, code, subject, _ in final:
        subjects[code].add(subject)
    for code, names in sorted(subjects.items()):
        names = sorted(names)
        if any(similarity(a, b) < 0.6 for a in names for b in names):
            pool_notes.append(f'{code}: {" | ".join(names)}')

    if problems:
        print('Problems:\n  ' + '\n  '.join(problems))
        sys.exit(1)

    write_sql(updates, old_only, inserts, new_programs, links, moves)
    write_review(review, links, moves, pool_notes)
    write_gpa(plan)

    n_desc = sum(1 for u in updates if u['description']) + sum(1 for i in inserts if i[3])
    print(f'{len(updates)} courses kept and updated ({sum(1 for u in updates if u["old_code"])} new codes), '
          f'{len(old_only)} earlier-batches only, {len(inserts)} new '
          f'({len(new_programs)} new programmes), {n_desc} with descriptions')
    print(f'{len(links)} code links, {len(moves)} upload moves')
    if pool_notes:
        print('Codes shared by different courses (upload pools overlap):\n  ' + '\n  '.join(pool_notes))


def write_sql(updates, old_only, inserts, new_programs, links, moves):
    out = []
    w = out.append
    w('-- Generated by scripts/prospectus_2025/build_catalog.py. Do not edit by hand.')
    w('-- Applies the 2025 prospectus to the course catalogue. Needs migration 027.')
    w('-- Run it in one go: it is one transaction, so nothing changes if any step fails.')
    w('-- Safe to run twice; the second run changes nothing.')
    w('')
    w('BEGIN;')
    w('')
    w('-- Stop if migration 027 has not been run')
    w("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
      "WHERE table_name = 'courses' AND column_name = 'curriculum') THEN "
      "RAISE EXCEPTION 'Run migrations/027_course_catalog_2025.sql first'; END IF; END $$;")
    w('')

    texts = {}
    for item in updates + old_only:
        if item['description']:
            texts.setdefault(item['description'], len(texts) + 1)
    for *_, desc in inserts:
        if desc:
            texts.setdefault(desc, len(texts) + 1)

    def d(text):
        return str(texts[text]) if text else 'NULL'

    w('-- Course descriptions, each stored once and referred to by number below')
    w('CREATE TEMP TABLE _desc (desc_id INT PRIMARY KEY, body TEXT) ON COMMIT DROP;')
    for chunk in chunks(list(texts.items()), 50):
        w('INSERT INTO _desc VALUES')
        w(',\n'.join(f'  ({i}, {q(t)})' for t, i in chunk) + ';')
    w('')

    w('-- 1. Courses in both plans: new code, name and semester; old values kept')
    w('CREATE TEMP TABLE _catalog_2025 (course_id INT, from_code TEXT, code TEXT, name TEXT, semester INT,')
    w('  old_code TEXT, old_name TEXT, old_semester INT, credit_hours INT, prereq TEXT, desc_id INT) ON COMMIT DROP;')
    for chunk in chunks(updates, 50):
        w('INSERT INTO _catalog_2025 VALUES')
        w(',\n'.join(
            f"  ({u['id']}, {q(u['from_code'])}, {q(u['code'])}, {q(u['name'])}, {u['semester']}, "
            f"{q(u['old_code'])}, {q(u['old_name'])}, {q(u['old_semester'])}, {q(u['credit_hours'])}, "
            f"{q(u['prereq'])}, {d(u['description'])})" for u in chunk) + ';')
    w('')
    w('-- Only rows still exactly as they were when the plan was built (first run)')
    w('DELETE FROM _catalog_2025 t WHERE NOT EXISTS (')
    w('  SELECT 1 FROM courses c WHERE c.course_id = t.course_id AND c.code = t.from_code AND c.curriculum = \'both\' AND c.old_code IS NULL AND c.old_name IS NULL AND c.old_semester IS NULL);')
    w('-- Free the codes first so two courses can swap codes (CS221 / CS222)')
    w("UPDATE courses c SET code = '~' || c.course_id FROM _catalog_2025 t WHERE c.course_id = t.course_id AND t.old_code IS NOT NULL;")
    w('UPDATE courses c SET code = t.code, name = t.name, semester = t.semester, year = (t.semester + 1) / 2,')
    w('       old_code = t.old_code, old_name = t.old_name, old_semester = t.old_semester,')
    w("       credit_hours = t.credit_hours, prereq = t.prereq, curriculum = 'both',")
    w('       description = (SELECT body FROM _desc WHERE desc_id = t.desc_id)')
    w('  FROM _catalog_2025 t WHERE c.course_id = t.course_id;')
    w('')

    w('-- 2. Courses only earlier batches take')
    for chunk in chunks(old_only, 50):
        w('UPDATE courses c SET curriculum = \'old\', credit_hours = COALESCE(c.credit_hours, v.ch),')
        w('       description = COALESCE(c.description, (SELECT body FROM _desc WHERE desc_id = v.desc_id))')
        w('  FROM (VALUES')
        w(',\n'.join(f"    ({o['id']}, {q(o['code'])}, {q(o['credit_hours'])}::int, {d(o['description'])}::int)"
                     for o in chunk))
        w('  ) AS v(course_id, code, ch, desc_id)')
        w(' WHERE c.course_id = v.course_id AND c.code = v.code;')
    w('')

    w('-- 3. New programmes')
    for faculty, prog_name in new_programs:
        w(f"INSERT INTO programs (faculty_id, name) SELECT faculty_id, {q(prog_name)} FROM faculties "
          f"WHERE name = {q(faculty)} ON CONFLICT (faculty_id, name) DO NOTHING;")
    w('')

    w('-- 4. New courses')
    by_prog = defaultdict(list)
    for faculty, prog_name, n, desc in inserts:
        by_prog[(faculty, prog_name)].append((n, desc))
    for (faculty, prog_name), rows in by_prog.items():
        w(f'-- {prog_name}')
        w('INSERT INTO courses (name, code, year, semester, faculty_id, program_id, is_lab, curriculum, credit_hours, prereq, description)')
        w("SELECT v.name, v.code, (v.semester + 1) / 2, v.semester, p.faculty_id, p.program_id, v.is_lab, '2025', v.ch, v.prereq,")
        w('       (SELECT body FROM _desc WHERE desc_id = v.desc_id)')
        w('  FROM (VALUES')
        w(',\n'.join(
            f"    ({q(n['name'])}, {q(n['code'])}, {n['semester']}, {q(is_lab(n['code'], n['name']))}, "
            f"{q(n['ch'])}::int, {q(prereq_text(n['prereq']))}::text, {d(desc)}::int)" for n, desc in rows))
        w('  ) AS v(name, code, semester, is_lab, ch, prereq, desc_id)')
        w(f'  JOIN programs p ON p.name = {q(prog_name)}')
        w(f'  JOIN faculties f ON f.faculty_id = p.faculty_id AND f.name = {q(faculty)}')
        w('ON CONFLICT (code, program_id) DO NOTHING;')
    w('')

    w('-- 5. Uploads: move the ones whose code now belongs to a different course.')
    w('--    Each move is recorded in files_course_code_backup_027 so it can be undone.')
    w('CREATE TABLE IF NOT EXISTS files_course_code_backup_027 (file_id INT PRIMARY KEY, old_course_code TEXT, new_course_code TEXT, moved_at TIMESTAMPTZ DEFAULT NOW());')
    w('CREATE TEMP TABLE _upload_moves (from_code TEXT, to_code TEXT) ON COMMIT DROP;')
    if moves:
        w('INSERT INTO _upload_moves VALUES ' + ', '.join(f'({q(a)}, {q(b)})' for a, b in moves) + ';')
    w('-- Only on the first run: later uploads under these codes are for the new course.')
    w('-- Skips any move that would clash with an upload of the same title.')
    w('CREATE TABLE IF NOT EXISTS catalog_2025_applied (applied_at TIMESTAMPTZ DEFAULT NOW());')
    w('INSERT INTO files_course_code_backup_027 (file_id, old_course_code, new_course_code)')
    w('SELECT f.file_id, f.course_code, m.to_code FROM files f JOIN _upload_moves m ON f.course_code = m.from_code')
    w(' WHERE NOT EXISTS (SELECT 1 FROM catalog_2025_applied)')
    w('   AND NOT EXISTS (SELECT 1 FROM files_course_code_backup_027 b WHERE b.file_id = f.file_id)')
    w('   AND NOT EXISTS (SELECT 1 FROM files g WHERE g.course_code = m.to_code AND g.title = f.title')
    w('                   AND g.category_id IS NOT DISTINCT FROM f.category_id AND g.instructor_id IS NOT DISTINCT FROM f.instructor_id);')
    w('UPDATE files f SET course_code = b.new_course_code FROM files_course_code_backup_027 b')
    w(' WHERE f.file_id = b.file_id AND f.course_code = b.old_course_code;')
    w('-- Links that pointed at a moved code meant the old course, so they follow it')
    w('INSERT INTO manual_course_links (course_code_1, course_code_2)')
    w('SELECT CASE WHEN l.course_code_1 = m.from_code THEN m.to_code ELSE l.course_code_1 END,')
    w('       CASE WHEN l.course_code_2 = m.from_code THEN m.to_code ELSE l.course_code_2 END')
    w('  FROM manual_course_links l JOIN _upload_moves m ON m.from_code IN (l.course_code_1, l.course_code_2)')
    w(' WHERE NOT EXISTS (SELECT 1 FROM catalog_2025_applied)')
    w('ON CONFLICT DO NOTHING;')
    w('DELETE FROM manual_course_links l USING _upload_moves m')
    w(' WHERE m.from_code IN (l.course_code_1, l.course_code_2) AND NOT EXISTS (SELECT 1 FROM catalog_2025_applied);')
    w('')

    w('-- 6. Link each old code to its new code so the course shows uploads under both')
    if links:
        w('INSERT INTO manual_course_links (course_code_1, course_code_2) VALUES')
        w(',\n'.join(f'  ({q(a)}, {q(b)})' for a, b in links))
        w('ON CONFLICT DO NOTHING;')
    w('')

    w('INSERT INTO catalog_2025_applied SELECT WHERE NOT EXISTS (SELECT 1 FROM catalog_2025_applied);')
    w('')
    w('-- 7. What changed')
    w("SELECT curriculum, COUNT(*) AS courses, COUNT(old_code) AS with_old_code, COUNT(description) AS with_description")
    w('  FROM courses GROUP BY curriculum ORDER BY curriculum;')
    w('')
    w('COMMIT;')

    os.makedirs(os.path.dirname(SQL_OUT), exist_ok=True)
    with open(SQL_OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + '\n')


def write_review(review, links, moves, pool_notes):
    with open(CSV_OUT, 'w', newline='', encoding='utf-8') as f:
        wr = csv.writer(f)
        wr.writerow(['program', 'change', 'old_code', 'old_name', 'old_semester',
                     'new_code', 'new_name', 'new_semester'])
        order = {'renamed': 0, 'retitled': 1, 'moved semester': 2, 'new course': 3,
                 'earlier batches only': 4, 'new programme': 5}
        for row in sorted(review, key=lambda r: (order[r[1]], r[0], r[2] or r[5])):
            wr.writerow(row)
        wr.writerow([])
        for a, b in moves:
            wr.writerow(['(uploads)', 'moved', a, '', '', b, '', ''])
        for a, b in links:
            wr.writerow(['(uploads)', 'linked', a, '', '', b, '', ''])
        for note in pool_notes:
            wr.writerow(['(uploads)', 'code shared by different courses', note, '', '', '', '', ''])


def write_gpa(plan):
    """Same shape as giki_courses_with_codes.json: faculties > programs > semesters > courses."""
    faculties = defaultdict(list)
    for prog_name, p in plan.items():
        semesters = defaultdict(list)
        for c in p['courses']:
            semesters[c['semester']].append({'code': c['code'], 'name': c['name'], 'ch': c['ch']})
        faculties[p['faculty']].append({
            'program_name': prog_name,
            'semesters': [{'semester': s, 'courses': semesters[s]} for s in sorted(semesters)],
        })
    data = {'faculties': [{'faculty_name': fac, 'programs': progs}
                          for fac, progs in sorted(faculties.items())]}
    with open(GPA_OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')


def chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


if __name__ == '__main__':
    build()
