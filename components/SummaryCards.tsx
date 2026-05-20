"use client";

import { Summary } from "@/types";

interface Props {
  summary: Summary;
}

const cards = [
  { key: "totalStudents", label: "Total Students", color: "#4F46E5" },
  { key: "placed", label: "Placed", color: "#16A34A" },
  { key: "higherStudies", label: "Higher Studies", color: "#D97706" },
  { key: "notPlaced", label: "Not Yet Placed", color: "#6B7280" },
  { key: "notEligible", label: "Not Eligible", color: "#DC2626" },
  { key: "totalOffers", label: "Total Offers", color: "#0891B2" },
] as const;

export default function SummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(({ key, label, color }) => (
        <div
          key={key}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1"
        >
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label}
          </span>
          <span
            className="text-3xl font-bold"
            style={{ color }}
          >
            {summary[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
