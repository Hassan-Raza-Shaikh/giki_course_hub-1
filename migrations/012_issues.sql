-- Migration 012: Issues system
CREATE TABLE IF NOT EXISTS issues (
    issue_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'material', 'ui', 'bug', 'feature', 'other'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_by VARCHAR(255), -- admin email
    admin_notes TEXT
);

CREATE INDEX idx_issues_status ON issues(status);
