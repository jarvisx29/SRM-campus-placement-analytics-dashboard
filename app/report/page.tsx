"use client";

import { useEffect, useState, useCallback } from "react";
import SrmHeader from "@/components/SrmHeader";
import { StudentRow } from "@/types";

interface ReportStudent extends StudentRow {
  dept: string;
}

interface NumericFilter {
  id: number;
  field: "tenth" | "twelfth" | "cgpa" | "backlogs";
  operator: ">" | ">=" | "<" | "<=" | "=";
  value: string;
}

const FIELD_LABELS: Record<string, string> = {
  tenth: "10th %",
  twelfth: "12th %",
  cgpa: "UG CGPA",
  backlogs: "Backlogs",
};

const PLACED_LABELS: Record<string, string> = {
  YES: "Placed",
  NO: "Not Placed",
  NE: "Not Eligible",
  NA: "Not Applicable (HS)",
};

const SORT_FIELDS = [
  { value: "studentName", label: "Name" },
  { value: "registerNo", label: "Register No" },
  { value: "dept", label: "Department" },
  { value: "tenth", label: "10th %" },
  { value: "twelfth", label: "12th %" },
  { value: "cgpa", label: "CGPA" },
];

function getDept(cls: string): string {
  const parts = cls.trim().split(/\s+/);
  return parts.length <= 1 ? cls.trim() : parts.slice(0, -1).join(" ");
}

function matchNumeric(val: string, op: string, threshold: string): boolean {
  const v = parseFloat(val);
  const t = parseFloat(threshold);
  if (isNaN(v) || isNaN(t)) return false;
  if (op === ">") return v > t;
  if (op === ">=") return v >= t;
  if (op === "<") return v < t;
  if (op === "<=") return v <= t;
  return Math.abs(v - t) < 0.001;
}

let nextId = 2;

