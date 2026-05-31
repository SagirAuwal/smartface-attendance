"use client";

import Link from "next/link";
import { Shield, Users, Clock, ArrowRight, BarChart2 } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import Logo from "./components/Logo";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans overflow-x-hidden transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-[var(--border)] backdrop-blur-md sticky top-0 z-50 bg-[var(--background)]/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={48} className="w-12 h-12" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)]/80 to-cyan-400 bg-clip-text text-transparent">
              SmartFace
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--muted)]">
            <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-cyan-400 transition-colors">Workflow</a>
            <a href="#security" className="hover:text-cyan-400 transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login"
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 hover-scale glow-cyan-sm animate-pulse"
            >
              Launch System
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 max-w-7xl mx-auto px-6 w-full flex flex-col lg:flex-row items-center gap-16">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Hero Left */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6 glow-cyan-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            AI-Powered Biometrics
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-[var(--foreground)] mb-6">
            Real-Time Face Recognition <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 bg-clip-text text-transparent text-glow-cyan">
              Attendance System
            </span>
          </h1>

          <p className="text-lg text-[var(--muted)] max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
            Eliminate proxy attendance and reduce manual workloads. Secure, fast, and automated face authentication tailored for schools, universities, and enterprise workspaces.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto text-center bg-cyan-500 text-slate-950 font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-cyan-400 hover-scale glow-cyan"
            >
              Sign In to Console
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto text-center border border-[var(--border)] hover:border-cyan-500/50 hover:bg-[var(--card)]/40 text-[var(--foreground)] font-semibold px-8 py-4 rounded-xl transition-all duration-200"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Hero Right - UI Preview Mockup */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none relative">
          <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] shadow-2xl relative">
            {/* Top bar */}
            <div className="bg-[var(--card)] px-6 py-4 border-b border-[var(--border)]/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs font-mono text-[var(--muted)]">attendance_scanner.py</span>
              <div className="w-4 h-4" />
            </div>

            {/* Video Preview Frame */}
            <div className="relative aspect-video bg-black flex items-center justify-center p-1 overflow-hidden">
              {/* Mock camera view */}
              <div className="w-full h-full relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 flex flex-col items-center justify-center">
                
                {/* Face Scanning Box Overlay */}
                <div className="w-48 h-48 border-2 border-cyan-400/80 rounded-2xl relative flex items-center justify-center glow-cyan-sm">
                  {/* Target corners */}
                  <span className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-cyan-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-cyan-400" />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-cyan-400" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-cyan-400" />
                  
                  {/* Scanning Laser Line */}
                  <span className="absolute left-0 w-full h-0.5 bg-cyan-400 opacity-80 scanner-line" />
                  
                  <Users className="w-16 h-16 text-cyan-500/20" />
                </div>

                <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 backdrop-blur-md border border-cyan-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                      <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Identified Student</p>
                      <p className="text-sm font-semibold text-white">Sageer Hamza (CSC301)</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-cyan-400 px-2 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">
                    98.4%
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom logs */}
            <div className="p-4 bg-[var(--card)]/40 border-t border-[var(--border)]/40 max-h-36 overflow-y-auto scrollbar-none font-mono text-[11px] text-[var(--muted)] space-y-2">
              <div className="flex items-center justify-between text-[var(--muted)] border-b border-[var(--border)]/40 pb-1.5 mb-2">
                <span>SYSTEM LOGS</span>
                <span className="text-emerald-400 uppercase">ONLINE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted)]">[08:04:12]</span>
                <span className="text-[var(--foreground)]/80">Camera initialization... OK</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted)]">[08:04:15]</span>
                <span className="text-[var(--foreground)]/80">PyTorch CUDA initialization... OK</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted)]">[08:04:22]</span>
                <span className="text-cyan-400 font-semibold">Face detected: Matric RUN/CSC/22/0451</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted)]">[08:04:23]</span>
                <span className="text-emerald-400 font-semibold">SUCCESS: Attendance marked for Hamza Sageer (Present)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-[var(--card)]/20 relative border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl mb-4">
              Designed for Speed & Security
            </h2>
            <p className="text-[var(--muted)]">
              SmartFace combines cutting-edge deep learning with highly flexible dashboards to make attendance tracking simple, fraud-proof, and fast.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="glass-card p-6 rounded-2xl border border-[var(--border)]/60 hover-scale">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-5">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Zero Proxy Fraud</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Biometric face verification ensures only the actual students physically present in the room can check-in.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-6 rounded-2xl border border-[var(--border)]/60 hover-scale">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-5">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Instant Scanning</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                The FaceNet recognition engine processes frame vectors in less than 200ms for rapid classroom check-ins.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-6 rounded-2xl border border-[var(--border)]/60 hover-scale">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mb-5">
                <BarChart2 className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Detailed Analytics</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Get automatically compiled logs, monthly aggregate tables, and absent grids, with CSV/Excel exports.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card p-6 rounded-2xl border border-[var(--border)]/60 hover-scale">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-5">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Enrollment Console</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Lecturers and admins can easily add students and capture reference facial angles directly from any webcam.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card)]/40 py-12 text-center text-sm text-[var(--muted)]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--foreground)]/80">SmartFace Attendance System</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--card)] text-[var(--muted)] border border-[var(--border)]">v1.0</span>
          </div>
          <p>© 2026 SmartFace Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
