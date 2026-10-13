import os
import re

file = '/Users/hassan/Projects/giki_course_hub-1/frontend/src/pages/AdminPanel.jsx'

with open(file, 'r') as f:
    content = f.read()

# borders
content = content.replace("border: '2px solid var(--border)'", "border: '1px solid var(--border)'")
content = content.replace("border: '2px solid currentColor'", "border: '1px solid currentColor'")
content = content.replace("border: '2px solid var(--text)'", "border: '1px solid var(--border)'")
content = content.replace("border: '2px solid #D97706'", "border: '1px solid #D97706'")
content = content.replace("border: '2px solid #FCD34D'", "border: '1px solid var(--border)'")
content = content.replace("border: '2px solid #EF4444'", "border: '1px solid #EF4444'")
content = content.replace("border: '2px solid #DC2626'", "border: '1px solid #DC2626'")

# modal border trick (border: `2px solid ${confirmModal.danger ? '#DC2626' : 'var(--text)'}`)
content = content.replace("border: `2px solid ${confirmModal.danger ? '#DC2626' : 'var(--text)'}`", "border: '1px solid var(--border)'")
content = content.replace("border: `2px solid ${confirmModal.danger ? '#DC2626' : '#10B981'}`", "border: '1px solid var(--border)'")


# shadows
content = content.replace("boxShadow: '4px 4px 0 var(--border)'", "boxShadow: '0 8px 32px rgba(0,0,0,0.06)'")
content = content.replace("boxShadow: '4px 4px 0 var(--text)'", "boxShadow: '0 8px 32px rgba(0,0,0,0.06)'")
content = content.replace("boxShadow: '6px 6px 0 var(--text)'", "boxShadow: '0 10px 40px rgba(0,0,0,0.1)'")
content = content.replace("boxShadow: '6px 6px 0 #D97706'", "boxShadow: '0 10px 40px rgba(0,0,0,0.1)'")
content = content.replace("boxShadow: '2px 2px 0 var(--border)'", "boxShadow: '0 4px 12px rgba(0,0,0,0.05)'")

# modal shadow trick
content = content.replace("boxShadow: `6px 6px 0 ${confirmModal.danger ? '#DC2626' : 'var(--text)'}`", "boxShadow: '0 10px 40px rgba(0,0,0,0.1)'")


# specific border radius for wrappers
content = content.replace("borderRadius: '14px'", "borderRadius: '24px'")
content = content.replace("borderRadius: '16px'", "borderRadius: '24px'")
content = content.replace("borderRadius: '12px'", "borderRadius: '100px'") # For pill-like containers

# specific modal / button radius
content = content.replace("borderRadius: '8px'", "borderRadius: '100px'")
content = content.replace("borderRadius: '10px'", "borderRadius: '16px'")

with open(file, 'w') as f:
    f.write(content)

print("Applied styling replacements to AdminPanel.jsx!")
