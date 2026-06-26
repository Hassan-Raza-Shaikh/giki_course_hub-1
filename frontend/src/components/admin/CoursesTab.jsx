import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { BookOpen, Edit3, Link, Info, GraduationCap, Plus, Trash2, FlaskConical } from 'lucide-react';
import { LoadingRow, btnStyle, inputStyle } from './AdminHelpers';
import IconMapper from '../IconMapper';

export const CoursesTab = ({ isAdmin, showToast, setConfirmModal, faculties, programs }) => {
  const [courses, setCourses] = useState([]);
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesTotalPages, setCoursesTotalPages] = useState(1);
  const [coursesTotalCount, setCoursesTotalCount] = useState(0);
  const [courseSearch, setCourseSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [courseForm, setCourseForm] = useState({ name: '', code: '', year: '', semester: '', is_lab: false, icon: '', faculty_id: '', program_id: '' });
  const [editingCourse, setEditingCourse] = useState(null);
  const [bulkCourseMode, setBulkCourseMode] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [isExistingCode, setIsExistingCode] = useState(false);
  const [existingProgramIds, setExistingProgramIds] = useState([]);
  const courseListRef = useRef(null);

  const loadCourses = () => {
    setLoading(true);
    api.get('/admin/courses', { params: { page: coursesPage, q: courseSearch } })
      .then(r => {
        setCourses(r.data.courses || []);
        setCoursesTotalPages(r.data.pages || 1);
        setCoursesTotalCount(r.data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadCourses();
  }, [coursesPage, courseSearch, isAdmin]);

  // Autofill effect for existing courses
  useEffect(() => {
    if (editingCourse || !courseForm.code || courseForm.code.length < 3) {
      if (isExistingCode) setIsExistingCode(false);
      return;
    }

    const timer = setTimeout(() => {
      api.get(`/admin/courses/by-code/${courseForm.code}`)
        .then(res => {
          if (res.data.success && res.data.course) {
            const c = res.data.course;
            setIsExistingCode(true);
            setExistingProgramIds(res.data.existing_program_ids || []);
            setCourseForm(prev => ({
              ...prev,
              name:        c.name,
              icon:        c.icon || prev.icon,
              is_lab:      c.is_lab || false,
              year:        c.year     != null ? String(c.year)     : prev.year,
              semester:    c.semester != null ? String(c.semester) : prev.semester,
            }));
            const n = res.data.existing_count || 0;
            showToast(`${courseForm.code.toUpperCase()} already exists in ${n} program${n !== 1 ? 's' : ''} — details autofilled!`, 'success');
          } else {
            setIsExistingCode(false);
            setExistingProgramIds([]);
          }
        })
        .catch(() => { setIsExistingCode(false); setExistingProgramIds([]); });
    }, 600);

    return () => clearTimeout(timer);
  }, [courseForm.code, editingCourse]);

  // Sync icon when faculty changes (only if not editing/autofilled)
  useEffect(() => {
    if (editingCourse || isExistingCode || !courseForm.faculty_id) return;
    const fac = faculties.find(f => f.id == courseForm.faculty_id);
    if (fac && fac.icon) {
      setCourseForm(prev => ({ ...prev, icon: fac.icon }));
    }
  }, [courseForm.faculty_id, faculties, editingCourse, isExistingCode]);

  const saveCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await api.put(`/admin/courses/${editingCourse.course_id}`, courseForm);
        showToast('Course updated');
      } else if (bulkCourseMode) {
        if (selectedPrograms.length === 0) { showToast('Select at least one program.', 'error'); return; }
        const r = await api.post('/admin/courses/bulk', { ...courseForm, program_ids: selectedPrograms });
        showToast(r.data.message || `Created for ${selectedPrograms.length} program(s)`);
        setSelectedPrograms([]);
      } else {
        await api.post('/admin/courses', courseForm);
        showToast('Course created');
      }
      setCourseForm({ name: '', code: '', year: '', semester: '', is_lab: false, icon: '', faculty_id: '', program_id: '' });
      setEditingCourse(null);
      setIsExistingCode(false);
      setExistingProgramIds([]);
      // Refresh list then scroll to it
      loadCourses();
      setTimeout(() => courseListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving course', 'error');
    }
  };

  const deleteCourse = async (id, name) => {
    setConfirmModal({
      title: <><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete Course</>,
      body: `Permanently delete "${name}" and ALL its uploaded files (PDFs, slides, etc.) from storage? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/admin/courses/${id}`);
          showToast('Course deleted');
          loadCourses();
          setConfirmModal(null);
        } catch (err) {
          showToast('Error deleting course', 'error');
        }
      }
    });
  };

  const editCourse = (c) => {
    setEditingCourse(c);
    setCourseForm({
      name: c.name || '', code: c.code || '',
      year: c.year || '', semester: c.semester || '', is_lab: !!c.is_lab,
      icon: c.icon || '📘', faculty_id: c.faculty_id || '', program_id: c.program_id || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      {/* Course Form */}
      <form onSubmit={saveCourse} style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--text)', padding: '28px', marginBottom: '32px', boxShadow: '6px 6px 0 var(--border)' }}>
        <h3 style={{ fontWeight: 950, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-primary)' }}>
          {editingCourse ? <><Edit3 size={14} /> Edit Course</> : <><BookOpen size={16} /> Add New Course</>}
          {editingCourse && <button type="button" onClick={() => {
            setEditingCourse(null);
            setCourseForm({ name: '', code: '', year: '', semester: '', is_lab: false, icon: '', faculty_id: '', program_id: '' });
            setIsExistingCode(false);
            setExistingProgramIds([]);
          }} style={{ marginLeft: 'auto', fontSize: '0.8rem', background: 'none', border: '2px solid var(--border)', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}>Cancel</button>}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>
              Course Name * {isExistingCode && <span style={{ color: 'var(--primary)', textTransform: 'none', marginLeft: '5px', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px' }}><Link size={10} /> Shared</span>}
            </label>
            <input
              value={courseForm.name}
              onChange={e => setCourseForm({...courseForm, name: e.target.value})}
              placeholder="Object Oriented Programming"
              required
              readOnly={isExistingCode}
              style={{ ...inputStyle, background: isExistingCode ? 'var(--bg-subtle)' : 'var(--bg-white)', cursor: isExistingCode ? 'not-allowed' : 'text' }}
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Course Code *</label>
            <input value={courseForm.code} onChange={e => setCourseForm({...courseForm, code: e.target.value.toUpperCase()})} placeholder="CS112" required style={inputStyle} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Year</label>
            <input type="number" min="1" max="4" value={courseForm.year} onChange={e => setCourseForm({...courseForm, year: e.target.value})} placeholder="1" style={inputStyle} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Semester</label>
            <input type="number" min="1" max="8" value={courseForm.semester} onChange={e => setCourseForm({...courseForm, semester: e.target.value})} placeholder="2" style={inputStyle} />
          </div>

          {/* Faculty + Program — always visible in single/edit mode */}
          {(!bulkCourseMode || editingCourse) && (
            <>
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Faculty</label>
                <select value={courseForm.faculty_id} onChange={e => setCourseForm({...courseForm, faculty_id: e.target.value, program_id: ''})} style={inputStyle}>
                  <option value="">Select Faculty</option>
                  {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase' }}>Program</label>
                <select value={courseForm.program_id} onChange={e => setCourseForm({...courseForm, program_id: e.target.value})} style={inputStyle}>
                  <option value="">Select Program</option>
                  {programs
                    .filter(p => !courseForm.faculty_id || p.faculty_id == courseForm.faculty_id)
                    .map(p => {
                      const alreadyHas = isExistingCode && existingProgramIds.includes(p.id);
                      return (
                        <option key={p.id} value={p.id} disabled={alreadyHas}>
                          {alreadyHas ? `✓ ${p.name} (already added)` : p.name}
                        </option>
                      );
                    })}
                </select>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
            <input type="checkbox" checked={courseForm.is_lab} onChange={e => setCourseForm({...courseForm, is_lab: e.target.checked})} id="is_lab" style={{ width: '20px', height: '20px' }} />
            <label htmlFor="is_lab" style={{ fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>Lab Course</label>
          </div>
        </div>

        {/* Autofill info banner */}
        {isExistingCode && !editingCourse && (
          <div style={{
            marginTop: '16px', padding: '12px 16px',
            background: 'rgba(124,58,237,0.07)', border: '2px solid var(--primary)',
            borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}><Info size={16} /></span>
            <div style={{ fontSize: '0.83rem', lineHeight: 1.5, color: 'var(--text)' }}>
              <strong>{courseForm.code}</strong> already exists in <strong>{existingProgramIds.length} program{existingProgramIds.length !== 1 ? 's' : ''}</strong>.
              {' '}Name is locked to keep resources synced across programs.
              {' '}Simply pick a program that doesn't have it yet
              {bulkCourseMode ? ' (greyed-out ones already have it)' : ''} and submit.
            </div>
          </div>
        )}

        {/* ── Bulk mode toggle (hidden when editing) ── */}
        {!editingCourse && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '2px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                  <GraduationCap size={16} /> {bulkCourseMode ? 'Multi-Program Mode' : 'Single Program Mode'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {bulkCourseMode
                    ? 'Course will be added to every checked program simultaneously.'
                    : 'Enable to add this course to multiple programs at once.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setBulkCourseMode(b => !b); setSelectedPrograms([]); }}
                style={{
                  padding: '7px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem',
                  border: '2px solid var(--text)', cursor: 'pointer',
                  background: bulkCourseMode ? 'var(--primary)' : 'var(--bg-white)',
                  color: bulkCourseMode ? 'white' : 'var(--text)',
                  boxShadow: '2px 2px 0 var(--border)',
                }}
              >
                {bulkCourseMode ? '✓ Enabled' : 'Enable'}
              </button>
            </div>

            {/* Multi-program checklist */}
            {bulkCourseMode && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button"
                    onClick={() => setSelectedPrograms(programs.filter(p => !existingProgramIds.includes(p.id)).map(p => p.id))}
                    style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-white)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                    ✓ Select All New
                  </button>
                  <button type="button" onClick={() => setSelectedPrograms([])}
                    style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-white)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                    ✕ Clear
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {selectedPrograms.length} selected
                    {isExistingCode && existingProgramIds.length > 0 && ` · ${existingProgramIds.length} already added (greyed)`}
                  </span>
                </div>
                {faculties.map(fac => {
                  const facProgs = programs.filter(p => p.faculty_id === fac.id);
                  if (!facProgs.length) return null;
                  const availableProgs = facProgs.filter(p => !existingProgramIds.includes(p.id));
                  const allFacSelected = availableProgs.length > 0 && availableProgs.every(p => selectedPrograms.includes(p.id));
                  return (
                    <div key={fac.id} style={{ marginBottom: '14px' }}>
                      {/* Faculty row — click toggles all available progs in this faculty */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: availableProgs.length ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (!availableProgs.length) return;
                          const ids = availableProgs.map(p => p.id);
                          setSelectedPrograms(prev =>
                            allFacSelected
                              ? prev.filter(id => !ids.includes(id))
                              : [...new Set([...prev, ...ids])]
                          );
                        }}
                      >
                        <span style={{
                          width: '16px', height: '16px', border: `2px solid ${availableProgs.length ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: '4px', display: 'inline-flex', alignItems: 'center',
                          justifyContent: 'center',
                          background: allFacSelected ? 'var(--primary)' : 'transparent',
                          flexShrink: 0,
                        }}>
                          {allFacSelected && <span style={{ color: 'white', fontSize: '11px', fontWeight: 900 }}>✓</span>}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: availableProgs.length ? 'var(--primary)' : 'var(--text-muted)' }}>{fac.name}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '24px' }}>
                        {facProgs.map(p => {
                          const alreadyHas = existingProgramIds.includes(p.id);
                          const checked = selectedPrograms.includes(p.id);
                          return (
                            <label key={p.id} style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              cursor: alreadyHas ? 'not-allowed' : 'pointer',
                              fontSize: '0.83rem',
                              fontWeight: checked ? 700 : 500,
                              opacity: alreadyHas ? 0.45 : 1,
                            }}>
                              <input
                                type="checkbox"
                                checked={alreadyHas ? true : checked}
                                disabled={alreadyHas}
                                onChange={e => !alreadyHas && setSelectedPrograms(prev =>
                                  e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                                )}
                                style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                              />
                              {p.name}
                              {alreadyHas && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>✓ already added</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button type="submit" style={{ ...btnStyle('var(--primary)'), width: '100%', marginTop: '24px', padding: '16px', fontSize: '1rem', boxShadow: '4px 4px 0 var(--text)' }}>
          {editingCourse
            ? 'Update Course Details'
            : bulkCourseMode
              ? <><Plus size={16} /> Add to {selectedPrograms.length || '…'} Program{selectedPrograms.length !== 1 ? 's' : ''}</>
              : <><Plus size={16} /> Create Course</>}
        </button>
      </form>

      {/* Course List */}
      <div ref={courseListRef} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          value={courseSearch}
          onChange={e => { setCourseSearch(e.target.value); setCoursesPage(1); }}
          placeholder="Search courses by name or code…"
          style={{ ...inputStyle, flex: 1, minWidth: '200px', maxWidth: '400px', marginBottom: 0 }}
        />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {coursesTotalCount} course{coursesTotalCount !== 1 ? 's' : ''} · Page {coursesPage} of {coursesTotalPages}
        </span>
      </div>
      <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
        {loading ? <LoadingRow /> : courses.map(c => (
          <div key={c.course_id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '1.5rem' }}><IconMapper emoji={c.icon} size={28} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{c.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({c.code})</span></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.faculty_name} · {c.program_name} · Year {c.year} Sem {c.semester} {c.is_lab && <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}>· <FlaskConical size={12} /> Lab</span>}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => editCourse(c)} style={btnStyle('#6366F1')}>Edit</button>
              <button onClick={() => deleteCourse(c.course_id, c.name)} style={btnStyle('#EF4444')}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Courses pagination */}
      {coursesTotalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
          <button
            disabled={coursesPage <= 1}
            onClick={() => setCoursesPage(p => p - 1)}
            style={{ padding: '8px 20px', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700, cursor: coursesPage <= 1 ? 'not-allowed' : 'pointer', opacity: coursesPage <= 1 ? 0.4 : 1 }}
          >← Prev</button>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>Page {coursesPage} / {coursesTotalPages}</span>
          <button
            disabled={coursesPage >= coursesTotalPages}
            onClick={() => setCoursesPage(p => p + 1)}
            style={{ padding: '8px 20px', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700, cursor: coursesPage >= coursesTotalPages ? 'not-allowed' : 'pointer', opacity: coursesPage >= coursesTotalPages ? 0.4 : 1 }}
          >Next →</button>
        </div>
      )}
    </div>
  );
};
