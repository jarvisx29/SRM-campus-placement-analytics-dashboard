"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export default function MultiSelect({ label, options, selected, onChange, placeholder = "All" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} selected`;

  return (
    <div className="flex flex-col gap-1 relative" ref={ref}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`border border-gray-200 rounded-lg px-3 py-2 text-sm text-left bg-gray-50 focus:outline-none focus:border-[#1565c0] flex items-center justify-between gap-2 ${
          selected.length === 0 ? "text-gray-500" : "text-gray-800 font-medium"
        }`}
      >
        <span className="truncate">{summary}</span>
        <span className={`text-gray-400 text-xs transition-transform shrink-0 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 sticky top-0 bg-white">
            <span className="text-xs text-gray-400">{selected.length} of {options.length} selected</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-semibold text-[#1565c0] hover:underline"
            >
              Clear
            </button>
          </div>
          {options.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400 italic">No options</div>
          ) : (
            options.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="accent-[#1565c0]"
                />
                {o.label}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
