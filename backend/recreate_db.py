import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine, Base
from app.models import models
from app.core import security

def recreate_db():
    db_file = "smartface.db"
    
    # Close database engine connections if any
    engine.dispose()
    
    # 1. Delete existing database file to wipe all old details
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
            print("Successfully deleted old database file.")
        except Exception as e:
            print(f"Could not delete database file: {e}")
            
    # 2. Re-create all database tables
    print("Re-creating all database tables...")
    Base.metadata.create_all(bind=engine)
    
    # 3. Seed fresh production credentials
    db = SessionLocal()
    try:
        print("Seeding new clean credentials...")
        
        # Admin
        admin = models.User(
            fullname="System Administrator",
            email="admin@smartface.com",
            role="admin",
            password_hash=security.get_password_hash("adminpass2026")
        )
        db.add(admin)
        
        # Lecturer (Tariq Yusuf)
        lecturer = models.User(
            fullname="Dr. Tariq Yusuf",
            email="tariq@smartface.com",
            role="lecturer",
            password_hash=security.get_password_hash("lecturerpass2026"),
            department="Computer Engineering"
        )
        db.add(lecturer)
        db.commit()
        db.refresh(lecturer)
        
        # Create a default course for the lecturer
        course = models.Course(
            course_code="COE501",
            course_name="Biometric Systems and Applications",
            lecturer_id=lecturer.id
        )
        db.add(course)
        
        # Student (Muhammad Sageer)
        student_user = models.User(
            fullname="Muhammad Sageer",
            email="sageer@smartface.com",
            role="student",
            password_hash=security.get_password_hash("studentpass2026")
        )
        db.add(student_user)
        db.commit()
        db.refresh(student_user)
        
        # Student profile
        student = models.Student(
            matric_number="FUKU/SCI/21/COM/0060",
            department="Computer Science",
            level="400 Level",
            user_id=student_user.id
        )
        db.add(student)
        db.commit()
        
        print("==================================================")
        print("DATABASE FRESHLY RECREATED & SEEDED!")
        print("New Credentials:")
        print("  - Admin: admin@smartface.com / adminpass2026")
        print("  - Lecturer: tariq@smartface.com / lecturerpass2026")
        print("  - Student: sageer@smartface.com / studentpass2026")
        print("==================================================")
        
    except Exception as e:
        db.rollback()
        print("Error seeding database:", e)
    finally:
        db.close()

if __name__ == "__main__":
    recreate_db()
