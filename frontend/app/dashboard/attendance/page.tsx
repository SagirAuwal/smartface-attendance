"use client";

import { useState, useEffect, useRef } from "react";
import { api, Course, Student, Attendance } from "../../services/api";
import {
  Camera,
  Play,
  Square,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
  Clock,
  HelpCircle,
  ShieldCheck
} from "lucide-react";

export default function AttendanceScanner() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [attendanceLog, setAttendanceLog] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Scanner status states
  const [scanning, setScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Camera Ready. Select course and start scanner.");
  const [statusType, setStatusType] = useState<"idle" | "scanning" | "success" | "duplicate" | "error">("idle");
  const [matchedStudentName, setMatchedStudentName] = useState("");
  const [matchScore, setMatchScore] = useState(0);

  // Web camera states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Developer Autofill Mocking state
  const [mockStudentId, setMockStudentId] = useState<string>("");

  useEffect(() => {
    fetchInitialData();
    return () => {
      stopScanning();
    };
  }, []);

  // Fetch courses and students to register for dropdowns
  const fetchInitialData = async () => {
    try {
      const coursesData = await api.getCourses();
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id.toString());
      }
      
      const studentsData = await api.getStudents();
      setStudents(studentsData);
      if (studentsData.length > 0) {
        setMockStudentId(studentsData[0].student_id.toString());
      }
    } catch (err) {
      console.error("Error loading courses:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's logs for the selected course
  const fetchLogs = async (courseId: number) => {
    try {
      const data = await api.getAttendance(courseId);
      setAttendanceLog(data);
    } catch (err) {
      console.error("Error loading attendance log:", err);
    }
  };

  // Triggered when selected course changes
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    setSelectedCourse(courseId);
    if (courseId) {
      fetchLogs(parseInt(courseId));
    }
  };

  const startScanning = async () => {
    if (!selectedCourse) {
      setStatusMessage("Please select a course before scanning.");
      setStatusType("error");
      return;
    }

    setStatusMessage("Opening video stream...");
    setStatusType("scanning");
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      
      setStream(mediaStream);
      setScanning(true);
      setStatusMessage("Biometric scanner active. Stand in front of the camera.");
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      // Fetch logs initially
      fetchLogs(parseInt(selectedCourse));
      
      // Start intervals to snap and process frames
      scanIntervalRef.current = setInterval(() => {
        captureAndMarkAttendance();
      }, 2000); // scans every 2 seconds

    } catch (err) {
      console.error(err);
      setStatusMessage("Camera capture device blocked or missing. Enable browser media permissions.");
      setStatusType("error");
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    
    setScanning(false);
    setStatusType("idle");
    setStatusMessage("Scanner paused. Click Start to resume.");
    setMatchedStudentName("");
    setMatchScore(0);
  };

  const captureAndMarkAttendance = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedCourse) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        setStatusMessage("Analyzing facial frame biometrics...");
        setStatusType("scanning");

        try {
          const mStudentId = mockStudentId ? parseInt(mockStudentId) : undefined;
          
          // Send snapshot to API endpoint
          const result = await api.markAttendance(
            parseInt(selectedCourse), 
            blob, 
            mStudentId
          );

          if (result.status === "success") {
            setStatusType("success");
            setStatusMessage(`Identified: ${result.student.user.fullname}`);
            setMatchedStudentName(result.student.user.fullname);
            setMatchScore(result.confidence);
            
            // Reload list
            fetchLogs(parseInt(selectedCourse));
          } else if (result.status === "duplicate") {
            setStatusType("duplicate");
            setStatusMessage(`${result.student.user.fullname} already checked-in.`);
            setMatchedStudentName(result.student.user.fullname);
            setMatchScore(result.confidence);
          } else {
            setStatusType("error");
            setStatusMessage("Face not recognized.");
            setMatchedStudentName("");
            setMatchScore(0);
          }
        } catch (err: any) {
          setStatusType("error");
          setStatusMessage(err.message || "No face detected in video frame.");
          setMatchedStudentName("");
          setMatchScore(0);
        }
      }, "image/jpeg", 0.85);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[var(--muted)]">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500 mr-2" />
        <span className="text-sm font-mono">Initializing camera modules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Configuration Header */}
      <div className="glass-card p-6 rounded-2xl border border-[var(--border)] flex flex-col md:flex-row items-end gap-6">
        <div className="flex-1 w-full space-y-2">
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Select Course Module
          </label>
          <select
            value={selectedCourse}
            onChange={handleCourseChange}
            disabled={scanning}
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] focus:border-cyan-500 rounded-xl text-sm text-[var(--foreground)] outline-none cursor-pointer"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_code} - {course.course_name}
              </option>
            ))}
          </select>
        </div>

        {/* Start/Stop Button */}
        <div className="w-full md:w-auto">
          {!scanning ? (
            <button
              onClick={startScanning}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-cyan-500 text-slate-950 font-bold px-6 py-3 rounded-xl hover:bg-cyan-400 transition-all glow-cyan cursor-pointer hover-scale"
            >
              <Play className="w-4.5 h-4.5 fill-slate-950" />
              Start Scanner
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-400 transition-all cursor-pointer animate-pulse"
            >
              <Square className="w-4.5 h-4.5 fill-white" />
              Stop Scanner
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Camera View Finder & Biometric Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden shadow-2xl relative">
            
            {/* Camera Viewfinder Box */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              
              {/* Target guidelines */}
              {scanning && (
                <div className="absolute inset-0 z-10 border border-slate-800/40 flex items-center justify-center pointer-events-none">
                  {/* Face bounding box guideline */}
                  <div className={`w-52 h-52 border-2 border-dashed rounded-3xl relative transition-all duration-300 ${
                    statusType === "success" ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-105" :
                    statusType === "duplicate" ? "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]" :
                    statusType === "error" ? "border-red-500" : "border-cyan-400"
                  }`}>
                    {/* Corner accents */}
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                    <span className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                    <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
                    
                    {/* Scanner line */}
                    {statusType === "scanning" && (
                      <span className="absolute left-0 w-full h-0.5 bg-cyan-400 scanner-line" />
                    )}
                  </div>
                </div>
              )}

              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${!scanning ? "hidden" : "block"}`}
              />

              {/* Camera Offline Placeholder */}
              {!scanning && (
                <div className="text-center p-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--card)] flex items-center justify-center border border-[var(--border)] mx-auto glow-cyan-sm">
                    <Camera className="w-7 h-7 text-cyan-400" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Biometric Camera Offline</p>
                  <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">
                    Select a course block above and launch the scanner to initiate facial registration queries.
                  </p>
                </div>
              )}
            </div>

            {/* Hidden canvas for capturing snapshots */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Status indicator bar */}
            <div className={`p-5 flex items-center justify-between text-xs font-semibold ${
              statusType === "success" ? "bg-emerald-500/10 border-t border-emerald-500/25 text-emerald-400" :
              statusType === "duplicate" ? "bg-cyan-500/10 border-t border-cyan-500/25 text-cyan-400" :
              statusType === "error" ? "bg-red-500/10 border-t border-red-500/25 text-red-400" :
              statusType === "scanning" ? "bg-cyan-500/5 border-t border-cyan-500/15 text-cyan-400" :
              "bg-[var(--card)]/60 border-t border-[var(--border)]/60 text-[var(--muted)]"
            }`}>
              <div className="flex items-center gap-2.5">
                {statusType === "success" && <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />}
                {statusType === "duplicate" && <CheckCircle className="w-4.5 h-4.5 text-cyan-500" />}
                {statusType === "error" && <AlertCircle className="w-4.5 h-4.5 text-red-500" />}
                {statusType === "scanning" && <Loader2 className="w-4.5 h-4.5 animate-spin text-cyan-400" />}
                <span className="font-medium tracking-wide uppercase font-mono">{statusMessage}</span>
              </div>
              
              {/* Confidence Score Badge */}
              {matchedStudentName && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-mono">Similarity Score</span>
                  <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                    statusType === "success" ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400" :
                    "bg-cyan-950/40 border border-cyan-500/30 text-cyan-400"
                  }`}>
                    {Math.round(matchScore * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Developer Testing Module panel */}
          <div className="glass-card rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Developer Test Simulation Console</span>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              For demonstration, select a student profile below. The mock face scanner will automatically identify the camera frames as this student, bypassing standard physical verification thresholds.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-[var(--muted)] font-semibold uppercase mb-1.5">Mock Student Selection</label>
                <select
                  value={mockStudentId}
                  onChange={(e) => setMockStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] focus:border-cyan-500 rounded-xl text-xs text-[var(--foreground)] outline-none cursor-pointer"
                >
                  <option value="">Off (Use Natural Vector Math)</option>
                  {students.map((std) => (
                    <option key={std.student_id} value={std.student_id}>
                      {std.user.fullname} ({std.matric_number})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <div className="px-3.5 py-2.5 rounded-xl bg-[var(--card)]/50 border border-[var(--border)] text-[10px] text-[var(--muted)] flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Forces backend to match selected student profiles.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Check-in list for selected Course */}
        <div className="glass-card rounded-2xl border border-[var(--border)] p-6 flex flex-col h-full shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-4 mb-5">
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Class Register</h3>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">Checked-in students today</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">
              <Users className="w-3.5 h-3.5" />
              {attendanceLog.length} Present
            </span>
          </div>

          {attendanceLog.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-[var(--muted)]">
              <Clock className="w-8 h-8 text-[var(--border)] mb-3" />
              <p className="text-xs">No active check-ins recorded yet.</p>
              <p className="text-[10px] text-[var(--muted)] mt-1 max-w-[180px]">Mark a student using the viewfinder camera scanner.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-3.5 overflow-y-auto scrollbar-none max-h-[460px]">
              {attendanceLog.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)]/40 hover:bg-[var(--card)] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-xs font-bold font-mono border border-cyan-500/10">
                      {item.student.user.fullname.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{item.student.user.fullname}</p>
                      <p className="text-[10px] text-[var(--muted)] font-mono">{item.student.matric_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/20 border border-emerald-500/20 inline-block">
                      Present
                    </p>
                    <p className="text-[9px] text-[var(--muted)] font-mono mt-1">
                      {new Date(item.attendance_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
