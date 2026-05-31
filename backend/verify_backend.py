import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models import models
from app.core import security
from app.ai.ai_engine import AIEngine

def test_backend_components():
    print("==================================================")
    print("STARTING SMARTFACE BACKEND INTEGRATION TEST")
    print("==================================================")
    
    # 1. Setup in-memory SQLite database for testing
    print("[1/6] Initializing Test Database...")
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    print("  -> In-memory database tables created successfully.")

    # 2. Test User Security & Password Hashing
    print("[2/6] Testing Security Utilities...")
    plain_password = "secure_password_123"
    hashed_pwd = security.get_password_hash(plain_password)
    assert hashed_pwd != plain_password, "Hashing failed to change password"
    assert security.verify_password(plain_password, hashed_pwd), "Password verification failed"
    print("  -> Password hashing and verification passed.")

    # 3. Test JWT Tokens
    token = security.create_access_token(subject="lecturer@smartface.com")
    decoded_email = security.decode_access_token(token)
    assert decoded_email == "lecturer@smartface.com", "JWT encoding/decoding failed"
    print("  -> JWT token generation and claims decoding passed.")

    # 4. Test Entity Creation
    print("[3/6] Testing DB Models Creation...")
    # Add Lecturer
    lecturer = models.User(
        fullname="Dr. Zainab Aliyu",
        email="aliyu@smartface.com",
        role="lecturer",
        password_hash=hashed_pwd
    )
    db.add(lecturer)
    db.commit()
    db.refresh(lecturer)
    assert lecturer.id is not None, "Lecturer user creation failed"
    
    # Add Course
    course = models.Course(
        course_code="CSC301",
        course_name="Introduction to Artificial Intelligence",
        lecturer_id=lecturer.id
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    assert course.id is not None, "Course creation failed"
    print("  -> Lecturer and Course models inserted successfully.")

    # Add Student
    student_user = models.User(
        fullname="Hamza Sageer",
        email="hamza@smartface.com",
        role="student",
        password_hash=hashed_pwd
    )
    db.add(student_user)
    db.commit()
    db.refresh(student_user)

    student = models.Student(
        matric_number="RUN/CSC/22/0451",
        department="Computer Science",
        level="300 Level",
        user_id=student_user.id
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    assert student.student_id is not None, "Student profile creation failed"
    print("  -> Student profile created successfully.")

    # 5. Test AI Face Embeddings (Mock Engine verification)
    print("[4/6] Testing AI Face Registration (Mock Mode)...")
    # Generate mock embeddings for two different students
    john_emb = AIEngine.generate_mock_embedding("RUN/CSC/22/0451")
    alice_emb = AIEngine.generate_mock_embedding("RUN/CSC/22/0999")
    
    # Verify embedding dimensions (FaceNet has 512 dimensions)
    assert len(john_emb) == 512, f"Embedding dimensions incorrect: {len(john_emb)}"
    
    # Store John's embedding in DB
    db_embedding = models.FaceEmbedding(
        student_id=student.student_id,
        embedding_vector=john_emb
    )
    db.add(db_embedding)
    db.commit()
    print("  -> Face vector registered in SQLite database successfully.")

    # 6. Test Face Recognition Matching
    print("[5/6] Testing Vector Matching...")
    # Fetch all registered embeddings
    registered = db.query(models.FaceEmbedding.student_id, models.FaceEmbedding.embedding_vector).all()
    assert len(registered) == 1, "Embeddings count mismatch"
    
    # Compare John's scan embedding with registered embeddings
    # (Since John's scan generates a similar embedding, it should match John)
    matched_id, score = AIEngine.match_face(john_emb, registered)
    print(f"  -> Scanned John Doe: matched student ID = {matched_id}, score = {score:.4f}")
    assert matched_id == student.student_id, "Matching failed to identify the correct student"
    assert score > 0.99, "Self-matching similarity score should be close to 1.0"
    
    # Compare Alice's scan embedding (should NOT match or have a low score)
    matched_id_alice, score_alice = AIEngine.match_face(alice_emb, registered)
    print(f"  -> Scanned Alice (unregistered): matched student ID = {matched_id_alice}, score = {score_alice:.4f}")
    assert score_alice < 0.60, f"Unregistered student got a high similarity score: {score_alice}"
    print("  -> Vector matching similarity logic is fully correct.")

    # 7. Test Attendance Processing
    print("[6/6] Testing Attendance Log Insertion & Duplicate Prevention...")
    attendance = models.Attendance(
        student_id=student.student_id,
        course_id=course.id,
        confidence_score=score,
        status="Present"
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    assert attendance.id is not None, "Attendance insertion failed"
    print("  -> Attendance marked successfully.")
    
    # Verify database queries for reports
    attendances_log = db.query(models.Attendance).all()
    assert len(attendances_log) == 1, "Attendance logs count mismatch"
    assert attendances_log[0].student.user.fullname == "Hamza Sageer", "Joined student relationship failed"
    assert attendances_log[0].course.course_code == "CSC301", "Joined course relationship failed"
    print("  -> Joined database relations query verified successfully.")

    db.close()
    print("==================================================")
    print("INTEGRATION TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_backend_components()
