import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), 'attendance.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            roll_no TEXT UNIQUE NOT NULL,
            class TEXT NOT NULL,
            trained INTEGER DEFAULT 0
        )
    ''')

    attendance_columns = cur.execute("PRAGMA table_info(attendance)").fetchall()
    if attendance_columns and 'subject' not in {column[1] for column in attendance_columns}:
        # SQLite cannot alter a UNIQUE constraint in place. Preserve existing
        # records and group them under a clear legacy subject.
        cur.execute('ALTER TABLE attendance RENAME TO attendance_legacy')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            subject TEXT NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(id),
            UNIQUE(student_id, date, subject)
        )
    ''')

    legacy_table = cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_legacy'").fetchone()
    if legacy_table:
        cur.execute('''
            INSERT INTO attendance (student_id, date, subject, status)
            SELECT student_id, date, 'General', status FROM attendance_legacy
        ''')
        cur.execute('DROP TABLE attendance_legacy')

    conn.commit()
    conn.close()
    print("Database ready at:", DB_PATH)

if __name__ == "__main__":
    init_db()
