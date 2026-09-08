import models, schemas, crud
from database import SessionLocal, engine
from datetime import datetime, timedelta

models.Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    
    # Check if we already have a user
    user = db.query(models.User).filter_by(email="instructor@smartgrader.com").first()
    if not user:
        user = crud.create_user(db, schemas.UserCreate(
            email="instructor@smartgrader.com",
            password="password123",
            full_name="Dr. Smith"
        ))
    
    # Check if courses exist
    courses = db.query(models.Course).all()
    if not courses:
        course1 = crud.create_course(db, schemas.CourseCreate(
            title="Introduction to Computer Science",
            description="CS101 Fall 2026"
        ), instructor_id=user.id)
        
        course2 = crud.create_course(db, schemas.CourseCreate(
            title="Advanced Physics",
            description="PHYS301 Fall 2026"
        ), instructor_id=user.id)
        
        # Create Assignments
        crud.create_assignment(db, schemas.AssignmentCreate(
            title="Midterm Exam Submission",
            description="Upload your midterm code here.",
            rubric="Code structure: 40 points\\nAlgorithm correctness: 60 points",
            due_date=datetime.utcnow() + timedelta(days=7),
            course_id=course1.id
        ))
        
        crud.create_assignment(db, schemas.AssignmentCreate(
            title="Lab Report 3",
            description="Quantum mechanics lab report.",
            rubric="Data analysis: 50 points\\nConclusion: 50 points",
            due_date=datetime.utcnow() + timedelta(days=2),
            course_id=course2.id
        ))
        
    db.close()
    print("Database seeded successfully.")

if __name__ == "__main__":
    seed_db()
