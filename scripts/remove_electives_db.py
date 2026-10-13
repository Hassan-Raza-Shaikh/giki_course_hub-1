import os
import json
from firebase_admin import firestore
from firebase_admin_init import init_firebase_admin

init_firebase_admin()
db = firestore.client()

def is_elective(course):
    name = course.get('name', '').lower()
    code = course.get('code', '').lower()
    
    if 'elective' in name or 'specialization' in name:
        return True
    
    # Generic placeholders with XXXXX
    if 'xxxxx' in code or code == 'cvxxx':
        if 'elective' in name:
            return True
            
    return False

# 1. Update the JSON file
with open('giki_courses_with_codes.json', 'r') as f:
    data = json.load(f)

removed_count = 0
for fac in data['faculties']:
    for prog in fac['programs']:
        for sem in prog['semesters']:
            original_courses = sem.get('courses', [])
            filtered_courses = [c for c in original_courses if not is_elective(c)]
            removed_count += len(original_courses) - len(filtered_courses)
            sem['courses'] = filtered_courses

with open('giki_courses_with_codes.json', 'w') as f:
    json.dump(data, f, indent=4)
print(f"Removed {removed_count} generic electives from JSON.")

# 2. Delete from Firestore
courses_ref = db.collection('courses')
all_courses = courses_ref.stream()

db_removed = 0
batch = db.batch()

for doc in all_courses:
    c = doc.to_dict()
    if is_elective(c):
        batch.delete(doc.reference)
        db_removed += 1

if db_removed > 0:
    batch.commit()

print(f"Deleted {db_removed} generic electives from Firestore.")
