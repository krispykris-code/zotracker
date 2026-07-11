"use client";

// Person filter chips shared by stats and calendar.
// `onSelectAll` (when provided) renders a leading「全部」chip.
export function PersonFilter({
  persons,
  selected,
  onSelect,
  onSelectAll,
  className = "",
}: {
  persons: string[];
  selected: string | null;
  onSelect: (person: string) => void;
  onSelectAll?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar ${className}`}>
      {onSelectAll && (
        <button
          onClick={onSelectAll}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !selected ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
          }`}
        >
          全部
        </button>
      )}
      {persons.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            selected === p ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
