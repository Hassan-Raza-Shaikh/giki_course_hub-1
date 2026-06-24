import React, { useState, useEffect } from 'react';
import api from '../services/api';
import BulkUploader from '../components/BulkUploader';
import LoadingSpinner from '../components/common/LoadingSpinner';

import { UploadCloud } from 'lucide-react';

const UploadPage = ({ user, onSignIn }) => {
  const [categories, setCategories] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, instRes, coursesRes] = await Promise.all([
          api.get('/categories'),
          api.get('/instructors'),
          api.get('/courses/list') 
        ]);
        
        if (catRes.data.success) setCategories(catRes.data.categories || []);
        if (instRes.data.success) setInstructors(instRes.data.instructors || []);
        if (coursesRes.data.success) setAllCourses(coursesRes.data.courses || []);
      } catch (err) {
        console.error("Failed to load upload metadata", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 70 }}>
        <LoadingSpinner message="Waking up server..." />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-hero)', paddingTop: '100px', paddingBottom: '80px' }}>
      <div className="page-container" style={{ maxWidth: '1000px' }}>
        
        {/* Header */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '32px 40px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          marginBottom: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          color: 'var(--text)',
          flexWrap: 'wrap',
          animation: 'fadeUp 0.4s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
          }}>
            <UploadCloud size={40} strokeWidth={2.5} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px 0', lineHeight: 1.1 }}>
              Global Upload Center
            </h1>
            <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              Contribute materials to any course. Select a course, set the category and instructor, and drop your files below.
            </p>
          </div>
        </div>

        <BulkUploader 
          user={user}
          onSignIn={onSignIn}
          categories={categories}
          instructors={instructors}
          allCourses={allCourses}
        />
      </div>
    </div>
  );
};

export default UploadPage;
