"use client";

import { useState } from "react";
import { HavlocRow } from "@/types";

interface Props {
  rows: HavlocRow[];
  actions?: React.ReactNode;
  downloadActions?: React.ReactNode;
}

const PAGE_SIZE = 25;

export default function HavlocTable({ rows, actions, downloadActions }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.rollNumber.toLowerCase().includes(search.toLowerCase())
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
            Havloc Records
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
            placeholder="Search by name or roll no..."
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
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Roll Number</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Branch</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Applied</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Eligible Jobs</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Eligible Not Applied</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Absent</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Screening</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Others</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Technical Interview</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Group Discussion</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Tech + HR Interview</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Test</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Application Screening</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Pre Placement Talk</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Manager Interview</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">HR Interview</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Manager Interview 2</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">HR Interview 2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={19} className="px-4 py-10 text-center text-gray-400 text-sm">
                  No Havloc records found
                </td>
              </tr>
            ) : (
              paginated.map((r, i) => (
                <tr key={r.rollNumber || i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.rollNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.branch}</td>
                  <td className="px-4 py-3 text-gray-700">{r.appliedCount || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.eligibleJobCount || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.eligibleNotAppliedCount || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.absentCount || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.screening || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.others || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.technicalInterview || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.groupDiscussion || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.technicalHrInterview || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.test || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.applicationScreening || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.prePlacementTalk || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.managerInterview1 || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.hrInterview1 || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.managerInterview2 || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.hrInterview2 || "—"}</td>
                </tr>
              ))
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
