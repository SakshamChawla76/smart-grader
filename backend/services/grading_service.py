"""
SmartGrader — Local Rubric-Based Grading Engine
================================================
Performs real rubric-based grading WITHOUT any API keys or LLMs.

How it works:
1. Parses the rubric into individual criteria with point values
2. Extracts text content from the submission (txt, code, etc.)
3. Evaluates each criterion against the submission using NLP-free heuristics:
   - Keyword/phrase matching with fuzzy tolerance
   - Code structure analysis (functions, classes, imports, comments)
   - Text quality metrics (word count, paragraph structure, vocabulary richness)
   - Mathematical expression detection
4. Scores each criterion individually and sums for the total
5. Generates detailed per-criterion feedback
"""

import re
import math
from collections import Counter
from typing import List, Dict, Tuple


# ─── Rubric Parsing ───────────────────────────────────────────────────────────

def parse_rubric(rubric_text: str) -> List[Dict]:
    """
    Parse a rubric string into structured criteria.
    Supports formats like:
      - "Correctness: 40 points"
      - "Code style (20 pts)"
      - "Documentation - 15"
      - "Use of loops: 10"
      - Plain lines without points (auto-weighted equally)
    """
    criteria = []
    lines = [l.strip() for l in rubric_text.replace("\\n", "\n").split("\n") if l.strip()]

    point_pattern = re.compile(
        r'^(.+?)[\s:\-–—]+(\d+)\s*(?:points?|pts?|marks?|%)?\s*$', re.IGNORECASE
    )
    paren_pattern = re.compile(
        r'^(.+?)\s*\((\d+)\s*(?:points?|pts?|marks?)?\)\s*$', re.IGNORECASE
    )

    for line in lines:
        # Try "Name: 40 points" or "Name - 40"
        m = point_pattern.match(line)
        if not m:
            m = paren_pattern.match(line)
        
        if m:
            name = m.group(1).strip().rstrip(':').rstrip('-').strip()
            points = int(m.group(2))
            criteria.append({"name": name, "max_points": points, "raw": line})
        else:
            # No point value found — treat as a criterion worth equal share
            criteria.append({"name": line, "max_points": 0, "raw": line})

    # If some criteria have no points, distribute remaining equally
    total_assigned = sum(c["max_points"] for c in criteria)
    unassigned = [c for c in criteria if c["max_points"] == 0]
    if unassigned:
        if total_assigned == 0:
            # No points anywhere — divide 100 equally
            per_item = 100 // len(criteria)
            for c in criteria:
                c["max_points"] = per_item
            # Give remainder to last
            criteria[-1]["max_points"] += 100 - per_item * len(criteria)
        else:
            # Fill remaining up to 100
            remaining = max(0, 100 - total_assigned)
            per_item = remaining // len(unassigned) if unassigned else 0
            for c in unassigned:
                c["max_points"] = max(per_item, 5)

    return criteria


# ─── Text Extraction ──────────────────────────────────────────────────────────

def extract_text(file_bytes: bytes, mime_type: str) -> str:
    """Extract readable text from file bytes."""
    text = ""
    if "text" in mime_type or mime_type in ("application/javascript", "application/json",
                                             "application/xml", "application/x-python"):
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except:
                pass
    return text


# ─── Analysis Functions ───────────────────────────────────────────────────────

def analyze_text_quality(text: str) -> Dict:
    """Compute text quality metrics."""
    words = re.findall(r'\b\w+\b', text)
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    
    word_count = len(words)
    unique_words = len(set(w.lower() for w in words))
    vocab_richness = unique_words / max(word_count, 1)
    avg_sentence_len = word_count / max(len(sentences), 1)
    
    return {
        "word_count": word_count,
        "sentence_count": len(sentences),
        "paragraph_count": len(paragraphs),
        "unique_words": unique_words,
        "vocab_richness": round(vocab_richness, 3),
        "avg_sentence_length": round(avg_sentence_len, 1),
    }


