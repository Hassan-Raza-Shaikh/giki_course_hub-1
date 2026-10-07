import os
from firebase_admin import firestore
from firebase_admin_init import init_firebase_admin

init_firebase_admin()
db = firestore.client()

courses_ref = db.collection('courses')
doc = next(courses_ref.stream())
print(doc.to_dict())
