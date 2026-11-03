import re

with open('src/pages/AdminPanel.jsx', 'r') as f:
    content = f.read()

content = content.replace("🗑 Delete", "<Trash2 size={16} style={{ marginRight: '4px' }} /> Delete")
content = content.replace("🗑 Remove Note", "<Trash2 size={16} style={{ marginRight: '4px' }} /> Remove Note")
content = content.replace("🔄", "<RefreshCw size={20} />")
content = content.replace("👁 Preview", "<Eye size={16} style={{ marginRight: '4px' }} /> Preview")
content = content.replace("👁 View File", "<Eye size={16} style={{ marginRight: '4px' }} /> View File")
content = content.replace("👁 View", "<Eye size={16} style={{ marginRight: '4px' }} /> View")
content = content.replace("{f.count} ⬇", "{f.count} <Download size={14} style={{ marginLeft: '4px' }} />")

with open('src/pages/AdminPanel.jsx', 'w') as f:
    f.write(content)
