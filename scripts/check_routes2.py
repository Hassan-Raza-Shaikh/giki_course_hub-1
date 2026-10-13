import re
import os

def check_file(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    # Find all route decorators
    routes = re.finditer(r'@(\w+_bp\.route)\(([^)]+)\)', content)
    for match in routes:
        route_line = match.group(0)
        start_idx = match.start()
        # Get the next few lines
        next_lines = content[start_idx:start_idx+300]
        func_match = re.search(r'def\s+(\w+)\(', next_lines)
        if func_match:
            func_name = func_match.group(1)
            
            # Check if this is an admin route
            if 'admin' in match.group(2) or 'admin' in func_name:
                if '_require_admin' not in next_lines:
                    print(f"[!] MISSING ADMIN CHECK: {filename} - {func_name} - {route_line}")

check_file('routes/admin_routes.py')
