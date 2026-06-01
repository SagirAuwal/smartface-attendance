import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import get_db, Base
from app.models import models
from app.core import security

# Use a separate test database file
DB_FILE = "test_roles.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Override the app dependency
app.dependency_overrides[get_db] = override_get_db

def test_roles_and_permissions():
    print("==================================================")
    print("STARTING SMARTFACE ROLE-BASED ACCESS CONTROL TESTS")
    print("==================================================")
    
    # Remove existing test DB file if any
    if os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except Exception:
            pass
            
    # Re-create tables
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    
    # 1. Setup Mock Users
    print("[1/5] Setting up mock user accounts for different roles...")
    hashed_pw = security.get_password_hash("testpassword")
    
    # Create Admin
    admin_user = models.User(
        fullname="Admin User",
        email="admin@test.com",
        role="admin",
        password_hash=hashed_pw
    )
    db.add(admin_user)
    
    # Create Sub-Admin
    subadmin_user = models.User(
        fullname="SubAdmin User",
        email="subadmin@test.com",
        role="sub_admin",
        password_hash=hashed_pw
    )
    db.add(subadmin_user)
    
    # Create Lecturer
    lecturer_user = models.User(
        fullname="Dr. Tariq Yusuf",
        email="lecturer@test.com",
        role="lecturer",
        password_hash=hashed_pw
    )
    db.add(lecturer_user)
    
    db.commit()
    db.refresh(admin_user)
    db.refresh(subadmin_user)
    db.refresh(lecturer_user)
    
    # Create Course assigned to Lecturer
    course = models.Course(
        course_code="COE501",
        course_name="Biometric Systems",
        lecturer_id=lecturer_user.id
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    
    print(f"  -> Created Admin (ID={admin_user.id})")
    print(f"  -> Created Sub-Admin (ID={subadmin_user.id})")
    print(f"  -> Created Lecturer (ID={lecturer_user.id}, Course={course.course_code})")
    
    # Create Access Tokens
    admin_token = security.create_access_token(subject=admin_user.email)
    subadmin_token = security.create_access_token(subject=subadmin_user.email)
    
    client = TestClient(app)
    
    # 2. Test Admin authority over Sub-Admins list
    print("[2/5] Testing Admin authority over Sub-Admins list endpoints...")
    # Admin can list sub-admins
    resp = client.get("/api/sub-admins", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200, f"Admin failed to fetch sub-admins: {resp.text}"
    sub_admins_list = resp.json()
    assert len(sub_admins_list) == 1, "Sub-admin list should contain exactly 1 entry"
    assert sub_admins_list[0]["email"] == "subadmin@test.com"
    print("  -> Admin fetched sub-admins list successfully.")
    
    # Sub-admin CANNOT list sub-admins
    resp = client.get("/api/sub-admins", headers={"Authorization": f"Bearer {subadmin_token}"})
    assert resp.status_code == 403, f"Sub-admin should be forbidden from listing sub-admins, got status {resp.status_code}"
    print("  -> Sub-admin block from listing sub-admins passed (403 Forbidden).")

    # 3. Test Lecturer deletion constraints
    print("[3/5] Testing Lecturer deletion constraints...")
    # Sub-admin attempts to delete lecturer -> Should be blocked (403)
    resp = client.delete(f"/api/lecturers/{lecturer_user.id}", headers={"Authorization": f"Bearer {subadmin_token}"})
    assert resp.status_code == 403, f"Sub-admin should be forbidden from deleting lecturers, got {resp.status_code}"
    print("  -> Sub-admin block from deleting lecturer passed (403 Forbidden).")
    
    # 4. Test Sub-Admin authority over Students & Face Registration
    print("[4/5] Testing Sub-Admin capabilities (Students and Course management)...")
    # Sub-admin registers a student
    student_payload = {
        "fullname": "Aliyu Kabir",
        "email": "aliyu.kabir@student.com",
        "password": "studentpassword",
        "matric_number": "RUN/CSC/22/0888",
        "department": "Computer Science",
        "level": "400 Level"
    }
    resp = client.post("/api/students", json=student_payload, headers={"Authorization": f"Bearer {subadmin_token}"})
    assert resp.status_code == 200, f"Sub-admin failed to register student: {resp.text}"
    student_id = resp.json()["student_id"]
    print(f"  -> Sub-admin successfully registered student (ID={student_id}).")
    
    # Sub-admin lists students
    resp = client.get("/api/students", headers={"Authorization": f"Bearer {subadmin_token}"})
    assert resp.status_code == 200, f"Sub-admin failed to fetch students: {resp.text}"
    assert len(resp.json()) == 1, "Students list should contain exactly 1 entry"
    print("  -> Sub-admin successfully fetched student directory list.")
    
    # Sub-admin deletes student
    resp = client.delete(f"/api/students/{student_id}", headers={"Authorization": f"Bearer {subadmin_token}"})
    assert resp.status_code == 200, f"Sub-admin failed to delete student: {resp.text}"
    print("  -> Sub-admin successfully deleted student profile.")

    # 5. Test Admin deletes Sub-Admin
    print("[5/5] Testing Admin's capability to delete a Sub-Admin...")
    resp = client.delete(f"/api/sub-admins/{subadmin_user.id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200, f"Admin failed to delete sub-admin: {resp.text}"
    print("  -> Admin successfully deleted sub-administrator account.")
    
    # Confirm sub-admin is deleted in DB
    resp = client.get("/api/sub-admins", headers={"Authorization": f"Bearer {admin_token}"})
    assert len(resp.json()) == 0, "Sub-admin list should be empty after deletion"
    print("  -> DB cascade check: Sub-admin is no longer in query results.")
    
    db.close()
    
    # Cleanup file
    if os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except Exception:
            pass
            
    print("==================================================")
    print("ALL ROLE-BASED ACCESS CONTROL TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_roles_and_permissions()
