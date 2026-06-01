"use client";

import { useState, useEffect } from "react";
import { api, User } from "../../services/api";
import {
  Search,
  UserPlus,
  ShieldCheck,
  X,
  ShieldAlert,
  Loader2,
  Trash2,
  CheckCircle,
  Mail,
  User as UserIcon,
  Lock
} from "lucide-react";

export default function Lecturers() {
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Form fields
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLecturers();
  }, []);

  const fetchLecturers = async () => {
    try {
      const data = await api.getLecturers();
      setLecturers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (lecturerId: number, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete lecturer '${name}'? This will delete their login profile and CASCADE to clean up all courses they teach along with associated student attendance registry logs.`)) {
      try {
        await api.deleteLecturer(lecturerId);
        fetchLecturers();
      } catch (err: any) {
        alert(err.message || "Failed to delete lecturer");
      }
    }
  };

  const handleAddLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!fullname || !email || !password || !department || !courseCode || !courseName) {
      setFormError("Please fill in all fields, including department and course details.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    setSaving(true);

    try {
      await api.createLecturer({
        fullname,
        email,
        password,
        department,
        course_code: courseCode,
        course_name: courseName
      });

      setFormSuccess(`Lecturer ${fullname} registered successfully!`);
      // Reset form
      setFullname("");
      setEmail("");
      setPassword("");
      setDepartment("");
      setCourseCode("");
      setCourseName("");
      
      // Refresh list
      fetchLecturers();
      
      // Close modal after delay
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess("");
      }, 1500);

    } catch (err: any) {
      setFormError(err.message || "Failed to register lecturer account.");
    } finally {
      setSaving(false);
    }
  };

  const filteredLecturers = lecturers.filter(
    (lecturer) =>
      lecturer.fullname.toLowerCase().includes(search.toLowerCase()) ||
      lecturer.email.toLowerCase().includes(search.toLowerCase())
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
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] focus:border-primary-500 rounded-xl text-sm text-[var(--foreground)] outline-none transition-all placeholder-[var(--muted)]"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={() => {
            setModalOpen(true);
            setFormError("");
            setFormSuccess("");
          }}
          className="flex items-center justify-center gap-2 bg-primary-500 text-slate-950 font-bold px-5 py-3 rounded-xl transition-all hover:bg-primary-400 hover-scale cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add Lecturer
        </button>
      </div>

      {/* Lecturers List Table */}
      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-[var(--muted)]">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary-500" />
            <span className="text-sm font-mono">Loading lecturer database...</span>
          </div>
        ) : filteredLecturers.length === 0 ? (
          <div className="py-20 text-center text-[var(--muted)]">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-[var(--border)]" />
            <p className="text-sm">No lecturers registered yet. Click "Add Lecturer" to register.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--card)]/50 border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Registered Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/40">
                {filteredLecturers.map((lecturer) => (
                  <tr key={lecturer.id} className="hover:bg-[var(--card)]/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[var(--foreground)]">{lecturer.fullname}</td>
                    <td className="px-6 py-4 text-[var(--muted)] font-mono text-xs">{lecturer.email}</td>
                    <td className="px-6 py-4 text-[var(--muted)]">{lecturer.department || "N/A"}</td>
                    <td className="px-6 py-4 text-[var(--muted)]">
                      {new Date(lecturer.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(lecturer.id, lecturer.fullname)}
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

      {/* Modal - Add Lecturer */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[var(--border)]/60 bg-[var(--card)]/90 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--foreground)]">Register Lecturer Profile</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddLecturer} className="p-6 space-y-5 overflow-y-auto max-h-[70vh] scrollbar-none">
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

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      type="text"
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      placeholder="Dr. Zainab Aliyu"
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="zainab.aliyu@university.edu"
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Login Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500"
                    disabled={saving}
                  />
                </div>

                <div className="pt-2 border-t border-[var(--border)]/40">
                  <h4 className="text-xs font-bold text-primary-400 uppercase tracking-wider mb-3">Assigned Course Module</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Course Code</label>
                      <input
                        type="text"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        placeholder="e.g. CSC301"
                        className="w-full px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500 font-mono text-xs"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase">Course Name</label>
                      <input
                        type="text"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        placeholder="e.g. Artificial Intelligence"
                        className="w-full px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] outline-none focus:border-primary-500"
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="border-t border-[var(--border)]/65 pt-5 flex justify-end gap-3 bg-[var(--card)]/40 -mx-6 px-6 -mb-6 pb-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-[var(--border)] hover:bg-[var(--background)]/50 text-[var(--muted)] hover:text-[var(--foreground)] text-xs font-bold rounded-xl transition-all cursor-pointer"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary-500 text-slate-950 font-extrabold text-xs rounded-xl hover:bg-primary-400 transition-all glow-primary flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register Lecturer"
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
