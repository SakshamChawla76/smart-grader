import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const API = 'http://127.0.0.1:8000/api';

interface Course { id: number; title: string; description?: string; instructor_id: number; }
interface Assignment { id: number; title: string; description?: string; rubric?: string; due_date?: string; course_id: number; }
interface Submission { id: number; student_name: string; assignment_id: number; file_path: string; mime_type: string; submitted_at: string; score: number | null; feedback: string | null; status: string; }
interface Stats { course_count: number; assignment_count: number; total_submissions: number; graded_submissions: number; pending_submissions: number; avg_score: number; }
interface CriterionResult { name: string; earned_points: number; max_points: number; percentage: number; evidence: string[]; }
interface GradeResult { success: boolean; submission_id: number; total_score: number; max_score: number; percentage: number; letter_grade: string; criteria_results: CriterionResult[]; feedback_md: string; }

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Grading state
  const [file, setFile] = useState<File | null>(null);
  const [rubric, setRubric] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | ''>('');
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create Course modal
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  // Create Assignment modal
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [newAssTitle, setNewAssTitle] = useState('');
  const [newAssDesc, setNewAssDesc] = useState('');
  const [newAssRubric, setNewAssRubric] = useState('');
  const [newAssCourseId, setNewAssCourseId] = useState<number | ''>('');
  const [newAssDueDate, setNewAssDueDate] = useState('');

  // Viewing submission detail
  const [viewingSub, setViewingSub] = useState<Submission | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cRes, aRes, sRes, stRes] = await Promise.all([
        fetch(`${API}/courses`), fetch(`${API}/assignments`),
        fetch(`${API}/submissions`), fetch(`${API}/stats`),
      ]);
      if (cRes.ok) setCourses(await cRes.json());
      if (aRes.ok) setAssignments(await aRes.json());
      if (sRes.ok) setSubmissions(await sRes.json());
      if (stRes.ok) setStats(await stRes.json());
    } catch (e) { console.error(e); }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getCourseName = (courseId: number) => courses.find(c => c.id === courseId)?.title || '—';

  // ── Handlers ──
  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim()) return;
    await fetch(`${API}/courses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newCourseTitle, description: newCourseDesc }) });
    setNewCourseTitle(''); setNewCourseDesc(''); setShowCreateCourse(false); fetchAll();
  };

  const handleCreateAssignment = async () => {
    if (!newAssTitle.trim() || !newAssCourseId) return;
    await fetch(`${API}/assignments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newAssTitle, description: newAssDesc, rubric: newAssRubric, course_id: newAssCourseId, due_date: newAssDueDate || null }) });
    setNewAssTitle(''); setNewAssDesc(''); setNewAssRubric(''); setNewAssCourseId(''); setNewAssDueDate(''); setShowCreateAssignment(false); fetchAll();
  };

  const handleGrade = async () => {
    if (!file || !rubric.trim() || !studentName.trim() || !selectedAssignmentId) { alert('Fill in all fields.'); return; }
    setIsGrading(true); setGradeResult(null);
    const fd = new FormData();
    fd.append('file', file); fd.append('rubric', rubric);
    fd.append('student_name', studentName); fd.append('assignment_id', selectedAssignmentId.toString());
    try {
      const res = await fetch(`${API}/grade`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) { setGradeResult(data); fetchAll(); }
      else alert('Grading failed: ' + (data.detail || 'Unknown error'));
    } catch { alert('Network error or server down.'); }
    setIsGrading(false);
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Delete this course and all its assignments?')) return;
    await fetch(`${API}/courses/${id}`, { method: 'DELETE' }); fetchAll();
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm('Delete this assignment?')) return;
    await fetch(`${API}/assignments/${id}`, { method: 'DELETE' }); fetchAll();
  };

  // ── Tab Icons ──
  const tabIcons: Record<string, string> = {
    dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    courses: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    assignments: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    grading: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    submissions: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  };

  // ── Shared Components ──
  const Modal = ({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  const Input = ({ label, value, onChange, placeholder, type = 'text' }: any) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      <input type={type} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
    </div>
  );

  const TextArea = ({ label, value, onChange, placeholder, rows = 3 }: any) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      <textarea value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none" />
    </div>
  );

  const gradeColor = (pct: number) => pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400';
  const gradeBg = (pct: number) => pct >= 70 ? 'from-emerald-500/20 to-emerald-500/5' : pct >= 40 ? 'from-amber-500/20 to-amber-500/5' : 'from-red-500/20 to-red-500/5';

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-64 backdrop-blur-xl bg-primary/10 border-r border-border/50 flex flex-col transition-all duration-300 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/20 flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">SmartGrader</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {Object.keys(tabIcons).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${activeTab === tab ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'}`}>
              {activeTab === tab && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full" />}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tabIcons[tab]} /></svg>
              <span className="capitalize font-medium">{tab}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">SG</div>
            <div><p className="text-sm font-semibold">Instructor</p><p className="text-xs text-muted-foreground">Local Engine</p></div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

        <header className="h-16 flex items-center justify-between px-8 backdrop-blur-md bg-background/50 border-b border-border/30 z-10 shrink-0">
          <h1 className="text-2xl font-bold tracking-tight capitalize">{activeTab}</h1>
        </header>

        <div className="flex-1 overflow-auto p-8 z-10">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* ══════════════════════ DASHBOARD ══════════════════════ */}
            {activeTab === 'dashboard' && stats && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { label: 'Courses', value: stats.course_count, color: 'from-blue-500 to-cyan-400', icon: tabIcons.courses },
                    { label: 'Assignments', value: stats.assignment_count, color: 'from-indigo-500 to-purple-500', icon: tabIcons.assignments },
                    { label: 'Graded', value: stats.graded_submissions, color: 'from-emerald-400 to-teal-500', icon: tabIcons.grading },
                    { label: 'Avg Score', value: `${stats.avg_score}%`, color: 'from-amber-400 to-orange-500', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                  ].map((s, i) => (
                    <div key={i} className="relative group overflow-hidden rounded-2xl bg-card border border-border/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                      <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${s.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
                      <div className="flex justify-between items-start">
                        <div><p className="text-sm text-muted-foreground mb-1">{s.label}</p><h3 className="text-3xl font-bold">{s.value}</h3></div>
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${s.color}`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={s.icon} /></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Recent Submissions</h2>
                    {submissions.length === 0 ? <p className="text-muted-foreground text-sm">No submissions yet. Grade some work in the Grading tab!</p> : (
                      <div className="space-y-3">
                        {submissions.slice(0, 5).map(s => (
                          <div key={s.id} onClick={() => { setViewingSub(s); }} className="flex items-center justify-between p-4 rounded-xl border border-border/30 hover:border-border/80 hover:bg-secondary/20 transition-colors cursor-pointer">
                            <div>
                              <p className="font-semibold">{s.student_name}</p>
                              <p className="text-sm text-muted-foreground">{assignments.find(a => a.id === s.assignment_id)?.title || `Assignment #${s.assignment_id}`}</p>
                            </div>
                            <div className="text-right">
                              {s.score !== null ? (
                                <span className={`text-lg font-bold ${gradeColor(s.score)}`}>{s.score}%</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Pending</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-gradient-to-b from-indigo-900/40 to-card border border-indigo-500/20 p-6 shadow-lg relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full" />
                    <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                      <button onClick={() => setShowCreateCourse(true)} className="w-full flex items-center gap-3 p-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-md transition-all hover:-translate-y-0.5">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        <span className="font-semibold">New Course</span>
                      </button>
                      <button onClick={() => setShowCreateAssignment(true)} className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-indigo-500/50 hover:bg-secondary/50 transition-all">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        <span className="font-medium">New Assignment</span>
                      </button>
                      <button onClick={() => setActiveTab('grading')} className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-indigo-500/50 hover:bg-secondary/50 transition-all">
                        <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-medium">Grade Submissions</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════ COURSES ══════════════════════ */}
            {activeTab === 'courses' && (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">{courses.length} course(s)</p>
                  <button onClick={() => setShowCreateCourse(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    New Course
                  </button>
                </div>
                {courses.length === 0 ? (
                  <div className="rounded-2xl bg-card border border-border/50 p-12 text-center"><p className="text-muted-foreground">No courses yet. Create your first course!</p></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {courses.map(c => {
                      const assCount = assignments.filter(a => a.course_id === c.id).length;
                      return (
                        <div key={c.id} className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm hover:shadow-lg transition-all group">
                          <div className="flex justify-between items-start mb-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">{c.title[0]}</div>
                            <button onClick={() => handleDeleteCourse(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                          <h3 className="text-lg font-semibold mb-1">{c.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{c.description || 'No description'}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="px-2 py-1 rounded-full bg-secondary">{assCount} assignment{assCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ══════════════════════ ASSIGNMENTS ══════════════════════ */}
            {activeTab === 'assignments' && (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">{assignments.length} assignment(s)</p>
                  <button onClick={() => setShowCreateAssignment(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    New Assignment
                  </button>
                </div>
                {assignments.length === 0 ? (
                  <div className="rounded-2xl bg-card border border-border/50 p-12 text-center"><p className="text-muted-foreground">No assignments yet. Create a course first, then add assignments.</p></div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map(a => {
                      const subCount = submissions.filter(s => s.assignment_id === a.id).length;
                      const gradedCount = submissions.filter(s => s.assignment_id === a.id && s.status === 'Graded').length;
                      return (
                        <div key={a.id} className="rounded-xl bg-card border border-border/50 p-5 shadow-sm hover:shadow-lg transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div>
                              <h3 className="font-semibold">{a.title}</h3>
                              <p className="text-sm text-muted-foreground">{getCourseName(a.course_id)} · {subCount} submission{subCount !== 1 ? 's' : ''} · {gradedCount} graded</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {a.due_date && <span className="text-xs text-muted-foreground hidden sm:inline">Due {new Date(a.due_date).toLocaleDateString()}</span>}
                            <button onClick={() => handleDeleteAssignment(a.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ══════════════════════ GRADING ══════════════════════ */}
            {activeTab === 'grading' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">1. Assignment & Student</h2>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Assignment</label>
                      <select value={selectedAssignmentId} onChange={e => {
                        const v = e.target.value ? Number(e.target.value) : '';
                        setSelectedAssignmentId(v);
                        if (v) { const a = assignments.find(a => a.id === v); if (a?.rubric) setRubric(a.rubric); }
                      }} className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                        <option value="">— Select —</option>
                        {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({getCourseName(a.course_id)})</option>)}
                      </select>
                    </div>
                    <Input label="Student Name" value={studentName} onChange={setStudentName} placeholder="e.g. Jane Doe" />
                  </div>

                  <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">2. Upload Submission</h2>
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-indigo-500/50 rounded-xl p-8 text-center hover:bg-indigo-500/5 transition-colors cursor-pointer">
                      <input type="file" ref={fileInputRef} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} accept="*/*" />
                      <svg className="w-10 h-10 text-indigo-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <p className="font-medium">{file ? `📎 ${file.name}` : 'Click to upload (any text/code file)'}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-2">3. Rubric</h2>
                    <p className="text-xs text-muted-foreground mb-3">Format: "Criterion name: points" per line. Auto-populated from assignment if available.</p>
                    <textarea value={rubric} onChange={e => setRubric(e.target.value)} rows={5} placeholder={"Correctness: 40 points\nCode style: 20 points\nDocumentation: 15 points\nError handling: 15 points\nEdge cases: 10 points"}
                      className="w-full bg-secondary/50 border border-border/50 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-mono text-sm" />
                  </div>

                  <button onClick={handleGrade} disabled={isGrading || !file || !rubric || !studentName || !selectedAssignmentId}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg">
                    {isGrading ? <span className="animate-pulse">Grading...</span> : <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Grade Submission</>}
                  </button>
                </div>

                {/* ── Results Panel ── */}
                <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm flex flex-col min-h-[600px]">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Evaluation Results
                  </h2>
                  <div className="flex-1 overflow-auto">
                    {gradeResult ? (
                      <div className="space-y-5">
                        {/* Score Card */}
                        <div className={`rounded-xl bg-gradient-to-r ${gradeBg(gradeResult.percentage)} border border-border/30 p-6 text-center`}>
                          <p className={`text-5xl font-black ${gradeColor(gradeResult.percentage)}`}>{gradeResult.letter_grade}</p>
                          <p className="text-2xl font-bold mt-1">{gradeResult.total_score} / {gradeResult.max_score}</p>
                          <p className="text-muted-foreground">{gradeResult.percentage}%</p>
                        </div>

                        {/* Per-Criterion */}
                        <div className="space-y-3">
                          {gradeResult.criteria_results.map((cr, i) => (
                            <div key={i} className="rounded-xl border border-border/30 p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-sm">{cr.name}</span>
                                <span className={`font-bold text-sm ${gradeColor(cr.percentage)}`}>{cr.earned_points}/{cr.max_points}</span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-2 mb-2">
                                <div className={`h-2 rounded-full transition-all duration-500 ${cr.percentage >= 70 ? 'bg-emerald-500' : cr.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${cr.percentage}%` }} />
                              </div>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {cr.evidence.map((ev, j) => <li key={j}>{ev}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p>Upload a submission and click "Grade" to see results</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════ SUBMISSIONS ══════════════════════ */}
            {activeTab === 'submissions' && (
              <>
                <p className="text-muted-foreground">{submissions.length} submission(s) total</p>
                {submissions.length === 0 ? (
                  <div className="rounded-2xl bg-card border border-border/50 p-12 text-center"><p className="text-muted-foreground">No submissions graded yet.</p></div>
                ) : (
                  <div className="rounded-2xl bg-card border border-border/50 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border/50 bg-secondary/30">
                        <th className="text-left p-4 font-semibold">Student</th>
                        <th className="text-left p-4 font-semibold">Assignment</th>
                        <th className="text-left p-4 font-semibold">Date</th>
                        <th className="text-left p-4 font-semibold">Score</th>
                        <th className="text-left p-4 font-semibold">Status</th>
                      </tr></thead>
                      <tbody>
                        {submissions.map(s => (
                          <tr key={s.id} className="border-b border-border/20 hover:bg-secondary/20 cursor-pointer transition-colors" onClick={() => setViewingSub(s)}>
                            <td className="p-4 font-medium">{s.student_name}</td>
                            <td className="p-4 text-muted-foreground">{assignments.find(a => a.id === s.assignment_id)?.title || '#' + s.assignment_id}</td>
                            <td className="p-4 text-muted-foreground">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}</td>
                            <td className="p-4"><span className={`font-bold ${s.score !== null ? gradeColor(s.score) : ''}`}>{s.score !== null ? `${s.score}%` : '—'}</span></td>
                            <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs ${s.status === 'Graded' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{s.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </main>

      {/* ── Modals ── */}
      <Modal show={showCreateCourse} onClose={() => setShowCreateCourse(false)} title="Create Course">
        <Input label="Course Title" value={newCourseTitle} onChange={setNewCourseTitle} placeholder="e.g. Introduction to Computer Science" />
        <Input label="Description" value={newCourseDesc} onChange={setNewCourseDesc} placeholder="e.g. CS101 Fall 2026" />
        <button onClick={handleCreateCourse} className="w-full p-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-all">Create Course</button>
      </Modal>

      <Modal show={showCreateAssignment} onClose={() => setShowCreateAssignment(false)} title="Create Assignment">
        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Course</label>
          <select value={newAssCourseId} onChange={e => setNewAssCourseId(e.target.value ? Number(e.target.value) : '')} className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
            <option value="">— Select Course —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <Input label="Title" value={newAssTitle} onChange={setNewAssTitle} placeholder="e.g. Midterm Exam" />
        <Input label="Description" value={newAssDesc} onChange={setNewAssDesc} placeholder="Describe the assignment" />
        <TextArea label="Rubric (one criterion per line)" value={newAssRubric} onChange={setNewAssRubric} placeholder={"Correctness: 40 points\nCode style: 20 points\nDocumentation: 20 points\nEdge cases: 20 points"} rows={5} />
        <Input label="Due Date" value={newAssDueDate} onChange={setNewAssDueDate} type="datetime-local" placeholder="" />
        <button onClick={handleCreateAssignment} className="w-full p-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-all">Create Assignment</button>
      </Modal>

      {/* Submission Detail Modal */}
      <Modal show={!!viewingSub} onClose={() => setViewingSub(null)} title={`Submission: ${viewingSub?.student_name || ''}`}>
        {viewingSub && (
          <div className="space-y-3">
            <p><strong>Assignment:</strong> {assignments.find(a => a.id === viewingSub.assignment_id)?.title}</p>
            <p><strong>Submitted:</strong> {viewingSub.submitted_at ? new Date(viewingSub.submitted_at).toLocaleString() : '—'}</p>
            <p><strong>Score:</strong> <span className={`font-bold ${viewingSub.score !== null ? gradeColor(viewingSub.score) : ''}`}>{viewingSub.score !== null ? `${viewingSub.score}%` : 'Pending'}</span></p>
            <p><strong>Status:</strong> {viewingSub.status}</p>
            {viewingSub.feedback && (
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 max-h-72 overflow-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">{viewingSub.feedback}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;
