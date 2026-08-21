"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import SrmHeader from "@/components/SrmHeader";

interface MentorReportRow {
  timestamp: string;
  mentorName: string;
  meetingDate: string;
  meetingLink: string;
  minutes: string;
  presentRegNos: string;
  absentRegNos: string;
  reportLink: string;
}

const HEADERS = [
  "Submitted At", "Mentor", "Meeting Date", "Meeting Link",
  "Minutes", "Present Reg Nos", "Absent Reg Nos", "Report Link",
];

const PAGE_SIZE = 20;

const MONTH_LABEL = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

function monthKey(dateStr: string): string {
  // meetingDate comes from an <input type="date"> as YYYY-MM-DD
  const m = dateStr.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : "";
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return MONTH_LABEL.format(new Date(year, month - 1, 1));
}

export default function MentorAdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [logging, setLogging] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [reports, setReports] = useState<MentorReportRow[]>([]);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedMentor, setSelectedMentor] = useState("");
  const [page, setPage] = useState(1);

  const verifyToken = useCallback(async (token: string, silent = false) => {
    try {
      const res = await fetch("/api/report-auth", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        sessionStorage.setItem("report_token", token);
        setAuthed(true);
      } else {
        sessionStorage.removeItem("report_token");
        setAuthed(false);
        if (!silent) setAuthError("Incorrect password. Please try again.");
      }
    } catch {
      if (!silent) setAuthError("Cannot verify password. Please try again.");
    }
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem("report_token");
    if (token) {
      verifyToken(token, true).finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, [verifyToken]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password.trim()) return;
    setLogging(true);
    setAuthError("");
    await verifyToken(password);
    setLogging(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("report_token");
    setAuthed(false);
    setPassword("");
  };

  useEffect(() => {
    if (!authed) return;
    const token = sessionStorage.getItem("report_token") || "";
    fetch("/api/mentor-portal/reports", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setReports(d.reports ?? []))
      .catch(() => setError("Failed to load submitted reports"));
  }, [authed]);

  useEffect(() => {
    setPage(1);
  }, [selectedMonth, selectedMentor]);

  const monthOptions = Array.from(
    new Set(reports.map((r) => monthKey(r.meetingDate)).filter(Boolean))
  ).sort();

  const mentorOptions = Array.from(new Set(reports.map((r) => r.mentorName).filter(Boolean))).sort();

  const filteredReports = reports.filter((r) => {
    if (selectedMonth && monthKey(r.meetingDate) !== selectedMonth) return false;
    if (selectedMentor && r.mentorName !== selectedMentor) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const pagedReports = filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const downloadXLSX = async () => {
    setDownloading(true);
    try {
      const XLSX = await import("xlsx");
      const rows = filteredReports.map((r) => [
        r.timestamp, r.mentorName, r.meetingDate, r.meetingLink,
        r.minutes, r.presentRegNos, r.absentRegNos, r.reportLink,
      ]);
      const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Mentor Reports");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mentor_Progress_Reports_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
        <SrmHeader />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 text-sm">
          Checking access…
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
        <SrmHeader />
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-4">
            <h2 className="text-sm font-black text-[#1a237e] uppercase tracking-widest text-center">
              Admin Access
            </h2>
            <p className="text-xs text-gray-500 text-center">
              Enter the password to view submitted mentor progress reports.
            </p>
            <form className="w-full flex flex-col gap-3" onSubmit={handleLogin}>
              <input
                type="password"
                autoFocus
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none bg-gray-50 focus:border-[#1565c0] text-center"
              />
              {authError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 text-center">
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={logging || !password.trim()}
                className="w-full bg-[#1565c0] hover:bg-[#1255a5] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm uppercase tracking-widest transition-colors"
              >
                {logging ? "Verifying…" : "Unlock Reports"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SrmHeader subtitle="Mentor Progress Reports — Admin" />
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <Link href="/report" className="text-xs font-semibold text-[#1565c0] hover:underline w-fit">
        ← Back to Admin Reports
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 outline-none bg-white focus:border-[#1565c0]"
        >
          <option value="">All Months</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <select
          value={selectedMentor}
          onChange={(e) => setSelectedMentor(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 outline-none bg-white focus:border-[#1565c0]"
        >
          <option value="">All Mentors</option>
          {mentorOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {(selectedMonth || selectedMentor) && (
          <button
            onClick={() => { setSelectedMonth(""); setSelectedMentor(""); }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-full transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-semibold text-gray-700">
          {filteredReports.length} of {reports.length} submitted report{reports.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={downloadXLSX}
          disabled={downloading || filteredReports.length === 0}
          className="bg-[#2e7d32] hover:bg-[#256428] disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors"
        >
          {downloading ? "Preparing…" : "Download XLSX"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-[#1565c0] text-white">
              {HEADERS.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-3 py-8 text-center text-gray-400">
                  {reports.length === 0
                    ? "No progress reports submitted yet."
                    : "No reports match the selected filters."}
                </td>
              </tr>
            ) : (
              pagedReports.map((r, i) => (
                <tr key={i} className={i % 2 !== 0 ? "bg-gray-50" : ""}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.timestamp ? new Date(r.timestamp).toLocaleString("en-IN") : "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.mentorName || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.meetingDate || "—"}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">
                    {r.meetingLink ? (
                      <a href={r.meetingLink} target="_blank" rel="noopener noreferrer" className="text-[#1565c0] hover:underline">
                        {r.meetingLink}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 max-w-[240px] truncate" title={r.minutes}>{r.minutes || "—"}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate" title={r.presentRegNos}>{r.presentRegNos || "—"}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate" title={r.absentRegNos}>{r.absentRegNos || "—"}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">
                    {r.reportLink ? (
                      <a href={r.reportLink} target="_blank" rel="noopener noreferrer" className="text-[#1565c0] hover:underline">
                        {r.reportLink}
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:border-[#1565c0] transition-colors"
          >
            Prev
          </button>
          <span className="text-xs font-semibold text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:border-[#1565c0] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
