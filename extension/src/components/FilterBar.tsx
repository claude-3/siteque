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
      <div className="flex bg-gray-100 p-0.5 rounded-lg">
        <button
          onClick={() => setFilterType("all")}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            filterType === "all"
              ? "bg-white text-neutral-700 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          All
        </button>
        <div className="w-px bg-gray-200 my-1 mx-0.5"></div>
        <button
          onClick={() => setFilterType("info")}
          className={`p-1 rounded transition-colors ${
            filterType === "info"
              ? "bg-white text-blue-300 shadow-sm"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
          title="Info"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setFilterType("alert")}
          className={`p-1 rounded transition-colors ${
            filterType === "alert"
              ? "bg-white text-red-300 shadow-sm"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
          title="Alert"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setFilterType("idea")}
          className={`p-1 rounded transition-colors ${
            filterType === "idea"
              ? "bg-white text-yellow-300 shadow-sm"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
          title="Idea"
        >
          <Lightbulb className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Resolved Toggle */}
      <button
        onClick={() => setShowResolved(!showResolved)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors ${
          showResolved
            ? "bg-gray-100 border-gray-300 text-neutral-700"
            : "bg-white border-dashed border-gray-300 text-neutral-400 hover:text-neutral-600 hover:border-gray-400"
        }`}
        title="Show/Hide Resolved Notes"
      >
        <CheckSquare className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Resolved</span>
      </button>
    </div>
  );
}
