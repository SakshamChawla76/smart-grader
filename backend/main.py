from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json
from datetime import datetime, timedelta
import jwt

import models
import schemas
import crud
from database import engine, get_db
from services.grading_service import evaluate_submission, grade_submission

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Grader API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "mysecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=60))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- Auth ---
@app.post("/api/auth/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/api/auth/login", response_model=schemas.Token)
def login_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if not db_user or not crud.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(
        data={"sub": db_user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(db: Session = Depends(get_db)):
    user = db.query(models.User).first()
    if not user:
        user = crud.create_user(db, schemas.UserCreate(email="instructor@smartgrader.com", password="password123", full_name="Dr. Smith"))
    return user

# --- Courses ---
@app.get("/api/courses", response_model=List[schemas.Course])
def read_courses(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_courses(db, instructor_id=current_user.id)

@app.post("/api/courses", response_model=schemas.Course)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_course(db=db, course=course, instructor_id=current_user.id)

@app.delete("/api/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"ok": True}

# --- Assignments ---
@app.get("/api/assignments", response_model=List[schemas.Assignment])
def read_assignments(course_id: Optional[int] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if course_id:
        return crud.get_assignments(db, course_id=course_id)
    return crud.get_recent_assignments(db, instructor_id=current_user.id, limit=50)

@app.post("/api/assignments", response_model=schemas.Assignment)
def create_assignment(assignment: schemas.AssignmentCreate, db: Session = Depends(get_db)):
    return crud.create_assignment(db=db, assignment=assignment)

@app.delete("/api/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    a = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(a)
    db.commit()
    return {"ok": True}

# --- Exams ---
@app.get("/api/exams")
def list_exams(course_id: Optional[int] = None, db: Session = Depends(get_db)):
    return crud.get_exams(db, course_id=course_id)

@app.post("/api/exams")
def create_exam(exam: schemas.ExamCreate, db: Session = Depends(get_db)):
    created = crud.create_exam(db, exam)
    return {
        "id": created.id,
        "title": created.title,
        "class_section": created.class_section,
        "course_id": created.course_id,
        "exam_date": created.exam_date,
        "duration_minutes": created.duration_minutes,
        "total_marks": created.total_marks,
        "passing_marks": created.passing_marks,
        "rubric": created.rubric,
        "status": created.status,
        "created_at": created.created_at,
    }

@app.get("/api/exams/{exam_id}")
def get_exam_detail(exam_id: int, db: Session = Depends(get_db)):
    ex = crud.get_exam(db, exam_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    subs = db.query(models.Submission).filter(models.Submission.exam_id == exam_id).order_by(models.Submission.id.asc()).all()
    
    submissions_list = []
    for s in subs:
        parsed_criteria = None
        if s.criteria_breakdown:
            try:
                parsed_criteria = json.loads(s.criteria_breakdown)
            except:
                pass
        
        submissions_list.append({
            "id": s.id,
            "student_name": s.student_name,
            "file_path": s.file_path,
            "mime_type": s.mime_type,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "score": s.score,
            "max_score": s.max_score,
            "feedback": s.feedback,
            "status": s.status,
            "moderator_score": s.moderator_score,
            "moderator_notes": s.moderator_notes,
            "criteria_breakdown": parsed_criteria,
            "is_published": s.is_published,
        })
    
    course_name = ex.course.title if ex.course else "Unknown Course"
    
    return {
        "id": ex.id,
        "title": ex.title,
        "class_section": ex.class_section,
        "course_id": ex.course_id,
        "course_name": course_name,
        "exam_date": ex.exam_date.isoformat() if ex.exam_date else None,
        "duration_minutes": ex.duration_minutes,
        "total_marks": ex.total_marks,
        "passing_marks": ex.passing_marks,
        "rubric": ex.rubric,
        "status": ex.status,
        "submissions": submissions_list,
        "stats": {
            "total": len(subs),
            "graded": len([s for s in subs if s.score is not None]),
            "approved": len([s for s in subs if s.is_published or s.status in ("Approved", "Published")]),
            "pending": len([s for s in subs if s.score is None]),
        }
    }

@app.delete("/api/exams/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db)):
    ex = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exam not found")
    db.delete(ex)
    db.commit()
    return {"ok": True}

# --- Batch Upload Answer Sheets ---
@app.post("/api/exams/{exam_id}/upload-sheets")
async def upload_exam_sheets(
    exam_id: int,
    files: List[UploadFile] = File(...),
    student_names: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    ex = crud.get_exam(db, exam_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    os.makedirs("uploads", exist_ok=True)
    names_list = [n.strip() for n in student_names.split(",")] if student_names else []
    
    uploaded_records = []
    for idx, f in enumerate(files):
        contents = await f.read()
        file_path = f"uploads/{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{f.filename}"
        with open(file_path, "wb") as out:
            out.write(contents)
        
        # Name resolution: provided name or derived from filename (e.g. "rohan_sharma_exam.pdf" -> "Rohan Sharma")
        if idx < len(names_list) and names_list[idx]:
            s_name = names_list[idx]
        else:
            clean_name = os.path.splitext(f.filename)[0].replace("_", " ").replace("-", " ")
            s_name = clean_name.title()
        
        sub = models.Submission(
            student_name=s_name,
            exam_id=exam_id,
            file_path=file_path,
            mime_type=f.content_type or "application/octet-stream",
            max_score=ex.total_marks,
            status="Pending"
        )
        db.add(sub)
        uploaded_records.append(sub)
    
    ex.status = "In Progress"
    db.commit()
    return {"success": True, "uploaded_count": len(uploaded_records)}

# --- Batch Auto-Grade All Sheets for an Exam ---
@app.post("/api/exams/{exam_id}/auto-grade-all")
def auto_grade_exam_submissions(exam_id: int, db: Session = Depends(get_db)):
    ex = crud.get_exam(db, exam_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    rubric = ex.rubric or "Correctness: 40 points\nLogic and Steps: 40 points\nClarity & Documentation: 20 points"
    pending_subs = db.query(models.Submission).filter(
        models.Submission.exam_id == exam_id,
        models.Submission.score.is_(None)
    ).all()
    
    graded_count = 0
    for s in pending_subs:
        if os.path.exists(s.file_path):
            with open(s.file_path, "rb") as fp:
                file_bytes = fp.read()
            
            res = evaluate_submission(
                file_bytes=file_bytes,
                mime_type=s.mime_type or "text/plain",
                rubric=rubric,
                file_name=os.path.basename(s.file_path)
            )
            
            # Map to exam's max score
            earned_pts = round((res["percentage"] / 100.0) * ex.total_marks, 1)
            s.score = earned_pts
            s.max_score = ex.total_marks
            s.feedback = res["feedback_md"]
            s.criteria_breakdown = json.dumps(res["criteria_results"])
            s.status = "AI_Graded"
            graded_count += 1
    
    ex.status = "Evaluating"
    db.commit()
    return {"success": True, "graded_count": graded_count}

# --- Submissions Management ---
@app.get("/api/submissions")
def read_submissions(
    assignment_id: Optional[int] = None,
    exam_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    subs = crud.get_submissions(db, assignment_id=assignment_id, exam_id=exam_id)
    return [
        {
            "id": s.id,
            "student_name": s.student_name,
            "assignment_id": s.assignment_id,
            "exam_id": s.exam_id,
            "file_path": s.file_path,
            "mime_type": s.mime_type,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "score": s.score,
            "max_score": s.max_score,
            "feedback": s.feedback,
            "status": s.status,
            "moderator_score": s.moderator_score,
            "moderator_notes": s.moderator_notes,
            "is_published": s.is_published,
        }
        for s in subs
    ]

@app.get("/api/submissions/{submission_id}")
def get_submission_detail(submission_id: int, db: Session = Depends(get_db)):
    s = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    parsed_criteria = None
    if s.criteria_breakdown:
        try:
            parsed_criteria = json.loads(s.criteria_breakdown)
        except:
            pass
    
    file_content = ""
    is_image = any(t in (s.mime_type or "") for t in ("image", "png", "jpeg", "jpg", "webp"))
    is_pdf = "pdf" in (s.mime_type or "")
    if not is_image and not is_pdf and os.path.exists(s.file_path):
        try:
            with open(s.file_path, "r", encoding="utf-8", errors="ignore") as f:
                file_content = f.read()
        except:
            file_content = "[Binary or unreadable file]"

    return {
        "id": s.id,
        "student_name": s.student_name,
        "assignment_id": s.assignment_id,
        "exam_id": s.exam_id,
        "file_path": s.file_path,
        "file_name": os.path.basename(s.file_path),
        "mime_type": s.mime_type,
        "is_image": is_image,
        "is_pdf": is_pdf,
        "file_content": file_content,
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        "score": s.score,
        "max_score": s.max_score,
        "feedback": s.feedback,
        "status": s.status,
        "moderator_score": s.moderator_score,
        "moderator_notes": s.moderator_notes,
        "criteria_breakdown": parsed_criteria,
        "is_published": s.is_published,
    }

# --- Stream Submission File for Side-by-Side Review Canvas ---
@app.get("/api/submissions/{submission_id}/file")
def get_submission_file(submission_id: int, db: Session = Depends(get_db)):
    s = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not s or not os.path.exists(s.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(s.file_path, media_type=s.mime_type)

# --- Teacher Moderation & Review Endpoint ---
@app.post("/api/submissions/{submission_id}/moderate")
def moderate_submission(
    submission_id: int,
    mod_data: schemas.SubmissionModerate,
    db: Session = Depends(get_db)
):
    sub = crud.moderate_submission(db, submission_id, mod_data)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check if all submissions in this exam are approved, then mark exam published
    if sub.exam_id:
        ex_subs = db.query(models.Submission).filter(models.Submission.exam_id == sub.exam_id).all()
        if all(s.is_published or s.status in ("Approved", "Published") for s in ex_subs):
            ex = db.query(models.Exam).filter(models.Exam.id == sub.exam_id).first()
            if ex:
                ex.status = "Published"
                db.commit()

    return {"success": True, "submission_id": sub.id, "status": sub.status, "score": sub.score}

# --- Legacy & Quick Grade Endpoint ---
@app.post("/api/grade")
async def api_grade(
    assignment_id: Optional[int] = Form(None),
    exam_id: Optional[int] = Form(None),
    student_name: str = Form(...),
    rubric: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    try:
        contents = await file.read()
        mime_type = file.content_type or "application/octet-stream"

        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        with open(file_path, "wb") as f:
            f.write(contents)

        submission = models.Submission(
            student_name=student_name,
            assignment_id=assignment_id,
            exam_id=exam_id,
            file_path=file_path,
            mime_type=mime_type,
            status="Pending"
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

        # Grade with OCR & Local Heuristics
        result = evaluate_submission(
            file_bytes=contents,
            mime_type=mime_type,
            rubric=rubric,
            file_name=file.filename
        )

        submission.score = result["percentage"]
        submission.feedback = result["feedback_md"]
        submission.criteria_breakdown = json.dumps(result["criteria_results"])
        submission.status = "AI_Graded"
        db.commit()

        return {
            "success": True,
            "submission_id": submission.id,
            "total_score": result["total_score"],
            "max_score": result["max_score"],
            "percentage": result["percentage"],
            "letter_grade": result["letter_grade"],
            "criteria_results": result["criteria_results"],
            "text_metrics": result["text_metrics"],
            "code_metrics": result["code_metrics"],
            "feedback_md": result["feedback_md"],
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- Dashboard Stats ---
@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    courses = crud.get_courses(db, instructor_id=current_user.id)
    all_assignments = []
    for c in courses:
        all_assignments.extend(crud.get_assignments(db, course_id=c.id))
    
    exams = db.query(models.Exam).all()
    total_submissions = db.query(models.Submission).count()
    graded = db.query(models.Submission).filter(models.Submission.score.isnot(None)).count()
    approved = db.query(models.Submission).filter(models.Submission.is_published == True).count()
    pending = total_submissions - graded
    
    avg_score = 0
    if graded > 0:
        scores = db.query(models.Submission.score).filter(models.Submission.score.isnot(None)).all()
        if scores:
            avg_score = round(sum(s[0] for s in scores) / len(scores), 1)
    
    return {
        "course_count": len(courses),
        "assignment_count": len(all_assignments),
        "exam_count": len(exams),
        "total_submissions": total_submissions,
        "graded_submissions": graded,
        "approved_submissions": approved,
        "pending_submissions": pending,
        "avg_score": avg_score,
    }

@app.get("/")
def read_root():
    return {"message": "SmartGrader Examination & Evaluation API v2.0 is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
