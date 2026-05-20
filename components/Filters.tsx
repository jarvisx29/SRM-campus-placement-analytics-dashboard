"use client";

interface Props {
  mentors: string[];
  categories: string[];
  selectedMentor: string;
  selectedCategory: string;
  onMentorChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onReset: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  PLACEMENT: "Placement",
  HS: "Higher Studies",
  E: "Entrepreneurship",
};

export default function Filters({
  mentors,
  categories,
  selectedMentor,
  selectedCategory,
  onMentorChange,
  onCategoryChange,
  onReset,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-4 items-end">
      <div className="flex flex-col gap-1 min-w-[200px]">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Filter by Mentor
        </label>
        <select
          value={selectedMentor}
          onChange={(e) => onMentorChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Mentors</option>
          {mentors.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 min-w-[180px]">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Filter by Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] || c}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onReset}
        className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Reset Filters
      </button>
    </div>
  );
}
