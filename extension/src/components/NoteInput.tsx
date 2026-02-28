import { useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Send, Loader2, Info, AlertTriangle, Lightbulb } from "lucide-react";
import type { NoteType } from "../hooks/useNotes";

interface NoteInputProps {
    userPlan: "free" | "pro";
    totalNoteCount: number;
    maxFreeNotes: number;
    onAddNote: (content: string, scope: "domain" | "exact", type: NoteType) => Promise<boolean>;
}

export default function NoteInput({
    userPlan,
    totalNoteCount,
    maxFreeNotes,
    onAddNote,
}: NoteInputProps) {
    const [selectedScope, setSelectedScope] = useState<"domain" | "exact">("domain");
    const [selectedType, setSelectedType] = useState<NoteType>("info");
    const [newNote, setNewNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setSubmitting(true);
        const success = await onAddNote(newNote, selectedScope, selectedType);
        if (success) {
            setNewNote("");
        }
        setSubmitting(false);
    };

    return (
        <div className="p-4 bg-white border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-neutral-800 hover:text-black">
                        <input
                            type="radio"
                            name="scope"
                            checked={selectedScope === "domain"}
                            onChange={() => setSelectedScope("domain")}
                            className="accent-neutral-800 focus:ring-neutral-800"
                        />
                        <span>Domain</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-neutral-800 hover:text-black">
                        <input
                            type="radio"
                            name="scope"
                            checked={selectedScope === "exact"}
                            onChange={() => setSelectedScope("exact")}
                            className="accent-neutral-800 focus:ring-neutral-800"
                        />
                        <span>This Page</span>
                    </label>
                </div>

                <div className="flex items-center gap-3">
                    {userPlan === "free" && (
                        <span className="text-[10px] text-gray-400 font-medium">
                            {totalNoteCount} / {maxFreeNotes}
                        </span>
                    )}

                    <div className="flex bg-white p-0.5 rounded-md">
                        <button
                            type="button"
                            onClick={() => setSelectedType("info")}
                            className={`cursor-pointer p-1 rounded ${selectedType === "info" ? "bg-neutral-800 shadow-sm text-white" : "text-gray-400 hover:text-neutral-600"}`}
                            title="Info"
                        >
                            <Info className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType("alert")}
                            className={`cursor-pointer p-1 rounded ${selectedType === "alert" ? "bg-neutral-800 shadow-sm text-white" : "text-gray-400 hover:text-neutral-600"}`}
                            title="Alert"
                        >
                            <AlertTriangle className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType("idea")}
                            className={`cursor-pointer p-1 rounded ${selectedType === "idea" ? "bg-neutral-800 shadow-sm text-white" : "text-gray-400 hover:text-neutral-600"}`}
                            title="Idea"
                        >
                            <Lightbulb className="w-4 h-4" strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                {userPlan === "free" && totalNoteCount >= maxFreeNotes ? (
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold mb-1">FREE Plan Limit Reached</div>
                            <p className="text-xs opacity-90">
                                You have reached the {maxFreeNotes} note limit. Please delete
                                some existing notes to create new ones.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <TextareaAutosize
                            ref={textareaRef}
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder={`Add a cue to ${selectedScope === "domain" ? "this domain" : "this page"}...`}
                            className="flex-1 resize-none border-4 border-neutral-800 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 max-h-50"
                            minRows={1}
                            onKeyDown={(e) => {
                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        <button
                            disabled={submitting || !newNote.trim()}
                            type="submit"
                            className="cursor-pointer bg-neutral-800 text-white p-2 rounded-md hover:bg-neutral-500 disabled:cursor-not-allowed transition-colors"
                            title="Add Note"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </>
                )}
            </form>
        </div>
    );
}
