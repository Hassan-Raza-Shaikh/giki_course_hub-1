import re

with open('src/pages/AdminPanel.jsx', 'r') as f:
    content = f.read()

# Add states
state_addition = """  const [allFiles, setAllFiles] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  
  const [issuesPage, setIssuesPage] = useState(1);
  const [issuesTotalPages, setIssuesTotalPages] = useState(1);"""
content = content.replace("  const [allFiles, setAllFiles] = useState([]);\n  const [users,    setUsers]    = useState([]);", state_addition)

# Update loaders
issues_loader = "issues:  () => api.get('/admin/issues', { params: { page: issuesPage } }).then(r => { setIssues(r.data.issues || []); setIssueCounts(r.data.counts || {}); setIssuesTotalPages(r.data.pages || 1); }),"
users_loader = "users:   () => api.get('/admin/users', { params: { page: usersPage } }).then(r => { setUsers(r.data.users || []); setUsersTotalPages(r.data.pages || 1); }),"

content = re.sub(r"issues:\s*\(\) => api\.get\('/admin/issues'\)\.then\(r => \{ setIssues\(r\.data\.issues \|\| \[\]\); setIssueCounts\(r\.data\.counts \|\| \{\}\); \}\),", issues_loader, content)
content = re.sub(r"users:\s*\(\) => api\.get\('/admin/users'\)\.then\(r => setUsers\(r\.data\.users \|\| \[\]\)\),", users_loader, content)

# Add useEffects for page changes
use_effects_addition = """  // Re-fetch users when page changes
  useEffect(() => {
    if (tab !== 'users' || !isAdmin) return;
    setLoading(true);
    api.get('/admin/users', { params: { page: usersPage } })
      .then(r => {
        setUsers(r.data.users || []);
        setUsersTotalPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [usersPage, tab, isAdmin]);

  // Re-fetch issues when page changes
  useEffect(() => {
    if (tab !== 'issues' || !isAdmin) return;
    setLoading(true);
    api.get('/admin/issues', { params: { page: issuesPage } })
      .then(r => {
        setIssues(r.data.issues || []);
        setIssueCounts(r.data.counts || {});
        setIssuesTotalPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [issuesPage, tab, isAdmin]);

  // Re-fetch"""
content = content.replace("  // Re-fetch", use_effects_addition, 1)

# Add pagination UI for users
users_ui = """              </tbody>
            </table>
          </div>
          
          <div className="page-container">
            <button onClick={() => setUsersPage(p => Math.max(1, p - 1))} disabled={usersPage === 1} className="page-btn">Prev</button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Page {usersPage} of {usersTotalPages}</span>
            <button onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))} disabled={usersPage >= usersTotalPages} className="page-btn">Next</button>
          </div>
        </>"""
content = content.replace("""              </tbody>
            </table>
          </div>
        </>""", users_ui)

# Add pagination UI for issues
issues_ui = """                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Resolution Notes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(internal, not shown to users)</span></label>
"""

with open('src/pages/AdminPanel.jsx', 'w') as f:
    f.write(content)

