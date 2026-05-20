import Image from "next/image";

export default function SrmHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <Image
        src="/srm-logo.png"
        alt="SRM Institute of Science & Technology"
        width={180}
        height={90}
        className="object-contain shrink-0"
        priority
      />
      <div className="border-l border-gray-200 pl-6">
        <p className="text-sm font-bold text-[#1565c0] uppercase tracking-wide leading-tight">
          Department of Computer Science and Engineering
        </p>
        <p className="text-2xl font-black text-[#1a237e] uppercase leading-tight mt-1">
          {subtitle ?? "Placement Statistics AY 2026-2027"}
        </p>
      </div>
    </div>
  );
}
