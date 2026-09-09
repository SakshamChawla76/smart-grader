# SmartGrader v2.0 🎓✨

> An advanced AI-powered examination, automated paper evaluation, and moderation platform inspired by **Gradescope** and **AICOS (EvalDesk)**. Built with a modern **React + Vite + TailwindCSS** frontend and a high-performance **FastAPI + SQLite** backend.

![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss)
![OCR](https://img.shields.io/badge/OCR-Tesseract%20%2B%20PyPDF-orange)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📸 Key Features & Capabilities

| Module | Features & Capabilities |
|---|---|
| **📊 Executive Dashboard** | Live metrics tracker: Active Exams, Evaluated Papers, Cohort Average Score, and Teacher Verified Rate. |
| **📝 Examination Hub** | Schedule and manage formal exams with Course, Class/Section, Duration, Total Marks, and Rubrics. |
| **⚡ 3-Stage Pipeline** | Full automated lifecycle: `[1. Sheets Ingested]` ➔ `[2. AI Auto-Grading & OCR]` ➔ `[3. Teacher Review Queue]`. |
| **🖥️ Side-by-Side Review Canvas** | AICOS/EvalDesk-style split screen: Zoomable answer sheet preview on the left, question-wise score moderation on the right. |
| **🔍 Multi-Format OCR Engine** | Ingests handwritten/printed paper images (`.png`, `.jpg`, `.jpeg`, `.webp`), multi-page PDFs (`pypdf`), and code files. |
| **👨‍🏫 Human-in-the-Loop Moderation** | Teachers can directly override points per question, add qualitative student remarks, and approve/publish grades. |
| **📦 Batch Answer Sheet Upload** | Drag & drop class bundles with automatic student name resolution from filenames. |
| **⚡ Instant Auto-Grader** | Quick single-paper evaluator with real-time markdown feedback and confidence breakdown. |
| **🔒 100% Offline & Free** | Runs entirely on your local machine with **zero external API keys, zero cloud costs, and zero latency**. |

---

## 🏗️ Architecture Overview

```
smart-grader/
├── backend/
│   ├── main.py                     # FastAPI routes (Auth, Courses, Exams, Submissions, Moderation, File Streaming)
│   ├── models.py                   # SQLAlchemy ORM (User, Course, Assignment, Exam, Submission)
│   ├── schemas.py                  # Pydantic schemas for requests, responses, and moderation
│   ├── crud.py                     # Database query & moderation methods
│   ├── database.py                 # SQLite session & engine setup
│   ├── seed_exams.py               # Seed realistic exams, rubrics, and graded student submissions
│   ├── services/
│   │   └── grading_service.py      # Local OCR & Rubric-based Heuristic Grading Engine
│   └── uploads/                    # Stored answer sheets (images, PDFs, code files)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Full Examination Hub & Side-by-Side Review Canvas UI
│   │   ├── App.css                 # Global animations & styling
│   │   └── index.css               # TailwindCSS theme tokens
│   ├── package.json                # Dependencies (lucide-react, react 19, vite 8)
│   └── vite.config.ts              # Vite server configuration (port 5180)
│
├── smartgrader_v2_demo.webp        # Full feature walkthrough animation
└── README.md                       # Documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.12+** — [Download Python](https://python.org)
- **Node.js 18+** — [Download Node.js](https://nodejs.org)
- **Git**

---

### 1. Set Up the Backend

```bash
cd backend

# Create and activate virtual environment
# Windows:
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS/Linux:
python3 -m venv venv
source venv/bin/activate

# Install required dependencies
pip install fastapi uvicorn sqlalchemy pyjwt bcrypt pydantic-settings python-dotenv python-multipart pypdf Pillow pytesseract

# Seed database with realistic exams and submissions
python seed_exams.py

# Start the backend server
python main.py
```
> The API server will be live at: **http://127.0.0.1:8000** (Swagger documentation at `http://127.0.0.1:8000/docs`).

---

### 2. Set Up the Frontend

Open a second terminal window:

```bash
cd frontend

# Install packages
npm install

# Launch Vite dev server
npm run dev
```
> The web application will be accessible at: **http://localhost:5180**

---

## 📖 Step-by-Step Teacher & Examiner Guide

### 1. The Executive Dashboard
- Open `http://localhost:5180`.
- Review high-level statistics:
  - Total Active Exams & Courses.
  - Number of Answer Sheets evaluated.
  - Overall Cohort Average Score.
- Inspect the **AICOS 3-Stage Evaluation Pipeline** status.

### 2. Examination & Assessment Hub (`Exams & Assessments` tab)
- View scheduled, evaluating, and published examinations.
- Click **"Create New Exam"**:
  - Enter Title (e.g. *Midterm Examination 2026*).
  - Select Course & Class/Section (e.g. *Grade 10 - Section A*).
  - Configure Duration, Total Marks, and Rubric.
- Click **"Open Dashboard"** on any exam to enter its submission management dashboard.

### 3. Batch Upload Answer Sheets
- In the Exam Dashboard, click **"Upload Sheets"**.
- Select multiple student answer sheets (`.png`, `.jpg`, `.pdf`, `.py`, etc.).
- Optional: Add student names comma-separated or let the system auto-derive names from filenames.
- Click **"Upload Sheets"** to queue them in the pipeline.

### 4. Running Batch AI Auto-Grading
- Click **"Run Batch Auto-Grade (OCR)"**.
- The local grading engine:
  1. Ingests all pending student scripts.
  2. Executes OCR on scanned images/PDFs.
  3. Segments questions and matches criteria against the rubric.
  4. Calculates points and assigns an initial score with confidence percentages.

### 5. Side-by-Side Review & Moderation Canvas *(Flagship Feature)*
- In the student submissions table, click **"Review & Moderate"** next to any student.
- **Left Column**:
  - Visual preview of the student's paper (zoom in/out with `+` / `-`, pan controls, line-numbered syntax viewer).
- **Right Column**:
  - Question-by-question breakdown cards showing:
    - AI Score vs Max Marks
    - AI Confidence percentage (e.g. `98% match`)
    - Extracted Evidence found in the student's paper
    - Pedagogical Remarks
  - **Live Score Override**: Change any score input directly; the total score recalculates in real time!
  - **Teacher Feedback**: Enter personalized remarks.
- Click **"Approve & Publish Grade"** to lock the grade and publish results to the student.

---

## 🔌 API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats` | Overall system metrics (exams, submissions, averages) |
| `GET` | `/api/exams` | List all examinations with evaluation completion rates |
| `POST` | `/api/exams` | Create a new examination with custom rubrics |
| `GET` | `/api/exams/{id}` | Get detailed exam metadata and all student submissions |
| `DELETE` | `/api/exams/{id}` | Delete an examination |
| `POST` | `/api/exams/{id}/upload-sheets` | Upload batch answer sheets for an exam |
| `POST` | `/api/exams/{id}/auto-grade-all` | Run batch local AI evaluation & OCR on pending scripts |
| `GET` | `/api/submissions/{id}` | Get submission details and structured question breakdown |
| `GET` | `/api/submissions/{id}/file` | Stream submission document/image for canvas preview |
| `POST` | `/api/submissions/{id}/moderate` | Teacher moderation: update scores, notes, and publish |
| `POST` | `/api/grade` | Instant single-file OCR & rubric grading |

---

## 🎥 Walkthrough Video
A full demonstration video walkthrough is available in the repository:
- File: `smartgrader_v2_demo.webp` (playable directly in any browser or media player).

---

## ⚖️ License
MIT License. Built for educational institutions, schools, and self-hosted automated paper evaluation.
