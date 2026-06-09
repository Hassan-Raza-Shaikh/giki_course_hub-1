from db import get_connection

def get_course_aliases(base_course_code):
    """
    Given a course code (e.g. 'CE221'), returns a set of all linked course codes.
    This includes:
    1. The base course code itself.
    2. All course codes that share the exact same course name (Implicit Links).
    3. All course codes linked via manual_course_links (Explicit Links) transitively.
    """
    if not base_course_code:
        return set()

    base_course_code = base_course_code.upper()
    aliases = set([base_course_code])

    conn = get_connection()
    try:
        cur = conn.cursor()

        # Step 1: Implicit links via same course name
        # Find the name of the base course
        cur.execute("SELECT name FROM courses WHERE code = %s LIMIT 1", (base_course_code,))
        row = cur.fetchone()
        
        if row:
            course_name = row[0]
            # Find all course codes with this exact name
            cur.execute("SELECT DISTINCT code FROM courses WHERE name = %s AND code IS NOT NULL", (course_name,))
            for r in cur.fetchall():
                aliases.add(r[0].upper())

        # Step 2: Explicit links via manual_course_links (Transitive closure)
        # We will use a recursive CTE to find all connected components
        # Note: the input aliases from Step 1 serve as our starting nodes.
        
        if aliases:
            # Prepare starting points for the recursive CTE
            start_nodes = list(aliases)
            
            query = """
            WITH RECURSIVE connected_courses AS (
                -- Base case: the initial set of known aliases
                SELECT UNNEST(%s::text[]) AS course_code
                
                UNION
                
                -- Recursive step: find all connected courses
                SELECT 
                    CASE 
                        WHEN mcl.course_code_1 = cc.course_code THEN mcl.course_code_2
                        ELSE mcl.course_code_1
                    END
                FROM manual_course_links mcl
                INNER JOIN connected_courses cc 
                    ON mcl.course_code_1 = cc.course_code OR mcl.course_code_2 = cc.course_code
            )
            SELECT DISTINCT course_code FROM connected_courses;
            """
            # PostgreSQL needs a list passed as an array
            cur.execute(query, (start_nodes,))
            for r in cur.fetchall():
                aliases.add(r[0].upper())

        return aliases
    except Exception as e:
        print(f"Error resolving course aliases: {e}")
        return set([base_course_code])
    finally:
        conn.close()
