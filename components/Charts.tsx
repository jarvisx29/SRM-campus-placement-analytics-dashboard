"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Summary, OfferTypeCounts } from "@/types";

interface Props {
  summary: Summary;
  offerTypeCounts: OfferTypeCounts;
}

const PLACEMENT_COLORS = ["#4F46E5", "#D97706", "#6B7280", "#DC2626"];
const OFFER_COLORS = ["#7C3AED", "#2563EB", "#16A34A", "#EA580C"];

export default function Charts({ summary, offerTypeCounts }: Props) {
  const placementData = [
    { name: "Placed", value: summary.placed },
    { name: "Higher Studies", value: summary.higherStudies },
    { name: "Not Placed", value: summary.notPlaced },
    { name: "Not Eligible", value: summary.notEligible },
  ].filter((d) => d.value > 0);

  const offerData = Object.entries(offerTypeCounts)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
          Placement Status Breakdown
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={placementData}
              cx="50%"
              cy="50%"
              outerRadius={90}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
              labelLine={false}
            >
              {placementData.map((_, i) => (
                <Cell key={i} fill={PLACEMENT_COLORS[i % PLACEMENT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
          Offer Category Distribution
        </h2>
        {offerData.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
            No offer type data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={offerData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {offerData.map((_, i) => (
                  <Cell key={i} fill={OFFER_COLORS[i % OFFER_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
