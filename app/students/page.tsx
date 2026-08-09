"use client";

import { useEffect, useState, useCallback } from "react";
import SrmHeader from "@/components/SrmHeader";
import { DashboardData, StudentRow } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  PLACEMENT: "Placement",
  HS: "Higher Studies",
  E: "Entrepreneurship",
};

const PAGE_SIZE = 20;

export default function StudentDetailPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [mentor, setMentor] = useState("");
  const [category, setCategory] = useState("");
  const [dept, setDept] = useState("");
  const [company, setCompany] = useState("");
  const [offerCategory, setOfferCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (m: string, c: string, d: string) => {
    setError("");
    const params = new URLSearchParams();
    if (m) params.set("mentor", m);
    if (c) params.set("category", c);
    if (d) params.set("dept", d);
    try {
      const res = await fetch(`/api/students?${params}`);
      const json = await res.json();
      setData(json);
      setPage(1);
    } catch {
      setError("Failed to load data");
    }
  }, []);

  useEffect(() => {
    fetchData(mentor, category, dept);
  }, [mentor, category, dept, fetchData]);

  const allStudents = data?.students ?? [];

  const companies = [
    ...new Set(
      allStudents.flatMap((s) =>
        [s.offer1, s.offer2, s.offer3, s.offer4, s.offer5, s.offer6].filter(
          (o) => o && o.trim() !== "" && o !== "0"
        )
      )
    ),
  ].sort();

  const offerCategories = [
    ...new Set(
      allStudents.flatMap((s) =>
        (s.offerType || "").split(",").map((t) => t.trim()).filter(Boolean)
      )
    ),
  ].sort();

  const filtered: StudentRow[] = allStudents.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      s.studentName.toLowerCase().includes(q) ||
      s.registerNo.toLowerCase().includes(q) ||
      s.offerType.toLowerCase().includes(q) ||
      [s.offer1, s.offer2, s.offer3, s.offer4, s.offer5, s.offer6].some((o) =>
        o.toLowerCase().includes(q)
      );
    const matchCompany =
      !company ||
      [s.offer1, s.offer2, s.offer3, s.offer4, s.offer5, s.offer6].some(
        (o) => o === company
      );
    const matchOfferCategory =
      !offerCategory ||
      (s.offerType || "").split(",").map((t) => t.trim()).includes(offerCategory);
    return matchSearch && matchCompany && matchOfferCategory;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const offerVal = (v: string) => (!v || v === "0" ? "—" : v);

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-4 sm:gap-5">
      <SrmHeader />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-[#1565c0] rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center">
        <FilterPill
          label="DEPT"
          value={dept}
          onChange={(v) => { setDept(v); setPage(1); }}
          options={data?.departments ?? []}
          emptyLabel="All Depts"
        />
        <FilterPill
          label="MENTOR"
          value={mentor}
          onChange={(v) => { setMentor(v); }}
          options={data?.mentors ?? []}
          emptyLabel="All Mentors"
        />
        <FilterPill
          label="CATEGORY"
          value={category}
          onChange={(v) => { setCategory(v); }}
          options={data?.categories ?? []}
          emptyLabel="All Categories"
          labelMap={CATEGORY_LABELS}
        />
        <FilterPill
          label="COMPANY"
          value={company}
          onChange={(v) => { setCompany(v); setPage(1); }}
          options={companies}
          emptyLabel="All Companies"
        />
        <FilterPill
          label="OFFER TYPE"
          value={offerCategory}
          onChange={(v) => { setOfferCategory(v); setPage(1); }}
          options={offerCategories}
          emptyLabel="All Offer Types"
        />
        <input
          type="text"
          placeholder="Search name / reg no…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-white rounded-full px-4 py-1.5 text-sm text-gray-700 outline-none w-56 border border-white/30"
        />
        {(dept || mentor || category || company || offerCategory || search) && (
          <button
            onClick={() => { setDept(""); setMentor(""); setCategory(""); setCompany(""); setOfferCategory(""); setSearch(""); }}
            className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
          >
            Reset
          </button>
        )}
        <span className="ml-auto text-white/70 text-xs">
          {filtered.length} students
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-left">
                {["REGISTER NO", "STUDENT NAME", "CATEGORY", "OFFER TYPE", "OFFER 1", "OFFER 2", "OFFER 3", "OFFER 4", "OFFER 5", "MENTOR"].map(
                  (col, i) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                      style={{
                        color: i < 2 ? "#4dd0e1" : i === 2 ? "#ffd54f" : i === 3 ? "#ce93d8" : "#ffb74d",
                      }}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    No students found
                  </td>
                </tr>
              ) : (
                paginated.map((s, i) => (
                  <tr
                    key={s.registerNo || i}
                    className={i % 2 === 0 ? "bg-white" : "bg-[#fce4ec]"}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700 whitespace-nowrap">{s.registerNo}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{s.studentName}</td>
                    <td className="px-4 py-2.5 text-gray-600">{CATEGORY_LABELS[s.category] || s.category}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: s.offerType ? "#7b1fa2" : "#9ca3af" }}>{s.offerType || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-700">{offerVal(s.offer1)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{offerVal(s.offer2)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{offerVal(s.offer3)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{offerVal(s.offer4)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{offerVal(s.offer5)}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{s.mentor || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  value,
  onChange,
  options,
  emptyLabel,
  labelMap,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  emptyLabel: string;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white text-gray-800 text-xs font-semibold uppercase tracking-wide rounded-full px-4 pr-8 py-1.5 border border-white/30 outline-none cursor-pointer"
      >
        <option value="">{emptyLabel} ▾</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labelMap?.[o] ?? o}
          </option>
        ))}
      </select>
      {value && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full" />
      )}
    </div>
  );
}
