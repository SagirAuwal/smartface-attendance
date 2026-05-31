"use client";

import { useState, useEffect } from "react";
import { api, Course, Attendance } from "../../services/api";
import {
  Download,
  Search,
  Filter,
  FileText,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";

export default function Reports() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const coursesData = await api.getCourses();
      setCourses(coursesData);
      
      const logsData = await api.getAttendance();
      setLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async () => {
    setLoading(true);
    try {
      const courseId = selectedCourse === "all" ? undefined : parseInt(selectedCourse);
      const data = await api.getAttendance(courseId);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading logs when filter selection changes
  useEffect(() => {
    if (selectedCourse !== "") {
      handleFilterChange();
    }
  }, [selectedCourse]);

  // Apply local filtering for Date and Search Query
  const filteredLogs = logs.filter((log) => {
    // 1. Date Filter
    if (selectedDate) {
      const logDate = new Date(log.attendance_time).toISOString().split("T")[0];
      if (logDate !== selectedDate) return false;
    }

    // 2. Search Query Filter (Student Name or Matric Number)
    if (search) {
      const query = search.toLowerCase();
      const nameMatch = log.student.user.fullname.toLowerCase().includes(query);
      const matricMatch = log.student.matric_number.toLowerCase().includes(query);
      if (!nameMatch && !matricMatch) return false;
    }

    return true;
  });

  const handleExportPDF = () => {
    if (filteredLogs.length === 0) return;

    Promise.all([
      import("jspdf"),
      import("jspdf-autotable")
    ]).then(([jsPDFModule, autoTableModule]) => {
      const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;
      const autoTable = autoTableModule.default || autoTableModule.autoTable;
      
      // Explicitly apply the plugin to jsPDF class just in case
      if (autoTableModule.applyPlugin) {
        autoTableModule.applyPlugin(jsPDF);
      }

      const doc = new jsPDF();

      // 1. Draw Custom High-Tech Vector Logo in PDF (Highly performant, synchronous vector graphics)
      doc.setFillColor(37, 99, 235); // Blue 600
      doc.circle(20, 17, 7, "F");
      
      doc.setFillColor(6, 182, 212); // Cyan 500
      doc.circle(20, 17, 4, "F");
      
      doc.setFillColor(255, 255, 255); // White Core
      doc.circle(20, 17, 1.5, "F");
      
      // Crosshair Scan Lines
      doc.setDrawColor(34, 211, 238); // Sky 400
      doc.setLineWidth(0.3);
      doc.line(10, 17, 14, 17);
      doc.line(26, 17, 30, 17);
      doc.line(20, 7, 20, 11);
      doc.line(20, 23, 20, 27);
      
      // Outer Target Ring
      doc.setDrawColor(6, 182, 212);
      doc.circle(20, 17, 8.5, "S");

      // Title
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFont("helvetica", "bold");
      doc.text("SmartFace Attendance Report", 33, 20);

      // 2. Metadata Section
      let startY = 32;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);

      const courseCode = selectedCourse === "all" ? "All Courses" : courses.find(c => c.id === parseInt(selectedCourse))?.course_code || "";
      doc.text(`Course Module: ${courseCode}`, 14, startY);
      doc.text(`Date Filter: ${selectedDate || "All Dates"}`, 14, startY + 6);
      doc.text(`Exported On: ${new Date().toLocaleString()}`, 14, startY + 12);
      doc.text(`Total Present: ${filteredLogs.length} Student(s)`, 14, startY + 18);

      // 3. Headers and Rows matching the requested image format
      const tableHeaders = [
        ["Student Name", "Matric Number", "Department", "Level", "Attendance Time", "Confidence Score"]
      ];

      const tableRows = filteredLogs.map((log) => [
        log.student.user.fullname,
        log.student.matric_number,
        log.student.department,
        log.student.level,
        new Date(log.attendance_time).toLocaleString(),
        `${Math.round(log.confidence_score * 100)}%`
      ]);

      // 4. Draw Dark Themed Table (matching the image look exactly) using direct autoTable call
      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: startY + 24,
        theme: "grid",
        headStyles: {
          fillColor: [18, 24, 38], // Dark charcoal: #121826
          textColor: [248, 250, 252], // Slate 50: #f8fafc
          lineColor: [30, 41, 59], // Slate 800: #1e293b
          lineWidth: 0.1,
          fontStyle: "bold",
          halign: "left"
        },
        bodyStyles: {
          fillColor: [18, 24, 38], // Dark charcoal: #121826
          textColor: [248, 250, 252], // Slate 50: #f8fafc
          lineColor: [30, 41, 59], // Slate 800: #1e293b
          lineWidth: 0.1,
          halign: "left"
        },
        alternateRowStyles: {
          fillColor: [24, 32, 51] // Alternate slightly lighter dark charcoal: #182033
        },
        styles: {
          fontSize: 9,
          valign: "middle"
        },
        margin: { top: startY + 24 }
      });

      doc.save(`smartface_report_${selectedDate || "all"}.pdf`);
    }).catch((err) => {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF: " + err.message);
    });
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    // Headers
    const headers = [
      "Student Name",
      "Matric Number",
      "Department",
      "Level",
      "Attendance Time",
      "Confidence Score"
    ];

    // Map logs to array rows
    const rows = filteredLogs.map((log) => [
      `"${log.student.user.fullname}"`,
      `"${log.student.matric_number}"`,
      `"${log.student.department}"`,
      `"${log.student.level}"`,
      `"${new Date(log.attendance_time).toLocaleString()}"`,
      `"${Math.round(log.confidence_score * 100)}%"`
    ]);

    // Build CSV content
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `smartface_report_${selectedDate || "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Filtering Actions Panel */}
      <div className="glass-card p-6 rounded-2xl border border-[var(--border)] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Course Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Filter Course
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] outline-none cursor-pointer focus:border-cyan-500"
          >
            <option value="all">All Modules</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] outline-none focus:border-cyan-500 cursor-pointer"
          />
        </div>

        {/* Search */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Search Student
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or Matric number..."
              className="w-full pl-9 pr-3 py-2.5 bg-[var(--card)] border border-[var(--border)] focus:border-cyan-500 rounded-xl text-xs text-[var(--foreground)] outline-none transition-all placeholder-[var(--muted)]"
            />
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex gap-2.5 w-full">
          <button
            onClick={handleExportPDF}
            disabled={filteredLogs.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs py-3.5 rounded-xl transition-all glow-cyan-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover-scale"
            title="Export Tabular PDF Report"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 border border-[var(--border)] hover:border-cyan-500/30 hover:bg-cyan-500/5 text-[var(--foreground)] font-bold text-xs py-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover-scale"
            title="Export CSV Log File"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Reports Registry Grid Table */}
      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-[var(--muted)]">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-500" />
            <span className="text-sm font-mono">Compiling registry index...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-[var(--muted)]">
            <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--border)]" />
            <p className="text-sm">No attendance records found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--card)]/50 border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Matric Number</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Check-in Time</th>
                  <th className="px-6 py-4">Confidence</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/40">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--card)]/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[var(--foreground)]">{log.student.user.fullname}</td>
                    <td className="px-6 py-4 font-mono text-[var(--muted)] text-xs">{log.student.matric_number}</td>
                    <td className="px-6 py-4 text-[var(--muted)]">{log.student.department} ({log.student.level})</td>
                    <td className="px-6 py-4 text-[var(--muted)]">
                      {new Date(log.attendance_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-medium text-cyan-400 bg-cyan-950/20 border border-cyan-500/20 px-2 py-0.5 rounded">
                        {Math.round(log.confidence_score * 100)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                        Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
