"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",               label: "Dashboard" },
  { href: "/students",       label: "Students"  },
  { href: "/mentor-report",  label: "Mentors"   },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 min-h-screen bg-white border-r border-gray-200 flex-col py-6 px-3 shrink-0">
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
                  active ? "bg-[#c5cae9] text-[#1a237e]" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-white border-t border-gray-200 shadow-lg">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wide transition-colors ${
                active ? "text-[#1a237e] bg-[#c5cae9]" : "text-gray-500"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
