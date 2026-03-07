import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

import Header from "./components/Header";
import FilterBar from "./components/FilterBar";
import QuickLinks from "./components/QuickLinks";

import { useAuth } from "./hooks/useAuth";
import { useCurrentTab } from "./hooks/useCurrentTab";
import { useUserStats } from "./hooks/useUserStats";
import { useNotes } from "./hooks/useNotes";

import LoginScreen from "./components/LoginScreen";
import NoteList from "./components/NoteList";
import NoteInput from "./components/NoteInput";

import { getScopeUrls } from "./utils/url";

const MAX_FREE_NOTES = 200;

export default function SidePanel() {
  const {
    session,
    authLoading,
    authError,
    sessionLoading,
    handleLogout,
    handleSocialLogin,
  } = useAuth();

  if (sessionLoading) {
    return (
      <div className="w-full h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        authError={authError}
        authLoading={authLoading}
        handleSocialLogin={handleSocialLogin}
      />
    );
  }

  return <NotesUI session={session} onLogout={handleLogout} />;
}

function NotesUI({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const { currentFullUrl, url, title } = useCurrentTab();
  const { userPlan, totalNoteCount, setTotalNoteCount, userStatsLoading } =
    useUserStats(session);

  const {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    toggleResolved,
    toggleFavorite,
    togglePinned,
  } = useNotes(session, currentFullUrl, setTotalNoteCount);

  // 🔍 フィルタリング用ステート
  const [filterType, setFilterType] = useState<
    "all" | "info" | "alert" | "idea"
  >("all");
  const [showResolved, setShowResolved] = useState(false);

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col font-sans">
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            fontSize: "12px",
            padding: "8px 12px",
            borderRadius: "8px",
            background: "#333",
            color: "#fff",
          },
        }}
      />
      <Header
        url={url}
        title={title}
        domain={currentFullUrl ? getScopeUrls(currentFullUrl).domain : ""}
        session={session}
        onLogout={onLogout}
      />

      <QuickLinks
        currentDomain={
          currentFullUrl ? getScopeUrls(currentFullUrl).domain : null
        }
      />

      <FilterBar
        filterType={filterType}
        setFilterType={setFilterType}
        showResolved={showResolved}
        setShowResolved={setShowResolved}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <NoteList
          notes={notes}
          loading={loading}
          filterType={filterType}
          showResolved={showResolved}
          currentFullUrl={currentFullUrl}
          onUpdate={updateNote}
          onDelete={deleteNote}
          onToggleResolved={toggleResolved}
          onToggleFavorite={toggleFavorite}
          onTogglePinned={togglePinned}
        />

        {currentFullUrl && notes.length > 0 && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => {
                const dashboardUrl =
                  import.meta.env.VITE_WEB_URL || "http://127.0.0.1:3000";
                const cleanUrl = currentFullUrl.replace(/^https?:\/\//, "");
                window.open(
                  `${dashboardUrl}/weave?url=${encodeURIComponent(cleanUrl)}`,
                  "_blank"
                );
              }}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-neutral-900 transition-colors shadow-sm w-full justify-center"
            >
              ✨ 錬成する (Weave Ideas)
            </button>
          </div>
        )}
      </div>

      {userStatsLoading ? (
        <div className="p-4 bg-white border-t border-gray-200 space-y-3">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        </div>
      ) : (
        <NoteInput
          userPlan={userPlan}
          totalNoteCount={totalNoteCount}
          maxFreeNotes={MAX_FREE_NOTES}
          onAddNote={addNote}
        />
      )}
    </div>
  );
}
