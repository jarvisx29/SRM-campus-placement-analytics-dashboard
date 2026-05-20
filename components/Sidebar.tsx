"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/students", label: "Student Detail" },
  { href: "/mentor-report", label: "Mentor Report" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-52 min-h-screen bg-white border-r border-gray-200 flex flex-col py-6 px-3 shrink-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 mb-3">
        Navigation
      </p>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#c5cae9] text-[#1a237e]"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
