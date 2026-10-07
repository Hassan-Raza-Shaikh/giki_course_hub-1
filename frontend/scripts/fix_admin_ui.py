import re

with open('src/pages/AdminPanel.jsx', 'r') as f:
    content = f.read()

# Fix issues UI pagination
issues_old = """              </div>
            ))}
          </div>
          <div className="page-container">
            <button onClick={() => setIssuesPage(p => Math.max(1, p - 1))} disabled={issuesPage === 1} className="page-btn">Prev</button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Page {issuesPage} of {issuesTotalPages}</span>
            <button onClick={() => setIssuesPage(p => Math.min(issuesTotalPages, p + 1))} disabled={issuesPage >= issuesTotalPages} className="page-btn">Next</button>
          </div>
        </>"""

issues_new = """              </div>
            ))}
          </div>
          
          {issuesTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              <button
                disabled={issuesPage <= 1}
                onClick={() => setIssuesPage(p => p - 1)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--border)',
                  cursor: issuesPage <= 1 ? 'not-allowed' : 'pointer', opacity: issuesPage <= 1 ? 0.5 : 1
                }}
              >
                Prev
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Page {issuesPage} of {issuesTotalPages}</span>
              <button
                disabled={issuesPage >= issuesTotalPages}
                onClick={() => setIssuesPage(p => p + 1)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--border)',
                  cursor: issuesPage >= issuesTotalPages ? 'not-allowed' : 'pointer', opacity: issuesPage >= issuesTotalPages ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          )}
        </>"""

content = content.replace(issues_old, issues_new)

# Add users UI pagination
users_old = """        {/* ── Users tab ── */}
        {tab === 'users' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
            {loading ? <LoadingRow /> : users.length === 0 ? <EmptyRow icon={<Users size={48} color="var(--primary)" />} msg="No users yet." /> : users.map(u => (
              <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                  {(u.username || u.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{u.username} {u.is_admin && <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#EDE9FE', color: '#5B21B6', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}><Shield size={10} /> admin</span>}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email} · joined {fmtDate(u.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}"""

users_new = """        {/* ── Users tab ── */}
        {tab === 'users' && (
          <>
          <div style={{ background: 'var(--bg-white)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden' }}>
            {loading ? <LoadingRow /> : users.length === 0 ? <EmptyRow icon={<Users size={48} color="var(--primary)" />} msg="No users yet." /> : users.map(u => (
              <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                  {(u.username || u.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{u.username} {u.is_admin && <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#EDE9FE', color: '#5B21B6', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}><Shield size={10} /> admin</span>}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email} · joined {fmtDate(u.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
          {usersTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              <button
                disabled={usersPage <= 1}
                onClick={() => setUsersPage(p => p - 1)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--border)',
                  cursor: usersPage <= 1 ? 'not-allowed' : 'pointer', opacity: usersPage <= 1 ? 0.5 : 1
                }}
              >
                Prev
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Page {usersPage} of {usersTotalPages}</span>
              <button
                disabled={usersPage >= usersTotalPages}
                onClick={() => setUsersPage(p => p + 1)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--border)',
                  cursor: usersPage >= usersTotalPages ? 'not-allowed' : 'pointer', opacity: usersPage >= usersTotalPages ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          )}
          </>
        )}"""

content = content.replace(users_old, users_new)

with open('src/pages/AdminPanel.jsx', 'w') as f:
    f.write(content)

