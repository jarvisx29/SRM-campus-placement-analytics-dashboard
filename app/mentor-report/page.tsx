"use client";

import { useEffect, useState, useCallback } from "react";
import SrmHeader from "@/components/SrmHeader";
import StatCard from "@/components/StatCard";

interface MentorStat {
  mentor: string;
  mentorId: string;
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

export default function MentorReportPage() {
  const [mentor, setMentor] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (m: string) => {
    setError("");
    const params = new URLSearchParams();
    if (m) params.set("mentor", m);
    try {
      const res = await fetch(`/api/mentor-report?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load data");
    }
  }, []);

  useEffect(() => {
    fetchData(mentor);
  }, [mentor, fetchData]);

  const stat = data?.stat;
  const mentors = data?.mentors ?? [];

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

  return (
    <div className="p-6 flex flex-col gap-6">
      <SrmHeader />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex gap-4 flex-wrap">
        <CyanPill label="MENTOR" value={mentor} onChange={setMentor} options={mentors} />
        {mentor && (
          <div className="bg-[#00bcd4] text-white text-xs font-semibold uppercase rounded-full px-4 py-1.5 flex items-center gap-2">
            <span>MENTOR ID: {stat?.mentorId || "—"}</span>
          </div>
        )}
        {mentor && (
          <button
            onClick={() => setMentor("")}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-full transition-colors"
          >
            Clear
          </button>
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
