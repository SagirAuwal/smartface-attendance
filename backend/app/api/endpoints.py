from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import json
import random
import os
import shutil

from app.db.session import get_db
from app.models import models
from app.schemas import schemas
from app.core import security
from app.core.config import settings
from app.ai.ai_engine import AIEngine

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    email = security.decode_access_token(token)
    if email is None:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================

@router.post("/auth/signup", response_model=schemas.UserResponse)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    hashed_pwd = security.get_password_hash(user_in.password)
    user = models.User(
        fullname=user_in.fullname,
        email=user_in.email,
        role=user_in.role,
        password_hash=hashed_pwd
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/auth/login")
def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm uses 'username' but it corresponds to our email field
    user = db.query(models.User).filter(models.User.email == username).first()
    if not user or not security.verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = security.create_access_token(subject=user.email)
    
    # Return user profile along with access token for convenient frontend usage
    user_response = schemas.UserResponse(
        id=user.id,
        fullname=user.fullname,
        email=user.email,
        role=user.role,
        profile_picture=user.profile_picture,
        created_at=user.created_at
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.get("/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/users/me", response_model=schemas.UserResponse)
def update_profile(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if user_update.fullname is not None:
        current_user.fullname = user_update.fullname
    if user_update.email is not None:
        if user_update.email != current_user.email:
            existing = db.query(models.User).filter(models.User.email == user_update.email).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this email already exists."
                )
            current_user.email = user_update.email
    if user_update.password is not None:
        current_user.password_hash = security.get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/users/me/profile-picture", response_model=schemas.UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Allowed formats: JPEG, PNG, GIF, WEBP."
        )
    
    # Setup directory paths
    api_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.abspath(os.path.join(api_dir, "..", "..", "static"))
    profile_pics_dir = os.path.join(static_dir, "profile_pictures")
    os.makedirs(profile_pics_dir, exist_ok=True)

    # Delete existing profile picture if any
    if current_user.profile_picture:
        old_filename = current_user.profile_picture.split("/")[-1]
        old_filepath = os.path.join(profile_pics_dir, old_filename)
        if os.path.exists(old_filepath):
            try:
                os.remove(old_filepath)
            except Exception as e:
                print(f"Error removing old profile picture: {e}")

    # Generate filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"user_{current_user.id}.{ext}"
    filepath = os.path.join(profile_pics_dir, filename)

    # Save new file
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save profile picture: {str(e)}"
        )

    # Update DB url
    db_url = f"/static/profile_pictures/{filename}"
    current_user.profile_picture = db_url
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/users/me/profile-picture", response_model=schemas.UserResponse)
def remove_profile_picture(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.profile_picture:
        return current_user
        
    # Setup directory paths
    api_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.abspath(os.path.join(api_dir, "..", "..", "static"))
    profile_pics_dir = os.path.join(static_dir, "profile_pictures")
    
    # Resolve filepath
    filename = current_user.profile_picture.split("/")[-1]
    filepath = os.path.join(profile_pics_dir, filename)
    
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception as e:
            print(f"Error removing profile picture file: {e}")
            
    current_user.profile_picture = None
    db.commit()
    db.refresh(current_user)
    return current_user

# ==========================================
# LECTURER MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/lecturers", response_model=List[schemas.UserResponse])
def get_lecturers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access the lecturer list."
        )
    lecturers = db.query(models.User).filter(models.User.role == "lecturer").all()
    return lecturers

