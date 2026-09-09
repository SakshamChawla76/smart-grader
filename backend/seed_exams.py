import os
import json
from datetime import datetime, timedelta
from database import SessionLocal, engine
import models, crud, schemas

models.Base.metadata.create_all(bind=engine)

def seed_exams_data():
    db = SessionLocal()
    os.makedirs("uploads", exist_ok=True)
    
    # Ensure instructor
    user = db.query(models.User).filter_by(email="prof.sharma@stanford.edu").first()
    if not user:
        user = crud.create_user(db, schemas.UserCreate(
            email="prof.sharma@stanford.edu",
            password="securePassword2026",
            full_name="Prof. Rajesh Sharma"
        ))

    # Get or create courses
    c1 = db.query(models.Course).filter_by(title="CS101: Intro to Python & Algorithms").first()
    if not c1:
        c1 = crud.create_course(db, schemas.CourseCreate(
            title="CS101: Intro to Python & Algorithms",
            description="Foundations of programming, algorithmic complexity, recursion, and core data structures."
        ), instructor_id=user.id)

    c2 = db.query(models.Course).filter_by(title="CS205: Object-Oriented Software Design").first()
    if not c2:
        c2 = crud.create_course(db, schemas.CourseCreate(
            title="CS205: Object-Oriented Software Design",
            description="Design patterns, SOLID principles, testing, and modern application architecture."
        ), instructor_id=user.id)

    c3 = db.query(models.Course).filter_by(title="AI301: Deep Learning & Neural Architectures").first()
    if not c3:
        c3 = crud.create_course(db, schemas.CourseCreate(
            title="AI301: Deep Learning & Neural Architectures",
            description="Backpropagation, PyTorch tensors, transformer attention, and computer vision pipelines."
        ), instructor_id=user.id)

    # 1. Clean existing exams for clean state
    db.query(models.Exam).delete()
    db.commit()

    # Create Sample Upload Files
    file1_path = "uploads/aarav_midterm_paper.py"
    with open(file1_path, "w", encoding="utf-8") as f:
        f.write('''"""
CS101 Midterm Examination 2026
Student: Aarav Patel
Roll: CS26-042
"""

# Question 1: QuickSort Implementation with Median-of-Three
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

# Question 2: Binary Search Tree Verification
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_valid_bst(root, low=float('-inf'), high=float('inf')):
    if not root:
        return True
    if not (low < root.val < high):
        return False
    return is_valid_bst(root.left, low, root.val) and is_valid_bst(root.right, root.val, high)

# Question 3: Time Complexity & Space Proof
# QuickSort average time complexity is O(n log n).
# The recursion depth is log2(n) and at each depth level O(n) partitioning work is performed.
# Space complexity is O(log n) for call stack memory.
''')

    file2_path = "uploads/priya_physics_answersheet.txt"
    with open(file2_path, "w", encoding="utf-8") as f:
        f.write('''PHYS301 Midterm Examination: Quantum Mechanics & Wave Equations
Student Name: Priya Sen
Section: Grade 12 - Advanced

[Section A: Schrodinger Time-Independent Equation]
The one-dimensional time-independent Schrodinger equation is given by:
(-hbar^2 / 2m) * (d^2 psi / dx^2) + V(x) * psi = E * psi.
For an infinite potential well where V(x) = 0 for 0 < x < L and infinity elsewhere:
Boundary conditions: psi(0) = 0 and psi(L) = 0.
General solution: psi(x) = A sin(k x) + B cos(k x).
Applying psi(0) = 0 gives B = 0.
Applying psi(L) = 0 gives k L = n pi, thus k = n pi / L.

[Section B: Probability Density & Normalization]
The normalization condition is integral |psi(x)|^2 dx from 0 to L = 1.
Integral A^2 sin^2(n pi x / L) dx = A^2 * (L/2) = 1 ==> A = sqrt(2/L).
Hence the normalized wavefunctions are psi_n(x) = sqrt(2/L) * sin(n pi x / L).

[Section C: Expectation Values and Heisenberg Uncertainty]
Using expectation values <x> = L / 2 and <p> = 0.
Delta x * Delta p >= hbar / 2 confirms Heisenberg's uncertainty principle for ground state n = 1.
''')

    file3_path = "uploads/kabir_data_structures.py"
    with open(file3_path, "w", encoding="utf-8") as f:
        f.write('''# Data Structures Midterm Test
# Kabir Mehta
def merge_sort(arr):
    if len(arr) > 1:
        mid = len(arr) // 2
        L = arr[:mid]
        R = arr[mid:]
        merge_sort(L)
        merge_sort(R)
        i = j = k = 0
        while i < len(L) and j < len(R):
            if L[i] < R[j]:
                arr[k] = L[i]
                i += 1
            else:
                arr[k] = R[j]
                j += 1
            k += 1
        while i < len(L):
            arr[k] = L[i]
            i += 1
            k += 1
        while j < len(R):
            arr[k] = R[j]
            j += 1
            k += 1
    return arr
''')

    # Create Exam 1: Midterm Examination (In Evaluation)
    ex1 = models.Exam(
        title="Midterm Examination 2026: Algorithms & BST",
        class_section="Grade 10 - Section A",
        course_id=c1.id,
        exam_date=datetime.utcnow() - timedelta(days=1),
        duration_minutes=120,
        total_marks=100.0,
        passing_marks=40.0,
        status="Evaluating",
        rubric=(
            "Q1: Divide & Conquer Sorting Implementation: 40 points\n"
            "Q2: Binary Search Tree Validation Logic: 35 points\n"
            "Q3: Time Complexity & Space Proof: 25 points"
        ),
        created_at=datetime.utcnow() - timedelta(days=2)
    )
    db.add(ex1)
    db.commit()
    db.refresh(ex1)

    # Create Exam 2: Term 1 Finals (Scheduled)
    ex2 = models.Exam(
        title="Term 1 Final: SOLID Software Architecture & Systems",
        class_section="Grade 11 - Section B",
        course_id=c2.id,
        exam_date=datetime.utcnow() + timedelta(days=4),
        duration_minutes=90,
        total_marks=100.0,
        passing_marks=45.0,
        status="Scheduled",
        rubric=(
            "Architecture & Dependency Inversion: 40 points\n"
            "Thread-Safe Concurrency & Mutex: 35 points\n"
            "Unit Test Suite Coverage (>80%): 25 points"
        ),
        created_at=datetime.utcnow() - timedelta(days=3)
    )
    db.add(ex2)

    # Create Exam 3: Neural Networks & Backprop Lab (Published)
    ex3 = models.Exam(
        title="AI Evaluation: Autograd & Deep Tensor Mechanics",
        class_section="Masters - AI Cohort",
        course_id=c3.id,
        exam_date=datetime.utcnow() - timedelta(days=5),
        duration_minutes=180,
        total_marks=100.0,
        passing_marks=50.0,
        status="Published",
        rubric=(
            "Computational Graph & Topological Order: 40 points\n"
            "Matrix Backprop Vectorization: 40 points\n"
            "Loss Convergence Analysis: 20 points"
        ),
        created_at=datetime.utcnow() - timedelta(days=6)
    )
    db.add(ex3)
    db.commit()

    # Add Submissions to Exam 1
    crit_breakdown_aarav = [
        {
            "name": "Q1: Divide & Conquer Sorting Implementation",
            "earned_points": 39.0,
            "max_points": 40.0,
            "percentage": 97.5,
            "confidence": 98.0,
            "evidence": ["Found recursive quicksort logic with pivot partitioning.", "Tested array order invariant."],
            "remarks": "Clean median pivot choice, avoids O(n^2) worst case."
        },
        {
            "name": "Q2: Binary Search Tree Validation Logic",
            "earned_points": 34.0,
            "max_points": 35.0,
            "percentage": 97.1,
            "confidence": 96.0,
            "evidence": ["TreeNode class structure properly initialized.", "Range boundary check (low < root.val < high) passed."],
            "remarks": "Rigorous recursive boundary check."
        },
        {
            "name": "Q3: Time Complexity & Space Proof",
            "earned_points": 24.0,
            "max_points": 25.0,
            "percentage": 96.0,
            "confidence": 94.0,
            "evidence": ["Identified log2(n) recursion tree depth with n work per level.", "Space complexity correctly derived as O(log n)."],
            "remarks": "Solid theoretical proof provided."
        }
    ]

    s1 = models.Submission(
        student_name="Aarav Patel",
        exam_id=ex1.id,
        file_path=file1_path,
        mime_type="text/x-python",
        score=97.0,
        max_score=100.0,
        feedback=(
            "### AI Evaluation Report: 97 / 100 (Grade: A+)\n\n"
            "- **Q1 Sorting (39/40)**: QuickSort implementation passes all partition test vectors.\n"
            "- **Q2 BST (34/35)**: Correct recursive tree boundary checks.\n"
            "- **Q3 Proof (24/25)**: Explicit mathematical induction for O(n log n)."
        ),
        criteria_breakdown=json.dumps(crit_breakdown_aarav),
        status="Approved",
        moderator_score=98.0,
        moderator_notes="Verified by Instructor: Outstanding paper, rigorous proof.",
        is_published=True
    )

    crit_breakdown_priya = [
        {
            "name": "Q1: Divide & Conquer Sorting Implementation",
            "earned_points": 35.0,
            "max_points": 40.0,
            "percentage": 87.5,
            "confidence": 92.0,
            "evidence": ["Found wave equation steps and boundary resolution."],
            "remarks": "Good structure, minor notation slip."
        },
        {
            "name": "Q2: Binary Search Tree Validation Logic",
            "earned_points": 30.0,
            "max_points": 35.0,
            "percentage": 85.7,
            "confidence": 90.0,
            "evidence": ["Normalized probability density step verified."],
            "remarks": "Well executed integration."
        },
        {
            "name": "Q3: Time Complexity & Space Proof",
            "earned_points": 23.0,
            "max_points": 25.0,
            "percentage": 92.0,
            "confidence": 91.0,
            "evidence": ["Heisenberg uncertainty derivation correct."],
            "remarks": "Complete expectation value derivation."
        }
    ]

    s2 = models.Submission(
        student_name="Priya Sen",
        exam_id=ex1.id,
        file_path=file2_path,
        mime_type="text/plain",
        score=88.0,
        max_score=100.0,
        feedback=(
            "### AI Evaluation Report: 88 / 100 (Grade: B+)\n\n"
            "- **Q1 Problem Solving (35/40)**: Strong analytical approach.\n"
            "- **Q2 Core Theory (30/35)**: Satisfies boundary conditions.\n"
            "- **Q3 Derivation (23/25)**: Consistent math and clean layout."
        ),
        criteria_breakdown=json.dumps(crit_breakdown_priya),
        status="AI_Graded",
        moderator_score=None,
        is_published=False
    )

    s3 = models.Submission(
        student_name="Kabir Mehta",
        exam_id=ex1.id,
        file_path=file3_path,
        mime_type="text/x-python",
        score=82.0,
        max_score=100.0,
        feedback="### AI Evaluation Report: 82 / 100\nMergeSort logic verified with O(n log n) efficiency.",
        status="AI_Graded",
        is_published=False
    )

    s4 = models.Submission(
        student_name="Diya Kapoor",
        exam_id=ex1.id,
        file_path="uploads/aarav_midterm_paper.py",
        mime_type="text/x-python",
        score=None,
        max_score=100.0,
        status="Pending",
        is_published=False
    )

    db.add_all([s1, s2, s3, s4])
    db.commit()
    db.close()
    print("Seeded 3 realistic exams, 4 student scripts with evaluation breakdowns and files!")

if __name__ == "__main__":
    seed_exams_data()
