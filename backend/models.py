from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, Boolean
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    
    courses = relationship("Course", back_populates="instructor")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    instructor_id = Column(Integer, ForeignKey("users.id"))
    
    instructor = relationship("User", back_populates="courses")
    assignments = relationship("Assignment", back_populates="course", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="course", cascade="all, delete-orphan")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    rubric = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    
    course = relationship("Course", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    class_section = Column(String, default="Class 10 - Section A")
    course_id = Column(Integer, ForeignKey("courses.id"))
    exam_date = Column(DateTime, default=datetime.datetime.utcnow)
    duration_minutes = Column(Integer, default=90)
    total_marks = Column(Float, default=100.0)
    passing_marks = Column(Float, default=40.0)
    rubric = Column(Text, nullable=True)
    status = Column(String, default="Scheduled") # Scheduled, In Progress, Evaluating, Published
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    course = relationship("Course", back_populates="exams")
    submissions = relationship("Submission", back_populates="exam", cascade="all, delete-orphan")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_name = Column(String)
    file_path = Column(String)
    mime_type = Column(String)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Grading results
    score = Column(Float, nullable=True)
    max_score = Column(Float, default=100.0)
    feedback = Column(Text, nullable=True)
    status = Column(String, default="Pending") # Pending, AI_Graded, Approved, Published
    
    # Moderation & Review
    moderator_score = Column(Float, nullable=True)
    moderator_notes = Column(Text, nullable=True)
    criteria_breakdown = Column(Text, nullable=True) # JSON structured per-question results
    is_published = Column(Boolean, default=False)
    
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True)
    assignment = relationship("Assignment", back_populates="submissions")

    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=True)
    exam = relationship("Exam", back_populates="submissions")
