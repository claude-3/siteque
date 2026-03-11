import { Info, AlertTriangle, Lightbulb, CheckSquare, Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";interface FilterBarProps {
  filterType: "all" | "info" | "alert" | "idea";
  setFilterType: (type: "all" | "info" | "alert" | "idea") => void;
  showResolved: boolean;
  setShowResolved: (show: boolean) => void;
  viewScope: "exact" | "domain";
  setViewScope: (scope: "exact" | "domain") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function FilterBar({
  filterType,
  setFilterType,
  showResolved,
  setShowResolved,
  viewScope,
  setViewScope,
  searchQuery,
  setSearchQuery,
}: FilterBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close search when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!searchQuery) setIsSearchOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex flex-col gap-3 sticky top-0 z-10">
      {/* Scope Tabs */}
      <div className="flex space-x-4 border-b border-gray-100">
        <button
          onClick={() => setViewScope("exact")}
          className={`cursor-pointer pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            viewScope === "exact"
              ? "border-neutral-800 text-neutral-800"
              : "border-transparent text-neutral-400 hover:text-neutral-600 hover:border-neutral-300"
          }`}
        >
          Page
        </button>
        <button
          onClick={() => setViewScope("domain")}
          className={`cursor-pointer pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            viewScope === "domain"
              ? "border-neutral-800 text-neutral-800"
              : "border-transparent text-neutral-400 hover:text-neutral-600 hover:border-neutral-300"
          }`}
        >
          Domain
        </button>
      </div>

      <div className="flex items-center justify-between">
        {/* Note Type Filter */}
        <div className="flex bg-neutral-800 p-1 rounded-lg shrink-0">
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

        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex items-center">
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`cursor-pointer p-1.5 rounded transition-colors ${
                isSearchOpen || searchQuery
                  ? "bg-neutral-100 text-neutral-800"
                  : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                isSearchOpen || searchQuery ? "w-32 ml-1" : "w-0 ml-0"
              }`}
            >
              <div className="relative flex items-center w-full">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    if (!searchQuery) setIsSearchOpen(false);
                  }}
                  className="w-full text-xs pl-2 pr-6 py-1 bg-neutral-100 border-none rounded focus:outline-none focus:ring-1 focus:ring-neutral-300 placeholder:text-neutral-400"
                />
                {searchQuery && (
                  <button
                    onMouseDown={(e) => {
                      // Prevent input from losing focus when clicking the clear button
                      e.preventDefault();
                    }}
                    onClick={() => {
                      setSearchQuery("");
                      inputRef.current?.focus();
                    }}
                    className="absolute right-1 cursor-pointer p-0.5 text-neutral-400 hover:text-neutral-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Resolved Toggle */}
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors shrink-0 ${
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
      </div>
    </div>
  );
}
