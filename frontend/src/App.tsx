import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import {
  GraduationCap,
  LayoutDashboard,
  FileCheck2,
  BookOpen,
  ClipboardList,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  RotateCcw,
  Sliders,
  Check,
  Send,
  Plus,
  Eye,
  FileText,
  FileCode,
  Image as ImageIcon,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Search,
  Award,
  Layers,
  ChevronDown
} from 'lucide-react';

const API = 'http://127.0.0.1:8000/api';

interface Course {
  id: number;
  title: string;
  description?: string;
  instructor_id: number;
}

interface Assignment {
  id: number;
  title: string;
  description?: string;
  rubric?: string;
  due_date?: string;
  course_id: number;
}

interface CriterionResult {
  name: string;
  earned_points: number;
  max_points: number;
  percentage: number;
  confidence?: number;
  evidence?: string[];
  remarks?: string;
}

interface Exam {
  id: number;
  title: string;
  class_section?: string;
  course_id: number;
  exam_date?: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  rubric?: string;
  status: string;
  submission_count: number;
  graded_count: number;
  approved_count: number;
  avg_score?: number;
}

interface Submission {
  id: number;
  student_name: string;
  assignment_id?: number;
  exam_id?: number;
  file_path: string;
  mime_type: string;
  submitted_at: string;
  score: number | null;
  max_score: number;
  feedback: string | null;
  status: string;
  moderator_score?: number | null;
  moderator_notes?: string | null;
  criteria_breakdown?: CriterionResult[] | null;
  is_published?: boolean;
}

interface SubmissionDetail extends Submission {
  file_name: string;
  is_image: boolean;
  is_pdf: boolean;
  file_content: string;
}

