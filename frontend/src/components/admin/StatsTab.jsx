import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Flame, Download, Gem, Bookmark, Folder, PieChart } from 'lucide-react';
import { LoadingRow } from './AdminHelpers';

const cardStyle = {
  background: 'var(--bg-white)', padding: '24px', borderRadius: '16px',
  border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)'
};

const cardTitleStyle = { 
  fontSize: '1.1rem', fontWeight: 900, marginBottom: '20px', 
  paddingBottom: '12px', borderBottom: '1px solid var(--border)' 
};

const statRowStyle = { 
  display: 'flex', alignItems: 'center', gap: '12px', 
  padding: '12px 0', borderBottom: '1px solid var(--border)' 
};

const statBadgeStyle = { 
  width: '24px', height: '24px', borderRadius: '50%', 
  background: 'var(--bg-subtle)', display: 'flex', 
  alignItems: 'center', justifyContent: 'center', 
  fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' 
};

export const StatsTab = ({ isAdmin }) => {
  const [detailedStats, setDetailedStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageDL, setPageDL] = useState(1);
  const [pageBM, setPageBM] = useState(1);
  const [pageC, setPageC] = useState(1);
  const STATS_PER_PAGE = 10;

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    api.get('/admin/stats/detailed')
      .then(r => setDetailedStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) return <LoadingRow />;
  if (!detailedStats) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}><Flame size={20} color="var(--accent)" /> Most Downloaded</h3>
        {detailedStats.most_downloaded.slice((pageDL - 1) * STATS_PER_PAGE, pageDL * STATS_PER_PAGE).map((f, i) => (
          <div key={f.file_id} style={statRowStyle}>
            <span style={statBadgeStyle}>{(pageDL - 1) * STATS_PER_PAGE + i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.course_code}</div>
            </div>
            <div style={{ fontWeight: 900, color: 'var(--primary)' }}>{f.count} <Download size={14} style={{ marginLeft: '4px' }} /></div>
          </div>
        ))}
        {Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE) > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: 'var(--bg-subtle)', padding: '8px', borderRadius: '10px', border: '1.5px solid var(--border)' }}>
            <button onClick={() => setPageDL(p => Math.max(1, p - 1))} disabled={pageDL === 1} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '100px', fontWeight: 700, fontSize: '0.8rem', cursor: pageDL === 1 ? 'not-allowed' : 'pointer', opacity: pageDL === 1 ? 0.5 : 1 }}>Prev</button>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Page {pageDL} of {Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE)}</span>
            <button onClick={() => setPageDL(p => Math.min(Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE), p + 1))} disabled={pageDL === Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE)} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '100px', fontWeight: 700, fontSize: '0.8rem', cursor: pageDL === Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE) ? 'not-allowed' : 'pointer', opacity: pageDL === Math.ceil(detailedStats.most_downloaded.length / STATS_PER_PAGE) ? 0.5 : 1 }}>Next</button>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}><Gem size={20} color="var(--electric)" /> Most Bookmarked</h3>
        {detailedStats.most_bookmarked.slice((pageBM - 1) * STATS_PER_PAGE, pageBM * STATS_PER_PAGE).map((f, i) => (
          <div key={f.file_id} style={statRowStyle}>
            <span style={statBadgeStyle}>{(pageBM - 1) * STATS_PER_PAGE + i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.course_code}</div>
            </div>
            <div style={{ fontWeight: 900, color: '#EC4899' }}>{f.count} <Bookmark size={14} /></div>
          </div>
        ))}
        {Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE) > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: 'var(--bg-subtle)', padding: '8px', borderRadius: '10px', border: '1.5px solid var(--border)' }}>
            <button onClick={() => setPageBM(p => Math.max(1, p - 1))} disabled={pageBM === 1} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '100px', fontWeight: 700, fontSize: '0.8rem', cursor: pageBM === 1 ? 'not-allowed' : 'pointer', opacity: pageBM === 1 ? 0.5 : 1 }}>Prev</button>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Page {pageBM} of {Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE)}</span>
            <button onClick={() => setPageBM(p => Math.min(Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE), p + 1))} disabled={pageBM === Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE)} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '100px', fontWeight: 700, fontSize: '0.8rem', cursor: pageBM === Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE) ? 'not-allowed' : 'pointer', opacity: pageBM === Math.ceil(detailedStats.most_bookmarked.length / STATS_PER_PAGE) ? 0.5 : 1 }}>Next</button>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}><Folder size={20} /> Top Courses</h3>
        {detailedStats.per_course.slice((pageC - 1) * STATS_PER_PAGE, pageC * STATS_PER_PAGE).map((c, i) => (
          <div key={c.course_code} style={statRowStyle}>
            <div style={{ flex: 1, fontWeight: 700 }}>{c.course_code}</div>
            <div style={{ fontWeight: 900 }}>{c.count} files</div>
          </div>
        ))}
        {Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE) > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: 'var(--bg-subtle)', padding: '8px', borderRadius: '10px', border: '1.5px solid var(--border)' }}>
            <button onClick={() => setPageC(p => Math.max(1, p - 1))} disabled={pageC === 1} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '100px', fontWeight: 700, fontSize: '0.8rem', cursor: pageC === 1 ? 'not-allowed' : 'pointer', opacity: pageC === 1 ? 0.5 : 1 }}>Prev</button>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Page {pageC} of {Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE)}</span>
            <button onClick={() => setPageC(p => Math.min(Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE), p + 1))} disabled={pageC === Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE)} style={{ padding: '6px 12px', background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: '100px', fontWeight: 700, fontSize: '0.8rem', cursor: pageC === Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE) ? 'not-allowed' : 'pointer', opacity: pageC === Math.ceil(detailedStats.per_course.length / STATS_PER_PAGE) ? 0.5 : 1 }}>Next</button>
          </div>
        )}
      </div>
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}><PieChart size={20} /> Content Breakdown</h3>
        {detailedStats.per_category.map((c) => (
          <div key={c.category} style={statRowStyle}>
            <div style={{ flex: 1, fontWeight: 700 }}>{c.category}</div>
            <div style={{ fontWeight: 900, color: 'var(--text-muted)' }}>{c.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
