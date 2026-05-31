"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api, User } from "../services/api";
import {
  Camera,
  Users,
  BarChart2,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ShieldCheck,
  BookOpen,
  Settings as SettingsIcon
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = api.getCurrentUser();
    if (!user) {
      router.push("/login");
    } else {
      setCurrentUser(user);
    }
  }, [router]);

  useEffect(() => {
    const handleUserUpdate = () => {
      const user = api.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    };
    window.addEventListener("user-updated", handleUserUpdate);
    window.addEventListener("user_profile_updated", handleUserUpdate);
    return () => {
      window.removeEventListener("user-updated", handleUserUpdate);
      window.removeEventListener("user_profile_updated", handleUserUpdate);
    };
  }, []);

  const handleLogout = () => {
    api.logout();
    router.push("/login");
  };

  if (!mounted || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 animate-pulse">
            <Camera className="w-6 h-6 text-cyan-400" />
          </div>
          <span className="text-sm text-[var(--muted)] font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  // Define nav links based on role
  const navItems = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "lecturer", "student"],
    },
    {
      name: "Face Scanner",
      href: "/dashboard/attendance",
      icon: Camera,
      roles: ["admin", "lecturer"], // Only staff can mark face attendance
    },
    {
      name: "Students",
      href: "/dashboard/students",
      icon: Users,
      roles: ["admin", "lecturer"], // Staff manages students
    },
    {
      name: "Lecturers",
      href: "/dashboard/lecturers",
      icon: ShieldCheck,
      roles: ["admin"], // Only admin can manage lecturers
    },
    {
      name: "Attendance Reports",
      href: "/dashboard/reports",
      icon: BarChart2,
      roles: ["admin", "lecturer", "student"], // All can view relevant reports
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: SettingsIcon,
      roles: ["admin", "lecturer", "student"],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] font-sans overflow-hidden transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-[var(--card)] border-r border-[var(--border)]/60 flex-shrink-0 transition-all duration-300 ${
        sidebarCollapsed ? "w-20" : "w-64"
      }`}>
        <div className={`h-20 flex items-center border-b border-[var(--border)]/40 transition-all duration-300 ${
          sidebarCollapsed ? "justify-center" : "justify-between px-6"
        }`}>
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                <Logo size={44} className="w-11 h-11" />
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-[var(--foreground)] to-cyan-400 bg-clip-text text-transparent">
                  SmartFace
                </span>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/60 transition-colors cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/60 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className={`flex-1 py-6 space-y-1.5 overflow-y-auto scrollbar-none transition-all duration-300 ${
          sidebarCollapsed ? "px-2" : "px-4"
        }`}>
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center rounded-xl text-sm font-medium transition-all ${
                  sidebarCollapsed ? "justify-center p-3" : "gap-3.5 px-4 py-3"
                } ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[inset_0_0_10px_rgba(6,182,212,0.05)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/50"
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-cyan-400" : "text-[var(--muted)]"}`} />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className={`border-t border-[var(--border)]/40 bg-[var(--background)]/40 transition-all duration-300 ${
          sidebarCollapsed ? "p-2 text-center" : "p-4"
        }`}>
          <div className={`flex items-center gap-3 px-2 ${sidebarCollapsed ? "justify-center mb-2" : "mb-4"}`}>
            {currentUser.profile_picture ? (
              <img
                src={`${BACKEND_URL}${currentUser.profile_picture}`}
                alt={currentUser.fullname}
                className="w-9 h-9 rounded-full object-cover border border-cyan-500/30 flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-sm flex-shrink-0">
                {currentUser.fullname.charAt(0).toUpperCase()}
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--foreground)] truncate">{currentUser.fullname}</p>
                <p className="text-[10px] text-[var(--muted)] capitalize truncate flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-cyan-500" />
                  {currentUser.role}
                </p>
              </div>
            )}
          </div>
          
          {sidebarCollapsed ? (
            <button
              onClick={handleLogout}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl border border-[var(--border)] hover:border-red-500/30 hover:bg-red-500/5 text-[var(--muted)] hover:text-red-400 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-[var(--border)] hover:border-red-500/30 hover:bg-red-500/5 text-[var(--muted)] hover:text-red-400 text-xs font-medium transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-[var(--card)] h-full border-r border-[var(--border)]/60 z-50">
            <div className="h-20 flex items-center justify-between px-6 border-b border-[var(--border)]/40">
              <div className="flex items-center gap-3">
                <Logo size={44} className="w-11 h-11" />
                <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">SmartFace</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[var(--border)]/40 bg-[var(--background)]/40">
              <div className="flex items-center gap-3 mb-4 px-2">
                {currentUser.profile_picture ? (
                  <img
                    src={`${BACKEND_URL}${currentUser.profile_picture}`}
                    alt={currentUser.fullname}
                    className="w-9 h-9 rounded-full object-cover border border-cyan-500/30 flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-sm">
                    {currentUser.fullname.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--foreground)] truncate">{currentUser.fullname}</p>
                  <p className="text-[10px] text-[var(--muted)] capitalize">{currentUser.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] hover:border-red-500/30 hover:bg-red-500/5 text-[var(--muted)] hover:text-red-400 text-xs font-medium transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-[var(--background)] border-b border-[var(--border)]/45 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Display page name based on route */}
            <h1 className="text-lg font-bold text-[var(--foreground)] tracking-wide">
              {pathname === "/dashboard" && "Dashboard Overview"}
              {pathname === "/dashboard/attendance" && "Real-Time Face Scanner"}
              {pathname === "/dashboard/students" && "Student Directory"}
              {pathname === "/dashboard/lecturers" && "Lecturer Directory"}
              {pathname === "/dashboard/reports" && "Attendance Registry"}
              {pathname === "/dashboard/settings" && "Account Settings"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme switcher toggle */}
            <ThemeToggle />

            {/* System Mode Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-wider">Server: Online</span>
            </div>
            
            {/* Display user initials */}
            {currentUser.profile_picture ? (
              <img
                src={`${BACKEND_URL}${currentUser.profile_picture}`}
                alt={currentUser.fullname}
                className="w-10 h-10 rounded-xl object-cover border border-cyan-500/30 glow-cyan-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold text-sm glow-cyan-sm">
                {currentUser.fullname.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[var(--background)] relative scrollbar-none">
          {children}
        </main>
      </div>
    </div>
  );
}
