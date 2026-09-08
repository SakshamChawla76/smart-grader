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

# --- Submission Schemas ---
class SubmissionBase(BaseModel):
    student_name: str
    assignment_id: int

class SubmissionCreate(SubmissionBase):
    file_path: str
    mime_type: str

class Submission(SubmissionBase):
    id: int
    file_path: str
    mime_type: str
    submitted_at: datetime
    score: Optional[float] = None
    feedback: Optional[str] = None
    status: str

    class Config:
        from_attributes = True
