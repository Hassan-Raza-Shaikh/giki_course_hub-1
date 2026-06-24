import React, { useState, useEffect, useMemo, Component } from 'react';
import { Plus, X, Save, Info, Loader2, Trash2, ArrowRight, Calculator, BookOpen } from 'lucide-react';
import api from '../services/api';
import coursesData from '../data/giki_courses_with_codes.json';
import { useToast } from '../components/Toast';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '120px 20px', maxWidth: '900px', margin: '0 auto', color: 'red' }}>
          <h2>Something went wrong in GPA Calculator.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.info && this.state.info.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

const GRADING_SCALE = [
  { grade: 'A', points: 4.00 },
  { grade: 'A-', points: 3.67 },
  { grade: 'B+', points: 3.33 },
  { grade: 'B', points: 3.00 },
  { grade: 'B-', points: 2.67 },
  { grade: 'C+', points: 2.33 },
  { grade: 'C', points: 2.00 },
  { grade: 'C-', points: 1.67 },
  { grade: 'D+', points: 1.33 },
  { grade: 'D', points: 1.00 },
  { grade: 'F', points: 0.00 },
];

export default function GpaCalculatorWrapper(props) {
  return (
    <ErrorBoundary>
      <GpaCalculator {...props} />
    </ErrorBoundary>
  );
}

