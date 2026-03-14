
import { Loader2, Ghost } from "lucide-react";
import type { Note, NoteType, NoteScope } from "../hooks/useNotes";
import NoteItem from "./NoteItem";
import { getScopeUrls } from "../utils/url";

interface NoteListProps {
    notes: Note[];
    loading: boolean;
    filterType: "all" | "info" | "alert" | "idea";
    showResolved: boolean;
    currentFullUrl: string;
    viewScope: "exact" | "domain" | "inbox";
    onUpdate: (id: string, content: string, type: NoteType, scope: NoteScope) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
    onToggleResolved: (id: string, status: boolean | undefined) => Promise<boolean>;
    onToggleFavorite: (note: Note) => Promise<boolean>;
    onTogglePinned: (note: Note) => Promise<boolean>;
    onSwapOrder: (id: string, direction: 'up' | 'down') => Promise<boolean>;
    onToggleExpansion: (id: string, current: boolean) => Promise<boolean>;
}

export default function NoteList({
    notes,
    loading,
    filterType,
    showResolved,
    currentFullUrl,
    viewScope,
    onUpdate,
    onDelete,
    onToggleResolved,
    onToggleFavorite,
    onTogglePinned,
    onSwapOrder,
    onToggleExpansion,
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
        .sort((a, b) =>
            (a.sort_order || 0) - (b.sort_order || 0) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

    const scopeUrls = currentFullUrl ? getScopeUrls(currentFullUrl) : { domain: "", exact: "" };

    const currentScopeNotes = filteredNotes
        .filter(
            (n) => {
                if (n.is_favorite) return false;
                // inbox タブの場合はURLパターン判定をバイパスし、scope === "inbox" のメモをそのまま表示
                if (viewScope === "inbox") return n.scope === "inbox";
                return (
                    (n.scope === "domain" && n.url_pattern === scopeUrls.domain) ||
                    (n.scope === "exact" && n.url_pattern === scopeUrls.exact)
                );
            }
        )
        .sort((a, b) => {
            // 1. Pinned items first (Local Pin)
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            // 2. Scope priority (exact > domain)
            if (a.scope !== b.scope) return a.scope === "exact" ? -1 : 1;
            // 3. Sort Order
            if ((a.sort_order || 0) !== (b.sort_order || 0)) return (a.sort_order || 0) - (b.sort_order || 0);
            // 4. Created date
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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

    const renderItem = (note: Note, index: number, isFavorite: boolean) => {
        const total = isFavorite ? favoriteNotes.length : currentScopeNotes.length;
        return (
            <NoteItem
                key={note.id}
                note={note}
                currentFullUrl={currentFullUrl}
                isFirst={index === 0}
                isLast={index === total - 1}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onToggleResolved={onToggleResolved}
                onToggleFavorite={onToggleFavorite}
                onTogglePinned={onTogglePinned}
                onSwapOrder={onSwapOrder}
                onToggleExpansion={onToggleExpansion}
            />
        );
    };

    return (
        <>
            {/* Favorites Section */}
            {favoriteNotes.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">
                        <span>Favorites</span>
                    </div>
                    <div className="space-y-3">
                        {favoriteNotes.map((note, idx) => renderItem(note, idx, true))}
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
                        {currentScopeNotes.map((note, idx) => renderItem(note, idx, false))}
                    </div>
                </div>
            )}
        </>
    );
}