interface Stats {
  course_count: number;
  assignment_count: number;
  exam_count: number;
  total_submissions: number;
  graded_submissions: number;
  approved_submissions: number;
  pending_submissions: number;
  avg_score: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'exams' | 'courses' | 'submissions' | 'quick-grade'>('dashboard');
  
  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Exam for detailed Exam Dashboard
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedExamDetail, setSelectedExamDetail] = useState<any | null>(null);
  const [isExamLoading, setIsExamLoading] = useState(false);

  // Side-by-Side Review Canvas (AICOS-style Paper Evaluation)
  const [canvasSubmissionId, setCanvasSubmissionId] = useState<number | null>(null);
  const [canvasDetail, setCanvasDetail] = useState<SubmissionDetail | null>(null);
  const [isCanvasLoading, setIsCanvasLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [moderatorNotes, setModeratorNotes] = useState<string>('');
  const [editableCriteria, setEditableCriteria] = useState<CriterionResult[]>([]);
  const [isSavingModeration, setIsSavingModeration] = useState(false);

  // Modals
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showUploadSheets, setShowUploadSheets] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);

  // Forms
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamCourseId, setNewExamCourseId] = useState<number | ''>('');
  const [newExamClass, setNewExamClass] = useState('Grade 10 - Section A');
  const [newExamDuration, setNewExamDuration] = useState(90);
  const [newExamTotalMarks, setNewExamTotalMarks] = useState(100);
  const [newExamRubric, setNewExamRubric] = useState(
    'Q1: Solution Implementation & Correctness: 40 points\nQ2: Theoretical Proof & Mathematical Rigor: 35 points\nQ3: Code Modularity, Documentation & Edge Cases: 25 points'
  );

  // Upload Sheets form
  const [batchExamId, setBatchExamId] = useState<number | ''>('');
  const [batchFiles, setBatchFiles] = useState<FileList | null>(null);
  const [batchNames, setBatchNames] = useState('');
  const [isBatchUploading, setIsBatchUploading] = useState(false);

  // Quick Grade Form
  const [quickStudentName, setQuickStudentName] = useState('');
  const [quickRubric, setQuickRubric] = useState('Correctness: 40 points\nLogic & Structure: 40 points\nDocumentation: 20 points');
  const [quickFile, setQuickFile] = useState<File | null>(null);
  const [isQuickGrading, setIsQuickGrading] = useState(false);
  const [quickGradeResult, setQuickGradeResult] = useState<any | null>(null);

  // Course Form
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  // Assignment Form
  const [newAssTitle, setNewAssTitle] = useState('');
  const [newAssCourseId, setNewAssCourseId] = useState<number | ''>('');
  const [newAssRubric, setNewAssRubric] = useState('');
  const [newAssDesc, setNewAssDesc] = useState('');

  // Fetch all basic data
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cRes, aRes, eRes, sRes, stRes] = await Promise.all([
        fetch(`${API}/courses`),
        fetch(`${API}/assignments`),
        fetch(`${API}/exams`),
        fetch(`${API}/submissions`),
        fetch(`${API}/stats`),
      ]);
      if (cRes.ok) setCourses(await cRes.json());
      if (aRes.ok) setAssignments(await aRes.json());
      if (eRes.ok) setExams(await eRes.json());
      if (sRes.ok) setSubmissions(await sRes.json());
      if (stRes.ok) setStats(await stRes.json());
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Load Exam Detail
  const fetchExamDetail = useCallback(async (examId: number) => {
    setIsExamLoading(true);
    try {
      const res = await fetch(`${API}/exams/${examId}`);
      if (res.ok) {
        setSelectedExamDetail(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setIsExamLoading(false);
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchExamDetail(selectedExamId);
    }
  }, [selectedExamId, fetchExamDetail]);

  // Load Side-by-Side Review Canvas
  const openReviewCanvas = async (submissionId: number) => {
    setCanvasSubmissionId(submissionId);
    setIsCanvasLoading(true);
    try {
      const res = await fetch(`${API}/submissions/${submissionId}`);
      if (res.ok) {
        const data: SubmissionDetail = await res.json();
        setCanvasDetail(data);
        setModeratorNotes(data.moderator_notes || '');
        setEditableCriteria(data.criteria_breakdown || []);
        setActiveQuestionIdx(0);
        setZoomLevel(100);
      }
    } catch (e) {
      console.error(e);
    }
    setIsCanvasLoading(false);
  };

  const closeReviewCanvas = () => {
    setCanvasSubmissionId(null);
    setCanvasDetail(null);
    if (selectedExamId) fetchExamDetail(selectedExamId);
    fetchAll();
  };

  // Handle Score Modification in Review Canvas
  const handleScoreChange = (index: number, newScore: number) => {
    const updated = [...editableCriteria];
    const max = updated[index].max_points;
    const clamped = Math.min(Math.max(0, newScore), max);
    updated[index].earned_points = clamped;
    updated[index].percentage = Math.round((clamped / max) * 100);
    setEditableCriteria(updated);
  };

  // Save or Publish Moderation
  const handleSaveModeration = async (publish: boolean) => {
    if (!canvasDetail) return;
    setIsSavingModeration(true);
    
    // Calculate total
    const totalEarned = editableCriteria.reduce((sum, c) => sum + (c.earned_points || 0), 0);
    
    try {
      const res = await fetch(`${API}/submissions/${canvasDetail.id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: totalEarned,
          moderator_score: totalEarned,
          moderator_notes: moderatorNotes,
          criteria_breakdown: JSON.stringify(editableCriteria),
          is_published: publish,
          status: publish ? 'Approved' : 'AI_Graded',
        }),
      });
      if (res.ok) {
        setCanvasDetail(prev => prev ? { ...prev, score: totalEarned, moderator_score: totalEarned, is_published: publish, status: publish ? 'Approved' : 'AI_Graded' } : null);
        if (selectedExamId) fetchExamDetail(selectedExamId);
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
    setIsSavingModeration(false);
  };

  // Batch Auto-Grade All for an Exam
  const handleBatchAutoGrade = async (examId: number) => {
    try {
      const res = await fetch(`${API}/exams/${examId}/auto-grade-all`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchExamDetail(examId);
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Exam Handler
  const handleCreateExam = async () => {
    if (!newExamTitle.trim() || !newExamCourseId) return;
    try {
      const res = await fetch(`${API}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newExamTitle,
          course_id: Number(newExamCourseId),
          class_section: newExamClass,
          duration_minutes: newExamDuration,
          total_marks: newExamTotalMarks,
          rubric: newExamRubric,
          status: 'Evaluating',
        }),
      });
      if (res.ok) {
        setShowCreateExam(false);
        setNewExamTitle('');
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Batch Upload Sheets Handler
  const handleUploadSheets = async () => {
    if (!batchExamId || !batchFiles || batchFiles.length === 0) return;
    setIsBatchUploading(true);
    const fd = new FormData();
    Array.from(batchFiles).forEach(f => fd.append('files', f));
    if (batchNames) fd.append('student_names', batchNames);
    
    try {
      const res = await fetch(`${API}/exams/${batchExamId}/upload-sheets`, {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        setShowUploadSheets(false);
        setBatchFiles(null);
        setBatchNames('');
        if (selectedExamId === Number(batchExamId)) fetchExamDetail(selectedExamId);
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
    setIsBatchUploading(false);
  };

  // Quick Grade Handler (single paper)
  const handleQuickGrade = async () => {
    if (!quickFile || !quickStudentName.trim() || !quickRubric.trim()) return;
    setIsQuickGrading(true);
    setQuickGradeResult(null);
    const fd = new FormData();
    fd.append('file', quickFile);
    fd.append('student_name', quickStudentName);
    fd.append('rubric', quickRubric);
    try {
      const res = await fetch(`${API}/grade`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setQuickGradeResult(data);
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
    setIsQuickGrading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Global Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">SmartGrader</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Evaluation Engine v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Offline AI Assessment, OCR & Moderation Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab('dashboard'); setSelectedExamId(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'exams'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Exams & Assessments
            {stats && stats.exam_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-semibold">
                {stats.exam_count}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('courses'); setSelectedExamId(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'courses'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Courses & Rubrics
          </button>
          <button
            onClick={() => { setActiveTab('quick-grade'); setSelectedExamId(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'quick-grade'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Instant OCR Auto-Grade
          </button>
        </nav>

        {/* User Info & Quick Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateExam(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            New Exam
          </button>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">
              RS
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-white leading-tight">Prof. Rajesh Sharma</div>
              <div className="text-[10px] text-slate-400">Head Examiner & Moderator</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* ======================= DASHBOARD TAB ======================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Active Exams</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mt-3">
                  {stats?.exam_count ?? 0}
                </div>
                <div className="text-xs text-indigo-400/80 mt-1 flex items-center gap-1">
                  <span>Across {stats?.course_count ?? 0} academic courses</span>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Answer Sheets Graded</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mt-3">
                  {stats?.graded_submissions ?? 0}
                  <span className="text-sm font-normal text-slate-400 ml-1.5">
                    / {stats?.total_submissions ?? 0}
                  </span>
                </div>
                <div className="text-xs text-emerald-400/80 mt-1 flex items-center gap-1">
                  <span>
                    {stats?.total_submissions ? Math.round(((stats.graded_submissions) / stats.total_submissions) * 100) : 0}% completion rate
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Moderated & Published</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mt-3">
                  {stats?.approved_submissions ?? 0}
                </div>
                <div className="text-xs text-purple-400/80 mt-1 flex items-center gap-1">
                  <span>Teacher signed & verified</span>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Cohort Average Score</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mt-3">
                  {stats?.avg_score ?? 0}%
                </div>
                <div className="text-xs text-amber-400/80 mt-1 flex items-center gap-1">
                  <span>Normalized criteria weighting</span>
                </div>
              </div>
            </div>

            {/* AICOS-Style 3-Stage Pipeline Visualizer */}
            <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    Automated Exam Evaluation Pipeline (AICOS Protocol)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    End-to-end examination pipeline: From OCR & Scanned paper ingestion to AI evaluation and teacher moderation.
                  </p>
                </div>
                <button
                  onClick={() => setShowUploadSheets(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <UploadCloud className="w-4 h-4 text-indigo-400" />
                  Upload Batch Answer Sheets
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Stage 1: Multi-Format Ingestion</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Accepts scanned answer sheet images (.png, .jpg), handwritten PDFs, and source code files.
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      OCR & Text Extractor Active
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Stage 2: AI Rubric Auto-Grading</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Matches criteria with NLP-free heuristics, detects question sections, and derives point confidence.
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      100% Local / Zero API Cost
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Stage 3: Teacher Review & Canvas</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Side-by-side answer sheet preview, question-level score overrides, feedback entry, and grade publishing.
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Full Human-in-the-Loop Control
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Examination List */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Current Active Examinations</h3>
                  <p className="text-xs text-slate-400">Click any exam to enter its evaluation pipeline dashboard</p>
                </div>
                <button
                  onClick={() => setActiveTab('exams')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  View All Exams <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {exams.map(ex => (
                  <div
                    key={ex.id}
                    onClick={() => { setSelectedExamId(ex.id); setActiveTab('exams'); }}
                    className="group bg-slate-950/60 hover:bg-slate-900 border border-slate-800/90 hover:border-indigo-500/40 rounded-xl p-5 cursor-pointer transition-all duration-200 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {ex.class_section || 'General'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        ex.status === 'Published'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : ex.status === 'Evaluating'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}>
                        {ex.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white mt-3 group-hover:text-indigo-300 transition">
                      {ex.title}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                      <span>Total Marks: {ex.total_marks}</span>
                      <span>•</span>
                      <span>Duration: {ex.duration_minutes}m</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                        <span>Evaluation Progress</span>
                        <span className="font-bold text-slate-200">
                          {ex.graded_count} / {ex.submission_count} Scripts
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${ex.submission_count ? (ex.graded_count / ex.submission_count) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================= EXAMS & ASSESSMENTS TAB ======================= */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            {!selectedExamId ? (
              // List of all exams
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Examination & Assessment Hub</h2>
                    <p className="text-xs text-slate-400">Manage exam schedules, paper uploads, and student score evaluation</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowUploadSheets(true)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <UploadCloud className="w-4 h-4 text-indigo-400" />
                      Upload Answer Sheets
                    </button>
                    <button
                      onClick={() => setShowCreateExam(true)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Exam
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {exams.map(ex => (
                    <div
                      key={ex.id}
                      className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {ex.class_section || 'Exam'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            ex.status === 'Published'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : ex.status === 'Evaluating'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}>
                            {ex.status}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-white leading-snug">
                          {ex.title}
                        </h3>

                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                          {ex.rubric ? ex.rubric.split('\n')[0] : 'No rubric configured'}
                        </p>

                        <div className="grid grid-cols-3 gap-2 my-4 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-center">
                          <div>
                            <div className="text-[10px] text-slate-400">Total Marks</div>
                            <div className="text-sm font-bold text-white mt-0.5">{ex.total_marks}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">Duration</div>
                            <div className="text-sm font-bold text-white mt-0.5">{ex.duration_minutes}m</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">Avg Score</div>
                            <div className="text-sm font-bold text-indigo-400 mt-0.5">{ex.avg_score ?? '—'}%</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Evaluation Status</span>
                          <span className="font-semibold text-slate-200">
                            {ex.graded_count}/{ex.submission_count} Graded
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            style={{
                              width: `${ex.submission_count ? (ex.graded_count / ex.submission_count) * 100 : 0}%`,
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => setSelectedExamId(ex.id)}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-1"
                          >
                            Open Dashboard
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Dedicated Exam Dashboard & Pipeline View
              <div className="space-y-5">
                {/* Exam Header */}
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedExamId(null)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {selectedExamDetail?.class_section}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">{selectedExamDetail?.course_name}</span>
                      </div>
                      <h2 className="text-lg font-bold text-white mt-1">
                        {selectedExamDetail?.title}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleBatchAutoGrade(selectedExamId)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Run Batch Auto-Grade (OCR)
                    </button>
                    <button
                      onClick={() => { setBatchExamId(selectedExamId); setShowUploadSheets(true); }}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <UploadCloud className="w-4 h-4 text-indigo-400" />
                      Upload Sheets
                    </button>
                  </div>
                </div>

                {/* Submissions & Review Queue Table */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Student Answer Sheets ({selectedExamDetail?.submissions?.length ?? 0})</h3>
                      <p className="text-xs text-slate-400">Click 'Review & Moderate' to enter side-by-side evaluation canvas</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-5 py-3.5">Student Name</th>
                          <th className="px-5 py-3.5">File & Format</th>
                          <th className="px-5 py-3.5">AI Evaluated Score</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5">Teacher Moderation</th>
                          <th className="px-5 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {selectedExamDetail?.submissions?.map((sub: any) => (
                          <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                            <td className="px-5 py-4 font-semibold text-white flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-400">
                                {sub.student_name.charAt(0)}
                              </div>
                              {sub.student_name}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                {sub.mime_type.includes('image') ? (
                                  <ImageIcon className="w-4 h-4 text-amber-400" />
                                ) : sub.mime_type.includes('pdf') ? (
                                  <FileText className="w-4 h-4 text-red-400" />
                                ) : (
                                  <FileCode className="w-4 h-4 text-indigo-400" />
                                )}
                                <span className="truncate max-w-[180px]">{sub.file_path.split('/').pop()}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {sub.score !== null ? (
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span className="text-sm">{sub.score}</span>
                                  <span className="text-slate-500 font-normal">/ {sub.max_score}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">Pending Grading</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                sub.is_published || sub.status === 'Approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : sub.score !== null
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}>
                                {sub.is_published ? 'Published' : sub.score !== null ? 'AI Graded' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs">
                              {sub.moderator_score !== null && sub.moderator_score !== undefined ? (
                                <div className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Verified: {sub.moderator_score} pts
                                </div>
                              ) : (
                                <span className="text-slate-500">Needs Review</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => openReviewCanvas(sub.id)}
                                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold rounded-lg border border-indigo-500/30 transition flex items-center gap-1.5 ml-auto"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Review & Moderate
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= COURSES & RUBRICS TAB ======================= */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Academic Courses & Grading Rubrics</h2>
                <p className="text-xs text-slate-400">Manage courses and define custom multi-criteria scoring rubrics</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateCourse(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  New Course
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {courses.map(c => (
                <div key={c.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-white">{c.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">{c.description || 'No description provided'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-700">
                      ID: #{c.id}
                    </span>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      Active Assignments: {assignments.filter(a => a.course_id === c.id).length}
                    </span>
                    <button
                      onClick={() => { setNewAssCourseId(c.id); setShowCreateAssignment(true); }}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Assignment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================= INSTANT OCR QUICK-GRADE TAB ======================= */}
        {activeTab === 'quick-grade' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Instant Paper & Code Auto-Grader
              </h2>
              <p className="text-xs text-slate-400">
                Upload a student's answer sheet (.png, .jpg, .pdf) or code script (.py, .js) for instant heuristic & OCR evaluation
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Student Name</label>
                <input
                  type="text"
                  placeholder="e.g. Liam Smith"
                  value={quickStudentName}
                  onChange={e => setQuickStudentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Grading Rubric / Criteria
                </label>
                <textarea
                  rows={4}
                  value={quickRubric}
                  onChange={e => setQuickRubric(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Correctness: 40 points&#10;Algorithm Logic: 40 points&#10;Clean Code: 20 points"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Answer Sheet File (Image OCR, PDF, or Code)
                </label>
                <input
                  type="file"
                  onChange={e => setQuickFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>

              <button
                onClick={handleQuickGrade}
                disabled={isQuickGrading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
              >
                {isQuickGrading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Extracting OCR & Evaluating Heuristics...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Local Auto-Grade
                  </>
                )}
              </button>
            </div>

            {/* Quick Grade Result Output */}
            {quickGradeResult && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400">Evaluation Report for</span>
                    <h3 className="font-bold text-base text-white">{quickStudentName}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-white">
                      {quickGradeResult.total_score} / {quickGradeResult.max_score}
                    </span>
                    <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Grade: {quickGradeResult.letter_grade} ({quickGradeResult.percentage}%)
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300">Criteria Breakdown:</h4>
                  {quickGradeResult.criteria_results?.map((cr: any, i: number) => (
                    <div key={i} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs font-semibold text-white">
                        <span>{cr.name}</span>
                        <span className="text-indigo-400 font-bold">{cr.earned_points} / {cr.max_points} pts</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {cr.evidence?.map((ev: string, evIdx: number) => (
                          <div key={evIdx} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                            <span className="text-emerald-400">•</span>
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* SIDE-BY-SIDE EVALUATION & REVIEW CANVAS (AICOS / EVALDESK STYLE MODERATION) */}
      {/* ========================================================================= */}
      {canvasSubmissionId && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          {/* Top Canvas Bar */}
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                {canvasDetail?.student_name.charAt(0) || 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{canvasDetail?.student_name}</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                    canvasDetail?.is_published
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  }`}>
                    {canvasDetail?.is_published ? 'Approved & Published' : 'In Review'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Script File: {canvasDetail?.file_name} • Format: {canvasDetail?.mime_type}
                </span>
              </div>
            </div>

            {/* Total Marks Banner */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Score</span>
                <span className="text-lg font-bold text-white">
                  {editableCriteria.reduce((sum, c) => sum + (c.earned_points || 0), 0)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ {canvasDetail?.max_score}</span>
                </span>
              </div>

              <div className="h-6 w-px bg-slate-800" />

              <button
                onClick={() => handleSaveModeration(false)}
                disabled={isSavingModeration}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
              >
                Save Draft
              </button>

              <button
                onClick={() => handleSaveModeration(true)}
                disabled={isSavingModeration}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" />
                Approve & Publish Grade
              </button>

              <button
                onClick={closeReviewCanvas}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2-Column Split View: Left Canvas vs Right Question Breakdown */}
          <div className="flex-1 grid grid-cols-12 overflow-hidden">
            {/* Left Column: Answer Sheet / Submitted Script Canvas */}
            <div className="col-span-7 border-r border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
              {/* Canvas Controls Header */}
              <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  Answer Sheet Document Preview
                </span>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono px-2 text-slate-300">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Canvas Content Body */}
              <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950/80">
                {canvasDetail?.is_image ? (
                  <div
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                    className="transition-transform duration-100 shadow-2xl rounded-lg border border-slate-800 overflow-hidden"
                  >
                    <img
                      src={`${API}/submissions/${canvasDetail.id}/file`}
                      alt="Student Answer Sheet"
                      className="max-w-2xl w-full h-auto object-contain bg-white"
                    />
                  </div>
                ) : (
                  // Syntax-highlighted code / text viewer
                  <div
                    style={{ fontSize: `${(zoomLevel / 100) * 12}px` }}
                    className="w-full h-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-auto font-mono text-slate-200 leading-relaxed shadow-xl"
                  >
                    <div className="text-[10px] text-slate-500 pb-3 mb-3 border-b border-slate-800 flex justify-between">
                      <span>{canvasDetail?.file_name}</span>
                      <span>UTF-8 Document / Script</span>
                    </div>
                    <pre className="whitespace-pre-wrap">{canvasDetail?.file_content}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Question-by-Question Grading & Moderation */}
            <div className="col-span-5 bg-slate-900/40 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Question-Wise Evaluation & Rubric Scores
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Adjust earned points directly; total score recalculates automatically.
                  </p>
                </div>
              </div>

              {/* Question Breakdown List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {editableCriteria.map((crit, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                          Criterion {idx + 1}
                        </span>
                        <h4 className="font-bold text-xs text-white mt-0.5">{crit.name}</h4>
                      </div>

                      {/* Interactive Score Adjustment Input */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={crit.max_points}
                          value={crit.earned_points}
                          onChange={e => handleScoreChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-12 bg-transparent text-right font-bold text-sm text-emerald-400 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-semibold">/ {crit.max_points}</span>
                      </div>
                    </div>

                    {/* AI Confidence & Percentage */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${crit.percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {crit.percentage}% match
                      </span>
                    </div>

                    {/* Evidence & Remarks */}
                    {crit.evidence && crit.evidence.length > 0 && (
                      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Evidence Found in Script:
                        </span>
                        {crit.evidence.map((ev, evI) => (
                          <div key={evI} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                            <span className="text-emerald-400 shrink-0">•</span>
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {crit.remarks && (
                      <p className="text-[11px] text-slate-400 italic">
                        Remark: {crit.remarks}
                      </p>
                    )}
                  </div>
                ))}

                {/* Teacher Moderation Notes */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-slate-300">
                    Teacher / Examiner Feedback Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={moderatorNotes}
                    onChange={e => setModeratorNotes(e.target.value)}
                    placeholder="Enter personalized feedback or commendations for this student..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= CREATE EXAM MODAL ======================= */}
      {showCreateExam && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Create New Examination</h3>
              <button onClick={() => setShowCreateExam(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Exam Title</label>
              <input
                type="text"
                placeholder="e.g. Midterm Assessment 2026"
                value={newExamTitle}
                onChange={e => setNewExamTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Course</label>
                <select
                  value={newExamCourseId}
                  onChange={e => setNewExamCourseId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Class / Section</label>
                <input
                  type="text"
                  value={newExamClass}
                  onChange={e => setNewExamClass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Total Marks</label>
                <input
                  type="number"
                  value={newExamTotalMarks}
                  onChange={e => setNewExamTotalMarks(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={newExamDuration}
                  onChange={e => setNewExamDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Evaluation Rubric</label>
              <textarea
                rows={3}
                value={newExamRubric}
                onChange={e => setNewExamRubric(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateExam(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExam}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
              >
                Create Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= BATCH UPLOAD SHEETS MODAL ======================= */}
      {showUploadSheets && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Batch Upload Answer Sheets</h3>
              <button onClick={() => setShowUploadSheets(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Examination</label>
              <select
                value={batchExamId}
                onChange={e => setBatchExamId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Choose Exam...</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Upload Scanned Answer Sheets (.pdf, .png, .jpg, code)
              </label>
              <input
                type="file"
                multiple
                onChange={e => setBatchFiles(e.target.files)}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Student Names (optional comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Aarav Patel, Priya Sen, Kabir Mehta"
                value={batchNames}
                onChange={e => setBatchNames(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowUploadSheets(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSheets}
                disabled={isBatchUploading}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
              >
                {isBatchUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                Upload Sheets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= CREATE COURSE MODAL ======================= */}
      {showCreateCourse && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Create New Course</h3>
              <button onClick={() => setShowCreateCourse(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Course Title</label>
              <input
                type="text"
                placeholder="e.g. CS301: Advanced Algorithms"
                value={newCourseTitle}
                onChange={e => setNewCourseTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                rows={3}
                value={newCourseDesc}
                onChange={e => setNewCourseDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateCourse(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newCourseTitle.trim()) return;
                  await fetch(`${API}/courses`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newCourseTitle, description: newCourseDesc }),
                  });
                  setNewCourseTitle('');
                  setNewCourseDesc('');
                  setShowCreateCourse(false);
                  fetchAll();
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
              >
                Create Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
