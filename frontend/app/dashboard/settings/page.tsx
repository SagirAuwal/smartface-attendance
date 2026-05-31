"use client";

import { useState, useEffect } from "react";
import { api, User } from "../../services/api";
import {
  User as UserIcon,
  Mail,
  Lock,
  Loader2,
  CheckCircle,
  ShieldCheck,
  UserPlus,
  AlertTriangle,
  Upload,
  Trash2
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  // Profile fields state
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Sub-admin creation state (admin only)
  const [adminFullname, setAdminFullname] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  useEffect(() => {
    setMounted(true);
    const user = api.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setFullname(user.fullname);
      setEmail(user.email);
    }
  }, []);

  const handleUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setUploadError("Only JPEG, PNG, GIF and WEBP images are allowed.");
        return;
      }
      
      setUploading(true);
      setUploadError("");
      setProfileSuccess("");
      try {
        const updatedUser = await api.uploadProfilePicture(file);
        setCurrentUser(updatedUser);
        setProfileSuccess("Profile picture uploaded successfully!");
      } catch (err: any) {
        setUploadError(err.message || "Failed to upload profile picture.");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleRemovePhoto = async () => {
    if (!currentUser?.profile_picture) return;
    
    setUploading(true);
    setUploadError("");
    setProfileSuccess("");
    try {
      const updatedUser = await api.removeProfilePicture();
      setCurrentUser(updatedUser);
      setProfileSuccess("Profile picture removed successfully!");
    } catch (err: any) {
      setUploadError(err.message || "Failed to remove profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!fullname || !email) {
      setProfileError("Full Name and Email Address are required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setProfileError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    setProfileSaving(true);
    try {
      const updatedUser = await api.updateProfile(
        fullname,
        email,
        password || undefined
      );
      
      setCurrentUser(updatedUser);
      setPassword(""); // Clear password field after saving
      setProfileSuccess("Profile updated successfully!");

      // Dispatch custom event to notify layout/sidebar to refresh user details
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("user-updated"));
      }
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile details.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminSuccess("");

    if (!adminFullname || !adminEmail || !adminPassword) {
      setAdminError("Please fill in all fields to create a sub-admin.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      setAdminError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    setAdminSaving(true);
    try {
      await api.signup(
        adminFullname,
        adminEmail,
        "admin",
        adminPassword
      );

      setAdminSuccess(`Sub-Administrator ${adminFullname} registered successfully!`);
      setAdminFullname("");
      setAdminEmail("");
      setAdminPassword("");
    } catch (err: any) {
      setAdminError(err.message || "Failed to create sub-administrator.");
    } finally {
      setAdminSaving(false);
    }
  };

  if (!mounted || !currentUser) {
    return (
      <div className="flex justify-center items-center py-20 text-[var(--muted)]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mr-2" />
        <span className="text-sm font-mono">Loading settings config...</span>
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Profile Settings Card */}
        <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl bg-[var(--card)]/50 backdrop-blur-md flex flex-col">
          <div className="p-6 border-b border-[var(--border)]/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
              <UserIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">Profile Details</h2>
              <p className="text-xs text-[var(--muted)]">Update your account display name, email, and password</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="p-6 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {profileError && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {/* Profile Image Uploader */}
              <div className="flex flex-col items-center justify-center p-4 border border-[var(--border)]/30 rounded-2xl bg-[var(--background)]/30 mb-6">
                <div className="relative group">
                  {currentUser.profile_picture ? (
                    <img
                      src={`${BACKEND_URL}${currentUser.profile_picture}`}
                      alt={currentUser.fullname}
                      className="w-24 h-24 rounded-full object-cover border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-300"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border-2 border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-3xl shadow-inner">
                      {fullname ? fullname.substring(0, 2).toUpperCase() : "SF"}
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-[1px]">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500/10 border border-cyan-500/25 hover:border-cyan-500/50 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Photo
                  </button>
                  {currentUser.profile_picture && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={uploading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-500/5 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/15 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                {uploadError && (
                  <p className="text-[11px] text-red-400 font-medium mt-2 text-center">{uploadError}</p>
                )}
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--muted)]">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] focus:border-cyan-500 rounded-xl text-sm text-[var(--foreground)] outline-none transition-all placeholder-[var(--muted)]"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--muted)]">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] focus:border-cyan-500 rounded-xl text-sm text-[var(--foreground)] outline-none transition-all placeholder-[var(--muted)]"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--muted)]">Change Password</label>
                  <span className="text-[10px] text-[var(--muted)] italic">Leave blank to keep current</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] focus:border-cyan-500 rounded-xl text-sm text-[var(--foreground)] outline-none transition-all placeholder-[var(--muted)]"
                  />
                </div>
              </div>

              {/* Role badge */}
              <div className="pt-2 flex items-center justify-between text-xs border-t border-[var(--border)]/30 mt-4">
                <span className="text-[var(--muted)]">Account Role</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium capitalize text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                  {currentUser.role}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all hover-scale disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {profileSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  Updating Profile...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        </div>

        {/* Add Sub-Admin Card (Admin Only) */}
        {isAdmin ? (
          <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl bg-[var(--card)]/50 backdrop-blur-md flex flex-col">
            <div className="p-6 border-b border-[var(--border)]/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/30">
                <UserPlus className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">Add Sub-Admin</h2>
                <p className="text-xs text-[var(--muted)]">Register a new administrator account for system management</p>
              </div>
            </div>

            <form onSubmit={handleAddSubAdmin} className="p-6 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {adminError && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                {adminSuccess && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{adminSuccess}</span>
                  </div>
                )}

                {/* Sub-Admin Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)]">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      type="text"
                      value={adminFullname}
                      onChange={(e) => setAdminFullname(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] focus:border-purple-500 rounded-xl text-sm text-[var(--foreground)] outline-none transition-all placeholder-[var(--muted)]"
                      required
                    />
                  </div>
                </div>

                {/* Sub-Admin Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)]">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] focus:border-purple-500 rounded-xl text-sm text-[var(--foreground)] outline-none transition-all placeholder-[var(--muted)]"
                      required
                    />
                  </div>
                </div>

                {/* Sub-Admin Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)]">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Create account password"
                      className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] focus:border-purple-500 rounded-xl text-sm text-[var(--foreground)] outline-none transition-all placeholder-[var(--muted)]"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={adminSaving}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all hover-scale disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {adminSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    Creating Account...
                  </>
                ) : (
                  "Create Admin Account"
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Profile Information and Instructions card for Non-Admins */
          <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl bg-[var(--card)]/50 backdrop-blur-md p-6 flex flex-col justify-center space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-2xl mx-auto shadow-md">
              {currentUser.fullname.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[var(--foreground)]">{currentUser.fullname}</h3>
              <p className="text-xs text-[var(--muted)]">{currentUser.email}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-semibold capitalize text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                {currentUser.role} Account
              </div>
            </div>
            <div className="pt-6 border-t border-[var(--border)]/35 text-[var(--muted)] text-xs max-w-sm mx-auto leading-relaxed">
              <p>For credentials or security issues requiring root privilege modifications, please reach out to your administrator directly.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
