import re

content = open('src/pages/AdminPanel.jsx').read()

lines = content.split('\n')
stack = []

for i, line in enumerate(lines):
    tags = re.findall(r'<\/?([a-zA-Z0-9]+)[^>]*>', line)
    for tag in tags:
        # Ignore self closing tags
        if "/>" in line.split(f"<{tag}")[-1].split(">")[0]: continue
        if tag in ["br", "hr", "input", "img"]: continue
        
        if line.find(f"</{tag}>") != -1:
            # it has both open and close, ignore simple cases
            pass
        
        if line.find(f"</{tag}") != -1:
            if len(stack) > 0 and stack[-1][0] == tag:
                stack.pop()
        elif line.find(f"<{tag}") != -1:
            stack.append((tag, i+1))

print(stack)
