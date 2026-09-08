import time
import random

def grade_submission(file_bytes: bytes, mime_type: str, rubric: str) -> str:
    """
    Evaluates a student's submission using a mock heuristic grading algorithm.
    This runs completely locally without any API keys or local LLMs.
    """
    # Simulate processing time
    time.sleep(2)
    
    # Extract some basic text if it's text/plain, otherwise just use length heuristics
    content_length = len(file_bytes)
    
    # Try to extract text for basic keyword matching
    text_content = ""
    if "text" in mime_type:
        try:
            text_content = file_bytes.decode('utf-8').lower()
        except:
            pass
            
    # Simple heuristic: longer rubric = more expectations
    rubric_points = len(rubric.split()) // 5 + 1
    
    # Simple keyword matching against rubric
    rubric_keywords = [word.lower() for word in rubric.split() if len(word) > 4]
    matches = sum(1 for word in rubric_keywords if word in text_content)
    
    score = min(100, max(40, 50 + (matches * 10) + (content_length % 20)))
    
    feedback = f"""
# Grading Evaluation Results

**Final Score: {score}/100**

---

## Breakdown
* **Content Length & Structure**: {'Good' if content_length > 100 else 'Needs more detail'} ({content_length} bytes analyzed)
* **Rubric Alignment**: Found {matches} matching concepts based on the provided rubric.

## AI Feedback
(Generated via Local Heuristic Engine)

**Strengths:**
* The submission was successfully processed and analyzed.
* Demonstrated basic understanding of the core requirements.

**Areas for Improvement:**
* Ensure all points in the rubric are explicitly addressed.
* Expand on the details to provide a more comprehensive answer.
    """
    return feedback
