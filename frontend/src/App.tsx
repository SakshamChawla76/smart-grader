import { useState, useRef, useEffect } from 'react';
import './App.css';

interface Assignment {
  id: number;
  title: string;
  course_id: number;
  due_date: string;
  status?: string;
  progress?: number;
}

interface Course {
  id: number;
  title: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [file, setFile] = useState<File | null>(null);
  const [rubric, setRubric] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | ''>('');
  const [gradingResult, setGradingResult] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch data on mount
    const fetchData = async () => {
      try {
        const [assignmentsRes, coursesRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/assignments'),
          fetch('http://127.0.0.1:8000/api/courses')
        ]);
        if (assignmentsRes.ok) {
          const data = await assignmentsRes.json();
          // add mock progress and status
          setAssignments(data.map((a: any) => ({...a, progress: Math.floor(Math.random() * 100), status: 'Grading'})));
        }
        if (coursesRes.ok) {
          setCourses(await coursesRes.json());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGrade = async () => {
    if (!file || !rubric || !studentName || !selectedAssignmentId) {
      alert("Please fill in all fields (Student Name, Assignment, File, and Rubric).");
      return;
    }
    
    setIsGrading(true);
    setGradingResult('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('rubric', rubric);
    formData.append('student_name', studentName);
    formData.append('assignment_id', selectedAssignmentId.toString());
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/grade', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.success) {
        setGradingResult(data.grading_result);
      } else {
        setGradingResult("Error: " + data.detail);
      }
    } catch (error) {
      setGradingResult("Network error or server down.");
    } finally {
      setIsGrading(false);
    }
  };

  const getCourseName = (courseId: number) => {
    return courses.find(c => c.id === courseId)?.title || 'Unknown Course';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden font-sans">
      
      {/* Sidebar - Glassmorphism */}
      <aside className="w-64 backdrop-blur-xl bg-primary/10 border-r border-border/50 flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/20 flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">SmartGrader</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {['dashboard', 'courses', 'assignments', 'grading', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                activeTab === tab 
                  ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
              }`}
            >
              {activeTab === tab && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full" />
              )}
              <span className="capitalize font-medium z-10">{tab}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                <img src="https://i.pravatar.cc/150?img=11" alt="User" className="w-full h-full object-cover opacity-90" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">Instructor</p>
              <p className="text-xs text-muted-foreground">Premium Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Background glow effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 backdrop-blur-md bg-background/50 border-b border-border/30 z-10">
          <h1 className="text-2xl font-bold tracking-tight capitalize">{activeTab}</h1>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <svg className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="pl-10 pr-4 py-2 bg-secondary/50 border border-border/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all w-64 backdrop-blur-sm"
              />
            </div>
            <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-background"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-8 z-10 scrollbar-hide">
          
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Dashboard Content */}
            {activeTab === 'dashboard' && (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Active Courses', value: courses.length.toString(), icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'from-blue-500 to-cyan-400' },
                    { label: 'Pending Grades', value: '12', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'from-indigo-500 to-purple-500' },
                    { label: 'Assignments', value: assignments.length.toString(), icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'from-emerald-400 to-teal-500' },
                  ].map((stat, i) => (
                    <div key={i} className="relative group overflow-hidden rounded-2xl bg-card border border-border/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                          <h3 className="text-3xl font-bold tracking-tight">{isLoading ? '...' : stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-10 backdrop-blur-sm`}>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon}></path></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Dashboard Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  <div className="lg:col-span-2 rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold">Recent Assignments</h2>
                      <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View all</button>
                    </div>
                    
                    <div className="space-y-4">
                      {isLoading ? (
                        <div className="text-center py-4 text-muted-foreground animate-pulse">Loading assignments...</div>
                      ) : assignments.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">No assignments found.</div>
                      ) : assignments.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/30 hover:border-border/80 hover:bg-secondary/20 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
                              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <div>
                              <h4 className="font-semibold">{item.title}</h4>
                              <p className="text-sm text-muted-foreground">{getCourseName(item.course_id)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                              <p className="text-sm font-medium">{item.status}</p>
                              <p className="text-xs text-muted-foreground">{new Date(item.due_date).toLocaleDateString()}</p>
                            </div>
                            
                            <div className="w-16 h-16 relative flex items-center justify-center">
                              <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path className="text-secondary stroke-current" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="text-indigo-500 stroke-current drop-shadow-md" strokeWidth="3" strokeDasharray={`${item.progress || 0}, 100`} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              </svg>
                              <span className="absolute text-xs font-semibold">{item.progress || 0}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Panel */}
                  <div className="rounded-2xl bg-gradient-to-b from-indigo-900/40 to-card border border-indigo-500/20 p-6 shadow-lg shadow-indigo-500/5 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full" />
                    
                    <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
                    
                    <div className="space-y-4">
                      <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        <span className="font-semibold">Create Assignment</span>
                      </button>
                      
                      <button className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-indigo-500/50 hover:bg-secondary/50 transition-all">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <span className="font-medium">Batch Upload Submissions</span>
                      </button>

                      <button className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-indigo-500/50 hover:bg-secondary/50 transition-all">
                        <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        <span className="font-medium">Train AI Model</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Grading Tab Content */}
            {activeTab === 'grading' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Panel: Input */}
                <div className="space-y-6">
                  <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">1. Select Assignment & Student</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Assignment</label>
                        <select 
                          className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          value={selectedAssignmentId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedAssignmentId(val ? Number(val) : '');
                            const assignment = assignments.find(a => a.id === Number(val));
                            if (assignment && assignment.rubric && !rubric) {
                               // Optional: prepopulate rubric if assignment has one (we don't get rubric back from API list currently, but we could)
                            }
                          }}
                        >
                          <option value="">-- Select an Assignment --</option>
                          {assignments.map(a => (
                            <option key={a.id} value={a.id}>{a.title} ({getCourseName(a.course_id)})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Student Name</label>
                        <input 
                          type="text" 
                          placeholder="E.g., Jane Doe"
                          className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">2. Upload Submission</h2>
                    <div 
                      className="border-2 border-dashed border-indigo-500/50 rounded-xl p-8 text-center hover:bg-indigo-500/5 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        accept="image/*,application/pdf,.txt,.py,.js"
                      />
                      <svg className="w-12 h-12 text-indigo-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                      <p className="font-medium">{file ? file.name : "Click to upload a file (PDF, TXT, Code, Image)"}</p>
                      <p className="text-sm text-muted-foreground mt-1">Supported formats: PDF, TXT, PNG, JPG, PY, JS</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">3. Define/Verify Rubric</h2>
                    <textarea 
                      className="w-full h-32 bg-secondary/50 border border-border/50 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                      placeholder="E.g., 10 points for correctness, 5 points for code style..."
                      value={rubric}
                      onChange={(e) => setRubric(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={handleGrade}
                    disabled={isGrading || !file || !rubric || !studentName || !selectedAssignmentId}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isGrading ? (
                      <span className="animate-pulse">Analyzing with Local Grader...</span>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Run Local Grader
                      </>
                    )}
                  </button>
                </div>

                {/* Right Panel: Output */}
                <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm h-full min-h-[600px] flex flex-col">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Evaluation Result
                  </h2>
                  
                  <div className="flex-1 bg-secondary/30 rounded-xl p-6 border border-border/50 overflow-auto">
                    {gradingResult ? (
                      <div className="prose prose-invert max-w-none">
                        <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{gradingResult}</div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <p>Results will appear here after grading.</p>
                      </div>
                    )}
                  </div>
                </div>
                
              </div>
            )}

            {/* Placeholder for other tabs */}
            {['courses', 'assignments', 'settings'].includes(activeTab) && (
              <div className="rounded-2xl bg-card border border-border/50 p-12 text-center shadow-sm">
                <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                <h2 className="text-2xl font-semibold mb-2 capitalize">{activeTab}</h2>
                <p className="text-muted-foreground">This section is under construction. Check back soon!</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
