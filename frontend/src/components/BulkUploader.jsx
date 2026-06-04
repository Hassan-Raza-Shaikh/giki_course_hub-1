import React, { useState } from 'react';
import api from '../services/api';

const CATEGORY_ICONS = {
  'Outline':         '📋',
  'Notes':           '📝',
  'Slides':          '📊',
  'Quizzes':         '📝',
  'Assignments':     '📄',
  'Past Papers':     '🗂️',
  'Lab Manuals':     '🧪',
  'Lab Tasks':       '⚗️',
  'Lab Reports':     '📋',
  'Reference':       '📚',
};

const BulkUploader = ({ 
  user, 
  onSignIn, 
  categories = [], 
  instructors = [], 
  courseInstructors = [], 
  fixedCourseId = null,
  fixedCourseCode = null,
  allCourses = [], // Only passed when fixedCourseId is null (Global Upload)
  onUploadComplete = () => {}
}) => {
  const [uploadQueue, setUploadQueue] = useState([]);  
  const [sharedCatId, setSharedCatId] = useState('');
  const [sharedInstructorId, setSharedInstructorId] = useState('');
  const [sharedCourseId, setSharedCourseId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSummary, setUploadSummary] = useState(null);

  const ALLOWED_EXTS = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'zip', 'png', 'jpg', 'jpeg', 'ipynb', 'py', 'js', 'jsx', 'ts', 'tsx', 'cpp', 'c', 'h', 'hpp', 'java', 'rs', 'go', 'rb', 'php', 'css', 'html', 'json', 'yaml', 'yml', 'sh', 'md'];
  const isAdmin = user?.role === 'admin';
  const MAX_FILES = isAdmin ? 1000 : 10;
  const DEFAULT_MAX_MB = isAdmin ? 10000 : 15;
  const REFERENCE_MAX_MB = isAdmin ? 10000 : 50;

  const getCatNameById = (catId) => {
    const c = categories.find(c => String(c.id) === String(catId));
    return c ? c.name : '';
  };

  const getMaxSizeMB = (catId) => {
    const name = getCatNameById(catId);
    return name && name.toLowerCase() === 'reference' ? REFERENCE_MAX_MB : DEFAULT_MAX_MB;
  };

  const addFilesToQueue = (fileList) => {
    const newFiles = Array.from(fileList);
    setUploadError('');

    const current = uploadQueue.length;
    if (current + newFiles.length > MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} files per upload. You already have ${current} queued.`);
      return;
    }

    const validated = [];
    for (const f of newFiles) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        setUploadError(`"${f.name}" — .${ext} files are not allowed.`);
        continue;
      }
      const title = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
      validated.push({
        file: f,
        title,
        category_id: sharedCatId || '',
        instructor_id: sharedInstructorId || '',
        course_id: fixedCourseId || sharedCourseId || '',
        status: 'queued',
        progress: 0,
        error: '',
        file_id: null,
      });
    }
    setUploadQueue(prev => [...prev, ...validated]);
  };

  const removeFromQueue = (idx) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQueueItem = (idx, updates) => {
    setUploadQueue(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  const applySharedMeta = (field, value) => {
    if (field === 'category_id') setSharedCatId(value);
    if (field === 'instructor_id') setSharedInstructorId(value);
    if (field === 'course_id') setSharedCourseId(value);
    setUploadQueue(prev => prev.map(item => item.status === 'queued' ? { ...item, [field]: value } : item));
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!user) { onSignIn(); return; }

    const ready = uploadQueue.filter(f => f.status === 'queued');
    const missing = ready.filter(f => !f.category_id || !f.title.trim() || !f.course_id);
    if (missing.length > 0) {
      if (!fixedCourseId && ready.some(f => !f.course_id)) {
        setUploadError('All files need a title, category, and course assigned.');
      } else {
        setUploadError('All files need a title and category.');
      }
      return;
    }
    if (ready.length === 0) {
      setUploadError('Add at least one file to upload.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSummary(null);

    // Group files by course_id because backend endpoints require course_id in the URL
    const filesByCourse = ready.reduce((acc, f) => {
      if (!acc[f.course_id]) acc[f.course_id] = [];
      acc[f.course_id].push(f);
      return acc;
    }, {});

    let overallSuccess = true;
    let totalUploaded = 0;
    let totalSkipped = 0;

    try {
      for (const [courseId, courseFiles] of Object.entries(filesByCourse)) {
        // Single file optimization
        if (courseFiles.length === 1) {
          const f = courseFiles[0];
          const qIdx = uploadQueue.indexOf(f);
          updateQueueItem(qIdx, { status: 'uploading', progress: 0 });

          const form = new FormData();
          form.append('title', f.title);
          form.append('category_id', f.category_id);
          if (f.instructor_id) form.append('instructor_id', f.instructor_id);
          form.append('file', f.file);

          try {
            const res = await api.post(`/courses/${courseId}/upload`, form, {
              headers: { 'Content-Type': 'multipart/form-data' },
              onUploadProgress: (evt) => {
                if (evt.lengthComputable) updateQueueItem(qIdx, { progress: Math.round((evt.loaded * 100) / evt.total) });
              }
            });
            if (res.data.success) {
              updateQueueItem(qIdx, { status: 'done', progress: 100, file_id: res.data.file_id });
              totalUploaded += 1;
            } else {
              updateQueueItem(qIdx, { status: 'error', error: res.data.message });
              overallSuccess = false;
            }
          } catch (err) {
            let msg = err.response?.data?.message || 'Upload failed';
            if (err.response?.status >= 500) msg += ' (If this persists, please use the Report button below)';
            updateQueueItem(qIdx, { status: 'error', error: msg });
            overallSuccess = false;
          }
          continue;
        }

        // Multi-file bulk pipeline for this course
        const manifest = courseFiles.map(f => ({
          name: f.file.name, size: f.file.size, title: f.title,
          category_id: parseInt(f.category_id),
          instructor_id: f.instructor_id ? parseInt(f.instructor_id) : null,
        }));

        const initRes = await api.post(`/courses/${courseId}/bulk-upload/init`, { files: manifest });
        if (!initRes.data.success) {
          overallSuccess = false;
          courseFiles.forEach(f => {
            const globalIdx = uploadQueue.indexOf(f);
            updateQueueItem(globalIdx, { status: 'error', error: initRes.data.message || 'Initialization failed' });
          });
          continue;
        }

        const { batch_id, accepted, rejected } = initRes.data;

        // Mark rejected
        for (const rej of (rejected || [])) {
          const globalIdx = uploadQueue.indexOf(courseFiles[rej.index]);
          if (globalIdx >= 0) {
            updateQueueItem(globalIdx, { status: 'error', error: rej.reason });
            overallSuccess = false;
          }
        }

        // Upload accepted sequentially
        for (const acc of accepted) {
          const readyFile = courseFiles[acc.index];
          if (!readyFile) continue;
          const globalIdx = uploadQueue.indexOf(readyFile);
          updateQueueItem(globalIdx, { status: 'uploading', progress: 0 });

          const form = new FormData();
          form.append('file', readyFile.file);
          form.append('file_index', acc.index);
          form.append('title', readyFile.title);
          form.append('category_id', readyFile.category_id);
          if (readyFile.instructor_id) form.append('instructor_id', readyFile.instructor_id);

          try {
            const fileRes = await api.post(`/courses/${courseId}/bulk-upload/${batch_id}/file`, form, {
              headers: { 'Content-Type': 'multipart/form-data' },
              onUploadProgress: (evt) => {
                if (evt.lengthComputable) updateQueueItem(globalIdx, { progress: Math.round((evt.loaded * 100) / evt.total) });
              }
            });
            if (fileRes.data.success) {
              updateQueueItem(globalIdx, { status: 'done', progress: 100, file_id: fileRes.data.file_id });
            } else {
              updateQueueItem(globalIdx, { status: fileRes.data.skipped ? 'skipped' : 'error', error: fileRes.data.message });
              if (!fileRes.data.skipped) overallSuccess = false;
            }
          } catch (err) {
            let msg = err.response?.data?.message || 'Upload failed';
            if (err.response?.status >= 500) msg += ' (If this persists, please use the Report button below)';
            updateQueueItem(globalIdx, { status: err.response?.data?.skipped ? 'skipped' : 'error', error: msg });
            if (!err.response?.data?.skipped) overallSuccess = false;
          }
        }

        // Finalize batch
        try {
          const doneRes = await api.post(`/courses/${courseId}/bulk-upload/${batch_id}/done`);
          if (doneRes.data.success && doneRes.data.summary) {
            totalUploaded += doneRes.data.summary.total_uploaded || 0;
            totalSkipped += doneRes.data.summary.total_skipped || 0;
          }
        } catch {}
      }

      setUploadSummary({ total_uploaded: totalUploaded, total_skipped: totalSkipped });
      if (totalUploaded > 0) setUploadSuccess(true);
      if (!overallSuccess && totalUploaded === 0) {
        setUploadError('Some or all files failed to upload. Check individual file statuses.');
      }
      
      onUploadComplete();
    } catch (err) {
      console.error('Bulk upload error:', err);
      let msg = err.response?.data?.message || 'Bulk upload failed. Please try again.';
      if (err.response?.status >= 500) msg += ' (If this persists, please use the Report button below)';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  // Group instructors by faculty for organized dropdown
  const otherInstructorsGrouped = React.useMemo(() => {
    const grouped = instructors
      .filter(i => !courseInstructors.find(ci => ci.id === i.id))
      .reduce((acc, i) => {
        const fac = i.faculty || 'Other';
        if (!acc[fac]) acc[fac] = [];
        acc[fac].push(i);
        return acc;
      }, {});

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map(fac => ({ name: fac, list: grouped[fac] }));
  }, [instructors, courseInstructors]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔐</div>
        <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '16px' }}>Sign in to upload materials</p>
        <button className="btn-primary" onClick={onSignIn}>Sign In with Google</button>
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', animation: 'scaleIn 0.3s ease' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
        <p style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.2rem', marginBottom: '8px' }}>
          {uploadSummary && uploadSummary.total_uploaded > 1 ? `${uploadSummary.total_uploaded} files submitted!` : 'Material submitted!'}
        </p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
          {isAdmin ? 'Your files have been directly uploaded and are now live.' : 'Your contribution is pending admin review and will go live once approved.'}
        </p>
        {uploadSummary && uploadSummary.total_skipped > 0 && (
          <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>⚠️ {uploadSummary.total_skipped} file(s) were skipped (duplicates or errors).</p>
        )}
        <button className="btn-primary" onClick={() => { setUploadSuccess(false); setUploadQueue([]); setUploadSummary(null); }}>Upload More</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleBulkUpload} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {uploadError && (
        <div style={{ padding: '14px', background: 'rgba(185,28,28,0.1)', color: 'var(--accent, #B91C1C)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: 600, border: '1px solid rgba(185,28,28,0.3)' }}>
          {uploadError}
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Files * <span style={{ fontWeight: 500, textTransform: 'none', color: 'var(--text-muted)' }}>— up to {MAX_FILES} files</span>
        </label>
        <div
          className="upload-zone"
          onClick={() => document.getElementById('file-input-bulk').click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(37,99,235,0.04)'; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; addFilesToQueue(e.dataTransfer.files); }}
          style={{ border: '2px dashed var(--border)', transition: 'all 0.2s', cursor: 'pointer', padding: '32px 16px', textAlign: 'center', borderRadius: '16px' }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>☁️</div>
            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>Drop files here or click to browse</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              PDF, DOCX, PPTX, TXT, IPYNB, Code, ZIP, images · {isAdmin ? 'No size limits for Admin' : 'Max 10MB per file (50MB for Reference)'}
            </p>
          </div>
          <input
            id="file-input-bulk"
            type="file"
            multiple
            style={{ display: 'none' }}
            accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.zip,.png,.jpg,.jpeg,.ipynb,.py,.js,.jsx,.ts,.tsx,.cpp,.c,.h,.hpp,.java,.rs,.go,.rb,.php,.css,.html,.json,.yaml,.yml,.sh,.md"
            onChange={e => { addFilesToQueue(e.target.files); e.target.value = ''; }}
          />
        </div>
      </div>

      {uploadQueue.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {!fixedCourseId && (
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Course for all *
              </label>
              <select
                value={sharedCourseId}
                onChange={e => applySharedMeta('course_id', e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '2px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-white)', color: 'var(--text)' }}
              >
                <option value="">Select course…</option>
                {allCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Category for all *
            </label>
            <select
              value={sharedCatId}
              onChange={e => applySharedMeta('category_id', e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '2px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-white)', color: 'var(--text)' }}
            >
              <option value="">Select category…</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{CATEGORY_ICONS[c.name] || '📁'} {c.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Instructor for all
            </label>
            <select
              value={sharedInstructorId}
              onChange={e => applySharedMeta('instructor_id', e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '2px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-white)', color: 'var(--text)' }}
            >
              <option value="">None / General</option>
              {courseInstructors.length > 0 && (
                <optgroup label={`Teaches ${fixedCourseCode || 'Course'}`}>
                  {courseInstructors.map(i => <option key={`ci-${i.id}`} value={i.id}>{i.name}</option>)}
                </optgroup>
              )}
              {otherInstructorsGrouped.map(group => (
                <optgroup key={`group-${group.name}`} label={`${group.name} Instructors`}>
                  {group.list.map(i => <option key={`i-${i.id}`} value={i.id}>{i.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      )}

      {uploadQueue.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Upload Queue ({uploadQueue.length}/{MAX_FILES})
          </label>
          {uploadQueue.map((item, idx) => {
            const statusIcon = { queued: '⏳', uploading: '⬆️', done: '✅', error: '❌', skipped: '⚠️' }[item.status] || '⏳';
            const isEditable = item.status === 'queued';
            const sizeMB = (item.file.size / 1024 / 1024).toFixed(1);
            const maxMB = getMaxSizeMB(item.category_id);
            const isTooLarge = item.file.size > maxMB * 1024 * 1024;

            return (
              <div key={idx} style={{
                padding: '14px 16px', borderRadius: 'var(--radius-md)',
                border: `1px solid ${item.status === 'error' ? '#FCA5A5' : item.status === 'done' ? '#86EFAC' : item.status === 'skipped' ? '#FDE68A' : 'var(--border)'}`,
                background: item.status === 'error' ? 'rgba(239, 68, 68, 0.1)' : item.status === 'done' ? 'rgba(34, 197, 94, 0.1)' : item.status === 'skipped' ? 'rgba(234, 179, 8, 0.1)' : 'var(--bg-white)',
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{statusIcon}</span>

                  {isEditable ? (
                    <input
                      type="text"
                      value={item.title}
                      onChange={e => updateQueueItem(idx, { title: e.target.value })}
                      placeholder="File title"
                      style={{ flex: '2 1 140px', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-subtle)', color: 'var(--text)', minWidth: 0 }}
                      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  ) : (
                    <span style={{ flex: '2 1 140px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </span>
                  )}

                  <span style={{ fontSize: '0.8rem', color: isTooLarge ? '#DC2626' : 'var(--text-muted)', fontWeight: 600, flexShrink: 0, width: '60px', textAlign: 'right' }}>
                    {sizeMB} MB
                  </span>

                  {/* Individual Course Dropdown */}
                  {!fixedCourseId && isEditable && (
                    <select
                      value={item.course_id}
                      onChange={e => updateQueueItem(idx, { course_id: e.target.value })}
                      style={{ flex: '1 1 120px', padding: '6px 8px', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '0.8rem', outline: 'none', background: 'var(--bg-subtle)', color: 'var(--text)', minWidth: 0 }}
                    >
                      <option value="">Course…</option>
                      {allCourses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                    </select>
                  )}

                  {/* Individual Category Dropdown */}
                  {isEditable && (
                    <select
                      value={item.category_id}
                      onChange={e => updateQueueItem(idx, { category_id: e.target.value })}
                      style={{ flex: '1 1 120px', padding: '6px 8px', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '0.8rem', outline: 'none', background: 'var(--bg-subtle)', color: 'var(--text)', minWidth: 0 }}
                    >
                      <option value="">Category…</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  
                  {/* Individual Instructor Dropdown */}
                  {isEditable && (
                    <select
                      value={item.instructor_id}
                      onChange={e => updateQueueItem(idx, { instructor_id: e.target.value })}
                      style={{ flex: '1 1 120px', padding: '6px 8px', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '0.8rem', outline: 'none', background: 'var(--bg-subtle)', color: 'var(--text)', minWidth: 0 }}
                    >
                      <option value="">Instructor…</option>
                      {courseInstructors.length > 0 && (
                        <optgroup label={`Teaches ${fixedCourseCode || 'Course'}`}>
                          {courseInstructors.map(i => <option key={`ci-${i.id}`} value={i.id}>{i.name}</option>)}
                        </optgroup>
                      )}
                      {otherInstructorsGrouped.map(group => (
                        <optgroup key={`group-${group.name}`} label={`${group.name} Instructors`}>
                          {group.list.map(i => <option key={`i-${i.id}`} value={i.id}>{i.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  )}

                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => removeFromQueue(idx)}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}
                      title="Remove from queue"
                    >✕</button>
                  )}
                </div>

                {item.status === 'uploading' && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                      <span>Uploading…</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.progress}%`, height: '100%', background: 'linear-gradient(90deg, #7C3AED, #EC4899)', transition: 'width 0.2s', borderRadius: '3px' }} />
                    </div>
                  </div>
                )}

                {item.error && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: item.status === 'skipped' ? '#92400E' : '#DC2626', fontWeight: 500 }}>
                    {item.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {uploadQueue.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={uploading || uploadQueue.filter(f => f.status === 'queued').length === 0}
            style={{ opacity: uploading ? 0.7 : 1, position: 'relative' }}
          >
            {uploading ? (
              <>Uploading {uploadQueue.filter(f => f.status === 'done').length}/{uploadQueue.filter(f => f.status !== 'error').length}…</>
            ) : (
              <>Upload {uploadQueue.filter(f => f.status === 'queued').length} file{uploadQueue.filter(f => f.status === 'queued').length !== 1 ? 's' : ''}</>
            )}
          </button>
          {!uploading && (
            <button
              type="button"
              onClick={() => { setUploadQueue([]); setUploadError(''); }}
              style={{ padding: '10px 20px', border: '2px solid var(--border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.9rem' }}
            >Clear All</button>
          )}
        </div>
      )}
    </form>
  );
};

export default BulkUploader;
