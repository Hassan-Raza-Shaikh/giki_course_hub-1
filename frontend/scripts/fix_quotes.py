with open('src/pages/AdminPanel.jsx', 'r') as f:
    content = f.read()

# Fix string literals containing React nodes
content = content.replace(
    "'<Trash2 size={16} style={{ marginRight: '4px' }} /> Delete File'",
    "<><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete File</>"
)
content = content.replace(
    "'<Trash2 size={16} style={{ marginRight: '4px' }} /> Delete Issue Report'",
    "<><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete Issue Report</>"
)
content = content.replace(
    "'<Trash2 size={16} style={{ marginRight: '4px' }} /> Delete Course'",
    "<><Trash2 size={16} style={{ marginRight: '4px' }} /> Delete Course</>"
)

with open('src/pages/AdminPanel.jsx', 'w') as f:
    f.write(content)