def analyze_code_quality(text: str) -> Dict:
    """Analyze code structure and quality."""
    lines = text.split("\n")
    code_lines = [l for l in lines if l.strip() and not l.strip().startswith("#") and not l.strip().startswith("//")]
    comment_lines = [l for l in lines if l.strip().startswith("#") or l.strip().startswith("//")]
    blank_lines = [l for l in lines if not l.strip()]
    
    functions = re.findall(r'\bdef\s+\w+', text) + re.findall(r'\bfunction\s+\w+', text)
    classes = re.findall(r'\bclass\s+\w+', text)
    imports = re.findall(r'^\s*(?:import|from|require|include)\b', text, re.MULTILINE)
    
    # Check for common patterns
    has_error_handling = bool(re.search(r'\btry\b|\bcatch\b|\bexcept\b|\berror\b', text, re.IGNORECASE))
    has_loops = bool(re.search(r'\bfor\b|\bwhile\b|\bforEach\b|\bmap\b', text))
    has_conditionals = bool(re.search(r'\bif\b|\belse\b|\belif\b|\bswitch\b|\bcase\b', text))
    has_return = bool(re.search(r'\breturn\b', text))
    has_print_output = bool(re.search(r'\bprint\b|\bconsole\.log\b|\bSystem\.out\b', text))
    has_docstrings = bool(re.search(r'""".*?"""|\'\'\'.*?\'\'\'', text, re.DOTALL))
    
    return {
        "total_lines": len(lines),
        "code_lines": len(code_lines),
        "comment_lines": len(comment_lines),
        "blank_lines": len(blank_lines),
        "functions": functions,
        "function_count": len(functions),
        "classes": classes,
        "class_count": len(classes),
        "import_count": len(imports),
        "has_error_handling": has_error_handling,
        "has_loops": has_loops,
        "has_conditionals": has_conditionals,
        "has_return": has_return,
        "has_output": has_print_output,
        "has_docstrings": has_docstrings,
        "comment_ratio": round(len(comment_lines) / max(len(code_lines), 1), 3),
    }


def keyword_match_score(text: str, criterion_name: str) -> Tuple[float, List[str]]:
    """
    Score how well the submission text matches a rubric criterion.
    Returns (0.0-1.0 score, list of matched evidence).
    """
    text_lower = text.lower()
    
    # Extract meaningful keywords from the criterion (skip short words)
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
                  "have", "has", "had", "do", "does", "did", "will", "would", "could",
                  "should", "may", "might", "shall", "can", "need", "dare", "ought",
                  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
                  "as", "into", "through", "during", "before", "after", "above", "below",
                  "between", "out", "off", "over", "under", "again", "further", "then",
                  "once", "and", "but", "or", "nor", "not", "so", "yet", "both", "each",
                  "few", "more", "most", "other", "some", "such", "no", "only", "own",
                  "same", "than", "too", "very", "just", "because", "if", "when", "where",
                  "how", "all", "any", "use", "using", "points", "pts", "marks", "check",
                  "proper", "good", "correct", "must", "show", "include", "demonstrate"}
    
    keywords = [w.lower() for w in re.findall(r'\b\w+\b', criterion_name) 
                if len(w) > 2 and w.lower() not in stop_words]
    
    if not keywords:
        return 0.5, ["(generic criterion — partial credit)"]
    
    matched = []
    for kw in keywords:
        # Look for the keyword or close variants in the text
        if kw in text_lower:
            # Find a snippet around the match
            idx = text_lower.index(kw)
            start = max(0, idx - 30)
            end = min(len(text_lower), idx + len(kw) + 30)
            snippet = text[start:end].strip().replace("\n", " ")
            matched.append(f'Found "{kw}" → "...{snippet}..."')
        else:
            # Try partial/stem matching
            stem = kw[:max(4, len(kw) - 2)]
            if stem in text_lower:
                idx = text_lower.index(stem)
                start = max(0, idx - 30)
                end = min(len(text_lower), idx + len(stem) + 30)
                snippet = text[start:end].strip().replace("\n", " ")
                matched.append(f'Partial match "{stem}*" → "...{snippet}..."')
    
    score = len(matched) / len(keywords)
    return min(score, 1.0), matched


# ─── Criterion Evaluators ─────────────────────────────────────────────────────

