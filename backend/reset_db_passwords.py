import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models import models
from app.core import security

def reset_passwords():
    db = SessionLocal()
    try:
        print("Resetting database passwords...")
        
        # 1. Reset Admin
        admin = db.query(models.User).filter(models.User.email == "admin@smartface.com").first()
        if admin:
            admin.password_hash = security.get_password_hash("adminpassword")
            print("  -> Admin password reset to: adminpassword")
        else:
            admin = models.User(
                fullname="System Administrator",
                email="admin@smartface.com",
                role="admin",
                password_hash=security.get_password_hash("adminpassword")
            )
            db.add(admin)
            print("  -> Created Admin with password: adminpassword")

        # 2. Reset Lecturer
        lecturer = db.query(models.User).filter(models.User.email == "lecturer@smartface.com").first()
        if lecturer:
            lecturer.fullname = "Dr. Tariq Yusuf"
            lecturer.password_hash = security.get_password_hash("lecturerpassword")
            print("  -> Lecturer password reset to: lecturerpassword, name updated to: Dr. Tariq Yusuf")
        else:
            lecturer = models.User(
                fullname="Dr. Tariq Yusuf",
                email="lecturer@smartface.com",
                role="lecturer",
                password_hash=security.get_password_hash("lecturerpassword")
            )
            db.add(lecturer)
            print("  -> Created Lecturer with password: lecturerpassword")

        # 3. Reset Student (Muhammad Sageer)
        student_user = db.query(models.User).filter(models.User.email == "miyatown5943@gmail.com").first()
        if student_user:
            student_user.password_hash = security.get_password_hash("studentpassword")
            print("  -> Student user password reset to: studentpassword")
        else:
            student_user = models.User(
                fullname="Muhammad Sageer",
                email="miyatown5943@gmail.com",
                role="student",
                password_hash=security.get_password_hash("studentpassword")
            )
            db.add(student_user)
            db.commit()
            db.refresh(student_user)
            
            # Check if student profile exists
            student = db.query(models.Student).filter(models.Student.user_id == student_user.id).first()
            if not student:
                student = models.Student(
                    matric_number="FUKU/SCI/21/COM/0060",
                    department="Computer Science",
                    level="400 Level",
                    user_id=student_user.id
                )
                db.add(student)
            print("  -> Created Student user and profile with password: studentpassword")

        db.commit()
        print("Password reset process finished successfully.")
    except Exception as e:
        db.rollback()
        print("Error resetting passwords:", e)
    finally:
        db.close()

if __name__ == "__main__":
    reset_passwords()
