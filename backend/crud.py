from sqlalchemy.orm import Session
from sqlalchemy import func
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
    return db.query(models.Assignment).join(models.Course).filter(models.Course.instructor_id == instructor_id).order_by(models.Assignment.id.desc()).limit(limit).all()

def create_assignment(db: Session, assignment: schemas.AssignmentCreate):
    db_assignment = models.Assignment(**assignment.model_dump())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

# --- Exams ---
def get_exams(db: Session, course_id: int = None, skip: int = 0, limit: int = 100):
    q = db.query(models.Exam)
    if course_id:
        q = q.filter(models.Exam.course_id == course_id)
    exams = q.order_by(models.Exam.id.desc()).offset(skip).limit(limit).all()
    
    result = []
    for ex in exams:
        subs = db.query(models.Submission).filter(models.Submission.exam_id == ex.id).all()
        graded = [s for s in subs if s.score is not None]
        approved = [s for s in subs if s.is_published or s.status in ("Approved", "Published")]
        avg_sc = (sum(s.score for s in graded) / len(graded)) if graded else None
        
        ex_dict = {
            "id": ex.id,
            "title": ex.title,
            "class_section": ex.class_section,
            "course_id": ex.course_id,
            "exam_date": ex.exam_date,
            "duration_minutes": ex.duration_minutes,
            "total_marks": ex.total_marks,
            "passing_marks": ex.passing_marks,
            "rubric": ex.rubric,
            "status": ex.status,
            "created_at": ex.created_at,
            "submission_count": len(subs),
            "graded_count": len(graded),
            "approved_count": len(approved),
            "avg_score": round(avg_sc, 1) if avg_sc is not None else None,
        }
        result.append(ex_dict)
    return result

def get_exam(db: Session, exam_id: int):
    return db.query(models.Exam).filter(models.Exam.id == exam_id).first()

def create_exam(db: Session, exam: schemas.ExamCreate):
    db_exam = models.Exam(**exam.model_dump())
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

# --- Submissions ---
def get_submissions(db: Session, assignment_id: int = None, exam_id: int = None):
    q = db.query(models.Submission)
    if assignment_id:
        q = q.filter(models.Submission.assignment_id == assignment_id)
    if exam_id:
        q = q.filter(models.Submission.exam_id == exam_id)
    return q.order_by(models.Submission.id.desc()).all()

def create_submission(db: Session, submission: schemas.SubmissionCreate):
    db_submission = models.Submission(**submission.model_dump())
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return db_submission

def update_submission_grade(db: Session, submission_id: int, score: float, feedback: str, criteria_breakdown: str = None):
    db_submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if db_submission:
        db_submission.score = score
        db_submission.feedback = feedback
        if criteria_breakdown:
            db_submission.criteria_breakdown = criteria_breakdown
        db_submission.status = "AI_Graded"
        db.commit()
        db.refresh(db_submission)
    return db_submission

def moderate_submission(db: Session, submission_id: int, mod_data: schemas.SubmissionModerate):
    db_submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if db_submission:
        if mod_data.score is not None:
            db_submission.score = mod_data.score
        if mod_data.moderator_score is not None:
            db_submission.moderator_score = mod_data.moderator_score
        if mod_data.moderator_notes is not None:
            db_submission.moderator_notes = mod_data.moderator_notes
        if mod_data.criteria_breakdown is not None:
            db_submission.criteria_breakdown = mod_data.criteria_breakdown
        if mod_data.is_published is not None:
            db_submission.is_published = mod_data.is_published
        if mod_data.status:
            db_submission.status = mod_data.status
        db.commit()
        db.refresh(db_submission)
    return db_submission
