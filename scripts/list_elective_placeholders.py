import json

with open('giki_courses_with_codes.json', 'r') as f:
    data = json.load(f)

count = 0
for fac in data['faculties']:
    for prog in fac['programs']:
        for sem in prog['semesters']:
            for course in sem['courses']:
                code = course.get('code', '').lower()
                name = course.get('name', '').lower()
                if 'xx' in code or 'elective' in name:
                    count += 1
                    print(course.get('code'), "-", course.get('name'))

print(f"\nTotal placeholders found: {count}")
