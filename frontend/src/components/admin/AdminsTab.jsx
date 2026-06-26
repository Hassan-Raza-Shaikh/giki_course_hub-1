import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Shield } from 'lucide-react';
import { LoadingRow, EmptyRow, btnStyle, fmtDate } from './AdminHelpers';

export const AdminsTab = ({ isAdmin, showToast, setConfirmModal }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminNotes, setNewAdminNotes] = useState('');

  const loadAdmins = () => {
    setLoading(true);
    api.get('/admin/admins')
      .then(r => setAdmins(r.data.admins || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadAdmins();
  }, [isAdmin]);

  const grantAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    try {
      const res = await api.post('/admin/admins', { email: newAdminEmail, notes: newAdminNotes });
      if (res.data.success) {
        showToast(`Admin granted to ${newAdminEmail}`);
        setNewAdminEmail(''); 
        setNewAdminNotes('');
        loadAdmins();
      }
    } catch (err) {
      showToast('Error granting admin', 'error');
    }
  };

  const revokeAdmin = async (email) => {
    setConfirmModal({
      title: 'Revoke Admin',
      body: `Remove admin privileges from ${email}? They will lose access to this panel immediately.`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/admin/admins/${email}`);
          showToast(`Admin revoked from ${email}`);
          setAdmins(a => a.filter(x => x.email !== email));
          setConfirmModal(null);
        } catch (err) {
          showToast('Error revoking admin', 'error');
        }
      }
    });
  };

  return (
    <div>
      <form onSubmit={grantAdmin} style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', padding: '24px', marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 800, marginBottom: '16px' }}><Shield size={24} /> Grant Admin Access</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} type="email" placeholder="user@example.com" required style={{ flex: 2, minWidth: '200px', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }} />
          <input value={newAdminNotes} onChange={e => setNewAdminNotes(e.target.value)} placeholder="Role / notes (optional)" style={{ flex: 3, minWidth: '160px', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }} />
          <button type="submit" style={btnStyle('#6366F1')}>Grant</button>
        </div>
      </form>
      <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
        {loading ? <LoadingRow /> : admins.length === 0 ? <EmptyRow icon={<Shield size={48} color="var(--primary)" />} msg="No admins configured yet." /> : admins.map(a => (
          <div key={a.email} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{a.email}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{a.notes || 'No role specified'} · granted by <strong>{a.granted_by}</strong> · {fmtDate(a.granted_at)}</div>
            </div>
            <button onClick={() => revokeAdmin(a.email)} style={btnStyle('#EF4444')}>Revoke</button>
          </div>
        ))}
      </div>
    </div>
  );
};
