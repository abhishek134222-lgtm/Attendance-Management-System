import os
import json
import cv2
import numpy as np
from datetime import date
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db, init_db

app = Flask(__name__)
app.secret_key = 'attendance_secret_key_change_this'

BASE_DIR = os.path.dirname(__file__)
DATASET_DIR = os.path.join(BASE_DIR, 'dataset')
TRAINER_PATH = os.path.join(BASE_DIR, 'trainer.yml')
LABELS_PATH = os.path.join(BASE_DIR, 'labels.json')
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

os.makedirs(DATASET_DIR, exist_ok=True)
init_db()

# ================= PAGE ROUTES =================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard.html')
def dashboard():
    return render_template('dashboard.html')

@app.route('/students.html')
def students_page():
    return render_template('students.html')

@app.route('/camera-attendance.html')
def camera_page():
    return render_template('camera-attendance.html')

@app.route('/mark-attendance.html')
def mark_attendance_page():
    return render_template('mark-attendance.html')

@app.route('/reports.html')
def reports_page():
    return render_template('reports.html')

# ================= AUTH =================

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    name, email, password = data.get('name'), data.get('email'), data.get('password')
    if not all([name, email, password]):
        return jsonify({"message": "All fields required"}), 400

    conn = get_db()
    existing = conn.execute('SELECT id FROM teachers WHERE email=?', (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"message": "Email already registered"}), 400

    hashed = generate_password_hash(password)
    conn.execute('INSERT INTO teachers (name, email, password) VALUES (?,?,?)', (name, email, hashed))
    conn.commit()
    conn.close()
    return jsonify({"message": "Account created"}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email, password = data.get('email'), data.get('password')

    conn = get_db()
    teacher = conn.execute('SELECT * FROM teachers WHERE email=?', (email,)).fetchone()
    conn.close()

    if not teacher or not check_password_hash(teacher['password'], password):
        return jsonify({"message": "Invalid email or password"}), 400

    session['teacher_id'] = teacher['id']
    session['teacher_name'] = teacher['name']
    return jsonify({"name": teacher['name'], "id": teacher['id']})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

# ================= STUDENTS =================

@app.route('/api/students', methods=['GET'])
def get_students():
    conn = get_db()
    rows = conn.execute('SELECT * FROM students ORDER BY class, roll_no').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.json
    name, roll_no, cls = data.get('name'), data.get('roll_no'), data.get('class')
    if not all([name, roll_no, cls]):
        return jsonify({"message": "All fields required"}), 400

    conn = get_db()
    try:
        conn.execute('INSERT INTO students (name, roll_no, class) VALUES (?,?,?)', (name, roll_no, cls))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"message": "Roll number already exists"}), 400
    conn.close()
    return jsonify({"message": "Student added"}), 201

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    conn = get_db()
    conn.execute('DELETE FROM students WHERE id=?', (student_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Student removed"})

# ================= FACE CAPTURE (register face using laptop camera) =================

@app.route('/api/students/<int:student_id>/capture', methods=['POST'])
def capture_face(student_id):
    conn = get_db()
    student = conn.execute('SELECT * FROM students WHERE id=?', (student_id,)).fetchone()
    conn.close()
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404

    student_dir = os.path.join(DATASET_DIR, str(student_id))
    os.makedirs(student_dir, exist_ok=True)

    existing_count = len([f for f in os.listdir(student_dir) if f.endswith('.jpg')])
    count = existing_count

    cam = cv2.VideoCapture(0)

    while True:
        ret, frame = cam.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = FACE_CASCADE.detectMultiScale(gray, 1.3, 5)

        display_frame = frame.copy()
        face_detected = len(faces) > 0

        for (x, y, w, h) in faces:
            color = (0, 255, 0) if face_detected else (0, 0, 255)
            cv2.rectangle(display_frame, (x, y), (x+w, y+h), color, 2)

        cv2.putText(display_frame, f"Captured: {count} photos", (15, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(display_frame, "SPACE = capture photo | Q = finish", (15, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        cv2.imshow(f'Register Face - {student["name"]}', display_frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord(' '):
            if len(faces) == 0:
                continue
            (x, y, w, h) = faces[0]
            face_img = gray[y:y+h, x:x+w]
            count += 1
            cv2.imwrite(os.path.join(student_dir, f"{count}.jpg"), face_img)

            flash = display_frame.copy()
            cv2.rectangle(flash, (0, 0), (flash.shape[1], flash.shape[0]), (255, 255, 255), -1)
            cv2.imshow(f'Register Face - {student["name"]}', flash)
            cv2.waitKey(80)

        elif key == ord('q'):
            break

    cam.release()
    cv2.destroyAllWindows()

    captured_now = count - existing_count
    if captured_now == 0 and existing_count == 0:
        return jsonify({"success": False, "message": "No photos captured. Try again."})

    train_model()

    conn = get_db()
    conn.execute('UPDATE students SET trained=1 WHERE id=?', (student_id,))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"{captured_now} new photos captured (total {count}) for {student['name']}"})

# ================= TRAINING =================

def train_model():
    face_samples = []
    ids = []
    label_map = {}

    if not os.path.exists(DATASET_DIR):
        return

    for student_id_str in os.listdir(DATASET_DIR):
        student_path = os.path.join(DATASET_DIR, student_id_str)
        if not os.path.isdir(student_path):
            continue

        label_map[int(student_id_str)] = student_id_str

        for img_name in os.listdir(student_path):
            img = cv2.imread(os.path.join(student_path, img_name), cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue
            face_samples.append(img)
            ids.append(int(student_id_str))

    if len(face_samples) == 0:
        return

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(face_samples, np.array(ids))
    recognizer.write(TRAINER_PATH)

    with open(LABELS_PATH, 'w') as f:
        json.dump(label_map, f)

# ================= CAMERA ATTENDANCE (recognize + mark) =================

@app.route('/api/attendance/recognize', methods=['POST'])
def recognize_and_mark():
    if not os.path.exists(TRAINER_PATH):
        return jsonify({"success": False, "message": "No trained faces yet. Register students first."})

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.read(TRAINER_PATH)

    with open(LABELS_PATH, 'r') as f:
        label_map = json.load(f)

    cam = cv2.VideoCapture(0)
    recognized_id = None
    attempts = 0

    while attempts < 100:
        ret, frame = cam.read()
        if not ret:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = FACE_CASCADE.detectMultiScale(gray, 1.3, 5)

        for (x, y, w, h) in faces:
            face_img = gray[y:y+h, x:x+w]
            label_id, confidence = recognizer.predict(face_img)

            if confidence < 70:
                recognized_id = label_map.get(str(label_id))
                color = (0, 255, 0)
                text = f"Match ({round(confidence,1)})"
            else:
                color = (0, 0, 255)
                text = "Unknown"

            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            cv2.putText(frame, text, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        cv2.imshow('Recognizing - Press Q to cancel', frame)

        if recognized_id:
            cv2.waitKey(800)
            break
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        attempts += 1

    cam.release()
    cv2.destroyAllWindows()

    if not recognized_id:
        return jsonify({"success": False, "message": "No face recognized"})

    conn = get_db()
    student = conn.execute('SELECT * FROM students WHERE id=?', (recognized_id,)).fetchone()
    if not student:
        conn.close()
        return jsonify({"success": False, "message": "Student record missing"})

    today = str(date.today())
    conn.execute('''
        INSERT INTO attendance (student_id, date, status) VALUES (?,?,?)
        ON CONFLICT(student_id, date) DO UPDATE SET status='Present'
    ''', (student['id'], today, 'Present'))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"{student['name']} marked Present"})

# ================= MANUAL ATTENDANCE =================

@app.route('/api/attendance/mark', methods=['POST'])
def mark_manual():
    data = request.json
    att_date = data.get('date')
    records = data.get('records', [])

    conn = get_db()
    for r in records:
        conn.execute('''
            INSERT INTO attendance (student_id, date, status) VALUES (?,?,?)
            ON CONFLICT(student_id, date) DO UPDATE SET status=excluded.status
        ''', (r['student_id'], att_date, r['status']))
    conn.commit()
    conn.close()
    return jsonify({"message": "Attendance saved"})

@app.route('/api/attendance/date/<att_date>', methods=['GET'])
def get_attendance_by_date(att_date):
    conn = get_db()
    rows = conn.execute('''
        SELECT a.id, s.name, s.roll_no, s.class, a.status
        FROM attendance a JOIN students s ON a.student_id = s.id
        WHERE a.date = ? ORDER BY s.roll_no
    ''', (att_date,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/attendance/report', methods=['GET'])
def report():
    conn = get_db()
    rows = conn.execute('''
        SELECT s.id, s.name, s.roll_no, s.class,
        COUNT(a.id) as total_days,
        SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) as present_days
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id
        GROUP BY s.id
        ORDER BY s.roll_no
    ''').fetchall()
    conn.close()

    result = []
    for r in rows:
        r = dict(r)
        total = r['total_days'] or 0
        present = r['present_days'] or 0
        r['percentage'] = round((present / total * 100), 2) if total > 0 else 0
        result.append(r)

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)