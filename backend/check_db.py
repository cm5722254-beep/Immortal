import sqlite3
conn = sqlite3.connect('merdonghua.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", tables)
# Check if api_keys table exists
if ('api_keys',) in tables:
    cursor.execute("PRAGMA table_info(api_keys)")
    print("api_keys columns:", cursor.fetchall())
conn.close()
