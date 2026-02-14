import { Info, AlertTriangle, Lightbulb, CheckSquare } from "lucide-react";

interface FilterBarProps {
  filterType: "all" | "info" | "alert" | "idea";
  setFilterType: (type: "all" | "info" | "alert" | "idea") => void;
  showResolved: boolean;
  setShowResolved: (show: boolean) => void;
}

export default function FilterBar({
  filterType,
  setFilterType,
  showResolved,
  setShowResolved,
}: FilterBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between sticky top-0 z-10">
      {/* Note Type Filter */}
      <div className="flex bg-neutral-800 p-1 rounded-lg">
        <button
          onClick={() => setFilterType("all")}
          className={`cursor-pointer py-1 px-2 rounded text-xs font-medium transition-colors ${
            filterType === "all"
              ? "bg-white text-neutral-800 shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType("info")}
          className={`cursor-pointer py-1 px-2 rounded transition-colors ${
            filterType === "info"
              ? "bg-white text-neutral-800 shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
          title="Info"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setFilterType("alert")}
          className={`cursor-pointer py-1 px-2 rounded transition-colors ${
            filterType === "alert"
              ? "bg-white text-neutral-800 shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
          title="Alert"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setFilterType("idea")}
          className={`cursor-pointer py-1 px-2 rounded transition-colors ${
            filterType === "idea"
              ? "bg-white text-neutral-800 shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
          title="Idea"
        >
          <Lightbulb className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Resolved Toggle */}
      <button
        onClick={() => setShowResolved(!showResolved)}
        className={`cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors ${
          showResolved
            ? "bg-neutral-800 border-neutral-800 text-white"
            : "bg-white border-dashed border-neutral-800 text-neutral-800 hover:text-white hover:border-neutral-800 hover:bg-neutral-800"
        }`}
        title="Show/Hide Resolved Notes"
      >
        <CheckSquare className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Resolved</span>
      </button>
    </div>
  );
}
