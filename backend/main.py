from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
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
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Auth Endpoints ---
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
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Temporary fake user dependency since we don't have a frontend token passing yet
def get_current_user(db: Session = Depends(get_db)):
    # In a real app, verify JWT. For now, just return the first user or create a mock one.
    user = db.query(models.User).first()
    if not user:
        user = crud.create_user(db, schemas.UserCreate(email="test@test.com", password="password", full_name="Test User"))
    return user

# --- Courses Endpoints ---
@app.get("/api/courses", response_model=List[schemas.Course])
def read_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_courses(db, instructor_id=current_user.id, skip=skip, limit=limit)

@app.post("/api/courses", response_model=schemas.Course)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_course(db=db, course=course, instructor_id=current_user.id)

# --- Assignments Endpoints ---
@app.get("/api/assignments", response_model=List[schemas.Assignment])
def read_assignments(course_id: int = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if course_id:
        return crud.get_assignments(db, course_id=course_id)
    return crud.get_recent_assignments(db, instructor_id=current_user.id)

@app.post("/api/assignments", response_model=schemas.Assignment)
def create_assignment(assignment: schemas.AssignmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_assignment(db=db, assignment=assignment)

# --- Submissions & Grading ---
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
        
        # Save file to disk
        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Create submission record
        submission = schemas.SubmissionCreate(
            student_name=student_name,
            assignment_id=assignment_id,
            file_path=file_path,
            mime_type=mime_type
        )
        db_submission = crud.create_submission(db, submission)
        
        # Call the local heuristic grading service
        result = grade_submission(contents, mime_type, rubric)
        
        # Extract score from mock result (e.g. "Final Score: 85/100")
        score = 0
        try:
            score_line = [line for line in result.split('\\n') if "Final Score:" in line][0]
            score = float(score_line.split("Final Score:")[1].split("/")[0].strip().replace("*", ""))
        except:
            pass
            
        # Update submission with grades
        crud.update_submission_grade(db, db_submission.id, score, result)
        
        return {"success": True, "grading_result": result, "submission_id": db_submission.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