export default function ReportPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [logging, setLogging] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [allStudents, setAllStudents] = useState<ReportStudent[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [dept, setDept] = useState("");
  const [category, setCategory] = useState("");
  const [placedStatus, setPlacedStatus] = useState("");
  const [numFilters, setNumFilters] = useState<NumericFilter[]>([]);
  const [sortField, setSortField] = useState("studentName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [filtered, setFiltered] = useState<ReportStudent[]>([]);
  const [applied, setApplied] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [generating, setGenerating] = useState<"pdf" | "docx" | "xlsx" | null>(null);
  const [error, setError] = useState("");

  const PAGE_SIZE = 20;

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
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => {
        const rows: ReportStudent[] = (d.students ?? []).map((s: StudentRow) => ({
          ...s,
          dept: getDept(s.class),
        }));
        setAllStudents(rows);
        setDepartments(d.departments ?? []);
        setCategories(d.categories ?? []);
      })
      .catch(() => setError("Failed to load student data"));
  }, [authed]);

  const addNumFilter = () => {
    setNumFilters((f) => [...f, { id: nextId++, field: "cgpa", operator: ">", value: "" }]);
  };

  const removeNumFilter = (id: number) => setNumFilters((f) => f.filter((x) => x.id !== id));

  const updateNumFilter = (id: number, key: keyof Omit<NumericFilter, "id">, value: string) => {
    setNumFilters((f) => f.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  };

  const applyFilters = useCallback(() => {
    let result = [...allStudents];

    if (dept) result = result.filter((s) => s.dept === dept);
    if (category) result = result.filter((s) => s.category === category);
    if (placedStatus) result = result.filter((s) => s.placed === placedStatus);

    for (const f of numFilters) {
      if (!f.value.trim()) continue;
      result = result.filter((s) => matchNumeric(s[f.field], f.operator, f.value));
    }

    result.sort((a, b) => {
      const numeric = ["tenth", "twelfth", "cgpa", "backlogs"];
      if (numeric.includes(sortField)) {
        const na = parseFloat(a[sortField as keyof ReportStudent] as string) || 0;
        const nb = parseFloat(b[sortField as keyof ReportStudent] as string) || 0;
        return sortDir === "asc" ? na - nb : nb - na;
      }
      const av = String(a[sortField as keyof ReportStudent] ?? "").toLowerCase();
      const bv = String(b[sortField as keyof ReportStudent] ?? "").toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    setFiltered(result);
    setApplied(true);
    setPreviewPage(1);
  }, [allStudents, dept, category, placedStatus, numFilters, sortField, sortDir]);

  const buildRows = () =>
    filtered.map((s, i) => [
      String(i + 1),
      s.registerNo || "—",
      s.studentName || "—",
      s.dept || "—",
      s.class || "—",
      s.gender || "—",
      s.dob || "—",
      s.category || "—",
      s.placed || "—",
      s.tenth || "—",
      s.twelfth || "—",
      s.cgpa || "—",
      s.offerType || "—",
      s.offer1 || "—",
      s.mentor || "—",
      s.resumeLink || "—",
    ]);

  const HEADERS = ["#", "Reg No", "Name", "Dept", "Class", "Gender", "DOB", "Category", "Status", "10th%", "12th%", "CGPA", "Offer Type", "Company", "Mentor", "Resume Link"];

  const downloadPDF = async () => {
    setGenerating("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const { autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const date = new Date().toLocaleDateString("en-IN");

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("SRM Institute of Science and Technology — Ramapuram", 148, 14, { align: "center" });
      doc.setFontSize(10);
      doc.text("CS & GT Department  |  Batch 2027  |  Placement Report", 148, 20, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      const filterDesc = [
        dept && `Dept: ${dept}`,
        category && `Category: ${category}`,
        placedStatus && `Status: ${placedStatus}`,
        ...numFilters.filter((f) => f.value).map((f) => `${FIELD_LABELS[f.field]} ${f.operator} ${f.value}`),
      ].filter(Boolean).join("  |  ") || "All Students";

      doc.text(`Filters: ${filterDesc}`, 148, 26, { align: "center" });
      doc.text(`Generated: ${date}   Total: ${filtered.length} students`, 148, 31, { align: "center" });

      const RESUME_COL = HEADERS.length - 1;
      const isUrl = (v: string) => /^https?:\/\//i.test(v);

      autoTable(doc, {
        startY: 35,
        head: [HEADERS],
        body: buildRows(),
        styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
        headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: [240, 244, 248] },
        columnStyles: {
          0: { cellWidth: 7 },
          1: { cellWidth: 20 },
          2: { cellWidth: 26 },
          3: { cellWidth: 13 },
          4: { cellWidth: 15 },
          5: { cellWidth: 11 },
          6: { cellWidth: 16 },
          7: { cellWidth: 15 },
          8: { cellWidth: 13 },
          9: { cellWidth: 10 },
          10: { cellWidth: 10 },
          11: { cellWidth: 10 },
          12: { cellWidth: 16 },
          13: { cellWidth: 20 },
          14: { cellWidth: 20 },
          15: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === RESUME_COL && isUrl(String(data.cell.raw ?? ""))) {
            data.cell.styles.textColor = [21, 101, 192];
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === RESUME_COL) {
            const raw = String(data.cell.raw ?? "");
            if (isUrl(raw)) {
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: raw });
            }
          }
        },
      });

      doc.save(`SRM_Report_${date.replace(/\//g, "-")}.pdf`);
    } finally {
      setGenerating(null);
    }
  };

  const downloadDOCX = async () => {
    setGenerating("docx");
    try {
      const {
        Document, Packer, Paragraph, Table, TableRow, TableCell,
        TextRun, WidthType, AlignmentType, HeadingLevel, ExternalHyperlink,
      } = await import("docx");

      const isUrl = (v: string) => /^https?:\/\//i.test(v);
      const RESUME_COL = HEADERS.length - 1;

      const hCell = (text: string) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 14, color: "FFFFFF" })] })],
          shading: { fill: "1565C0" },
        });

      const dCell = (text: string, alt: boolean) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, size: 14 })] })],
          shading: alt ? { fill: "EEF2F7" } : undefined,
        });

      const linkCell = (text: string, alt: boolean) =>
        new TableCell({
          children: [
            new Paragraph({
              children: isUrl(text)
                ? [new ExternalHyperlink({ link: text, children: [new TextRun({ text, style: "Hyperlink", size: 14 })] })]
                : [new TextRun({ text, size: 14 })],
            }),
          ],
          shading: alt ? { fill: "EEF2F7" } : undefined,
        });

      const rows = buildRows();
      const date = new Date().toLocaleDateString("en-IN");
      const filterDesc = [
        dept && `Department: ${dept}`,
        category && `Category: ${category}`,
        placedStatus && `Status: ${PLACED_LABELS[placedStatus] ?? placedStatus}`,
        ...numFilters.filter((f) => f.value).map((f) => `${FIELD_LABELS[f.field]} ${f.operator} ${f.value}`),
      ].filter(Boolean).join(" | ") || "All Students";

      const doc = new Document({
        sections: [{
          properties: { page: { size: { width: 15840, height: 12240, orientation: "landscape" as const } } },
          children: [
            new Paragraph({
              text: "SRM Institute of Science and Technology — Ramapuram",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [new TextRun({ text: "CS & GT Department  |  Batch 2027  |  Placement Report", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [new TextRun({ text: `Filters: ${filterDesc}`, size: 18 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [new TextRun({ text: `Generated: ${date}   |   Total: ${filtered.length} students`, size: 18 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: HEADERS.map(hCell),
                  tableHeader: true,
                }),
                ...rows.map((row, i) =>
                  new TableRow({
                    children: row.map((cell, colIdx) =>
                      colIdx === RESUME_COL ? linkCell(cell, i % 2 !== 0) : dCell(cell, i % 2 !== 0)
                    ),
                  })
                ),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SRM_Report_${date.replace(/\//g, "-")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(null);
    }
  };

  const downloadXLSX = async () => {
    setGenerating("xlsx");
    try {
      const XLSX = await import("xlsx");
      const date = new Date().toLocaleDateString("en-IN");

      const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...buildRows()]);
      sheet["!cols"] = HEADERS.map(() => ({ wch: 16 }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Report");

      const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SRM_Report_${date.replace(/\//g, "-")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(null);
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
              Enter the password to view and generate placement reports.
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
          <SrmHeader />
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* ── FILTER CARD ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#1565c0] px-5 py-3">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">Report Filters</h2>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-5">

          {/* Basic filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</label>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-gray-50 focus:border-[#1565c0]"
              >
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-gray-50 focus:border-[#1565c0]"
              >
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Placed Status</label>
              <select
                value={placedStatus}
                onChange={(e) => setPlacedStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-gray-50 focus:border-[#1565c0]"
              >
                <option value="">All</option>
                {Object.entries(PLACED_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Numeric filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Numeric Filters</span>
              <button
                onClick={addNumFilter}
                className="text-xs text-[#1565c0] font-semibold hover:underline"
              >
                + Add Filter
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {numFilters.length === 0 && (
                <p className="text-xs text-gray-400 italic">No numeric filters — click "+ Add Filter" to add one.</p>
              )}
              {numFilters.map((f) => (
                <div key={f.id} className="flex items-center gap-2 flex-wrap">
                  <select
                    value={f.field}
                    onChange={(e) => updateNumFilter(f.id, "field", e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none bg-gray-50 flex-1 min-w-[120px]"
                  >
                    {Object.entries(FIELD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <select
                    value={f.operator}
                    onChange={(e) => updateNumFilter(f.id, "operator", e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none bg-gray-50 w-20"
                  >
                    {[">", ">=", "<", "<=", "="].map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={f.value}
                    onChange={(e) => updateNumFilter(f.id, "value", e.target.value)}
                    placeholder="Value"
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none bg-gray-50 w-28 focus:border-[#1565c0]"
                  />
                  <button
                    onClick={() => removeNumFilter(f.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 text-sm font-bold shrink-0"
                  >
                    −
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Sort</span>
            <div className="flex gap-3 flex-wrap">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none bg-gray-50 flex-1 min-w-[160px]"
              >
                {SORT_FIELDS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {(["asc", "desc"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSortDir(d)}
                    className={`px-4 py-1.5 text-xs font-semibold uppercase transition-colors ${
                      sortDir === d ? "bg-[#1565c0] text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {d === "asc" ? "Ascending" : "Descending"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Apply button */}
          <button
            onClick={applyFilters}
            disabled={allStudents.length === 0}
            className="w-full bg-[#1565c0] hover:bg-[#1255a5] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm uppercase tracking-widest transition-colors"
          >
            {allStudents.length === 0 ? "Loading data…" : "Apply Filters"}
          </button>
        </div>
      </div>

      {/* ── PREVIEW & DOWNLOAD ── */}
      {applied && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#1b5e20] px-5 py-3 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">
                {filtered.length} Student{filtered.length !== 1 ? "s" : ""} Match
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {[dept, category, placedStatus && PLACED_LABELS[placedStatus]].filter(Boolean).join(" · ") || "No basic filters applied"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadPDF}
                disabled={filtered.length === 0 || !!generating}
                className="flex items-center gap-2 bg-[#c62828] hover:bg-[#b71c1c] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wide transition-colors"
              >
                {generating === "pdf" ? "Generating…" : "Download PDF"}
              </button>
              <button
                onClick={downloadDOCX}
                disabled={filtered.length === 0 || !!generating}
                className="flex items-center gap-2 bg-[#1565c0] hover:bg-[#1255a5] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wide transition-colors"
              >
                {generating === "docx" ? "Generating…" : "Download DOCX"}
              </button>
              <button
                onClick={downloadXLSX}
                disabled={filtered.length === 0 || !!generating}
                className="flex items-center gap-2 bg-[#2e7d32] hover:bg-[#1b5e20] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wide transition-colors"
              >
                {generating === "xlsx" ? "Generating…" : "Download XLSX"}
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No students match the selected filters.</div>
          ) : (() => {
            const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
            const paginated = filtered.slice((previewPage - 1) * PAGE_SIZE, previewPage * PAGE_SIZE);
            const globalStart = (previewPage - 1) * PAGE_SIZE;
            return (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        {HEADERS.map((h) => (
                          <th key={h} className="px-3 py-2.5 font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((s, i) => (
                        <tr key={s.registerNo || i} className={i % 2 === 0 ? "bg-white" : "bg-[#f0f4f8]"}>
                          <td className="px-3 py-2 text-gray-500">{globalStart + i + 1}</td>
                          <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap">{s.registerNo || "—"}</td>
                          <td className="px-3 py-2 text-gray-800 whitespace-nowrap font-medium">{s.studentName || "—"}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{s.dept || "—"}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{s.class || "—"}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{s.gender || "—"}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{s.dob || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{s.category || "—"}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              s.placed === "YES" ? "bg-green-100 text-green-800" :
                              s.placed === "NO" ? "bg-red-100 text-red-700" :
                              s.placed === "NE" ? "bg-orange-100 text-orange-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {s.placed || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{s.tenth || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{s.twelfth || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{s.cgpa || "—"}</td>
                          <td className="px-3 py-2 font-medium" style={{ color: s.offerType ? "#7b1fa2" : "#9ca3af" }}>{s.offerType || "—"}</td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{s.offer1 || "—"}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{s.mentor || "—"}</td>
                          <td className="px-3 py-2 text-xs max-w-[160px]">
                            {s.resumeLink ? (
                              /^https?:\/\//i.test(s.resumeLink) ? (
                                <a
                                  href={s.resumeLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={s.resumeLink}
                                  className="block truncate text-[#1565c0] underline hover:text-[#0d47a1]"
                                >
                                  {s.resumeLink}
                                </a>
                              ) : (
                                <span className="block truncate text-gray-600" title={s.resumeLink}>
                                  {s.resumeLink}
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Page {previewPage} of {totalPages} &nbsp;·&nbsp; {filtered.length} students total
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        disabled={previewPage === 1}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                        disabled={previewPage === totalPages}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