def evaluate_criterion(criterion: Dict, text: str, text_metrics: Dict, code_metrics: Dict, is_code: bool) -> Dict:
    """
    Evaluate a single rubric criterion against the submission.
    Returns: { earned_points, max_points, percentage, feedback, evidence }
    """
    name_lower = criterion["name"].lower()
    max_pts = criterion["max_points"]
    
    # Detect what kind of criterion this is
    is_correctness = any(w in name_lower for w in ["correct", "accuracy", "right", "answer", "solution", "output", "result"])
    is_style = any(w in name_lower for w in ["style", "format", "clean", "readable", "naming", "indent", "convention"])
    is_docs = any(w in name_lower for w in ["document", "comment", "docstring", "readme", "explain", "description"])
    is_structure = any(w in name_lower for w in ["structure", "organiz", "modular", "function", "class", "architect"])
    is_error = any(w in name_lower for w in ["error", "exception", "edge", "handling", "robust", "valid"])
    is_completeness = any(w in name_lower for w in ["complete", "all", "cover", "comprehensive", "thorough", "full"])
    is_testing = any(w in name_lower for w in ["test", "assert", "verify", "check", "unit"])
    is_logic = any(w in name_lower for w in ["logic", "algorithm", "loop", "condition", "flow", "implement"])
    
    evidence = []
    score_pct = 0.0
    
    if is_code:
        # ── Code-based evaluation ──
        if is_correctness or is_logic:
            # Check for functional code: has functions, returns, conditionals
            pts = 0
            if code_metrics["function_count"] > 0:
                pts += 0.3
                evidence.append(f"✓ Found {code_metrics['function_count']} function(s): {', '.join(code_metrics['functions'][:5])}")
            if code_metrics["has_conditionals"]:
                pts += 0.2
                evidence.append("✓ Contains conditional logic (if/else)")
            if code_metrics["has_loops"]:
                pts += 0.15
                evidence.append("✓ Contains loop structures")
            if code_metrics["has_return"]:
                pts += 0.15
                evidence.append("✓ Functions return values")
            if code_metrics["has_output"]:
                pts += 0.1
                evidence.append("✓ Produces output (print/console)")
            if code_metrics["code_lines"] > 10:
                pts += 0.1
                evidence.append(f"✓ Substantial code ({code_metrics['code_lines']} lines)")
            
            kw_score, kw_evidence = keyword_match_score(text, criterion["name"])
            pts = pts * 0.6 + kw_score * 0.4
            evidence.extend(kw_evidence[:3])
            score_pct = min(pts, 1.0)
            
        elif is_style:
            pts = 0
            if code_metrics["comment_ratio"] > 0.1:
                pts += 0.3
                evidence.append(f"✓ Good comment ratio ({code_metrics['comment_ratio']:.0%})")
            else:
                evidence.append(f"✗ Low comment ratio ({code_metrics['comment_ratio']:.0%}) — add more comments")
            if code_metrics["blank_lines"] > 2:
                pts += 0.2
                evidence.append("✓ Code uses whitespace for readability")
            if code_metrics["function_count"] > 0:
                pts += 0.2
                evidence.append("✓ Code is organized into functions")
            if code_metrics["code_lines"] < 200:
                pts += 0.15
                evidence.append("✓ Code is concise")
            # Check naming conventions (snake_case for Python)
            snake_case = re.findall(r'\bdef\s+[a-z][a-z0-9_]+', text)
            if snake_case:
                pts += 0.15
                evidence.append("✓ Follows naming conventions")
            score_pct = min(pts, 1.0)
            
        elif is_docs:
            pts = 0
            if code_metrics["comment_lines"] > 3:
                pts += 0.4
                evidence.append(f"✓ Has {code_metrics['comment_lines']} comment lines")
            elif code_metrics["comment_lines"] > 0:
                pts += 0.2
                evidence.append(f"△ Only {code_metrics['comment_lines']} comment lines — needs more")
            else:
                evidence.append("✗ No comments found")
            if code_metrics["has_docstrings"]:
                pts += 0.4
                evidence.append("✓ Contains docstrings")
            else:
                evidence.append("✗ No docstrings found — add docstrings to functions")
            kw_score, kw_evidence = keyword_match_score(text, criterion["name"])
            pts += kw_score * 0.2
            evidence.extend(kw_evidence[:2])
            score_pct = min(pts, 1.0)
            
        elif is_structure:
            pts = 0
            if code_metrics["function_count"] >= 2:
                pts += 0.35
                evidence.append(f"✓ Well-structured with {code_metrics['function_count']} functions")
            elif code_metrics["function_count"] == 1:
                pts += 0.15
                evidence.append("△ Only 1 function — consider breaking code into more functions")
            else:
                evidence.append("✗ No functions — code should be modular")
            if code_metrics["class_count"] > 0:
                pts += 0.25
                evidence.append(f"✓ Uses classes ({code_metrics['class_count']})")
            if code_metrics["import_count"] > 0:
                pts += 0.2
                evidence.append(f"✓ Uses {code_metrics['import_count']} imports/modules")
            if code_metrics["code_lines"] > 5:
                pts += 0.2
            score_pct = min(pts, 1.0)
            
        elif is_error:
            pts = 0
            if code_metrics["has_error_handling"]:
                pts += 0.7
                evidence.append("✓ Implements error/exception handling")
            else:
                evidence.append("✗ No error handling found — add try/except or validation")
            kw_score, kw_evidence = keyword_match_score(text, criterion["name"])
            pts += kw_score * 0.3
            evidence.extend(kw_evidence[:2])
            score_pct = min(pts, 1.0)
            
        elif is_testing:
            pts = 0
            has_tests = bool(re.search(r'\bdef\s+test_|assert\s|unittest|pytest|describe\(|it\(', text))
            if has_tests:
                pts += 0.8
                evidence.append("✓ Contains test cases")
            else:
                evidence.append("✗ No test cases found")
            kw_score, kw_evidence = keyword_match_score(text, criterion["name"])
            pts += kw_score * 0.2
            score_pct = min(pts, 1.0)
            
        else:
            # Generic criterion for code — use keyword matching
            kw_score, kw_evidence = keyword_match_score(text, criterion["name"])
            evidence.extend(kw_evidence)
            
            # Bonus for substantial code
            if code_metrics["code_lines"] > 20:
                kw_score = min(kw_score + 0.2, 1.0)
                evidence.append(f"✓ Substantial implementation ({code_metrics['code_lines']} lines)")
            score_pct = kw_score
    
    else:
        # ── Text/essay-based evaluation ──
        if is_completeness:
            pts = 0
            if text_metrics["word_count"] > 300:
                pts += 0.4
                evidence.append(f"✓ Comprehensive response ({text_metrics['word_count']} words)")
            elif text_metrics["word_count"] > 100:
                pts += 0.25
                evidence.append(f"△ Moderate length ({text_metrics['word_count']} words) — could be more thorough")
            else:
                evidence.append(f"✗ Very short ({text_metrics['word_count']} words) — needs more detail")
            if text_metrics["paragraph_count"] > 2:
                pts += 0.2
                evidence.append(f"✓ Well-structured ({text_metrics['paragraph_count']} paragraphs)")
            kw_score, kw_evidence = keyword_match_score(text, criterion["name"])
            pts += kw_score * 0.4
            evidence.extend(kw_evidence[:3])
            score_pct = min(pts, 1.0)
            
        elif is_correctness:
            kw_score, kw_evidence = keyword_match_score(text, criterion["name"])
            evidence.extend(kw_evidence)
            # Bonus for longer, more detailed answers
            length_bonus = min(text_metrics["word_count"] / 200, 0.3)
            score_pct = min(kw_score * 0.7 + length_bonus, 1.0)
            if text_metrics["word_count"] > 50:
                evidence.append(f"✓ Provides {text_metrics['word_count']} words of explanation")
                
        elif is_docs or is_style:
            pts = 0
            if text_metrics["vocab_richness"] > 0.5:
                pts += 0.3
                evidence.append(f"✓ Rich vocabulary ({text_metrics['vocab_richness']:.0%} unique words)")
            if text_metrics["avg_sentence_length"] < 25 and text_metrics["avg_sentence_length"] > 5:
                pts += 0.3
                evidence.append(f"✓ Good sentence structure (avg {text_metrics['avg_sentence_length']:.0f} words/sentence)")
            elif text_metrics["avg_sentence_length"] >= 25:
                pts += 0.1
                evidence.append("△ Sentences are very long — consider breaking them up")
            if text_metrics["paragraph_count"] > 1:
                pts += 0.2
                evidence.append(f"✓ Organized into {text_metrics['paragraph_count']} paragraphs")
            kw_score, kw_evidence = keyword_match_score(text, criterion["name"])
            pts += kw_score * 0.2
            evidence.extend(kw_evidence[:2])
            score_pct = min(pts, 1.0)
        
        else:
            # Generic text criterion — keyword matching + text quality
            kw_score, kw_evidence = keyword_match_score(text, criterion["name"])
            evidence.extend(kw_evidence)
            length_bonus = min(text_metrics["word_count"] / 150, 0.3)
            quality_bonus = min(text_metrics["vocab_richness"], 0.2)
            score_pct = min(kw_score * 0.5 + length_bonus + quality_bonus, 1.0)
            if text_metrics["word_count"] > 30:
                evidence.append(f"✓ Response length: {text_metrics['word_count']} words")
    
    # If we have absolutely no evidence and some text exists, give partial credit
    if not evidence and text.strip():
        score_pct = max(score_pct, 0.3)
        evidence.append("△ Content present but no direct match to this criterion")
    elif not text.strip():
        score_pct = 0
        evidence.append("✗ No readable content found in submission")
    
    earned = round(max_pts * score_pct, 1)
    
    return {
        "name": criterion["name"],
        "earned_points": earned,
        "max_points": max_pts,
        "percentage": round(score_pct * 100, 1),
        "evidence": evidence,
    }


