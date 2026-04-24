"""
seed_db.py — Run once to populate GIKI Course Hub database with real course data.
"""
import psycopg2
from config import DB_CONFIG

COURSES = [
    # (name, code, description, year, icon)
    # ── Year 1 ──────────────────────────────────────
    ("Calculus & Analytical Geometry", "MATH-101", "Limits, derivatives, integrals, and series for engineers.", 1, "📐"),
    ("Applied Physics", "PHY-101", "Mechanics, thermodynamics, waves, and optics.", 1, "⚛️"),
    ("Introduction to Computing", "CS-101", "Programming fundamentals with problem-solving.", 1, "💻"),
    ("Engineering Drawing", "ME-101", "Technical drawing, orthographic projection, and CAD.", 1, "📏"),
    ("Communication Skills", "HU-101", "Academic writing, presentations, and professional communication.", 1, "💬"),
    ("Islamic Studies / Ethics", "IS-101", "Foundations of Islamic thought and professional ethics.", 1, "📖"),
    ("Linear Algebra", "MATH-102", "Matrices, vector spaces, eigenvalues, and linear transformations.", 1, "🔢"),
    ("Pakistan Studies", "PS-101", "History, geography, and socio-political landscape of Pakistan.", 1, "🗺️"),

    # ── Year 2 ──────────────────────────────────────
    ("Data Structures & Algorithms", "CS-201", "Arrays, linked lists, trees, graphs, sorting, and searching.", 2, "🌳"),
    ("Digital Logic Design", "CS-202", "Boolean algebra, gates, combinational and sequential circuits.", 2, "⚡"),
    ("Differential Equations", "MATH-201", "ODEs, PDEs, Laplace transforms, and applications.", 2, "∂"),
    ("Object-Oriented Programming", "CS-203", "Classes, inheritance, polymorphism, and design patterns in C++/Java.", 2, "🧩"),
    ("Probability & Statistics", "MATH-202", "Probability theory, distributions, hypothesis testing.", 2, "📊"),
    ("Discrete Mathematics", "MATH-203", "Sets, logic, graph theory, combinatorics, and proofs.", 2, "🔍"),
    ("Circuit Theory", "EE-201", "KVL/KCL, AC/DC circuits, and network theorems.", 2, "🔌"),
    ("Technical Report Writing", "HU-201", "Writing technical reports, research papers, and documentation.", 2, "📝"),

    # ── Year 3 ──────────────────────────────────────
    ("Operating Systems", "CS-301", "Process management, memory, file systems, and concurrency.", 3, "🖥️"),
    ("Database Systems", "CS-302", "Relational model, SQL, normalization, and transactions.", 3, "🗄️"),
    ("Computer Networks", "CS-303", "OSI model, TCP/IP, routing, and network security.", 3, "🌐"),
    ("Software Engineering", "CS-304", "SDLC, agile, requirements, design patterns, and testing.", 3, "⚙️"),
    ("Theory of Automata", "CS-305", "FSM, regular expressions, context-free grammars, Turing machines.", 3, "🤖"),
    ("Numerical Methods", "MATH-301", "Root finding, interpolation, integration, and ODEs numerically.", 3, "🧮"),
    ("Signals & Systems", "EE-301", "Fourier analysis, Laplace, Z-transform, and filtering.", 3, "〰️"),
    ("Technical Elective I", "CS-310", "Advanced topic in specialization area.", 3, "🎯"),

    # ── Year 4 ──────────────────────────────────────
    ("Artificial Intelligence", "CS-401", "Search, knowledge representation, ML basics, and planning.", 4, "🧠"),
    ("Machine Learning", "CS-402", "Supervised, unsupervised, and reinforcement learning.", 4, "🤖"),
    ("Computer Architecture", "CS-403", "CPU design, pipelining, memory hierarchy, and parallelism.", 4, "🏛️"),
    ("Final Year Project I", "CS-490", "Research proposal, literature review, and initial design.", 4, "🚀"),
    ("Final Year Project II", "CS-491", "Implementation, testing, and project defense.", 4, "🎓"),
    ("Technical Elective II", "CS-410", "Advanced topic chosen from a list of specializations.", 4, "📡"),
    ("Engineering Ethics & Management", "HU-401", "Professional responsibility, project management, and law.", 4, "⚖️"),
    ("Compiler Construction", "CS-404", "Lexical analysis, parsing, semantic analysis, and code generation.", 4, "🔧"),
]

CATEGORIES = ["Past Papers", "Notes", "Slides", "Assignments", "Lab Reports"]


def seed():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    try:
        # ── Schema updates ─────────────────────────────────
        cur.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS year INT CHECK (year BETWEEN 1 AND 4);")
        cur.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS code TEXT;")
        cur.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS icon TEXT;")
        cur.execute("ALTER TABLE users ALTER COLUMN password DROP NOT NULL;")

        # ── Seed categories ────────────────────────────────
        for cat in CATEGORIES:
            cur.execute(
                "INSERT INTO categories (name) VALUES (%s) ON CONFLICT (name) DO NOTHING;",
                (cat,)
            )

        # ── Seed courses ───────────────────────────────────
        for name, code, desc, year, icon in COURSES:
            cur.execute("""
                INSERT INTO courses (name, code, description, year, icon)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (name, code, desc, year, icon))

        conn.commit()
        print(f"✅ Seeded {len(COURSES)} courses and {len(CATEGORIES)} categories.")
    except Exception as e:
        conn.rollback()
        print(f"❌ Seed failed: {e}")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed()
