"""
Match the courses currently in the app against the 2025 prospectus plan.

Used by build_catalog.py. Each program's live courses are paired with its
2025 courses so a course keeps one page (and its uploads) when its code,
name or semester changes.

Pairing, per program:
  1. Explicit pairs from overrides.json.
  2. Courses whose names match closely (same theory/lab kind).
  3. Courses with the same code and kind (a retitled course). Codes that were
     reused for a different subject are listed in overrides.json never_pair.
Anything left over is either new in 2025 or only taken by earlier batches.
"""
import json
import os
import re
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DATA = os.path.join(ROOT, 'data', 'prospectus_2025')

NAME_MATCH = 0.88   # names this close are the same subject


def load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


def norm(name):
    n = name.lower().replace('&', ' and ')
    n = re.sub(r'\blaboratory\b', 'lab', n)
    n = re.sub(r'\b(engg|engr)\b\.?', 'engineering', n)
    n = re.sub(r'[^a-z0-9 ]', ' ', n)
    return ' '.join(n.split())


def similarity(a, b):
    return SequenceMatcher(None, norm(a), norm(b)).ratio()


def is_lab(code, name):
    code = (code or '').upper().replace('-', '')
    return code.endswith('L') or bool(re.search(r'\blab\b', name, re.I))


def clean_name(name):
    """Drop footnote markers the prospectus prints after some names."""
    name = re.sub(r'[+*]+', '', name).strip()
    return re.sub(r'\s+', ' ', name)


def resolve_code(course, program, overrides):
    """Give courses printed with a placeholder code (HM3XX, '') a stable code."""
    code = (course['code'] or '').strip()
    key = norm(clean_name(course['name']))
    fixes = overrides['code_fixes_by_program'].get(program, {})
    if code in fixes:
        return fixes[code]
    if code in overrides['code_fixes']:
        return overrides['code_fixes'][code]
    if key in overrides['codes_by_name']:
        return overrides['codes_by_name'][key]
    if not code or re.search(r'X', code[2:], re.I):
        return overrides['placeholder_codes_by_name'].get(key, code)
    return code


def is_slot(course, overrides):
    """Elective slots and pick-one-of slots, which are not a single course."""
    if course.get('placeholder'):
        return True
    name = norm(clean_name(course['name']))
    return any(name.startswith(s) for s in overrides['slot_names'])


def live_programs():
    """{program name: {'faculty': str, 'courses': [{id, code, name, semester}]}}"""
    out = {}
    for fac in load('live_courses_2026-10-13.json')['faculties']:
        for prog in fac['programs']:
            courses = []
            for year in prog['years']:
                for sem in year['semesters'] or []:
                    for c in sem['courses'] or []:
                        courses.append({'id': c['id'], 'code': c['code'], 'name': c['name'],
                                        'semester': c['semester']})
            out[prog['name']] = {'faculty': fac['name'], 'courses': courses}
    return out


def plan_programs(overrides):
    """2025 plan per program, placeholders dropped and codes resolved."""
    out = {}
    for fac in load('giki_courses_2025.json')['faculties']:
        for prog in fac['programs']:
            courses = []
            for sem in prog['semesters']:
                for c in sem['courses']:
                    if is_slot(c, overrides) or c.get('source') == 'old_json':
                        continue
                    courses.append({
                        'code': resolve_code(c, prog['program_name'], overrides),
                        'printed_code': c['code'],
                        'name': clean_name(c['name']),
                        'semester': sem['semester'],
                        'ch': c.get('ch'), 'lec': c.get('lec'), 'lab': c.get('lab'),
                        'prereq': c.get('prereq'),
                    })
            out[prog['program_name']] = {'faculty': fac['faculty_name'], 'courses': courses}
    return out


def match_program(prog_name, live, plan, overrides):
    """Return (pairs, old_only, new_only) for one program."""
    explicit = overrides['pairs'].get(prog_name, {})
    never = {tuple(p) for p in overrides['never_pair'].get(prog_name, [])}
    old_left = list(live)
    new_left = list(plan)
    pairs = []

    def take(o, n, why):
        pairs.append((o, n, why))
        old_left.remove(o)
        new_left.remove(n)

    for old_code, new_code in explicit.items():
        o = next((c for c in old_left if c['code'] == old_code), None)
        n = next((c for c in new_left if c['code'] == new_code), None)
        if o is None or n is None:
            raise SystemExit(f'{prog_name}: override {old_code} -> {new_code} matches nothing')
        take(o, n, 'override')

    def allowed(o, n):
        return (is_lab(o['code'], o['name']) == is_lab(n['code'], n['name'])
                and (o['code'], n['code']) not in never)

    scored = sorted(
        ((similarity(o['name'], n['name']), i, j)
         for i, o in enumerate(old_left) for j, n in enumerate(new_left) if allowed(o, n)),
        reverse=True)
    used_o, used_n, picked = set(), set(), []
    for score, i, j in scored:
        if score < NAME_MATCH:
            break
        if i in used_o or j in used_n:
            continue
        used_o.add(i)
        used_n.add(j)
        picked.append((old_left[i], new_left[j]))
    for o, n in picked:
        take(o, n, 'name')

    for o in list(old_left):
        n = next((c for c in new_left if c['code'] == o['code'] and allowed(o, c)), None)
        if n:
            take(o, n, 'code')

    return pairs, old_left, new_left
