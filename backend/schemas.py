from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        from_attributes = True

# --- Course Schemas ---
class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: int
    instructor_id: int

    class Config:
        from_attributes = True

# --- Assignment Schemas ---
class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    rubric: Optional[str] = None
    due_date: Optional[datetime] = None

class AssignmentCreate(AssignmentBase):
    course_id: int

class Assignment(AssignmentBase):
    id: int
    course_id: int

    class Config:
        from_attributes = True

# --- Exam Schemas ---
class ExamBase(BaseModel):
    title: str
    class_section: Optional[str] = "Class 10 - Section A"
    course_id: int
    exam_date: Optional[datetime] = None
    duration_minutes: Optional[int] = 90
    total_marks: Optional[float] = 100.0
    passing_marks: Optional[float] = 40.0
    rubric: Optional[str] = None
    status: Optional[str] = "Scheduled"

class ExamCreate(ExamBase):
    pass

class Exam(ExamBase):
    id: int
    created_at: datetime
    submission_count: Optional[int] = 0
    graded_count: Optional[int] = 0
    approved_count: Optional[int] = 0
    avg_score: Optional[float] = None

    class Config:
        from_attributes = True

# --- Submission Schemas ---
class SubmissionBase(BaseModel):
    student_name: str
    assignment_id: Optional[int] = None
    exam_id: Optional[int] = None

class SubmissionCreate(SubmissionBase):
    file_path: str
    mime_type: str

class SubmissionModerate(BaseModel):
    score: Optional[float] = None
    moderator_score: Optional[float] = None
    moderator_notes: Optional[str] = None
    criteria_breakdown: Optional[str] = None
    is_published: Optional[bool] = False
    status: Optional[str] = "Approved"

class Submission(SubmissionBase):
    id: int
    file_path: str
    mime_type: str
    submitted_at: datetime
    score: Optional[float] = None
    max_score: Optional[float] = 100.0
    feedback: Optional[str] = None
    status: str
    moderator_score: Optional[float] = None
    moderator_notes: Optional[str] = None
    criteria_breakdown: Optional[str] = None
    is_published: Optional[bool] = False

    class Config:
        from_attributes = True
