from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float
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
    assignments = relationship("Assignment", back_populates="course")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    rubric = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    
    course = relationship("Course", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_name = Column(String)
    file_path = Column(String)
    mime_type = Column(String)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Grading results
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    status = Column(String, default="Pending") # Pending, Graded
    
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    assignment = relationship("Assignment", back_populates="submissions")
