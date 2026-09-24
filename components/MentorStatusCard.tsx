"use client";

import { useMemo, useState } from "react";
import { StudentRow } from "@/types";
import {
  buildMentorStatus,
  createMentorStatusDocxBlob,
  createMentorStatusPdf,
  monthTitle,
} from "@/lib/mentorStatus";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function MentorStatusCard({ students }: { students: StudentRow[] }) {
  const [month, setMonth] = useState(currentMonthValue);
  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState("");

  const { rows, totals } = useMemo(() => buildMentorStatus(students), [students]);
  const label = monthTitle(month);
  const disabled = rows.length === 0 || !label || !!generating;
  const fileStem = `Mentor_Mentee_Monthly_Status_${label.replace(" ", "_")}`;

  const downloadPDF = async () => {
    setGenerating("pdf");
    setError("");
    try {
      const doc = await createMentorStatusPdf(rows, totals, label);
      doc.save(`${fileStem}.pdf`);
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  const downloadDOCX = async () => {
    setGenerating("docx");
    setError("");
    try {
      const blob = await createMentorStatusDocxBlob(rows, totals, label);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileStem}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not generate the DOCX. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-[#1a237e] px-5 py-3">
        <h2 className="text-white font-bold text-sm uppercase tracking-widest">
          Mentor Mentee Monthly Status
        </h2>
      </div>

      <div className="p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Report Month
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none bg-gray-50 focus:border-[#1565c0]"
            />
          </div>

          <p className="text-xs text-gray-500 flex-1 min-w-[200px]">
            {rows.length === 0
              ? "Loading mentor data…"
              : `${rows.length} mentors · ${totals.allocated} students allocated · ${totals.placed} placed · ${totals.yetToBePlaced} yet to be placed · ${totals.higherStudies} higher studies · ${totals.notEligible} not eligible.`}
          </p>

          <div className="flex gap-2">
            <button
              onClick={downloadPDF}
              disabled={disabled}
              className="bg-[#c62828] hover:bg-[#b71c1c] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wide transition-colors"
            >
              {generating === "pdf" ? "Generating…" : "Download PDF"}
            </button>
            <button
              onClick={downloadDOCX}
              disabled={disabled}
              className="bg-[#1565c0] hover:bg-[#1255a5] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wide transition-colors"
            >
              {generating === "docx" ? "Generating…" : "Download DOCX"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>
        )}
      </div>
    </div>
  );
}
