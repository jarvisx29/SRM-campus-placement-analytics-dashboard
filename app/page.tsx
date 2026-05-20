"use client";

import { useEffect, useState } from "react";
import SrmHeader from "@/components/SrmHeader";
import StatCard from "@/components/StatCard";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LabelList,
} from "recharts";
import { DashboardData } from "@/types";

const ROW1 = [
  { key: "totalStudents",  label: "Strength",    bg: "#c5cae9", color: "#283593" },
  { key: "higherStudies",  label: "H.Studies",   bg: "#fff9c4", color: "#f9a825" },
  { key: "placementCount", label: "Placement",   bg: "#c8e6c9", color: "#2e7d32" },
  { key: "placed",         label: "Placed",      bg: "#ffcdd2", color: "#c62828" },
  { key: "totalOffers",    label: "Offers",      bg: "#b2ebf2", color: "#00838f" },
] as const;

const ROW2 = [
  { key: "Normal",      label: "Normal",      bg: "#c5cae9", color: "#283593" },
  { key: "Dream",       label: "Dream",       bg: "#fff9c4", color: "#f9a825" },
  { key: "Super Dream", label: "Super Dream", bg: "#ffcdd2", color: "#c62828" },
  { key: "Marquee",     label: "Marquee",     bg: "#b2dfdb", color: "#00695c" },
] as const;

const STATUS_COLORS = ["#2196f3", "#26c6da", "#7c3aed", "#ff9800"];

const BAR_ITEMS = [
  { key: "notEligible",    label: "RF Placement",   fill: "#e91e63" },
  { key: "higherStudies",  label: "Higher Studies", fill: "#f48fb1" },
  { key: "placementCount", label: "Placement",      fill: "#5c6bc0" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Failed to load data"));
  }, []);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return <div className="p-8 text-gray-400">Loading dashboard…</div>;

  const { summary, offerTypeCounts } = data;

  const summaryRow1: Record<string, number> = {
    totalStudents:  summary.totalStudents,
    higherStudies:  summary.higherStudies,
    placementCount: summary.placementCount,
    placed:         summary.placed,
    totalOffers:    summary.totalOffers,
  };

  const offerTypeEntries = Object.entries(offerTypeCounts).filter(([, v]) => v > 0);
  const hasOfferTypes = offerTypeEntries.length >= 2;

  const pieSrc = hasOfferTypes
    ? offerTypeEntries.map(([name, value]) => ({ name, value }))
    : [
        { name: "Placed",        value: summary.placed },
        { name: "Higher Studies",value: summary.higherStudies },
        { name: "Not Placed",    value: summary.notPlaced },
        { name: "Not Eligible",  value: summary.notEligible },
      ].filter((d) => d.value > 0);

  const pieTitle = hasOfferTypes ? "Offers" : "Student Status";

  const summaryRecord: Record<string, number> = {
    notEligible:    summary.notEligible,
    higherStudies:  summary.higherStudies,
    placementCount: summary.placementCount,
  };
  const barData = BAR_ITEMS.map((item) => ({
    label: item.label,
    value: summaryRecord[item.key],
    fill:  item.fill,
  }));

  const RADIAN = Math.PI / 180;
  const renderPieLabel = (props: {
    cx?: number; cy?: number; midAngle?: number;
    outerRadius?: number; value?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, value = 0 } = props;
    if (!value) return null;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
        fontSize={14} fontWeight="bold" fill="#1a1a1a">
        {value}
      </text>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderBarLabel = (props: any) => {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const width = Number(props.width ?? 0);
    const value = Number(props.value ?? 0);
    const idx = Number(props.index ?? 0);
    return (
      <text
        x={x + width / 2}
        y={y - 10}
        textAnchor="middle"
        fontSize={20}
        fontWeight="bold"
        fill={barData[idx]?.fill ?? "#333"}
      >
        {value}
      </text>
    );
  };

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
      <SrmHeader />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {ROW1.map(({ key, label, bg, color }) => (
          <StatCard key={key} label={label} value={summaryRow1[key] ?? 0} bg={bg} color={color} />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ROW2.map(({ key, label, bg, color }) => (
          <StatCard key={key} label={label}
            value={offerTypeCounts[key as keyof typeof offerTypeCounts] ?? 0}
            bg={bg} color={color} />
        ))}
      </div>

      <div className="bg-[#dce8f8] rounded-xl p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* ── PIE CHART ── */}
        <div className="flex flex-col items-center">
          <p className="font-black text-gray-900 text-base uppercase tracking-widest mb-1">
            {pieTitle}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieSrc}
                dataKey="value"
                cx="45%"
                cy="50%"
                outerRadius={90}
                labelLine={false}
                label={renderPieLabel}
                stroke="none"
              >
                {pieSrc.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 13 }}
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          {!hasOfferTypes && (
            <p className="text-xs text-gray-400 text-center mt-1">
              Will switch to offer category breakdown once OFFER TYPE data is filled
            </p>
          )}
        </div>

        {/* ── BAR CHART ── */}
        <div className="flex flex-col">
          <div className="flex gap-5 mb-2 flex-wrap">
            {BAR_ITEMS.map(({ label, fill }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <span className="w-5 h-3 rounded-sm inline-block" style={{ background: fill }} />
                {label}
              </span>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={barData}
              margin={{ top: 40, right: 30, left: 10, bottom: 5 }}
              barCategoryGap="35%"
            >
              <XAxis dataKey="label" tick={false} axisLine={{ stroke: "#ccc" }} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                formatter={(v, _, p) => [v, p.payload?.label]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={80}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
                <LabelList dataKey="value" position="top" content={renderBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <p className="text-center font-black text-gray-900 uppercase tracking-wide text-sm">
            Placement vs Higher Studies
          </p>
        </div>
      </div>
    </div>
  );
}
