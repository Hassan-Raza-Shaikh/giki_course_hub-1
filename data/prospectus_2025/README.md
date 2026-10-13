# Prospectus 2025 course data

Extracted from `Undergraduate-Prospectus-2025.pdf` (repo root). Nothing in the app reads these files yet.

## giki_courses_2025.json
The same shape as `frontend/src/data/giki_courses_with_codes.json`: faculties → programs → semesters 1–8 → courses `{code, name, ch}`. Each course also has:
- `lec`, `lab`: contact hours, null where the prospectus doesn't give them.
- `prereq`, `coreq`: as printed.
- `placeholder: true`: generic slots such as "Technical Elective I". Drop these to match the existing file, which has no elective slots.
- `electives` on each program: the named elective courses offered, with a `group` heading.
- `source: "old_json"`: courses from the previous `giki_courses_with_codes.json` that the 2025 plan doesn't have for that program (136 in all, mostly older course numbers such as CE221 Digital Logic Design, which is now CS221). Each one is placed in its old semester, so every course currently in the app is still in this file. These rows aren't counted in the credit check below.

Every semester's credit total was checked against the prospectus's printed "Total" row, and all match except these:
- FCSE BS Computer Engineering and BS Data Science, semesters 7–8: HM413 and HM414 (Understanding of Quran) are printed with their columns shifted, which counts them as 0 credit hours. They are stored as 1 CH, the same as in the other programs, so those four semester totals are 1 above the printed figure.
- Computer Engineering and Data Science print theory and lab together on one row (e.g. "CS101, CS101L", 3 CH). These rows are split into a theory course and a 1 CH lab, to match how the app stores courses.

## giki_course_descriptions_2025.json
Course descriptions are keyed by course code, with `name`, `credits` (as printed), `prereq`, `description`, `faculty` and `page` (the PDF page number).
- Labs usually have no separate description; use the theory course's.
- Some codes are reused for different courses, so these entries carry a suffix:
  - `"MM456#2"`
  - `"HM213 (Service)"`: MGS service courses
  - `"CS101 (MGS)"`: the same code described by a second faculty
- FCSE uses combined keys such as `"CS313/CS413"`; the `codes` field lists each code separately.
