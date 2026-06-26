import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { GraduationCap } from 'lucide-react';
import { LoadingRow, btnStyle } from './AdminHelpers';

export const InstructorsTab = ({ isAdmin, showToast, faculties }) => {
  const [instructors, setInstructors] = useState([]);
  const [instructorForm, setInstructorForm] = useState({ name: '', faculty_name: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    api.get('/instructors')
      .then(r => setInstructors(r.data.instructors || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const saveInstructor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/instructors', instructorForm);
      showToast('Instructor added');
      setInstructorForm({ name: '', faculty_name: '' });
      api.get('/instructors').then(r => setInstructors(r.data.instructors || []));
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving instructor', 'error');
    }
  };

  return (
    <div>
      <form onSubmit={saveInstructor} style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', padding: '28px', marginBottom: '32px' }}>
        <h3 style={{ fontWeight: 900, marginBottom: '20px' }}><GraduationCap size={24} /> Add New Instructor</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '6px' }}>Full Name *</label>
            <input value={instructorForm.name} onChange={e => setInstructorForm({...instructorForm, name: e.target.value})} placeholder="e.g. Dr. Ali" required style={{ width: '100%', padding: '14px', borderRadius: '100px', border: '1px solid var(--border)' }} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '6px' }}>Faculty *</label>
            <select 
              value={instructorForm.faculty_name} 
              onChange={e => setInstructorForm({...instructorForm, faculty_name: e.target.value})} 
              required
              style={{ width: '100%', padding: '14px', borderRadius: '100px', border: '1px solid var(--border)', background: 'var(--bg-white)' }}
            >
              <option value="">Select Faculty</option>
              {faculties.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '100px', fontWeight: 700, width: '100%', padding: '14px', marginTop: '24px', cursor: 'pointer' }}>
          Create Instructor
        </button>
      </form>

      <div style={{ background: 'var(--bg-white)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div> : instructors.map(i => (
          <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{i.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i.faculty || 'General Faculty'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
