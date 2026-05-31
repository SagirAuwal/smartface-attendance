import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models import models

db = SessionLocal()
try:
    print("=== USERS ===")
    users = db.query(models.User).all()
    for u in users:
        print(f"ID: {u.id}, Name: {u.fullname}, Email: {u.email}, Role: {u.role}")
        
    print("\n=== STUDENTS ===")
    students = db.query(models.Student).all()
    for s in students:
        print(f"Student ID: {s.student_id}, Matric: {s.matric_number}, User ID: {s.user_id}")
        
    print("\n=== FACE EMBEDDINGS ===")
    embs = db.query(models.FaceEmbedding).all()
    for e in embs:
        print(f"ID: {e.id}, Student ID: {e.student_id}, Vector Size: {len(e.embedding_vector)}")
except Exception as ex:
    print("Error:", ex)
finally:
    db.close()
