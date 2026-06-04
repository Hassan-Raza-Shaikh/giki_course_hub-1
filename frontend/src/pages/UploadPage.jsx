import React, { useState, useEffect } from 'react';
import api from '../services/api';
import BulkUploader from '../components/BulkUploader';
import LoadingSpinner from '../components/common/LoadingSpinner';

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
    <div style={{ minHeight: '100vh', paddingTop: '70px', background: 'var(--bg-main)' }}>
      <div className="page-container" style={{ padding: '40px 24px', maxWidth: '1000px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'Outfit', color: 'var(--text)', marginBottom: '8px' }}>
          Global Upload Center
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '32px' }}>
          Contribute materials to any course. Select a course, set the category and instructor, and drop your files below.
        </p>

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
