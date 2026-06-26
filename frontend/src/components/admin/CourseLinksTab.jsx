import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link, Trash2 } from 'lucide-react';
import { LoadingRow, EmptyRow, btnStyle, fmtDate, inputStyle } from './AdminHelpers';

export const CourseLinksTab = ({ isAdmin, showToast }) => {
  const [courseLinks, setCourseLinks] = useState([]);
  const [courseLinkForm, setCourseLinkForm] = useState({ course_code_1: '', course_code_2: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    api.get('/admin/course-links')
      .then(r => {
        setCourseLinks(r.data.links || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const saveCourseLink = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/course-links', courseLinkForm);
      showToast('Course link added');
      setCourseLinkForm({ course_code_1: '', course_code_2: '' });
      api.get('/admin/course-links').then(r => setCourseLinks(r.data.links || []));
    } catch (err) {
      showToast(err.response?.data?.message || 'Error adding course link', 'error');
    }
  };

  const deleteCourseLink = async (link_id) => {
    try {
      await api.delete(`/admin/course-links/${link_id}`);
      showToast('Course link removed');
      setCourseLinks(l => l.filter(x => x.link_id !== link_id));
    } catch (err) {
      showToast('Error removing course link', 'error');
    }
  };

  return (
    <div>
      <form onSubmit={saveCourseLink} style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', padding: '28px', marginBottom: '32px' }}>
        <h3 style={{ fontWeight: 950, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link size={16} /> Link Two Courses (Resource Sharing)
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
          When two courses are linked, any file uploaded to one will organically appear in the other.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px' }}>First Course Code</label>
            <input value={courseLinkForm.course_code_1} onChange={e => setCourseLinkForm({...courseLinkForm, course_code_1: e.target.value.toUpperCase()})} placeholder="e.g. CE221" required style={inputStyle} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '6px' }}>Second Course Code</label>
            <input value={courseLinkForm.course_code_2} onChange={e => setCourseLinkForm({...courseLinkForm, course_code_2: e.target.value.toUpperCase()})} placeholder="e.g. EE221" required style={inputStyle} />
          </div>
        </div>
        <button type="submit" style={{ ...btnStyle('var(--primary)'), marginTop: '20px' }}>Create Link</button>
      </form>

      <div style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? <LoadingRow /> : courseLinks.length === 0 ? (
          <EmptyRow icon={<Link size={48} color="var(--primary)" />} msg="No manual course links active." />
        ) : courseLinks.map(l => (
          <div key={l.link_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{l.course_code_1} ↔ {l.course_code_2}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Linked on {fmtDate(l.created_at)}</div>
            </div>
            <button onClick={() => deleteCourseLink(l.link_id)} style={btnStyle('#EF4444')}><Trash2 size={16} /> Unlink</button>
          </div>
        ))}
      </div>
    </div>
  );
};