@router.post("/lecturers", response_model=schemas.UserResponse)
def create_lecturer(
    lecturer_in: schemas.LecturerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create lecturers."
        )
        
    db_user = db.query(models.User).filter(models.User.email == lecturer_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # Validate course code uniqueness
    db_course = db.query(models.Course).filter(models.Course.course_code == lecturer_in.course_code).first()
    if db_course:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A course with code '{lecturer_in.course_code}' already exists."
        )
        
    hashed_pwd = security.get_password_hash(lecturer_in.password)
    user = models.User(
        fullname=lecturer_in.fullname,
        email=lecturer_in.email,
        role="lecturer",
        password_hash=hashed_pwd,
        department=lecturer_in.department
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create associated course
    course = models.Course(
        course_code=lecturer_in.course_code,
        course_name=lecturer_in.course_name,
        lecturer_id=user.id
    )
    db.add(course)
    db.commit()
    
    return user

@router.delete("/lecturers/{lecturer_id}")
def delete_lecturer(
    lecturer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete lecturers."
        )
        
    lecturer = db.query(models.User).filter(models.User.id == lecturer_id, models.User.role == "lecturer").first()
    if not lecturer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lecturer not found."
        )
        
    # Cascade deletion to courses they teach (which cascades to attendance records)
    courses = db.query(models.Course).filter(models.Course.lecturer_id == lecturer_id).all()
    for course in courses:
        db.delete(course)
        
    db.delete(lecturer)
    db.commit()
    return {"status": "success", "message": "Lecturer account and associated courses deleted successfully."}

