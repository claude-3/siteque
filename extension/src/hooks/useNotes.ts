import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { supabase } from "../supabaseClient";
import { getScopeUrls } from "../utils/url";
import type { Session } from "@supabase/supabase-js";
import type { Note, NoteScope } from "../../../types/app";

export type NoteType = Note["note_type"];
export type { Note, NoteScope };

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
                )
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true });

            if (error) throw error;
            setNotes((data as Note[]) || []);
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
        selectedScope: NoteScope,
        selectedType: NoteType,
    ) => {
        if (!session?.user?.id || !content.trim()) return false;

        try {
            const scopeUrls = getScopeUrls(currentFullUrl);
            const targetUrlPattern =
                selectedScope === "domain" ? scopeUrls.domain : selectedScope === "exact" ? scopeUrls.exact : "inbox";

            const newSortOrder = notes.length > 0 
                ? Math.max(...notes.map(n => n.sort_order || 0)) + 1 
                : 0;

            const payload = {
                user_id: session.user.id,
                url_pattern: targetUrlPattern,
                content,
                scope: selectedScope,
                note_type: selectedType,
                sort_order: newSortOrder,
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

    const swapNoteOrder = async (noteId: string, direction: 'up' | 'down') => {
        const currentIndex = notes.findIndex(n => n.id === noteId);
        if (currentIndex === -1) return false;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= notes.length) return false;

        const currentNote = notes[currentIndex];
        const targetNote = notes[targetIndex];

        // Optimistic UI update
        const newNotes = [...notes];
        const tempOrder = currentNote.sort_order;
        
        newNotes[currentIndex] = { ...currentNote, sort_order: targetNote.sort_order };
        newNotes[targetIndex] = { ...targetNote, sort_order: tempOrder };
        
        // Sort the array according to the new sort_order so it reflects immediately
        newNotes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setNotes(newNotes);

        try {
            // Update both notes in parallel
            const [res1, res2] = await Promise.all([
                supabase.from('sitecue_notes').update({ sort_order: targetNote.sort_order }).eq('id', currentNote.id),
                supabase.from('sitecue_notes').update({ sort_order: tempOrder }).eq('id', targetNote.id)
            ]);

            if (res1.error) throw res1.error;
            if (res2.error) throw res2.error;
            return true;
        } catch (error) {
            console.error('Failed to swap notes', error);
            toast.error('Failed to reorder notes');
            // Revert changes by refetching
            fetchNotes();
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
        swapNoteOrder,
    };
}
