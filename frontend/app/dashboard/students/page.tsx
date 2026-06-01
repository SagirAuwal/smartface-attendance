"use client";

import { useState, useEffect, useRef } from "react";
import { api, Student } from "../../services/api";
import {
  Search,
  UserPlus,
  Users,
  Camera,
  X,
  ShieldAlert,
  Loader2,
  Trash2,
  CheckCircle,
  Video
} from "lucide-react";

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Form fields
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("300 Level");

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [enrollProgress, setEnrollProgress] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDelete = async (studentId: number, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete student '${name}'? This will delete their login profile, face biometrics, and all attendance logs.`)) {
      try {
        await api.deleteStudent(studentId);
        fetchStudents();
      } catch (err: any) {
        alert(err.message || "Failed to delete student");
      }
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await api.getStudents();
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCamera = async () => {
    setCapturedImage(null);
    setImageBlob(null);
    setFormError("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 300, facingMode: "user" }
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Delay slightly to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      setFormError("Could not access webcam. Please verify connections and permissions.");
    }
  };

  const handleStopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedImage(dataUrl);
        
        canvas.toBlob((blob) => {
          if (blob) {
            setImageBlob(blob);
          }
        }, "image/jpeg", 0.95);
        
        handleStopCamera();
      }
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!fullname || !email || !password || !matricNumber || !department || !level) {
      setFormError("Please fill in all profile fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    if (!imageBlob) {
      setFormError("Facial biometric scan is required to register a student.");
      return;
    }

    setSaving(true);
    setEnrollProgress("Registering student account credentials...");

    try {
      // 1. Create student account
      const student = await api.createStudent({
        fullname,
        email,
        password,
        matric_number: matricNumber,
        department,
        level
      });

      // 2. Upload face image blob to extract embeddings
      setEnrollProgress("Uploading biometric facial vector to database...");
      await api.registerFace(student.student_id, imageBlob);

      setFormSuccess(`Student ${fullname} enrolled successfully!`);
      // Reset form
      setFullname("");
      setEmail("");
      setPassword("");
      setMatricNumber("");
      setDepartment("");
      setCapturedImage(null);
      setImageBlob(null);
      
      // Refresh list
      fetchStudents();
      
      // Close modal after delay
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess("");
      }, 1500);

    } catch (err: any) {
      setFormError(err.message || "Failed to register student biometric profile");
    } finally {
      setSaving(false);
      setEnrollProgress("");
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.user.fullname.toLowerCase().includes(search.toLowerCase()) ||
      student.matric_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or matric number..."
            className="w-full pl-10 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] focus:border-primary-500 rounded-xl text-sm text-[var(--foreground)] outline-none transition-all placeholder-[var(--muted)] font-sans"
          />
        </div>

        {/* Enroll Button */}
        <button
          onClick={() => {
            setModalOpen(true);
            setFormError("");
            setFormSuccess("");
          }}
          className="flex items-center justify-center gap-2 bg-primary-500 text-slate-950 font-bold px-5 py-3 rounded-xl transition-all hover:bg-primary-400 hover-scale cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Enroll Student
        </button>
      </div>

      {/* Students List Table */}
      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-[var(--muted)]">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary-500" />
            <span className="text-sm font-mono">Loading student registry...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-20 text-center text-[var(--muted)]">
            <Users className="w-12 h-12 mx-auto mb-3 text-[var(--border)]" />
            <p className="text-sm">No students registered yet. Click "Enroll Student" to register.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--card)]/50 border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Matric Number</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Biometrics</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/40">
                {filteredStudents.map((student) => (
                  <tr key={student.student_id} className="hover:bg-[var(--card)]/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[var(--foreground)]">{student.user.fullname}</td>
                    <td className="px-6 py-4 font-mono text-[var(--muted)] text-xs">{student.matric_number}</td>
                    <td className="px-6 py-4 text-[var(--muted)]">{student.user.email}</td>
                    <td className="px-6 py-4 text-[var(--muted)]">{student.department}</td>
                    <td className="px-6 py-4 text-[var(--muted)]">{student.level}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Embedded
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(student.student_id, student.user.fullname)}
                        className="text-red-500 hover:text-red-400 font-medium cursor-pointer inline-flex items-center gap-1 transition-all"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Enroll Student */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-3xl rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[var(--border)]/60 bg-[var(--card)]/90 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--foreground)]">Enroll Student Biometric Profile</h3>
              <button
                onClick={() => {
                  handleStopCamera();
                  setModalOpen(false);
                }}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddStudent} className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-none">
              {formError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form fields */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400">Account Details</h4>
                  
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Full Name</label>
                    <input
                      type="text"
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      placeholder="e.g. Hamza Sageer"
                      className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hamza.sageer@university.edu"
                      className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Temporary Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="temporary_pass"
                      className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500"
                      disabled={saving}
                    />
                  </div>

                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400 pt-2">Academic Details</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Matric Number</label>
                      <input
                        type="text"
                        value={matricNumber}
                        onChange={(e) => setMatricNumber(e.target.value)}
                        placeholder="RUN/CSC/22/..."
                        className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500 font-mono text-xs"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Level</label>
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500 cursor-pointer"
                        disabled={saving}
                      >
                        <option>100 Level</option>
                        <option>200 Level</option>
                        <option>300 Level</option>
                        <option>400 Level</option>
                        <option>500 Level</option>
                        <option>Postgraduate</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Computer Science"
                      className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Biometric webcam panel */}
                <div className="space-y-4 flex flex-col justify-start">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400">Biometric Enrollment</h4>
                  
                  <div className="flex-1 flex flex-col items-center justify-center border border-[var(--border)] bg-black rounded-2xl min-h-[260px] relative overflow-hidden">
                    {/* Live Camera View */}
                    {showCamera && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <video
                           ref={videoRef}
                           autoPlay
                           playsInline
                           muted
                           className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute inset-0 border border-primary-500/30 flex items-center justify-center pointer-events-none">
                          {/* Face Crop Box Reference */}
                          <div className="w-40 h-40 border border-dashed border-primary-400 rounded-full relative">
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] text-primary-400 uppercase tracking-widest text-center font-semibold">Center Face</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Captured image display */}
                    {capturedImage && (
                      <div className="absolute inset-0 bg-cover bg-center flex items-center justify-center">
                        <img src={capturedImage} alt="Face scan capture" className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded shadow">
                          Scanned
                        </div>
                      </div>
                    )}

                    {/* Default state */}
                    {!showCamera && !capturedImage && (
                      <div className="text-center p-6 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-[var(--card)] flex items-center justify-center border border-[var(--border)] mx-auto">
                          <Camera className="w-6 h-6 text-[var(--muted)]" />
                        </div>
                        <p className="text-xs text-[var(--muted)] max-w-[200px]">
                          Launch the camera capture panel to link a biometric profile to this student.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions for Camera */}
                  <div className="flex gap-3">
                    {!showCamera && !capturedImage && (
                      <button
                        type="button"
                        onClick={handleStartCamera}
                        className="w-full py-3 border border-[var(--border)] hover:border-primary-500/30 hover:bg-primary-500/5 text-xs font-bold rounded-xl text-[var(--foreground)] hover:text-primary-400 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        disabled={saving}
                      >
                        <Video className="w-4 h-4" />
                        Start Camera
                      </button>
                    )}

                    {showCamera && (
                      <div className="w-full flex gap-3">
                        <button
                          type="button"
                          onClick={handleCapture}
                          className="flex-1 py-3 bg-primary-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-primary-400 transition-all cursor-pointer"
                        >
                          Capture Face
                        </button>
                        <button
                          type="button"
                          onClick={handleStopCamera}
                          className="py-3 px-4 border border-[var(--border)] text-[var(--muted)] text-xs rounded-xl hover:bg-[var(--card)] transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {capturedImage && (
                      <button
                        type="button"
                        onClick={handleStartCamera}
                        className="w-full py-3 border border-[var(--border)] hover:border-primary-500/30 hover:bg-primary-500/5 text-xs font-bold rounded-xl text-[var(--foreground)] hover:text-primary-400 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        disabled={saving}
                      >
                        <Camera className="w-4 h-4" />
                        Retake Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Hidden Canvas for capturing */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Modal Actions */}
              <div className="border-t border-[var(--border)]/60 pt-6 flex justify-end gap-4 bg-[var(--card)]/40 -mx-6 px-6 -mb-6 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    handleStopCamera();
                    setModalOpen(false);
                  }}
                  className="px-5 py-3 border border-[var(--border)] hover:bg-[var(--background)]/50 text-[var(--muted)] text-xs font-bold rounded-xl transition-all cursor-pointer"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-500 text-slate-950 font-extrabold text-xs rounded-xl hover:bg-primary-400 transition-all glow-primary flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving || !imageBlob}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {enrollProgress || "Saving..."}
                    </>
                  ) : (
                    "Save & Enroll Profile"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
