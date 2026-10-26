import os
import re

def check_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find all imported names
    imported = set()
    for match in re.finditer(r'import\s+.*?\{([^}]+)\}.*?from', content):
        names = [n.split(' as ')[0].strip() for n in match.group(1).split(',')]
        imported.update(names)
    for match in re.finditer(r'import\s+([A-Z]\w+)\s+from', content):
        imported.add(match.group(1))

    # React standard hooks
    imported.update(['React', 'useState', 'useEffect', 'useCallback', 'useRef', 'useMemo', 'Fragment'])
    # HTML native elements
    imported.update(['A', 'B', 'P', 'Div', 'Span', 'Img', 'Input', 'Button', 'Form', 'Nav', 'Header', 'Footer'])

    # Find all JSX components used `<ComponentName`
    used = set()
    for match in re.finditer(r'<([A-Z]\w+)', content):
        used.add(match.group(1))

    missing = used - imported
    # filter out internally defined components
    missing = [m for m in missing if not re.search(r'(const|function|class)\s+' + m + r'\s*=?\s*\(', content)]

    if missing:
        print(f"{filepath}: missing {missing}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.jsx'):
            check_file(os.path.join(root, file))