# ─── Main Grading Function ───────────────────────────────────────────────────

def grade_submission(file_bytes: bytes, mime_type: str, rubric: str) -> dict:
    """
    Grade a submission against a rubric. Returns a structured result dict.
    
    Returns:
        {
            "total_score": float,
            "max_score": int,
            "percentage": float,
            "letter_grade": str,
            "criteria_results": [...],
            "summary": str,
            "text_metrics": {...},
            "code_metrics": {...} or None,
            "feedback_md": str  # full markdown report
        }
    """
    # Extract text
    text = extract_text(file_bytes, mime_type)
    
    # Detect if this is code
    code_extensions = (".py", ".js", ".ts", ".java", ".c", ".cpp", ".rb", ".go", ".rs")
    is_code = (
        any(mime_type.endswith(ext) for ext in ("python", "javascript", "java", "x-python")) or
        bool(re.search(r'\bdef\s+\w+|\bfunction\s+\w+|\bclass\s+\w+|\bimport\s+', text))
    )
    
    # Analyze
    text_metrics = analyze_text_quality(text)
    code_metrics = analyze_code_quality(text) if is_code else None
    
    # Parse rubric
    criteria = parse_rubric(rubric)
    
    # Evaluate each criterion
    results = []
    for criterion in criteria:
        result = evaluate_criterion(criterion, text, text_metrics, code_metrics or {}, is_code)
        results.append(result)
    
    # Calculate totals
    total_earned = sum(r["earned_points"] for r in results)
    total_max = sum(r["max_points"] for r in results)
    percentage = round((total_earned / max(total_max, 1)) * 100, 1)
    
    # Letter grade
    if percentage >= 93: letter = "A"
    elif percentage >= 90: letter = "A-"
    elif percentage >= 87: letter = "B+"
    elif percentage >= 83: letter = "B"
    elif percentage >= 80: letter = "B-"
    elif percentage >= 77: letter = "C+"
    elif percentage >= 73: letter = "C"
    elif percentage >= 70: letter = "C-"
    elif percentage >= 67: letter = "D+"
    elif percentage >= 60: letter = "D"
    else: letter = "F"
    
    # Build markdown report
    md = f"# 📝 Grading Report\n\n"
    md += f"**Total Score: {total_earned}/{total_max} ({percentage}%) — Grade: {letter}**\n\n"
    md += "---\n\n"
    md += "## Criteria Breakdown\n\n"
    
    for r in results:
        icon = "✅" if r["percentage"] >= 70 else "⚠️" if r["percentage"] >= 40 else "❌"
        md += f"### {icon} {r['name']} — {r['earned_points']}/{r['max_points']} ({r['percentage']}%)\n\n"
        for ev in r["evidence"]:
            md += f"- {ev}\n"
        md += "\n"
    
    md += "---\n\n"
    md += "## Submission Analysis\n\n"
    if is_code:
        md += f"- **Type**: Code submission\n"
        md += f"- **Lines of code**: {code_metrics['code_lines']}\n"
        md += f"- **Functions**: {code_metrics['function_count']}\n"
        md += f"- **Classes**: {code_metrics['class_count']}\n"
        md += f"- **Comment ratio**: {code_metrics['comment_ratio']:.0%}\n"
        md += f"- **Error handling**: {'Yes' if code_metrics['has_error_handling'] else 'No'}\n"
    else:
        md += f"- **Type**: Text submission\n"
        md += f"- **Word count**: {text_metrics['word_count']}\n"
        md += f"- **Sentences**: {text_metrics['sentence_count']}\n"
        md += f"- **Paragraphs**: {text_metrics['paragraph_count']}\n"
        md += f"- **Vocabulary richness**: {text_metrics['vocab_richness']:.0%}\n"
    
    md += f"\n*Graded by SmartGrader Local Engine (no API keys used)*\n"
    
    return {
        "total_score": total_earned,
        "max_score": total_max,
        "percentage": percentage,
        "letter_grade": letter,
        "criteria_results": results,
        "text_metrics": text_metrics,
        "code_metrics": code_metrics,
        "feedback_md": md,
    }
