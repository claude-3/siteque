
import { Loader2, Ghost } from "lucide-react";
import type { Note, NoteType } from "../hooks/useNotes";
import NoteItem from "./NoteItem";
import { getScopeUrls } from "../utils/url";

interface NoteListProps {
    notes: Note[];
    loading: boolean;
    filterType: "all" | "info" | "alert" | "idea";
    showResolved: boolean;
    currentFullUrl: string;
    onUpdate: (id: string, content: string, type: NoteType) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
    onToggleResolved: (id: string, status: boolean | undefined) => Promise<boolean>;
    onToggleFavorite: (note: Note) => Promise<boolean>;
    onTogglePinned: (note: Note) => Promise<boolean>;
}

export default function NoteList({
    notes,
    loading,
    filterType,
    showResolved,
    currentFullUrl,
    onUpdate,
    onDelete,
    onToggleResolved,
    onToggleFavorite,
    onTogglePinned,
}: NoteListProps) {
    // 📝 Split notes into Favorites (Global) and Current Page (Local)
    const filteredNotes = notes.filter((note) => {
        // 1. Note Type Filter
        if (filterType !== "all") {
            const type = note.note_type || "info";
            if (type !== filterType) return false;
        }
        // 2. Resolved Filter
        if (!showResolved && note.is_resolved) {
            return false;
        }
        return true;
    });

    const favoriteNotes = filteredNotes
        .filter((n) => n.is_favorite)
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

    const scopeUrls = currentFullUrl ? getScopeUrls(currentFullUrl) : { domain: "", exact: "" };

    const currentScopeNotes = filteredNotes
        .filter(
            (n) =>
                !n.is_favorite &&
                ((n.scope === "domain" && n.url_pattern === scopeUrls.domain) ||
                    (n.scope === "exact" && n.url_pattern === scopeUrls.exact)),
        )
        .sort((a, b) => {
            // 1. Pinned items first (Local Pin)
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            // 2. Scope priority (exact > domain)
            if (a.scope !== b.scope) return a.scope === "exact" ? -1 : 1;
            // 3. Created date (newest first)
            return (
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        });

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (favoriteNotes.length === 0 && currentScopeNotes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Ghost className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                    No notes for this page yet
                </h3>
                <p className="text-xs text-gray-500 mb-4 max-w-50">
                    Capture your thoughts for this page.
                </p>
            </div>
        );
    }

    const renderItem = (note: Note) => (
        <NoteItem
            key={note.id}
            note={note}
            currentFullUrl={currentFullUrl}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onToggleResolved={onToggleResolved}
            onToggleFavorite={onToggleFavorite}
            onTogglePinned={onTogglePinned}
        />
    );

    return (
        <>
            {/* Favorites Section */}
            {favoriteNotes.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">
                        <span>Favorites</span>
                    </div>
                    <div className="space-y-3">
                        {favoriteNotes.map(renderItem)}
                    </div>
                    {currentScopeNotes.length > 0 && (
                        <hr className="border-gray-200" />
                    )}
                </div>
            )}

            {/* Current Page Section */}
            {currentScopeNotes.length > 0 && (
                <div className="space-y-3">
                    {favoriteNotes.length > 0 && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">
                            <span>Current Page</span>
                        </div>
                    )}
                    <div className="space-y-3">
                        {currentScopeNotes.map(renderItem)}
                    </div>
                </div>
            )}
        </>
    );
}
