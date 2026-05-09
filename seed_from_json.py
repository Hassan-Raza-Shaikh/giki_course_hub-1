"""
seed_from_json.py — Re-seeds database using giki_courses_with_codes.json.
Structure: Faculty → Program → Semester → Course
DB mapping: faculty table, programs table, courses table (with faculty_id, program_id, semester, year)
"""
import json
import psycopg2
from db import get_connection


CATEGORIES = [
    ("Outline",         False),
    ("Notes",           False),
    ("Slides",          False),
    ("Quizzes",         False),
    ("Assignments",     False),
    ("Past Papers",     False),
    ("Reference Books", False),
    ("Lab Manuals",     True),
    ("Lab Tasks",       True),
    ("Lab Reports",     True),
]

FACULTY_ICONS = {
    "FCSE": "💻",
    "FEE": "⚡",
    "MGS": "📈",
    "FMCE": "⚗️",
    "FME": "⚙️",
    "Civil Engineering": "🏗️",
    "FBS": "🧪",
}

FACULTY_FULL_NAMES = {
    "FCSE": "Faculty of Computer Science & Engineering",
    "FEE": "Faculty of Electrical Engineering",
    "MGS": "Faculty of Management & Social Sciences",
    "FMCE": "Faculty of Mechanical & Chemical Engineering",
    "FME": "Faculty of Mechanical Engineering",
    "Civil Engineering": "Faculty of Civil Engineering",
    "FBS": "Faculty of Basic Sciences",
}

def seed():
    with open("giki_courses_with_codes.json", encoding="utf-8") as f:
        data = json.load(f)
    
    try:
        with open("instructors_by_faculty.json", encoding="utf-8") as f:
            instructor_data = json.load(f)
    except FileNotFoundError:
        instructor_data = {}

    conn = get_connection()
    cur = conn.cursor()

    try:
        # ── Schema migrations ──────────────────────────────────────────────
        # Add faculty table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS faculties (
                faculty_id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                full_name TEXT,
                icon TEXT
            );
        """)

        # Add programs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS programs (
                program_id SERIAL PRIMARY KEY,
                faculty_id INT REFERENCES faculties(faculty_id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                UNIQUE (faculty_id, name)
            );
        """)

        # Add faculty_id, program_id, semester, code columns to courses
        cur.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS faculty_id INT REFERENCES faculties(faculty_id);")
        cur.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS program_id INT REFERENCES programs(program_id);")
        cur.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS semester INT CHECK (semester BETWEEN 1 AND 8);")
        cur.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_lab BOOLEAN DEFAULT FALSE;")
        cur.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_lab_category BOOLEAN DEFAULT FALSE;")

        # Ensure unique constraint on (code, program_id) to allow same course code in different programs 
        # but prevent duplicates within a program
        cur.execute("""
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'unique_course_program'
                ) THEN
                    ALTER TABLE courses ADD CONSTRAINT unique_course_program UNIQUE (code, program_id);
                END IF;
            END $$;
        """)

        # Clean old seed data
        cur.execute("DELETE FROM files;")
        cur.execute("DELETE FROM course_instructors;")
        cur.execute("DELETE FROM instructors;")
        cur.execute("DELETE FROM courses;")
        cur.execute("DELETE FROM programs;")
        cur.execute("DELETE FROM faculties;")
        cur.execute("DELETE FROM categories;")

        # ── Seed categories ────────────────────────────────────────────────
        for cat_name, is_lab_cat in CATEGORIES:
            cur.execute(
                "INSERT INTO categories (name, is_lab_category) VALUES (%s, %s) ON CONFLICT (name) DO UPDATE SET is_lab_category = EXCLUDED.is_lab_category;",
                (cat_name, is_lab_cat)
            )
        print(f"✅ Seeded {len(CATEGORIES)} categories.")

        # ── Seed faculties, programs, courses ──────────────────────────────
        total_courses = 0
        for fac_data in data["faculties"]:
            fac_name = fac_data["faculty_name"]
            print(f"  Seeding faculty: {fac_name}...")
            # Insert faculty
            cur.execute("""
                INSERT INTO faculties (name, full_name, icon)
                VALUES (%s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET full_name = EXCLUDED.full_name
                RETURNING faculty_id;
            """, (fac_name, FACULTY_FULL_NAMES.get(fac_name, fac_name), FACULTY_ICONS.get(fac_name, "🎓")))
            faculty_id = cur.fetchone()[0]

            for prog_data in fac_data["programs"]:
                prog_name = prog_data["program_name"]
                print(f"    Seeding program: {prog_name}...")
                
                # Insert program
                cur.execute("""
                    INSERT INTO programs (faculty_id, name)
                    VALUES (%s, %s)
                    ON CONFLICT (faculty_id, name) DO NOTHING
                    RETURNING program_id;
                """, (faculty_id, prog_name))
                row = cur.fetchone()
                if not row:
                    cur.execute("SELECT program_id FROM programs WHERE faculty_id=%s AND name=%s;", (faculty_id, prog_name))
                    row = cur.fetchone()
                program_id = row[0]

                for sem_data in prog_data["semesters"]:
                    semester = sem_data["semester"]
                    year = (semester + 1) // 2  # semester 1,2 → Year 1; 3,4 → Year 2; etc.

                    for course in sem_data["courses"]:
                        code = course["code"]
                        name = course["name"]
                        is_lab = "Lab" in name or (code and code.strip().endswith('L'))
                        cur.execute("""
                            INSERT INTO courses (name, code, description, year, semester, faculty_id, program_id, is_lab)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (code, program_id) DO NOTHING;
                        """, (name, code, f"{prog_name} — Semester {semester}", year, semester, faculty_id, program_id, is_lab))
                        total_courses += 1
            print(f"  ✅ Finished {fac_name}.")

        # ── Ensure FBS exists (even if not in JSON) ────────────────────────
        cur.execute("""
            INSERT INTO faculties (name, full_name, icon)
            VALUES (%s, %s, %s)
            ON CONFLICT (name) DO NOTHING;
        """, ("FBS", "Faculty of Basic Sciences", "🧪"))

        # ── Seed instructors ──────────────────────────────────────────────
        total_instructors = 0
        for fac_code, inst_list in instructor_data.items():
            for inst_name in inst_list:
                cur.execute("""
                    INSERT INTO instructors (name, faculty_name)
                    VALUES (%s, %s)
                    ON CONFLICT (name) DO UPDATE SET faculty_name = EXCLUDED.faculty_name;
                """, (inst_name, fac_code))
                total_instructors += 1
        print(f"✅ Seeded {total_instructors} instructors from JSON.")

        conn.commit()
        print(f"✅ Seeded {total_courses} course entries across all programs.")
        print("✅ Database fully re-seeded with GIKI faculty/program structure.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed()
