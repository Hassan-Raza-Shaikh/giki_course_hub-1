import re

with open('src/pages/AdminPanel.jsx', 'r') as f:
    content = f.read()

issues_ui = """                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Resolution Notes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(internal, not shown to users)</span></label>"""

issues_replacement = """              </div>
            ))}
          </div>
          <div className="page-container">
            <button onClick={() => setIssuesPage(p => Math.max(1, p - 1))} disabled={issuesPage === 1} className="page-btn">Prev</button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Page {issuesPage} of {issuesTotalPages}</span>
            <button onClick={() => setIssuesPage(p => Math.min(issuesTotalPages, p + 1))} disabled={issuesPage >= issuesTotalPages} className="page-btn">Next</button>
          </div>
        </>"""

content = content.replace("""              </div>
            ))}
          </div>
        </>""", issues_replacement)

with open('src/pages/AdminPanel.jsx', 'w') as f:
    f.write(content)

