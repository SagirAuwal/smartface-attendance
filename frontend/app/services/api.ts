const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:8080/api";

export interface User {
  id: number;
  fullname: string;
  email: string;
  role: "admin" | "lecturer" | "student";
  department?: string;
  profile_picture?: string;
  created_at: string;
}

export interface Student {
  student_id: number;
  matric_number: string;
  department: string;
  level: string;
  user: User;
}

export interface Course {
  id: number;
  course_code: string;
  course_name: string;
  lecturer: User;
}

export interface Attendance {
  id: number;
  student_id: number;
  course_id: number;
  attendance_time: string;
  confidence_score: number;
  status: "Present" | "Late" | "Absent";
  student: Student;
}

export interface CourseStats {
  course_code: string;
  course_name: string;
  total_students: number;
  present_today: number;
  attendance_rate: number;
}

class ApiService {
  private getHeaders(isMultipart = false): HeadersInit {
    const token = typeof window !== "undefined" ? localStorage.getItem("smartface_token") : null;
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    if (!isMultipart) {
      headers["Content-Type"] = "application/json";
    }
    
    return headers;
  }

  private async handleError(response: Response, defaultMsg: string): Promise<never> {
    // If unauthorized, and not the login endpoint, trigger automatic logout and redirect
    if (response.status === 401 && !response.url.endsWith("/auth/login")) {
      this.logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login?expired=true";
      }
    }

