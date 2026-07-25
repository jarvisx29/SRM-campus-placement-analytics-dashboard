"use client";

import { useEffect, useState, useCallback } from "react";
import SrmHeader from "@/components/SrmHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import HavlocTable from "@/components/HavlocTable";
import { StudentRow, HavlocRow } from "@/types";

interface MentorStat {
  mentor: string;
  allocated: number;
  placed: number;
  higherStudies: number;
  totalOffers: number;
  Normal: number;
  Dream: number;
  "Super Dream": number;
  Marquee: number;
}

interface ApiResponse {
  mentors: string[];
  departments: string[];
  stat: MentorStat | null;
}

const ROW1 = [
  { key: "higherStudies", label: "Higher Studies",          bg: "#c5cae9", color: "#283593" },
  { key: "placed",        label: "No of Students Placed",   bg: "#c5cae9", color: "#283593" },
  { key: "totalOffers",   label: "Offers",                  bg: "#c5cae9", color: "#283593" },
  { key: "allocated",     label: "No of Students Allocated",bg: "#c5cae9", color: "#283593" },
] as const;

const ROW2 = [
  { key: "Normal",       label: "Normal",       bg: "#c5cae9", color: "#283593" },
  { key: "Dream",        label: "Dream",        bg: "#c5cae9", color: "#283593" },
  { key: "Super Dream",  label: "Super Dream",  bg: "#c5cae9", color: "#283593" },
  { key: "Marquee",      label: "Marquee",      bg: "#c5cae9", color: "#283593" },
] as const;

const HAVLOC_HEADERS = [
  "#", "Roll Number", "Name", "Branch", "Applied", "Eligible Jobs", "Eligible Not Applied",
  "Absent", "Screening", "Others", "Technical Interview", "Group Discussion",
  "Tech + HR Interview", "Test", "Application Screening", "Pre Placement Talk",
  "Manager Interview", "HR Interview", "Manager Interview 2", "HR Interview 2",
];

