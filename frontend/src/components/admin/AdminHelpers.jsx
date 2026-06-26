import React from 'react';
import { CheckCircle, XCircle, Trash2, Shield, Ban, BookOpen, Edit3, Flag, Play, Activity } from 'lucide-react';

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtSize = (b) => b ? `${(b / (1024 * 1024)).toFixed(2)} MB` : '—';

export const STATUS_COLORS = {
  approved: { bg: '#D1FAE5', color: '#065F46' },
  pending:  { bg: '#FEF3C7', color: '#92400E' },
  rejected: { bg: '#FEE2E2', color: '#991B1B' },
  resolved: { bg: '#DBEAFE', color: '#1E40AF' },
  dismissed: { bg: '#F3F4F6', color: '#374151' },
};

export const ACTION_ICONS = {
  approve_file:  <CheckCircle size={18} strokeWidth={1.5} />, reject_file: <XCircle size={18} strokeWidth={1.5} />, delete_file: <Trash2 size={18} strokeWidth={1.5} />,
  grant_admin:   <Shield size={18} strokeWidth={1.5} />, revoke_admin: <Ban size={18} strokeWidth={1.5} />,
  create_course: <BookOpen size={18} strokeWidth={1.5} />, update_course: <Edit3 size={18} strokeWidth={1.5} />, delete_course: <Trash2 size={18} strokeWidth={1.5} />,
  resolve_report: <Flag size={18} strokeWidth={1.5} />, dismiss_report: <Play size={18} strokeWidth={1.5} />
};

export const LoadingRow = () => (
  <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
);

export const EmptyRow = ({ icon, msg }) => (
  <div style={{ padding: '60px', textAlign: 'center' }}>
    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{icon}</div>
    <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{msg}</p>
  </div>
);

export const btnStyle = (bg) => ({
  color: (bg === 'var(--electric)' || bg === 'var(--primary)' || bg === 'var(--tertiary)' || bg === 'var(--text)') ? 'var(--bg-hero)' : 'white', 
  background: bg,  border: `2px solid ${bg}`,
  borderRadius: '8px', padding: '7px 14px', fontWeight: 700,
  fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap',
});

export const inputStyle = {
  width: '100%', padding: '12px 14px', border: '2px solid var(--border)',
  borderRadius: '10px', fontSize: '0.9rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  background: 'var(--bg-white)', color: 'var(--text)'
};

export const cardStyle = {
  background: 'var(--bg-white)', padding: '24px', borderRadius: '16px',
  border: '2px solid var(--border)', boxShadow: '4px 4px 0 var(--border)'
};

export const cardTitleStyle = { 
  fontSize: '1.1rem', fontWeight: 900, marginBottom: '20px', 
  paddingBottom: '12px', borderBottom: '1px solid var(--border)' 
};

export const statRowStyle = { 
  display: 'flex', alignItems: 'center', gap: '12px', 
  padding: '12px 0', borderBottom: '1px solid var(--border)' 
};

export const statBadgeStyle = { 
  width: '24px', height: '24px', borderRadius: '50%', 
  background: 'var(--bg-subtle)', display: 'flex', 
  alignItems: 'center', justifyContent: 'center', 
  fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' 
};
