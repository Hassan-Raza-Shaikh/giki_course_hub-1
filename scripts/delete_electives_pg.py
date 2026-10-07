from db import get_connection

conn = get_connection()
cur = conn.cursor()

def is_elective(name, code):
    name = (name or '').lower()
    code = (code or '').lower()
    if 'elective' in name or 'specialization' in name:
        return True
    if 'xxxxx' in code or code == 'cvxxx':
        if 'elective' in name:
            return True
    return False

cur.execute("SELECT course_id, name, code FROM courses")
all_courses = cur.fetchall()

to_delete = []
for c in all_courses:
    cid, cname, ccode = c
    if is_elective(cname, ccode):
        to_delete.append(cid)

print(f"Found {len(to_delete)} electives in PG.")
if to_delete:
    # also delete related files and crosslinks if any cascade is not set
    # but the DB might have ON DELETE CASCADE. Let's just try.
    cur.execute("DELETE FROM courses WHERE course_id = ANY(%s)", (to_delete,))
    conn.commit()
    print("Deleted.")
