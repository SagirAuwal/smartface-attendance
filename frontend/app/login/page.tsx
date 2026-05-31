"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../services/api";
import { Lock, Mail, ShieldAlert, Loader2 } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

export default function Login() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"admin" | "lecturer">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("expired") === "true") {
        setError("Your session has expired. Please log in again.");
        // Clear query parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (api.getCurrentUser()) {
        router.push("/dashboard");
      }
    } else if (api.getCurrentUser()) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleTabChange = (tab: "admin" | "lecturer") => {
    setActiveTab(tab);
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.login(email, password);
      
      // Enforce separated role access based on active tab
      const loggedInUser = api.getCurrentUser();
      if (loggedInUser) {
        if (activeTab === "admin" && loggedInUser.role !== "admin") {
          api.logout();
          setError("This account does not have administrator privileges. Please use the Lecturer Portal tab.");
          setLoading(false);
          return;
        }
        if (activeTab === "lecturer" && loggedInUser.role !== "lecturer") {
          api.logout();
          setError("This account is registered as an Administrator. Please use the Admin Portal tab.");
          setLoading(false);
          return;
        }
      }
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)] font-sans p-6 relative transition-colors duration-300">
      {/* Theme Switcher */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      {/* Background decoration blur */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 mb-2 hover-scale">
            <Logo size={56} className="w-14 h-14" />
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--foreground)] to-cyan-400 bg-clip-text text-transparent">
              SmartFace
            </span>
          </Link>
          <p className="text-sm text-[var(--muted)] font-medium">Biometric Attendance Console</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl border border-[var(--border)] p-8 shadow-2xl">
          {/* Tab Switcher */}
          <div className="flex border-b border-[var(--border)]/30 mb-6">
            <button
              type="button"
              onClick={() => handleTabChange("admin")}
              className={`flex-1 pb-3 text-sm font-bold text-center transition-all cursor-pointer ${
                activeTab === "admin"
                  ? "text-cyan-400 border-b-2 border-cyan-500"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Admin Portal
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("lecturer")}
              className={`flex-1 pb-3 text-sm font-bold text-center transition-all cursor-pointer ${
                activeTab === "lecturer"
                  ? "text-cyan-400 border-b-2 border-cyan-500"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Lecturer Portal
            </button>
          </div>

          <h2 className="text-xl font-bold text-[var(--foreground)] mb-6 text-center">
            {activeTab === "admin" ? "Admin Sign In" : "Lecturer Sign In"}
          </h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeTab === "admin" ? "admin@smartface.com" : "tariq@smartface.com"}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-sm text-[var(--foreground)] placeholder-[var(--muted)] outline-none transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-sm text-[var(--foreground)] placeholder-[var(--muted)] outline-none transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-cyan-500 text-slate-950 font-bold py-3.5 rounded-xl transition-all duration-200 hover:bg-cyan-400 glow-cyan cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover-scale"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
