import os
import json
from datetime import datetime, timedelta
import models, crud, schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

def seed_rich_data():
    db = SessionLocal()
    
    # 1. Clear or ensure instructor user
    user = db.query(models.User).filter_by(email="prof.sharma@stanford.edu").first()
    if not user:
        user = crud.create_user(db, schemas.UserCreate(
            email="prof.sharma@stanford.edu",
            password="securePassword2026",
            full_name="Prof. Rajesh Sharma"
        ))

    # Clean existing for fresh realistic look
    db.query(models.Submission).delete()
    db.query(models.Assignment).delete()
    db.query(models.Course).delete()
    db.commit()

    # 2. Create Realistic Courses
    c1 = crud.create_course(db, schemas.CourseCreate(
        title="CS101: Intro to Python & Algorithms",
        description="Foundations of programming, algorithmic complexity, recursion, and core data structures."
    ), instructor_id=user.id)

    c2 = crud.create_course(db, schemas.CourseCreate(
        title="CS205: Object-Oriented Software Design",
        description="Design patterns, SOLID principles, testing, and modern application architecture."
    ), instructor_id=user.id)

    c3 = crud.create_course(db, schemas.CourseCreate(
        title="AI301: Deep Learning & Neural Architectures",
        description="Backpropagation, PyTorch tensors, transformer attention, and computer vision pipelines."
    ), instructor_id=user.id)

    c4 = crud.create_course(db, schemas.CourseCreate(
        title="MATH220: Linear Algebra & Optimization",
        description="Eigenvalues, matrix decomposition, convex optimization, and vector spaces."
    ), instructor_id=user.id)

    # 3. Create Assignments with detailed rubrics
    a1 = crud.create_assignment(db, schemas.AssignmentCreate(
        title="HW 1: Recursive Sorting & Big-O Verification",
        description="Implement QuickSort and MergeSort with O(n log n) average time complexity. Include test assertions.",
        rubric="Time Complexity: 35 points\nCorrectness & Sorting Logic: 35 points\nCode Cleanliness & PEP8: 15 points\nEdge Case Handling (empty, duplicates): 15 points",
        due_date=datetime.utcnow() + timedelta(days=5),
        course_id=c1.id
    ))

    a2 = crud.create_assignment(db, schemas.AssignmentCreate(
        title="HW 2: Balanced Binary Search Tree (AVL)",
        description="Build self-balancing AVL Tree with insert, delete, and level-order traversal functions.",
        rubric="Tree Rotations Logic: 40 points\nSearch & Traversal Efficiency: 30 points\nMemory and Node Management: 20 points\nDocumentation & Comments: 10 points",
        due_date=datetime.utcnow() + timedelta(days=12),
        course_id=c1.id
    ))

    a3 = crud.create_assignment(db, schemas.AssignmentCreate(
        title="Project 1: SOLID Architecture Bank Simulator",
        description="Implement transaction pipeline adhering to Single Responsibility and Open-Closed principles.",
        rubric="SOLID Compliance: 40 points\nConcurrency & Thread Safety: 30 points\nUnit Test Coverage (>85%): 20 points\nError & Exception Handling: 10 points",
        due_date=datetime.utcnow() + timedelta(days=9),
        course_id=c2.id
    ))

    a4 = crud.create_assignment(db, schemas.AssignmentCreate(
        title="Lab 2: Custom Backpropagation Engine",
        description="Implement automatic differentiation (Autograd) from scratch without torch.autograd.",
        rubric="Topological Sort Graph: 35 points\nVectorized Gradient Computation: 35 points\nLoss Convergence on MNIST: 20 points\nClean Vector Math & Typing: 10 points",
        due_date=datetime.utcnow() + timedelta(days=14),
        course_id=c3.id
    ))

    # 4. Realistic Submissions with graded results & feedback
    submissions_data = [
        {
            "student_name": "Aarav Patel",
            "assignment_id": a1.id,
            "file_path": "uploads/aarav_quicksort.py",
            "score": 96.0,
            "status": "graded",
            "submitted_at": datetime.utcnow() - timedelta(hours=8),
            "feedback": (
                "### Grade Report: 96 / 100 (Grade: A+)\n\n"
                "- **Time Complexity (35/35)**: Verified O(n log n) median-of-three pivot selection prevents worst-case O(n^2).\n"
                "- **Correctness & Sorting Logic (35/35)**: All 18 automated test suites passed perfectly.\n"
                "- **Code Cleanliness & PEP8 (14/15)**: Exceptional modularity; minor formatting on line 42.\n"
                "- **Edge Case Handling (12/15)**: Handles null arrays and reverse-sorted lists cleanly."
            )
        },
        {
            "student_name": "Priya Sen",
            "assignment_id": a1.id,
            "file_path": "uploads/priya_mergesort.py",
            "score": 90.0,
            "status": "graded",
            "submitted_at": datetime.utcnow() - timedelta(hours=14),
            "feedback": (
                "### Grade Report: 90 / 100 (Grade: A)\n\n"
                "- **Time Complexity (35/35)**: Optimal merge step O(n) with recursive divide step.\n"
                "- **Correctness & Sorting Logic (32/35)**: 17/18 tests passed. Minor off-by-one on single-element slice.\n"
                "- **Code Cleanliness & PEP8 (13/15)**: Good variable naming and docstrings.\n"
                "- **Edge Case Handling (10/15)**: Handled duplicates well; edge case with negative integers required fix."
            )
        },
        {
            "student_name": "Kabir Mehta",
            "assignment_id": a1.id,
            "file_path": "uploads/kabir_hw1.py",
            "score": 84.0,
            "status": "graded",
            "submitted_at": datetime.utcnow() - timedelta(hours=22),
            "feedback": (
                "### Grade Report: 84 / 100 (Grade: B)\n\n"
                "- **Time Complexity (30/35)**: QuickSort pivot chosen as first element, degrades on already sorted arrays.\n"
                "- **Correctness & Sorting Logic (30/35)**: Valid algorithm logic for standard arrays.\n"
                "- **Code Cleanliness & PEP8 (12/15)**: Follows general structure.\n"
                "- **Edge Case Handling (12/15)**: Passed boundary tests."
            )
        },
        {
            "student_name": "Ananya Roy",
            "assignment_id": a3.id,
            "file_path": "uploads/ananya_bank_system.py",
            "score": 98.0,
            "status": "graded",
            "submitted_at": datetime.utcnow() - timedelta(hours=4),
            "feedback": (
                "### Grade Report: 98 / 100 (Grade: A+)\n\n"
                "- **SOLID Compliance (40/40)**: Flawless abstraction layers with dependency inversion.\n"
                "- **Concurrency & Thread Safety (29/30)**: Reentrant locks properly guard balance modifications.\n"
                "- **Unit Test Coverage (19/20)**: 94% branch coverage reported by pytest-cov.\n"
                "- **Error Handling (10/10)**: Custom exception hierarchy catches invalid transactions cleanly."
            )
        },
        {
            "student_name": "Vikram Malhotra",
            "assignment_id": a4.id,
            "file_path": "uploads/vikram_autograd.py",
            "score": 92.0,
            "status": "graded",
            "submitted_at": datetime.utcnow() - timedelta(hours=2),
            "feedback": (
                "### Grade Report: 92 / 100 (Grade: A)\n\n"
                "- **Topological Sort Graph (35/35)**: DAG construction handles backward pass recursively.\n"
                "- **Vectorized Gradient Computation (32/35)**: Broadcast matching on matmul gradients has small redundancy.\n"
                "- **Loss Convergence (17/20)**: Reached 96.2% accuracy on MNIST test set within 5 epochs.\n"
                "- **Clean Vector Math (8/10)**: Clear NumPy tensor operations."
            )
        }
    ]

    for s in submissions_data:
        sub = models.Submission(
            student_name=s["student_name"],
            assignment_id=s["assignment_id"],
            file_path=s["file_path"],
            mime_type="text/x-python",
            submitted_at=s["submitted_at"],
            score=s["score"],
            status=s["status"],
            feedback=s["feedback"]
        )
        db.add(sub)

    db.commit()
    db.close()
    print("Enriched database with 4 courses, 4 assignments, and 5 comprehensive graded submissions!")

if __name__ == "__main__":
    seed_rich_data()
