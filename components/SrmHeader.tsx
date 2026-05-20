import Image from "next/image";

export default function SrmHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 text-center sm:text-left">
      <Image
        src="/srm-logo.png"
        alt="SRM Institute of Science & Technology"
        width={150}
        height={75}
        className="object-contain shrink-0"
        priority
      />
      <div className="sm:border-l border-gray-200 sm:pl-6">
        <p className="text-xs sm:text-sm font-bold text-[#1565c0] uppercase tracking-wide leading-tight">
          Department of Computer Science and Engineering
        </p>
        <p className="text-base sm:text-2xl font-black text-[#1a237e] uppercase leading-tight mt-1">
          {subtitle ?? "Placement Statistics AY 2026-2027"}
        </p>
      </div>
    </div>
  );
}
