"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, CourseStats, Attendance } from "../services/api";
import {
  Users,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  Camera,
  FileText,
  UserPlus,
  ArrowUpRight,
  Clock
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState<CourseStats[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const user = api.getCurrentUser();
    if (user) {
      setRole(user.role);
    }

    const fetchData = async () => {
      try {
        const statsData = await api.getStats();
        setStats(statsData);

        const logs = await api.getAttendance();
        // Limit to 5 most recent records
        setRecentAttendance(logs.slice(0, 5));
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:0.2s]" />
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:0.4s]" />
          <span className="text-xs font-mono ml-2">Loading metrics...</span>
        </div>
      </div>
    );
  }

  // Calculate aggregated stats
  const totalCourses = stats.length;
  const totalStudents = stats.reduce((acc, curr) => Math.max(acc, curr.total_students), 0);
  const presentToday = stats.reduce((acc, curr) => acc + curr.present_today, 0);
  
  // Calculate average attendance rate across courses
  const avgRate = totalCourses > 0
    ? Math.round(stats.reduce((acc, curr) => acc + curr.attendance_rate, 0) / totalCourses)
    : 0;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary-500/25 bg-gradient-to-br from-[#0c1222] to-[#060a12] p-6 md:p-8 shadow-[0_0_30px_rgba(6,182,212,0.04)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex-1 max-w-xl z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2.5 tracking-tight">SmartFace Console Active</h2>
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            Welcome to the SmartFace dashboard. Biometric facial analysis models are loaded and checking in student profiles. Review active courses, trigger real-time webcam scanners, or generate logs.
          </p>
        </div>

        {/* Biometric Scanning Illustration */}
        <div className="w-full md:w-[400px] h-32 md:h-36 flex-shrink-0 relative overflow-hidden bg-slate-950/50 rounded-xl border border-primary-500/15 flex items-center justify-center p-1 z-10">
          <svg viewBox="0 0 360 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <filter id="primary-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="scanner-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
                <stop offset="15%" stopColor="rgba(6, 182, 212, 0.4)" />
                <stop offset="50%" stopColor="rgba(34, 211, 238, 1)" />
                <stop offset="85%" stopColor="rgba(6, 182, 212, 0.4)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
              </linearGradient>
            </defs>

            {/* Grid Background */}
            <path d="M 0,20 L 360,20 M 0,40 L 360,40 M 0,60 L 360,60 M 0,80 L 360,80 M 0,100 L 360,100 M 0,120 L 360,120" stroke="rgba(6, 182, 212, 0.04)" strokeWidth="0.5" />
            <path d="M 40,0 L 40,140 M 80,0 L 80,140 M 120,0 L 120,140 M 160,0 L 160,140 M 200,0 L 200,140 M 240,0 L 240,140 M 280,0 L 280,140 M 320,0 L 320,140" stroke="rgba(6, 182, 212, 0.04)" strokeWidth="0.5" />

            {/* Biometric Waves with animation */}
            <path d="M 10,70 Q 30,35 50,70 T 90,70 T 130,70 T 170,70" stroke="rgba(6, 182, 212, 0.2)" strokeWidth="1.2" fill="none" className="biometric-wave-1" />
            <path d="M 10,70 Q 20,95 40,70 T 80,70 T 120,70 T 160,70" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="0.8" fill="none" className="biometric-wave-2" />

            {/* Front-Facing Face Mesh Outline & lines */}
            <path d="
              M 235,22 L 256,28 L 273,46 L 276,67 L 274,91 L 259,112 L 235,121 L 211,112 L 196,91 L 194,67 L 197,46 L 214,28 L 235,22 Z
              M 235,22 L 235,40 L 235,58 L 235,67 L 235,88 L 235,103 L 235,109 L 235,115 L 235,121
              M 235,22 L 214,28 M 235,22 L 256,28
              M 235,40 L 214,28 M 235,40 L 256,28
              M 235,40 L 197,46 M 235,40 L 273,46
              M 197,46 L 214,28 M 273,46 L 256,28
              M 197,46 L 194,67 M 273,46 L 276,67
              M 194,67 L 196,91 M 276,67 L 274,91
              M 196,91 L 211,112 M 274,91 L 259,112
              M 211,112 L 235,121 M 259,112 L 235,121
              M 196,91 L 223,91 M 274,91 L 247,91
              M 235,88 L 223,91 M 235,88 L 247,91
              M 223,91 L 217,104.5 M 247,91 L 253,104.5
              M 211,112 L 217,104.5 M 259,112 L 253,104.5
              M 235,103 L 217,104.5 M 235,103 L 253,104.5
              M 235,109 L 217,104.5 M 235,109 L 253,104.5
              M 235,109 L 235,115
              M 235,115 L 211,112 M 235,115 L 259,112
              M 235,58 L 217,58 M 235,58 L 253,58
              M 217,58 L 211,67 L 235,67 M 253,58 L 259,67 L 235,67
              M 217,58 L 197,46 M 253,58 L 273,46
              M 211,67 L 194,67 M 259,67 L 276,67
              M 211,67 L 223,91 M 259,67 L 247,91
            " stroke="url(#logo-grad)" strokeWidth="1.1" strokeOpacity="0.6" fill="none" />

            {/* Symmetrical Face Grid Nodes */}
            <g fill="#22d3ee" filter="url(#primary-glow)">
              <circle cx="235" cy="22" r="1.2" />
              <circle cx="214" cy="28" r="1.2" />
              <circle cx="256" cy="28" r="1.2" />
              <circle cx="197" cy="46" r="1.2" />
              <circle cx="273" cy="46" r="1.2" />
              <circle cx="194" cy="67" r="1.2" />
              <circle cx="276" cy="67" r="1.2" />
              <circle cx="196" cy="91" r="1.2" />
              <circle cx="274" cy="91" r="1.2" />
              <circle cx="211" cy="112" r="1.2" />
              <circle cx="259" cy="112" r="1.2" />
              <circle cx="235" cy="121" r="1.2" />
              <circle cx="223" cy="91" r="1.2" />
              <circle cx="247" cy="91" r="1.2" />
              <circle cx="217" cy="104.5" r="1.2" />
              <circle cx="253" cy="104.5" r="1.2" />
              <circle cx="235" cy="109" r="1.2" />
              <circle cx="235" cy="115" r="1.2" />
              <circle cx="235" cy="40" r="1.2" />
              <circle cx="235" cy="58" r="1.2" />
              <circle cx="217" cy="58" r="1.2" />
              <circle cx="253" cy="58" r="1.2" />
              <circle cx="211" cy="67" r="1.2" />
              <circle cx="259" cy="67" r="1.2" />
              <circle cx="235" cy="67" r="1.2" />
              <circle cx="235" cy="88" r="1.2" />
              <circle cx="235" cy="103" r="1.2" />
            </g>

            {/* Guide Corner Brackets */}
            <path d="M 180,25 L 180,15 L 190,15" stroke="#22d3ee" strokeWidth="1.2" />
            <path d="M 285,15 L 295,15 L 295,25" stroke="#22d3ee" strokeWidth="1.2" />
            <path d="M 180,115 L 180,125 L 190,125" stroke="#22d3ee" strokeWidth="1.2" />
            <path d="M 285,125 L 295,125 L 295,115" stroke="#22d3ee" strokeWidth="1.2" />

            {/* Matrix logs / technical text */}
            <g fill="rgba(6, 182, 212, 0.6)" fontFamily="monospace" fontSize="5.5" letterSpacing="0.4">
              <text x="310" y="25">ID: SF-78</text>
              <text x="310" y="35">ACC: 99.82%</text>
              <text x="310" y="45">DIST: 0.82m</text>
              <text x="310" y="55">FPS: 45.0</text>
              <text x="310" y="65">VEC: 512D</text>
              <text x="310" y="75">TEMP: 36.6C</text>
              <text x="310" y="85">STATUS: OK</text>
              <text x="310" y="95">MODE: LIVE</text>
              <text x="310" y="105">LOCK: SEC</text>
              <text x="310" y="115">PT_V3.8</text>
            </g>

            {/* Animated Laser Scanning Line */}
            <g className="scanner-line-group-anim">
              <rect x="180" y="0" width="115" height="1.5" fill="url(#scanner-grad)" filter="url(#primary-glow)" />
              <circle cx="180" cy="0.75" r="1.5" fill="#22d3ee" filter="url(#primary-glow)" />
              <circle cx="295" cy="0.75" r="1.5" fill="#22d3ee" filter="url(#primary-glow)" />
            </g>
          </svg>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scan-vertical {
              0%, 100% { transform: translateY(15px); }
              50% { transform: translateY(125px); }
            }
            @keyframes pulse-wave {
              0%, 100% { transform: scaleY(1); opacity: 0.8; }
              50% { transform: scaleY(1.3) translateY(-10px); opacity: 1; }
            }
            .scanner-line-group-anim {
              animation: scan-vertical 5s ease-in-out infinite;
            }
            .biometric-wave-1 {
              animation: pulse-wave 4s ease-in-out infinite;
              transform-origin: 90px 70px;
            }
            .biometric-wave-2 {
              animation: pulse-wave 6s ease-in-out infinite alternate;
              transform-origin: 90px 70px;
            }
          `}} />
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Enrolled</span>
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--foreground)]">{totalStudents}</span>
            <span className="text-xs text-[var(--muted)] font-mono">Students</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Modules</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--foreground)]">{totalCourses}</span>
            <span className="text-xs text-[var(--muted)] font-mono">Courses</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scanned Today</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CalendarCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--foreground)]">{presentToday}</span>
            <span className="text-xs text-[var(--muted)] font-mono">Check-ins</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Check-in Rate</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--foreground)]">{avgRate}%</span>
            <span className="text-xs text-emerald-500 font-medium">Stable</span>
          </div>
        </div>
      </div>

      {/* Main Stats and Logs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Courses list and analytics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl border border-[var(--border)] p-6">
            <h3 className="text-base font-bold text-[var(--foreground)] mb-6">Course Attendance Rates</h3>
            
            {stats.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-6 text-center">No active courses registered.</p>
            ) : (
              <div className="space-y-5">
                {stats.map((course) => (
                  <div key={course.course_code} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold text-[var(--foreground)] mr-2">{course.course_code}</span>
                        <span className="text-[var(--muted)] text-xs">{course.course_name}</span>
                      </div>
                      <span className="font-semibold text-primary-400">{course.attendance_rate}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-[var(--background)] rounded-full overflow-hidden border border-[var(--border)]/40">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-blue-500 rounded-full"
                        style={{ width: `${course.attendance_rate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{course.present_today} present today</span>
                      <span>{course.total_students} students enrolled</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          {role !== "student" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/dashboard/attendance"
                className="glass-card p-5 rounded-2xl border border-[var(--border)] hover:border-primary-500/20 hover:bg-[var(--card)]/55 flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20 mb-3 group-hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5 text-primary-400" />
                </div>
                <h4 className="text-xs font-bold text-[var(--foreground)] mb-1">Mark Face Attendance</h4>
                <p className="text-[10px] text-[var(--muted)]">Open webcam scanner</p>
              </Link>

              <Link
                href="/dashboard/students"
                className="glass-card p-5 rounded-2xl border border-[var(--border)] hover:border-blue-500/20 hover:bg-[var(--card)]/55 flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-3 group-hover:scale-110 transition-transform">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="text-xs font-bold text-[var(--foreground)] mb-1">Add Student Profile</h4>
                <p className="text-[10px] text-[var(--muted)]">Enroll new face vectors</p>
              </Link>

              <Link
                href="/dashboard/reports"
                className="glass-card p-5 rounded-2xl border border-[var(--border)] hover:border-purple-500/20 hover:bg-[var(--card)]/55 flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mb-3 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <h4 className="text-xs font-bold text-[var(--foreground)] mb-1">Attendance Records</h4>
                <p className="text-[10px] text-[var(--muted)]">Filter, search & CSV exports</p>
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Real-time scan activity logs */}
        <div className="glass-card rounded-2xl border border-[var(--border)] p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-[var(--foreground)]">Live Activity Log</h3>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          {recentAttendance.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <Clock className="w-8 h-8 text-[var(--muted)] mb-3" />
              <p className="text-xs text-[var(--muted)] italic">No attendance scans recorded today.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto scrollbar-none">
              {recentAttendance.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)]/40 bg-[var(--card)]/40 hover:bg-[var(--card)]/80"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 text-xs font-bold font-mono">
                      {log.student.user.fullname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{log.student.user.fullname}</p>
                      <p className="text-[10px] text-[var(--muted)]">{new Date(log.attendance_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/20 border border-emerald-500/20">
                    Present
                  </span>
                </div>
              ))}
              
              <Link
                href="/dashboard/reports"
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors pt-2 block text-center"
              >
                View all logs
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
