import db
conn = db.get_connection()
cur = conn.cursor()
try:
    cur.execute("""
        SELECT c.course_id, c.name, c.code, c.year, c.semester,
               f.icon AS faculty_icon, f.name AS faculty_name
        FROM courses c TABLESAMPLE SYSTEM (10)
        JOIN faculties f ON c.faculty_id = f.faculty_id
        ORDER BY RANDOM() LIMIT 3;
    """)
    rows = cur.fetchall()
    print("ROWS from TABLESAMPLE:", len(rows))
except Exception as e:
    print("ERROR:", e)
finally:
    cur.close()
    conn.close()