function GpaCalculator({ user }) {
  const toast = useToast();

  // Selection state
  const [faculty, setFaculty] = useState('');
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('');

  // Course & calculator state
  const [courses, setCourses] = useState([]);
  const [visibleNames, setVisibleNames] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Custom course form
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCH, setNewCourseCH] = useState(3);

  // Network state
  const [isSaving, setIsSaving] = useState(false);
  const [savedRecords, setSavedRecords] = useState([]);
  const [cgpaData, setCgpaData] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [gpaPublic, setGpaPublic] = useState(user?.gpaPublic || false);

  // Sync gpaPublic state if user object updates
  useEffect(() => {
    if (user && user.gpaPublic !== undefined) setGpaPublic(user.gpaPublic);
  }, [user]);

  const fetchRecords = () => {
    if (!user) return;
    setLoadingRecords(true);
    api.get('/gpa/records')
      .then(res => {
        if (res.data.success) {
          setSavedRecords(res.data.records);
          setCgpaData(res.data);
        }
      })
      .catch(err => console.error("Failed to load GPA records", err))
      .finally(() => setLoadingRecords(false));
  };

  // Load user's saved records on mount
  useEffect(() => {
    fetchRecords();
  }, [user]);

  // When faculty/program/semester changes, load courses
  useEffect(() => {
    if (!faculty || !program || !semester) {
      setCourses([]);
      return;
    }

    // 1. Check if user has a saved record for this exact combo
    const savedRecord = savedRecords.find(
      r => r.faculty === faculty && r.program === program && r.semester === parseInt(semester)
    );

    if (savedRecord) {
      try {
        const parsedCourses = typeof savedRecord.courses === 'string' 
          ? JSON.parse(savedRecord.courses) 
          : savedRecord.courses;
        setCourses(Array.isArray(parsedCourses) ? parsedCourses : []);
      } catch (e) {
        console.error("Failed to parse courses", e);
        setCourses([]);
      }
      return;
    }

    // 2. Otherwise load defaults from JSON
    const facData = coursesData.faculties.find(f => f.faculty_name === faculty);
    if (facData) {
      const progData = facData.programs.find(p => p.program_name === program);
      if (progData) {
        const semData = progData.semesters.find(s => s.semester === parseInt(semester));
        if (semData && semData.courses) {
          const defaultCourses = semData.courses.map((c, i) => ({
            id: `preset_${c.code}_${i}_${Date.now()}`,
            name: c.name,
            code: c.code,
            creditHours: parseInt(c.ch) || 3,
            grade: 'A',
            isCustom: false
          }));
          setCourses(defaultCourses);
          return;
        }
      }
    }
    
    // If no default data exists for this semester
    setCourses([]);
  }, [faculty, program, semester, savedRecords]);

  // Close course name tooltips on global click
  useEffect(() => {
    const handleGlobalClick = () => setVisibleNames({});
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Dropdowns dependent logic
  const availablePrograms = useMemo(() => {
    const facData = coursesData.faculties.find(f => f.faculty_name === faculty);
    return facData ? facData.programs.map(p => p.program_name) : [];
  }, [faculty]);

  const availableSemesters = useMemo(() => {
    const facData = coursesData.faculties.find(f => f.faculty_name === faculty);
    if (!facData) return [];
    const progData = facData.programs.find(p => p.program_name === program);
    return progData ? progData.semesters.map(s => s.semester).sort((a,b) => a - b) : [];
  }, [faculty, program]);


  // Calculator Actions
  const handleGradeChange = (id, newGrade) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, grade: newGrade } : c));
  };
  
  const handleCHChange = (id, newCH) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, creditHours: parseInt(newCH) } : c));
  };

  const removeCourse = (id) => {
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  const toggleNameVisibility = (e, id) => {
    e.stopPropagation();
    setVisibleNames(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addCourse = (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    
    const newCourse = {
      id: `custom_${Date.now()}`,
      name: newCourseName,
      code: newCourseCode.trim() || 'Custom',
      creditHours: parseInt(newCourseCH),
      grade: 'A',
      isCustom: true
    };
    
    setCourses([...courses, newCourse]);
    setNewCourseName('');
    setNewCourseCode('');
    setNewCourseCH(3);
    setShowAddForm(false);
  };

  const saveRecord = async () => {
    if (!user) {
      toast.error("You must be logged in to save GPA records.");
      return;
    }
    if (!faculty || !program || !semester || courses.length === 0) {
      toast.error("Incomplete plan. Select faculty, program, semester and add courses.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. First ensure the privacy preference is saved
      await api.patch('/me/profile', { gpaPublic });

      // 2. Save the GPA record
      const payload = {
        faculty,
        program,
        semester: parseInt(semester),
        gpa: parseFloat(gpa),
        total_credits: totalCH,
        courses
      };
      
      const res = await api.post('/gpa/save', payload);
      if (res.data.success) {
        toast.success("GPA Record saved successfully to your profile!");
        fetchRecords();
      } else {
        toast.error(res.data.message || "Failed to save record.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };


  // Computations
  const totalCH = courses.reduce((sum, c) => sum + Number(c.creditHours), 0);
  const calculateGPA = () => {
    if (courses.length === 0 || totalCH === 0) return "0.00";
    let totalPoints = 0;
    courses.forEach(course => {
      const gradeRule = GRADING_SCALE.find(g => g.grade === course.grade);
      const points = gradeRule ? gradeRule.points : 0;
      totalPoints += (points * course.creditHours);
    });
    return (totalPoints / totalCH).toFixed(2);
  };
  const gpa = calculateGPA();


  return (
    <div className="container" style={{ padding: '120px 20px 100px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{
        background: 'var(--accent)',
        border: '3px solid var(--text)',
        borderRadius: '16px',
        padding: '24px 32px',
        boxShadow: '6px 6px 0px var(--text)',
        marginBottom: '40px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        color: 'var(--text)'
      }}>
        <div style={{
          background: 'var(--bg-white)',
          padding: '16px',
          borderRadius: '12px',
          border: '2px solid var(--text)',
          boxShadow: '4px 4px 0px rgba(0,0,0,0.1)'
        }}>
          <Calculator size={40} strokeWidth={2.5} color="var(--primary)" />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px 0', lineHeight: 1.1 }}>
            GPA Calculator
          </h1>
          <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, opacity: 0.9 }}>
            Plan your semester, track your targets, and save them to your profile.
          </p>
        </div>
      </div>

      {/* Selection Area */}
      <div style={{
        background: 'var(--bg-white)',
        border: '3px solid var(--text)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '6px 6px 0px var(--text)',
        marginBottom: '30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        <div>
          <label style={{ display: 'block', fontWeight: 800, marginBottom: '8px', fontSize: '0.9rem' }}>Faculty</label>
          <select 
            className="input-base" 
            value={faculty} 
            onChange={(e) => { setFaculty(e.target.value); setProgram(''); setSemester(''); }}
            style={{ width: '100%', cursor: 'pointer' }}
          >
            <option value="">Select Faculty...</option>
            {coursesData.faculties.map(f => (
              <option key={f.faculty_name} value={f.faculty_name}>{f.faculty_name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', fontWeight: 800, marginBottom: '8px', fontSize: '0.9rem' }}>Program</label>
          <select 
            className="input-base" 
            value={program} 
            onChange={(e) => { setProgram(e.target.value); setSemester(''); }}
            disabled={!faculty}
            style={{ width: '100%', cursor: !faculty ? 'not-allowed' : 'pointer', opacity: !faculty ? 0.6 : 1 }}
          >
            <option value="">Select Program...</option>
            {availablePrograms.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 800, marginBottom: '8px', fontSize: '0.9rem' }}>Semester</label>
          <select 
            className="input-base" 
            value={semester} 
            onChange={(e) => setSemester(e.target.value)}
            disabled={!program}
            style={{ width: '100%', cursor: !program ? 'not-allowed' : 'pointer', opacity: !program ? 0.6 : 1 }}
          >
            <option value="">Select Semester...</option>
            {availableSemesters.map(s => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Courses Area */}
      {faculty && program && semester && (
        <div style={{
          background: 'var(--bg-white)',
          border: '3px solid var(--text)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '6px 6px 0px var(--text)',
          animation: 'slideUp 0.4s ease-out'
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid var(--border)', paddingBottom: '16px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Courses</h2>
            <span style={{ background: 'var(--bg-subtle)', padding: '4px 12px', borderRadius: '100px', fontWeight: 800, fontSize: '0.85rem', border: '1.5px solid var(--border)' }}>
              {courses.length} courses loaded
            </span>
          </div>

          {courses.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ fontWeight: 600 }}>No preset courses found for this semester. Add custom courses below!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
              {courses.map(course => (
                <div 
                  key={course.id} 
                  onMouseLeave={() => setVisibleNames(prev => ({ ...prev, [course.id]: false }))}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '2px solid var(--text)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '16px',
                    position: 'relative'
                  }}
                >
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                        {course.code || 'Custom'}
                      </span>
                      <button 
                        onClick={(e) => toggleNameVisibility(e, course.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                      >
                        <Info size={16} strokeWidth={3} />
                      </button>

                      {visibleNames[course.id] && (
                        <div style={{ 
                          position: 'absolute', top: '100%', left: '16px', zIndex: 10, marginTop: '8px',
                          background: 'var(--text)', color: 'var(--bg-white)',
                          padding: '12px', borderRadius: '8px', border: '2px solid var(--text)',
                          boxShadow: '4px 4px 0px rgba(0,0,0,0.2)', width: 'max-content', maxWidth: '280px',
                          fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.4
                        }}>
                          {course.name}
                        </div>
                      )}
                    </div>
                    {course.isCustom && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'var(--accent)', color: 'var(--text)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--text)' }}>
                        CUSTOM
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                    {/* Editable Credit Hours */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Credits</label>
                      <select 
                        value={course.creditHours}
                        onChange={(e) => handleCHChange(course.id, e.target.value)}
                        style={{ 
                          padding: '8px', borderRadius: '8px', border: '2px solid var(--text)', 
                          background: 'var(--bg-white)', fontWeight: 800, cursor: 'pointer', width: '70px'
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>{num} CH</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Grade</label>
                      <select 
                        value={course.grade}
                        onChange={(e) => handleGradeChange(course.id, e.target.value)}
                        style={{ 
                          padding: '8px', borderRadius: '8px', border: '2px solid var(--text)', 
                          background: 'color-mix(in srgb, var(--primary) 85%, var(--accent))', color: 'white', fontWeight: 800, cursor: 'pointer', width: '90px'
                        }}
                      >
                        {GRADING_SCALE.map(scale => (
                          <option key={scale.grade} value={scale.grade}>{scale.grade} ({scale.points})</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
                      <button 
                        onClick={() => removeCourse(course.id)}
                        style={{ 
                          background: 'none', border: 'none', color: '#ef4444', 
                          cursor: 'pointer', padding: '8px', borderRadius: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                        title="Remove Course"
                      >
                        <Trash2 size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Course Form */}
          <div style={{ marginBottom: '32px' }}>
            {!showAddForm ? (
              <button 
                onClick={() => setShowAddForm(true)}
                style={{
                  width: '100%', background: 'none', border: '2px dashed var(--text-muted)',
                  borderRadius: '12px', padding: '20px', color: 'var(--text)', fontWeight: 800,
                  fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--text)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
              >
                <Plus size={20} strokeWidth={3} /> ADD EXTRA COURSE
              </button>
            ) : (
              <div style={{ background: 'var(--bg-subtle)', border: '2px solid var(--text)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>Add Custom Course</h3>
                  <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>
                
                <form onSubmit={addCourse} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 120px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px' }}>Code</label>
                    <input className="input-base" placeholder="e.g. CS101" value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)} style={{ width: '100%', padding: '10px' }} />
                  </div>
                  <div style={{ flex: '2 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px' }}>Name *</label>
                    <input className="input-base" placeholder="e.g. Advanced AI" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} required style={{ width: '100%', padding: '10px' }} />
                  </div>
                  <div style={{ flex: '0 0 100px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px' }}>Credits</label>
                    <select className="input-base" value={newCourseCH} onChange={e => setNewCourseCH(Number(e.target.value))} style={{ width: '100%', padding: '10px', cursor: 'pointer' }}>
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num} CH</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <button type="submit" disabled={!newCourseName.trim()} className="btn-base" style={{ background: 'var(--electric)', color: 'white', padding: '10px 20px' }}>
                      <Plus size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sticky/Fixed GPA Bottom Bar inside the container */}
          <div style={{
            background: 'var(--text)',
            color: 'var(--bg-white)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Estimated GPA
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: 'var(--accent)' }}>
                  {gpa}
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.8 }}>
                  / 4.00
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px', opacity: 0.8 }}>
                Total Credits: {totalCH}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Public GPA</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Show on profile</div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                    <input 
                      type="checkbox" 
                      checked={gpaPublic} 
                      onChange={(e) => setGpaPublic(e.target.checked)} 
                      style={{ opacity: 0, width: 0, height: 0 }} 
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: gpaPublic ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
                      transition: '.3s', borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute', content: '""', height: '16px', width: '16px', left: '3px', bottom: '3px',
                        backgroundColor: 'white', transition: '.3s', borderRadius: '50%',
                        transform: gpaPublic ? 'translateX(18px)' : 'none'
                      }}/>
                    </span>
                  </label>
                </div>
              )}

              <button 
                onClick={saveRecord}
                disabled={isSaving || !user || courses.length === 0}
                style={{
                  background: 'color-mix(in srgb, var(--primary) 85%, var(--accent))',
                  color: 'white',
                  border: '2px solid white',
                  borderRadius: '12px',
                  padding: '16px 32px',
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: (isSaving || courses.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (isSaving || courses.length === 0) ? 0.7 : 1,
                  boxShadow: (isSaving || courses.length === 0) ? 'none' : '4px 4px 0px rgba(255,255,255,0.4)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { if(!isSaving && courses.length > 0) { e.currentTarget.style.transform = 'translate(-2px, -2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px rgba(255,255,255,0.4)'; } }}
                onMouseOut={e => { if(!isSaving && courses.length > 0) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px rgba(255,255,255,0.4)'; } }}
              >
                {isSaving ? (
                  <><Loader2 className="animate-spin" size={24} /> SAVING...</>
                ) : (
                  <>
                    <Save size={24} strokeWidth={2.5} /> 
                    {!user ? 'LOGIN TO SAVE' : 'SAVE TO PROFILE'}
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Render Saved Records and CGPA below the calculator */}
      {cgpaData && cgpaData.records && cgpaData.records.length > 0 && (
        <div style={{ marginTop: '60px', animation: 'fadeUp 0.4s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <Calculator size={28} color="var(--accent)" />
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)' }}>
              Your Saved Records
            </h2>
            {cgpaData.cgpa && (
              <div style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'var(--text)', padding: '6px 16px', borderRadius: '100px', fontWeight: 900, border: '2px solid var(--text)', boxShadow: '3px 3px 0px var(--text)' }}>
                CGPA: {cgpaData.cgpa}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {cgpaData.records.map(r => (
              <div key={r.gpa_id} style={{
                background: 'var(--bg-white)',
                border: '2px solid var(--text)',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '4px 4px 0px var(--text)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'color-mix(in srgb, var(--primary) 85%, var(--accent))', marginBottom: '2px' }}>Semester {r.semester}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{r.program}</div>
                  </div>
                  <div style={{
                    background: 'var(--bg-subtle)',
                    border: '2px solid var(--text)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                    color: 'var(--text)'
                  }}>
                    {r.gpa}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <span>{r.total_credits} Credits</span>
                  <span>{r.faculty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
