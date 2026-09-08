from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from datetime import datetime, timedelta
import jwt

import models
import schemas
import crud
from database import engine, get_db
from services.grading_service import grade_submission

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Grader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "mysecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
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
        user = crud.create_user(db, schemas.UserCreate(email="test@test.com", password="password", full_name="Test User"))
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

# --- Submissions ---
@app.get("/api/submissions")
def read_submissions(assignment_id: Optional[int] = None, db: Session = Depends(get_db)):
    if assignment_id:
        subs = crud.get_submissions(db, assignment_id=assignment_id)
    else:
        subs = db.query(models.Submission).order_by(models.Submission.id.desc()).limit(50).all()
    return [
        {
            "id": s.id,
            "student_name": s.student_name,
            "assignment_id": s.assignment_id,
            "file_path": s.file_path,
            "mime_type": s.mime_type,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "score": s.score,
            "feedback": s.feedback,
            "status": s.status,
        }
        for s in subs
    ]

# --- Grading ---
@app.post("/api/grade")
async def api_grade(
    assignment_id: int = Form(...),
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

        # Save file
        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as f:
            f.write(contents)

        # Create submission record
        submission = schemas.SubmissionCreate(
            student_name=student_name,
            assignment_id=assignment_id,
            file_path=file_path,
            mime_type=mime_type,
        )
        db_submission = crud.create_submission(db, submission)

        # Grade with the local engine — returns a dict now
        result = grade_submission(contents, mime_type, rubric)

        # Update submission with the score
        crud.update_submission_grade(
            db, db_submission.id,
            score=result["percentage"],
            feedback=result["feedback_md"]
        )

        return {
            "success": True,
            "submission_id": db_submission.id,
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
    
    total_submissions = db.query(models.Submission).count()
    graded = db.query(models.Submission).filter(models.Submission.status == "Graded").count()
    pending = total_submissions - graded
    
    avg_score = 0
    if graded > 0:
        scores = db.query(models.Submission.score).filter(models.Submission.status == "Graded", models.Submission.score.isnot(None)).all()
        if scores:
            avg_score = round(sum(s[0] for s in scores) / len(scores), 1)
    
    return {
        "course_count": len(courses),
        "assignment_count": len(all_assignments),
        "total_submissions": total_submissions,
        "graded_submissions": graded,
        "pending_submissions": pending,
        "avg_score": avg_score,
    }

@app.get("/")
def read_root():
    return {"message": "SmartGrader API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
