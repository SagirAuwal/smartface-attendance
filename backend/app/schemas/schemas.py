from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    fullname: str
    email: EmailStr
    role: str # admin, lecturer, student
    department: Optional[str] = None
    profile_picture: Optional[str] = None

class UserCreate(UserBase):
    password: str

class LecturerCreate(BaseModel):
    fullname: str
    email: EmailStr
    password: str
    department: str
    course_code: str
    course_name: str

class UserUpdate(BaseModel):
    fullname: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

# Student Schemas
class StudentCreate(BaseModel):
    fullname: str
    email: EmailStr
    password: str
    matric_number: str
    department: str
    level: str

class StudentResponse(BaseModel):
    student_id: int
    matric_number: str
    department: str
    level: str
    user: UserResponse

    class Config:
        from_attributes = True

# Course Schemas
class CourseCreate(BaseModel):
    course_code: str
    course_name: str
    lecturer_id: int

class CourseResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    lecturer: UserResponse

    class Config:
        from_attributes = True

# Attendance Schemas
class AttendanceCreate(BaseModel):
    student_id: int
    course_id: int
    status: str # Present, Late, Absent
    confidence_score: float

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    attendance_time: datetime
    confidence_score: float
    status: str
    student: StudentResponse

    class Config:
        from_attributes = True

# Report Stat Schema
class CourseStats(BaseModel):
    course_code: str
    course_name: str
    total_students: int
    present_today: int
    attendance_rate: float
