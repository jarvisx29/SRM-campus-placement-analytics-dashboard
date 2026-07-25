"use client";

import { useState } from "react";
import { StudentRow } from "@/types";

interface Props {
  students: StudentRow[];
  actions?: React.ReactNode;
  downloadActions?: React.ReactNode;
}

const PLACED_BADGE: Record<string, { label: string; className: string }> = {
  YES: { label: "Placed", className: "bg-green-100 text-green-700" },
  NO: { label: "Not Placed", className: "bg-gray-100 text-gray-600" },
  NA: { label: "N/A", className: "bg-yellow-100 text-yellow-700" },
  NE: { label: "Not Eligible", className: "bg-red-100 text-red-600" },
};

const CATEGORY_LABELS: Record<string, string> = {
  PLACEMENT: "Placement",
  HS: "Higher Studies",
  E: "Entrepreneurship",
};

const PAGE_SIZE = 25;

export default function DataTable({ students, actions, downloadActions }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = students.filter(
    (s) =>
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.registerNo.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Student Records
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({filtered.length} students)
            </span>
          </h2>
          {actions}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {downloadActions}
          <input
            type="text"
            placeholder="Search by name or register no..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">#</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Register No</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Student Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Class</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Category</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Offer Type</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Offer 1</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Offer 2</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Offer 3</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Mentor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-gray-400 text-sm">
                  No students found
                </td>
              </tr>
            ) : (
              paginated.map((s, i) => {
                const badge = PLACED_BADGE[s.placed] || { label: s.placed, className: "bg-gray-100 text-gray-500" };
                return (
                  <tr key={s.registerNo || i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.registerNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{s.studentName}</td>
                    <td className="px-4 py-3 text-gray-600">{s.class}</td>
                    <td className="px-4 py-3 text-gray-600">{CATEGORY_LABELS[s.category] || s.category}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.offerType || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{s.offer1 || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{s.offer2 || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{s.offer3 || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.mentor || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