    let detailMsg = defaultMsg;
    try {
      const err = await response.json();
      if (err && err.detail) {
        if (typeof err.detail === "string") {
          detailMsg = err.detail;
        } else if (Array.isArray(err.detail)) {
          detailMsg = err.detail
            .map((d: any) => {
              const field = d.loc && d.loc.length > 1 ? d.loc.slice(1).join(".") : "";
              return field ? `${field}: ${d.msg}` : d.msg;
            })
            .join(", ");
        } else if (typeof err.detail === "object") {
          detailMsg = JSON.stringify(err.detail);
        }
      }
    } catch {
      // Ignore JSON parse error, use defaultMsg
    }
    throw new Error(detailMsg);
  }

  // ==========================================
  // AUTH
  // ==========================================
  
  async login(email: string, password: string): Promise<any> {
    const formData = new FormData();
    formData.append("username", email); // OAuth2 expects username
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      body: formData, // FormData automatically sets content-type multipart/form-data
    });

    if (!response.ok) {
      await this.handleError(response, "Incorrect email or password");
    }

    const data = await response.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("smartface_token", data.access_token);
      localStorage.setItem("smartface_user", JSON.stringify(data.user));
    }
    return data;
  }

  async signup(fullname: string, email: string, role: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullname, email, role, password }),
    });

    if (!response.ok) {
      await this.handleError(response, "Signup failed");
    }

    return response.json();
  }

  getCurrentUser(): User | null {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("smartface_user");
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("smartface_token");
      localStorage.removeItem("smartface_user");
    }
  }

  async updateProfile(fullname?: string, email?: string, password?: string): Promise<User> {
    const payload: any = {};
    if (fullname) payload.fullname = fullname;
    if (email) payload.email = email;
    if (password) payload.password = password;

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await this.handleError(response, "Failed to update profile");
    }

    const data = await response.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("smartface_user", JSON.stringify(data));
      window.dispatchEvent(new Event("user_profile_updated"));
    }
    return data;
  }

  async uploadProfilePicture(file: Blob): Promise<User> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/users/me/profile-picture`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: formData,
    });

    if (!response.ok) {
      await this.handleError(response, "Failed to upload profile picture");
    }

    const data = await response.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("smartface_user", JSON.stringify(data));
      window.dispatchEvent(new Event("user_profile_updated"));
    }
    return data;
  }

  async removeProfilePicture(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/me/profile-picture`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      await this.handleError(response, "Failed to remove profile picture");
    }

    const data = await response.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("smartface_user", JSON.stringify(data));
      window.dispatchEvent(new Event("user_profile_updated"));
    }
    return data;
  }

  // ==========================================
  // STUDENTS
  // ==========================================

  async getStudents(): Promise<Student[]> {
    const response = await fetch(`${API_BASE_URL}/students`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      await this.handleError(response, "Failed to fetch students");
    }
    return response.json();
  }

  async createStudent(studentData: any): Promise<Student> {
    const response = await fetch(`${API_BASE_URL}/students`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(studentData),
    });

    if (!response.ok) {
      await this.handleError(response, "Failed to create student");
    }
    return response.json();
  }

  async registerFace(studentId: number, imageBlob: Blob): Promise<any> {
    const formData = new FormData();
    formData.append("file", imageBlob, "face.jpg");

    const response = await fetch(`${API_BASE_URL}/students/${studentId}/register-face`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: formData,
    });

    if (!response.ok) {
      await this.handleError(response, "Face registration failed");
    }
    return response.json();
  }

  async deleteStudent(studentId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      await this.handleError(response, "Failed to delete student");
    }
    return response.json();
  }

  // ==========================================
  // COURSES
  // ==========================================

  async getCourses(): Promise<Course[]> {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      await this.handleError(response, "Failed to fetch courses");
    }
    return response.json();
  }

  async createCourse(courseCode: string, courseName: string, lecturerId: number): Promise<Course> {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ course_code: courseCode, course_name: courseName, lecturer_id: lecturerId }),
    });

    if (!response.ok) {
      await this.handleError(response, "Failed to create course");
    }
    return response.json();
  }

  // ==========================================
  // ATTENDANCE & SCANS
  // ==========================================

  async getAttendance(courseId?: number, studentId?: number): Promise<Attendance[]> {
    let url = `${API_BASE_URL}/attendance`;
    const params = new URLSearchParams();
    if (courseId) params.append("course_id", courseId.toString());
    if (studentId) params.append("student_id", studentId.toString());
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      await this.handleError(response, "Failed to fetch attendance history");
    }
    return response.json();
  }

  async markAttendance(courseId: number, imageBlob: Blob, mockStudentId?: number): Promise<any> {
    const formData = new FormData();
    formData.append("course_id", courseId.toString());
    formData.append("file", imageBlob, "scan.jpg");
    if (mockStudentId !== undefined && mockStudentId !== null) {
      formData.append("mock_student_id", mockStudentId.toString());
    }

    const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: formData,
    });

    if (!response.ok) {
      await this.handleError(response, "Face recognition failed");
    }
    return response.json();
  }

  async manualMarkAttendance(studentId: number, courseId: number, status: string, score: number): Promise<Attendance> {
    const response = await fetch(`${API_BASE_URL}/attendance/manual`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ student_id: studentId, course_id: courseId, status, confidence_score: score }),
    });

    if (!response.ok) {
      await this.handleError(response, "Failed manual attendance entry");
    }
    return response.json();
  }

  // ==========================================
  // LECTURERS
  // ==========================================

  async getLecturers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/lecturers`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      await this.handleError(response, "Failed to fetch lecturers list");
    }
    return response.json();
  }

  async createLecturer(lecturerData: any): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/lecturers`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(lecturerData),
    });

    if (!response.ok) {
      await this.handleError(response, "Failed to create lecturer");
    }
    return response.json();
  }

  async deleteLecturer(lecturerId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/lecturers/${lecturerId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      await this.handleError(response, "Failed to delete lecturer");
    }
    return response.json();
  }

  // ==========================================
  // REPORTS
  // ==========================================

  async getStats(): Promise<CourseStats[]> {
    const response = await fetch(`${API_BASE_URL}/reports/stats`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      await this.handleError(response, "Failed to fetch reports analytics");
    }
    return response.json();
  }
}

export const api = new ApiService();
