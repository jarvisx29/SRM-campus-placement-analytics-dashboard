interface Props {
  label: string;
  value: number | string;
  bg: string;
  color: string;
}

export default function StatCard({ label, value, bg, color }: Props) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1 shadow-sm"
      style={{ backgroundColor: bg }}
    >
      <span className="text-sm font-semibold uppercase tracking-wide" style={{ color }}>
        {label}
      </span>
      <span className="text-5xl font-light" style={{ color }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}
