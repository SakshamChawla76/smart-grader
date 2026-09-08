from sqlalchemy.orm import Session
import models
import schemas
import bcrypt

def get_password_hash(password: str):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# --- Users ---
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, full_name=user.full_name, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Courses ---
def get_courses(db: Session, instructor_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Course).filter(models.Course.instructor_id == instructor_id).offset(skip).limit(limit).all()

def create_course(db: Session, course: schemas.CourseCreate, instructor_id: int):
    db_course = models.Course(**course.model_dump(), instructor_id=instructor_id)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

# --- Assignments ---
def get_assignments(db: Session, course_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Assignment).filter(models.Assignment.course_id == course_id).offset(skip).limit(limit).all()

def get_recent_assignments(db: Session, instructor_id: int, limit: int = 5):
    # Get assignments for all courses taught by this instructor
    return db.query(models.Assignment).join(models.Course).filter(models.Course.instructor_id == instructor_id).order_by(models.Assignment.id.desc()).limit(limit).all()

def create_assignment(db: Session, assignment: schemas.AssignmentCreate):
    db_assignment = models.Assignment(**assignment.model_dump())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

# --- Submissions ---
def get_submissions(db: Session, assignment_id: int):
    return db.query(models.Submission).filter(models.Submission.assignment_id == assignment_id).all()

def create_submission(db: Session, submission: schemas.SubmissionCreate):
    db_submission = models.Submission(**submission.model_dump())
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return db_submission

def update_submission_grade(db: Session, submission_id: int, score: float, feedback: str):
    db_submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if db_submission:
        db_submission.score = score
        db_submission.feedback = feedback
        db_submission.status = "Graded"
        db.commit()
        db.refresh(db_submission)
    return db_submission
