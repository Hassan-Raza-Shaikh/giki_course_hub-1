import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        database="giki course hub",
        user="postgres",
        password="ammar.12?",  # put your actual password
        port="5432"
    )

    print("✅ Connected to database!")

    cur = conn.cursor()

    # Test 1: Check DB name
    cur.execute("SELECT current_database();")
    print("Database:", cur.fetchone())

    # Test 2: Check users table
    cur.execute("SELECT * FROM users;")
    rows = cur.fetchall()

    print("Users table data:")
    for row in rows:
        print(row)

    cur.close()
    conn.close()

except Exception as e:
    print("❌ Error:", e)