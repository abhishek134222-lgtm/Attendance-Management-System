# AttendX - Face Recognition Attendance System

A web-based attendance management system with camera-based face recognition, built for tracking student attendance across multiple classes/sections.

## Features

- Teacher signup/login with secure password hashing
- Add and manage students across multiple classes
- Register student faces via laptop camera (manual capture with SPACE key)
- Automatic attendance marking through face recognition
- Manual attendance marking (Present/Absent toggle)
- Class-wise filtering
- Attendance reports with percentage calculation
- Dashboard with daily attendance overview
- Dark glassmorphism UI with cursor trail animation

## Tech Stack

- **Backend:** Python, Flask
- **Database:** SQLite (file-based, no separate install needed)
- **Face Recognition:** OpenCV (Haar Cascade + LBPH Recognizer)
- **Frontend:** HTML, CSS, JavaScript (vanilla)

## Project Structure
attendance-system/
├── app.py # Main Flask application
├── database.py # Database schema and connection
├── requirements.txt # Python dependencies
├── attendance.db # SQLite database (auto-created)
├── dataset/ # Student face images (auto-created)
├── trainer.yml # Trained face recognition model (auto-created)
├── labels.json # Student ID to face label mapping (auto-created)
├── static/
│ ├── style.css
│ ├── script.js
│ ├── auth.js
│ ├── dashboard.js
│ ├── students.js
│ ├── camera.js
│ ├── mark-attendance.js
│ └── reports.js
└── templates/
├── index.html
├── dashboard.html
├── students.html
├── camera-attendance.html
├── mark-attendance.html
└── reports.html


## Setup Instructions

### 1. Install Python

Download from [python.org](https://www.python.org/downloads/). During installation, make sure to check **"Add python.exe to PATH"**.

### 2. Install Dependencies

```bash
python -m pip install -r requirements.txt
```

### 3. Run the Application

```bash
python app.py
```

### 4. Open in Browser

Navigate to:


## Usage

1. **Sign up** as a teacher on the login page
2. Go to **Students** page and add students with name, roll number, and class
3. Click **"Register Face"** next to a student — camera opens, press **SPACE** to capture photos (5-10 recommended), press **Q** to finish
4. Go to **Camera Attendance** page and click **"Start Camera Recognition"** to mark attendance via face
5. Alternatively, use **Mark Attendance** page for manual Present/Absent marking
6. View overall stats on **Dashboard** and percentage reports on **Reports** page

## Notes

- All data is stored locally in `attendance.db` — no internet or cloud database required
- Face recognition uses OpenCV's LBPH algorithm, trained automatically after each face registration
- Camera access requires a working webcam on the host machine

## Author

Abhishek
CSE Student, CGC Jhanjeri