# ==========================================
# STUDENT MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/students", response_model=List[schemas.StudentResponse])
def get_students(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Admin and lecturers can see students. Students can see only themselves.
    if current_user.role in ["admin", "lecturer"]:
        students = db.query(models.Student).all()
    else:
        students = db.query(models.Student).filter(models.Student.user_id == current_user.id).all()
    return students

@router.post("/students", response_model=schemas.StudentResponse)
def create_student(student_in: schemas.StudentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["admin", "lecturer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create students"
        )
        
    # Check if user email already exists
    db_user = db.query(models.User).filter(models.User.email == student_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    # Check matric number
    db_student = db.query(models.Student).filter(models.Student.matric_number == student_in.matric_number).first()
    if db_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student with this matric number already exists."
        )

    # Create user profile first
    hashed_pwd = security.get_password_hash(student_in.password)
    user = models.User(
        fullname=student_in.fullname,
        email=student_in.email,
        role="student",
        password_hash=hashed_pwd
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create student profile
    student = models.Student(
        matric_number=student_in.matric_number,
        department=student_in.department,
        level=student_in.level,
        user_id=user.id
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.post("/students/{student_id}/register-face")
async def register_face(
    student_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "lecturer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to register student faces"
        )
        
    student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
        
    contents = await file.read()
    embedding = AIEngine.extract_face_embedding(contents)
    
    if not embedding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in the image. Please try another photo."
        )
        
    # Check if this face is already registered under another student profile
    registered = db.query(models.FaceEmbedding.student_id, models.FaceEmbedding.embedding_vector).all()
    if registered:
        matched_id, score = AIEngine.match_face(embedding, registered)
        if matched_id is not None and matched_id != student_id and score >= settings.RECOGNITION_THRESHOLD:
            matched_student = db.query(models.Student).filter(models.Student.student_id == matched_id).first()
            matched_name = matched_student.user.fullname if matched_student else "Another Student"
            matched_matric = matched_student.matric_number if matched_student else ""
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Biometric Conflict: This face is already enrolled under student '{matched_name}' ({matched_matric}). Duplicate biometrics are not allowed."
            )
        
    # Store embedding. We can delete any older embeddings for this student to keep it clean.
    db.query(models.FaceEmbedding).filter(models.FaceEmbedding.student_id == student_id).delete()
    
    face_emb = models.FaceEmbedding(
        student_id=student_id,
        embedding_vector=embedding
    )
    db.add(face_emb)
    db.commit()
    
    return {
        "status": "success",
        "message": f"Face registered successfully for {student.user.fullname}.",
        "embedding_dimensions": len(embedding)
    }

@router.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"[DEBUG DELETE] Attempting to delete student_id={student_id} (type={type(student_id)}), current_user.email={current_user.email}")
    
    if current_user.role not in ["admin", "lecturer"]:
        print(f"[DEBUG DELETE] User {current_user.email} with role {current_user.role} is not authorized.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete students"
        )
        
    student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student:
        print(f"[DEBUG DELETE] Student with student_id={student_id} was NOT found in the database.")
        count = db.query(models.Student).count()
        print(f"[DEBUG DELETE] Total students in DB: {count}")
        stds = db.query(models.Student).all()
        print(f"[DEBUG DELETE] Registered Student IDs: {[s.student_id for s in stds]}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
        
    user = db.query(models.User).filter(models.User.id == student.user_id).first()
    
    # Delete student profile (cascades to face embeddings and attendance logs)
    db.delete(student)
    
    # Delete associated User login account
    if user:
        db.delete(user)
        
    db.commit()
    print(f"[DEBUG DELETE] Successfully deleted student and user profile.")
    return {"status": "success", "message": "Student, biometrics, and records deleted successfully."}

# ==========================================
# COURSE MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/courses", response_model=List[schemas.CourseResponse])
def get_courses(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role == "student":
        # For simplicity, students see all courses they can attend
        courses = db.query(models.Course).all()
    elif current_user.role == "lecturer":
        courses = db.query(models.Course).filter(models.Course.lecturer_id == current_user.id).all()
    else:
        courses = db.query(models.Course).all()
    return courses

@router.post("/courses", response_model=schemas.CourseResponse)
def create_course(course_in: schemas.CourseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["admin", "lecturer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create courses"
        )
        
    db_course = db.query(models.Course).filter(models.Course.course_code == course_in.course_code).first()
    if db_course:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course with this code already exists."
        )
        
    # Check if lecturer exists and has correct role
    lecturer = db.query(models.User).filter(models.User.id == course_in.lecturer_id).first()
    if not lecturer or lecturer.role != "lecturer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid lecturer_id. User must be a Lecturer."
        )

    course = models.Course(
        course_code=course_in.course_code,
        course_name=course_in.course_name,
        lecturer_id=course_in.lecturer_id
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

# ==========================================
# ATTENDANCE MARKING & CAMERA ENDPOINTS
# ==========================================

@router.get("/attendance", response_model=List[schemas.AttendanceResponse])
def get_attendance(
    course_id: Optional[int] = None,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Attendance)
    
    if current_user.role == "student":
        student_profile = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
        if not student_profile:
            return []
        query = query.filter(models.Attendance.student_id == student_profile.student_id)
    elif current_user.role == "lecturer":
        # Lecturers see attendance for their courses
        lecturer_courses = db.query(models.Course.id).filter(models.Course.lecturer_id == current_user.id).all()
        course_ids = [c[0] for c in lecturer_courses]
        query = query.filter(models.Attendance.course_id.in_(course_ids))
        
    if course_id is not None:
        query = query.filter(models.Attendance.course_id == course_id)
    if student_id is not None:
        query = query.filter(models.Attendance.student_id == student_id)
        
    return query.order_by(models.Attendance.attendance_time.desc()).all()

@router.post("/attendance/mark")
async def mark_attendance(
    course_id: int = Form(...),
    file: UploadFile = File(...),
    mock_student_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    # Verify course exists
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    contents = await file.read()
    
    # Extract embedding from current camera snapshot
    embedding = AIEngine.extract_face_embedding(contents)
    if not embedding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected. Please center your face in the camera and ensure good lighting."
        )
        
    # Get all registered face embeddings
    registered = db.query(models.FaceEmbedding.student_id, models.FaceEmbedding.embedding_vector).all()
    
    matched_student_id = None
    confidence = 0.0
    
    # Perform face comparison
    if settings.AI_ENGINE_MODE == "mock" and mock_student_id is not None:
        # In mock mode, if a student ID was manually selected/mocked by the developer UI, force match them
        matched_student = db.query(models.Student).filter(models.Student.student_id == mock_student_id).first()
        if matched_student:
            matched_student_id = mock_student_id
            confidence = 0.95
    else:
        # standard vector similarity matching
        if registered:
            matched_student_id, confidence = AIEngine.match_face(embedding, registered)

    # Check if a high confidence match was found
    if matched_student_id is None or confidence < settings.RECOGNITION_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Face not recognized. Please register or try again."
        )
            
    student = db.query(models.Student).filter(models.Student.student_id == matched_student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Matched student profile not found")

    # Prevent duplicate attendance on the same day for this course
    today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min)
    today_end = datetime.datetime.combine(datetime.date.today(), datetime.time.max)
    
    existing_attendance = db.query(models.Attendance).filter(
        models.Attendance.student_id == matched_student_id,
        models.Attendance.course_id == course_id,
        models.Attendance.attendance_time >= today_start,
        models.Attendance.attendance_time <= today_end
    ).first()
    
    # Pydantic response for student metadata
    student_res = schemas.StudentResponse(
        student_id=student.student_id,
        matric_number=student.matric_number,
        department=student.department,
        level=student.level,
        user=schemas.UserResponse(
            id=student.user.id,
            fullname=student.user.fullname,
            email=student.user.email,
            role=student.user.role,
            profile_picture=student.user.profile_picture,
            created_at=student.user.created_at
        )
    )

    if existing_attendance:
        return {
            "status": "duplicate",
            "message": f"Attendance already marked today for {student.user.fullname}.",
            "confidence": confidence,
            "student": student_res,
            "time": existing_attendance.attendance_time.isoformat()
        }

    # Record attendance
    attendance = models.Attendance(
        student_id=matched_student_id,
        course_id=course_id,
        confidence_score=confidence,
        status="Present", # default
        attendance_time=datetime.datetime.utcnow()
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return {
        "status": "success",
        "message": f"Attendance marked for {student.user.fullname} successfully!",
        "confidence": confidence,
        "student": student_res,
        "time": attendance.attendance_time.isoformat()
    }

@router.post("/attendance/manual", response_model=schemas.AttendanceResponse)
def manual_mark_attendance(
    attendance_in: schemas.AttendanceCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "lecturer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manually mark attendance"
        )
        
    # Check if student and course exist
    student = db.query(models.Student).filter(models.Student.student_id == attendance_in.student_id).first()
    course = db.query(models.Course).filter(models.Course.id == attendance_in.course_id).first()
    
    if not student or not course:
        raise HTTPException(status_code=404, detail="Student or Course not found")
        
    # Check duplicate
    today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min)
    today_end = datetime.datetime.combine(datetime.date.today(), datetime.time.max)
    
    existing = db.query(models.Attendance).filter(
        models.Attendance.student_id == attendance_in.student_id,
        models.Attendance.course_id == attendance_in.course_id,
        models.Attendance.attendance_time >= today_start,
        models.Attendance.attendance_time <= today_end
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attendance already marked for {student.user.fullname} today."
        )
        
    attendance = models.Attendance(
        student_id=attendance_in.student_id,
        course_id=attendance_in.course_id,
        confidence_score=attendance_in.confidence_score,
        status=attendance_in.status,
        attendance_time=datetime.datetime.utcnow()
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance

# ==========================================
# REPORTS & ANALYTICS ENDPOINTS
# ==========================================

@router.get("/reports/stats", response_model=List[schemas.CourseStats])
def get_reports_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Calculate key statistics per course for the current user
    if current_user.role == "lecturer":
        courses = db.query(models.Course).filter(models.Course.lecturer_id == current_user.id).all()
    else:
        courses = db.query(models.Course).all()
        
    total_students_count = db.query(models.Student).count()
    today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min)
    today_end = datetime.datetime.combine(datetime.date.today(), datetime.time.max)
    
    stats = []
    for course in courses:
        # Number of students present today
        present_count = db.query(models.Attendance).filter(
            models.Attendance.course_id == course.id,
            models.Attendance.attendance_time >= today_start,
            models.Attendance.attendance_time <= today_end,
            models.Attendance.status == "Present"
        ).count()
        
        # Simple attendance rate calculation (present / total registered students)
        rate = (present_count / total_students_count * 100) if total_students_count > 0 else 0.0
        
        stats.append(schemas.CourseStats(
            course_code=course.course_code,
            course_name=course.course_name,
            total_students=total_students_count,
            present_today=present_count,
            attendance_rate=round(rate, 2)
        ))
    return stats
