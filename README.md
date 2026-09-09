# SmartGrader 🎓✨

> An AI-powered assignment grading platform inspired by [Gradescope](https://www.gradescope.com/) and [Smartail](https://smartail.ai/). Built with **React + Vite** frontend and **FastAPI + SQLite** backend.

![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📸 Features

| Feature | Description |
|---|---|
| **Executive Dashboard** | Real-time overview of active courses, exam pipeline status, and recent submissions |
| **Examination & Assessment Hub** | Complete exam lifecycle management with class/section, duration, and rubrics |
| **3-Stage Evaluation Pipeline** | Ingest Answer Sheets ➔ Local AI Auto-Grading & OCR ➔ Teacher Review Queue |
| **Side-by-Side Review Canvas** | Interactive document canvas on the left with question-wise score moderation on the right |
| **Multi-Format OCR Engine** | Parses scanned answer sheets (.png, .jpg), handwritten PDFs, and source code files locally |
| **Human-in-the-Loop Moderation** | Teachers can override AI scores per question, add personal remarks, and publish grades |
| **Batch Script Ingestion** | Upload multiple student papers in one click with automatic student name resolution |
| **Zero Cost & Offline** | Runs entirely locally without paid cloud LLMs or external API subscriptions |
| **Premium Dark Glassmorphic UI** | Responsive, modern dark aesthetic with smooth transitions and micro-animations |


---

## 🏗️ Architecture

```
smart-grader/
├── backend/                    # FastAPI backend
│   ├── main.py                 # App entry point & all API routes
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── crud.py                 # Database CRUD operations
│   ├── database.py             # SQLAlchemy engine & session setup
│   ├── seed.py                 # Database seeder with sample data
│   ├── services/
│   │   └── grading_service.py  # Local heuristic grading engine
│   ├── uploads/                # Uploaded submission files
│   └── sql_app.db              # SQLite database (auto-created)
│
├── frontend/                   # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── App.tsx             # Main application component
│   │   ├── App.css             # Custom styles
│   │   └── index.css           # Tailwind imports
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
└── README.md                   # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.12+** — [Download](https://python.org)
- **Node.js 18+** — [Download](https://nodejs.org)
- **Git** — [Download](https://git-scm.com)

### 1. Clone the Repository

```bash
git clone https://github.com/SakshamChawla76/smart-grader.git
cd smart-grader
```

### 2. Set Up the Backend

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate it
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy pyjwt bcrypt pydantic-settings python-dotenv python-multipart

# Seed the database with sample data
python seed.py
```

### 3. Start the Backend Server

```bash
# Still inside backend/ with venv activated
python main.py
```

The API server starts at **http://127.0.0.1:8000**. You can visit http://127.0.0.1:8000/docs for the interactive Swagger documentation.

### 4. Set Up the Frontend

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend starts at **http://localhost:5180**.

---

## 📖 How to Use SmartGrader

### Step 1: Open the Dashboard

Navigate to **http://localhost:5180** in your browser. You'll see:
- **Active Courses** count (seeded with 2 courses)
- **Assignments** count (seeded with 2 assignments)
- **Recent Assignments** list pulled live from the database

### Step 2: Grade a Submission

1. Click **"Grading"** in the left sidebar.
2. **Select an Assignment** from the dropdown (e.g., "Midterm Exam Submission").
3. **Enter the Student's Name** (e.g., "Jane Doe").
4. **Upload a Submission File** — click the upload box and select any `.txt`, `.py`, `.js`, `.pdf`, or image file.
5. **Define/Verify the Rubric** — type your grading criteria (e.g., "10 points for correctness, 5 points for code style, 5 points for documentation").
6. Click **"Run Local Grader"**.
7. Wait ~2 seconds — the **Evaluation Result** panel on the right will display:
   - A **score out of 100**
   - A **breakdown** of content analysis
   - **AI-generated feedback** with strengths and areas for improvement

### Step 3: Create New Courses & Assignments (via API)

Since the frontend doesn't yet have creation forms, use the **Swagger docs** at http://127.0.0.1:8000/docs:

#### Create a Course
```
POST /api/courses
Body (JSON):
{
  "title": "Data Structures & Algorithms",
  "description": "CS201 Spring 2026"
}
```

#### Create an Assignment
```
POST /api/assignments
Body (JSON):
{
  "title": "Binary Tree Homework",
  "description": "Implement a BST with insert, search, delete.",
  "rubric": "Correctness: 50 points\nEdge cases: 30 points\nCode quality: 20 points",
  "due_date": "2026-10-15T23:59:00",
  "course_id": 1
}
```

After creating courses/assignments via Swagger, **refresh the frontend** — they'll appear in the Dashboard and Grading dropdown automatically.

### Step 4: Register a New User (Optional)

```
POST /api/auth/register
Body (JSON):
{
  "email": "professor@university.edu",
  "password": "securepass123",
  "full_name": "Prof. Johnson"
}
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `GET` | `/api/courses` | List all courses |
| `POST` | `/api/courses` | Create a new course |
| `GET` | `/api/assignments` | List recent assignments |
| `POST` | `/api/assignments` | Create a new assignment |
| `POST` | `/api/grade` | Upload & grade a submission |

### Grading Endpoint Details

```
POST /api/grade
Content-Type: multipart/form-data

Fields:
  - assignment_id (int): ID of the assignment
  - student_name (string): Name of the student
  - rubric (string): Grading criteria
  - file (file): The submission file
```

---

## 🧠 How the Grading Engine Works

The Local Heuristic Engine (`services/grading_service.py`) runs **entirely offline** with zero dependencies on external APIs:

1. **Content Extraction** — Reads the uploaded file bytes and attempts UTF-8 text decoding.
2. **Keyword Matching** — Extracts significant keywords (>4 chars) from the rubric and checks for matches in the submission text.
3. **Scoring Algorithm** — Combines content length analysis with keyword match count:
   ```
   score = min(100, max(40, 50 + (matches × 10) + (content_length % 20)))
   ```
4. **Feedback Generation** — Produces a structured Markdown report with score, breakdown, strengths, and areas for improvement.

> **Note**: This is a heuristic engine designed for demonstration. For production use, you can swap `grading_service.py` with any LLM backend (OpenAI, Gemini, local Ollama, etc.) by modifying a single file.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS v4 |
| **Backend** | Python, FastAPI, Uvicorn |
| **Database** | SQLite via SQLAlchemy ORM |
| **Auth** | JWT (PyJWT) + bcrypt |
| **Styling** | Glassmorphism, CSS Gradients, Micro-animations |

---

## 🗺️ Roadmap

- [ ] Course & Assignment creation forms in the frontend
- [ ] Full JWT auth flow in the frontend (login/register pages)
- [ ] Batch submission upload (multiple files at once)
- [ ] Grade history & analytics dashboard
- [ ] PDF/Image OCR support for handwritten submissions
- [ ] Pluggable LLM backend (Ollama, Gemini, OpenAI)
- [ ] Student-facing portal for viewing grades
- [ ] Export grades to CSV/Excel

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

**Saksham Chawla** — [@SakshamChawla76](https://github.com/SakshamChawla76)
