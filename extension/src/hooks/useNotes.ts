import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import type { Database } from "../../../types/supabase";
import { supabase } from "../supabaseClient";
import { getScopeUrls } from "../utils/url";
import type { Session } from "@supabase/supabase-js";

export type Note = Database["public"]["Tables"]["sitecue_notes"]["Row"];
export type NoteType = Database["public"]["Tables"]["sitecue_notes"]["Row"]["note_type"];

export function useNotes(session: Session | null, currentFullUrl: string, setTotalNoteCount: React.Dispatch<React.SetStateAction<number>>) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNotes = useCallback(async () => {
        if (!currentFullUrl || !session) return;
        setLoading(true);
        try {
            const scopeUrls = getScopeUrls(currentFullUrl);

            const { data, error } = await supabase
                .from("sitecue_notes")
                .select("*")
                .or(
                    `and(url_pattern.eq."${scopeUrls.domain}",scope.eq.domain),and(url_pattern.eq."${scopeUrls.exact}",scope.eq.exact),is_favorite.eq.true`,
                );

            if (error) throw error;
            setNotes(data || []);
        } catch (error) {
            console.error("Failed to fetch notes", error);
        } finally {
            setLoading(false);
        }
    }, [currentFullUrl, session]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const addNote = async (
        content: string,
        selectedScope: "domain" | "exact" | "inbox",
        selectedType: NoteType,
    ) => {
        if (!session?.user?.id || !content.trim()) return false;

        try {
            const scopeUrls = getScopeUrls(currentFullUrl);
            const targetUrlPattern =
                selectedScope === "domain" ? scopeUrls.domain : selectedScope === "exact" ? scopeUrls.exact : "inbox";

            const payload = {
                user_id: session.user.id,
                url_pattern: targetUrlPattern,
                content,
                scope: selectedScope,
                note_type: selectedType,
            };

            const { error } = await supabase.from("sitecue_notes").insert(payload);

            if (error) throw error;

            if (selectedScope === "inbox") {
                toast.success("Saved to Inbox");
                setTotalNoteCount((prev) => prev + 1);
                chrome.runtime.sendMessage({ type: "REFRESH_BADGE" });
                return true;
            }

            setTotalNoteCount((prev) => prev + 1);
            chrome.runtime.sendMessage({ type: "REFRESH_BADGE" });
            fetchNotes();
            return true;
        } catch (error) {
            console.error("Failed to create note", error);
            toast.error("Failed to create note");
            return false;
        }
    };

    const updateNote = async (id: string, editContent: string, editType: NoteType) => {
        if (!editContent.trim()) return false;
        try {
            const { error } = await supabase
                .from("sitecue_notes")
                .update({
                    content: editContent,
                    note_type: editType,
                })
                .eq("id", id);

            if (error) throw error;

            setNotes((prevNotes) =>
                prevNotes.map((n) =>
                    n.id === id ? { ...n, content: editContent, note_type: editType } : n,
                )
            );
            toast.success("Cue updated");
            return true;
        } catch (error) {
            console.error("Failed to update note", error);
            toast.error("Failed to update note");
            return false;
        }
    };

    const deleteNote = async (id: string) => {
        if (!window.confirm("このメモを削除しますか？")) return false;

        try {
            const { error } = await supabase
                .from("sitecue_notes")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));
            setTotalNoteCount((prev) => Math.max(0, prev - 1));
            toast.success("Cue deleted");
            chrome.runtime.sendMessage({ type: "REFRESH_BADGE" });
            return true;
        } catch (error) {
            console.error("Failed to delete note", error);
            toast.error("Failed to delete note");
            return false;
        }
    };

    const toggleResolved = async (id: string, currentStatus: boolean | undefined) => {
        const nextStatus = !currentStatus;
        try {
            const { error } = await supabase
                .from("sitecue_notes")
                .update({ is_resolved: nextStatus })
                .eq("id", id);

            if (error) throw error;

            setNotes((prevNotes) =>
                prevNotes.map((n) => (n.id === id ? { ...n, is_resolved: nextStatus } : n)),
            );
            chrome.runtime.sendMessage({ type: "REFRESH_BADGE" });
            return true;
        } catch (error) {
            console.error("Failed to toggle resolved status", error);
            toast.error("Failed to update status");
            return false;
        }
    };

    const toggleFavorite = async (note: Note) => {
        const nextStatus = !note.is_favorite;
        try {
            const { error } = await supabase
                .from("sitecue_notes")
                .update({ is_favorite: nextStatus })
                .eq("id", note.id);

            if (error) throw error;

            setNotes((prevNotes) =>
                prevNotes.map((n) =>
                    n.id === note.id ? { ...n, is_favorite: nextStatus } : n,
                ),
            );
            toast.success(
                nextStatus ? "Added to favorites" : "Removed from favorites",
            );
            return true;
        } catch (error) {
            console.error("Failed to toggle favorite status", error);
            toast.error("Failed to update status");
            return false;
        }
    };

    const togglePinned = async (note: Note) => {
        const nextStatus = !note.is_pinned;
        try {
            const { error } = await supabase
                .from("sitecue_notes")
                .update({ is_pinned: nextStatus })
                .eq("id", note.id);

            if (error) throw error;

            setNotes((prevNotes) =>
                prevNotes.map((n) =>
                    n.id === note.id ? { ...n, is_pinned: nextStatus } : n,
                ),
            );
            toast.success(nextStatus ? "Pinned note" : "Unpinned note");
            return true;
        } catch (error) {
            console.error("Failed to toggle pinned status", error);
            toast.error("Failed to update status");
            return false;
        }
    };

    return {
        notes,
        loading,
        fetchNotes,
        addNote,
        updateNote,
        deleteNote,
        toggleResolved,
        toggleFavorite,
        togglePinned,
    };
}