export default function MentorReportPage() {
  const [mentor, setMentor] = useState("");
  const [dept, setDept] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [havlocRows, setHavlocRows] = useState<HavlocRow[]>([]);
  const [view, setView] = useState<"GENERAL" | "HAVLOC">("GENERAL");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);

  const fetchData = useCallback(async (m: string, d: string) => {
    setError("");
    const params = new URLSearchParams();
    if (m) params.set("mentor", m);
    if (d) params.set("dept", d);
    try {
      const res = await fetch(`/api/mentor-report?${params}`);
      const json = await res.json();
      setData(json);

      if (m) {
        const [studentsRes, havlocRes] = await Promise.all([
          fetch(`/api/students?${params}`),
          fetch(`/api/havloc-report?${params}`),
        ]);
        const studentsJson = await studentsRes.json();
        const havlocJson = await havlocRes.json();
        setStudents(studentsJson.students ?? []);
        setHavlocRows(havlocJson.rows ?? []);
      } else {
        setStudents([]);
        setHavlocRows([]);
      }
    } catch {
      setError("Failed to load data");
    }
  }, []);

  useEffect(() => {
    fetchData(mentor, dept);
  }, [mentor, dept, fetchData]);

  const stat = data?.stat;
  const mentors = data?.mentors ?? [];
  const departments = data?.departments ?? [];

  const row1Vals: Record<string, number> = {
    higherStudies: stat?.higherStudies ?? 0,
    placed:        stat?.placed ?? 0,
    totalOffers:   stat?.totalOffers ?? 0,
    allocated:     stat?.allocated ?? 0,
  };
  const row2Vals: Record<string, number> = {
    Normal:        stat?.Normal ?? 0,
    Dream:         stat?.Dream ?? 0,
    "Super Dream": stat?.["Super Dream"] ?? 0,
    Marquee:       stat?.Marquee ?? 0,
  };

  const buildGeneralRows = () =>
    students.map((s, i) => [
      String(i + 1), s.registerNo || "—", s.studentName || "—", s.class || "—",
      s.category || "—", s.placed || "—", s.offerType || "—",
      s.offer1 || "—", s.offer2 || "—", s.offer3 || "—", s.mentor || "—",
    ]);
  const GENERAL_HEADERS = ["#", "Register No", "Student Name", "Class", "Category", "Status", "Offer Type", "Offer 1", "Offer 2", "Offer 3", "Mentor"];

  const buildHavlocRows = () =>
    havlocRows.map((r, i) => [
      String(i + 1), r.rollNumber || "—", r.name || "—", r.branch || "—",
      r.appliedCount || "—", r.eligibleJobCount || "—", r.eligibleNotAppliedCount || "—",
      r.absentCount || "—", r.screening || "—", r.others || "—", r.technicalInterview || "—",
      r.groupDiscussion || "—", r.technicalHrInterview || "—", r.test || "—",
      r.applicationScreening || "—", r.prePlacementTalk || "—", r.managerInterview1 || "—",
      r.hrInterview1 || "—", r.managerInterview2 || "—", r.hrInterview2 || "—",
    ]);

  const downloadPDF = async () => {
    setGenerating("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const { autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const date = new Date().toLocaleDateString("en-IN");
      const headers = view === "GENERAL" ? GENERAL_HEADERS : HAVLOC_HEADERS;
      const rows = view === "GENERAL" ? buildGeneralRows() : buildHavlocRows();
      const count = view === "GENERAL" ? students.length : havlocRows.length;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("SRM Institute of Science and Technology — Ramapuram", 148, 14, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Mentor Report — ${view === "GENERAL" ? "General" : "Havloc"} Data`, 148, 20, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Mentor: ${mentor || "All"}${dept ? `  |  Dept: ${dept}` : ""}`, 148, 26, { align: "center" });
      doc.text(`Generated: ${date}   Total: ${count} students`, 148, 31, { align: "center" });

      autoTable(doc, {
        startY: 35,
        head: [headers],
        body: rows,
        styles: { fontSize: 6.5, cellPadding: 1.2, overflow: "linebreak" },
        headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: "bold", fontSize: 6.5 },
        alternateRowStyles: { fillColor: [240, 244, 248] },
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const lastAutoTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable;
      let sigY = (lastAutoTable?.finalY ?? 35) + 25;
      if (sigY > pageHeight - 20) {
        doc.addPage();
        sigY = 30;
      }

      const margin = 20;
      const usableWidth = pageWidth - margin * 2;
      const colWidth = usableWidth / 3;
      const sigLabels = ["Mentor", "Placement Coordinator", "HOD"];

      doc.setDrawColor(80);
      doc.setLineWidth(0.3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      sigLabels.forEach((label, i) => {
        const x1 = margin + i * colWidth + 8;
        const x2 = margin + (i + 1) * colWidth - 8;
        doc.line(x1, sigY, x2, sigY);
        doc.text(label, margin + i * colWidth + colWidth / 2, sigY + 6, { align: "center" });
      });

      doc.save(`Mentor_Report_${view}_${date.replace(/\//g, "-")}.pdf`);
    } finally {
      setGenerating(null);
    }
  };

  const downloadDOCX = async () => {
    setGenerating("docx");
    try {
      const {
        Document, Packer, Paragraph, Table, TableRow, TableCell,
        TextRun, WidthType, AlignmentType, HeadingLevel, BorderStyle,
      } = await import("docx");

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

      const headers = view === "GENERAL" ? GENERAL_HEADERS : HAVLOC_HEADERS;
      const rows = view === "GENERAL" ? buildGeneralRows() : buildHavlocRows();
      const count = view === "GENERAL" ? students.length : havlocRows.length;
      const date = new Date().toLocaleDateString("en-IN");

      const sigCell = () =>
        new TableCell({
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          },
          children: [
            new Paragraph({ text: "", spacing: { before: 400 } }),
          ],
        });
      const sigLabelCell = (label: string) =>
        new TableCell({
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: label, bold: true, size: 18 })],
            }),
          ],
        });

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
              children: [new TextRun({ text: `Mentor Report — ${view === "GENERAL" ? "General" : "Havloc"} Data`, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [new TextRun({ text: `Mentor: ${mentor || "All"}${dept ? `  |  Dept: ${dept}` : ""}`, size: 18 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [new TextRun({ text: `Generated: ${date}   |   Total: ${count} students`, size: 18 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: headers.map(hCell), tableHeader: true }),
                ...rows.map((row, i) => new TableRow({ children: row.map((cell) => dCell(cell, i % 2 !== 0)) })),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: ["Mentor", "Placement Coordinator", "HOD"].map(sigCell) }),
                new TableRow({ children: ["Mentor", "Placement Coordinator", "HOD"].map(sigLabelCell) }),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mentor_Report_${view}_${date.replace(/\//g, "-")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(null);
    }
  };

  const toggleActions = (
    <div className="flex rounded-lg overflow-hidden border border-gray-200">
      <button
        onClick={() => setView("GENERAL")}
        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
          view === "GENERAL" ? "bg-[#1565c0] text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
        }`}
      >
        General
      </button>
      <button
        onClick={() => setView("HAVLOC")}
        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
          view === "HAVLOC" ? "bg-[#1565c0] text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
        }`}
      >
        Havloc
      </button>
    </div>
  );

  const downloadActions = (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={downloadPDF}
        disabled={!!generating}
        className="bg-[#c62828] hover:bg-[#b71c1c] disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors"
      >
        {generating === "pdf" ? "Generating…" : "PDF"}
      </button>
      <button
        onClick={downloadDOCX}
        disabled={!!generating}
        className="bg-[#1565c0] hover:bg-[#1255a5] disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors"
      >
        {generating === "docx" ? "Generating…" : "DOCX"}
      </button>
    </div>
  );

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
      <SrmHeader />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex gap-4 flex-wrap items-center">
        <CyanPill label="DEPT" value={dept} onChange={(v) => { setDept(v); setMentor(""); }} options={departments} />
        <CyanPill label="MENTOR" value={mentor} onChange={setMentor} options={mentors} />
        {(dept || mentor) && (
          <button
            onClick={() => { setDept(""); setMentor(""); }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-full transition-colors"
          >
            Clear
          </button>
        )}
        {dept && (
          <span className="text-sm font-semibold text-[#1565c0]">Showing: {dept}</span>
        )}
      </div>

      {!stat && !error ? (
        <div className="text-gray-400 text-sm p-4">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ROW1.map(({ key, label, bg, color }) => (
              <StatCard key={key} label={label} value={row1Vals[key] ?? 0} bg={bg} color={color} />
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ROW2.map(({ key, label, bg, color }) => (
              <StatCard key={key} label={label} value={row2Vals[key] ?? 0} bg={bg} color={color} />
            ))}
          </div>

          {mentors.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-xl px-4 py-3">
              Mentor data is not yet populated in the sheet. Once the MENTOR column in GDS is filled, reports will appear here.
            </div>
          )}

          {mentor && view === "GENERAL" && (
            <DataTable students={students} actions={toggleActions} downloadActions={downloadActions} />
          )}
          {mentor && view === "HAVLOC" && (
            <HavlocTable rows={havlocRows} actions={toggleActions} downloadActions={downloadActions} />
          )}
        </>
      )}
    </div>
  );
}

function CyanPill({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none bg-[#00bcd4] text-white text-xs font-bold uppercase tracking-wide rounded-full px-5 py-2 outline-none cursor-pointer border-2 border-[#e91e8c] shadow"
    >
      <option value="">{label} ▾</option>
      {options.map((o) => (
        <option key={o} value={o} className="text-gray-800 bg-white">
          {o}
        </option>
      ))}
    </select>
  );
}
