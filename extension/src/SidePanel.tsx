import { useEffect, useState, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import TextareaAutosize from "react-textarea-autosize";
import {
  Send,
  Loader2,
  X,
  Check,
  Trash2,
  Info,
  AlertTriangle,
  Lightbulb,
  CheckSquare,
  Square,
  Pin,
  ExternalLink,
  Star,
  Edit2,
  Ghost,
  Copy,
} from "lucide-react";
import MarkdownRenderer from "./components/MarkdownRenderer";
import type { Database } from "../../types/supabase";
import { supabase } from "./supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { getScopeUrls, getCurrentTabInfo } from "./utils/url";
import Header from "./components/Header";
import FilterBar from "./components/FilterBar";
import QuickLinks from "./components/QuickLinks";

type Note = Database["public"]["Tables"]["sitecue_notes"]["Row"];
type NoteType =
  Database["public"]["Tables"]["sitecue_notes"]["Row"]["note_type"];

// 🌐 スコープ選択用の型
type ScopeType = "domain" | "exact";

interface TabChangeInfo {
  url?: string;
}

const MAX_FREE_NOTES = 200;

export default function SidePanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSocialLogin = async (provider: "google" | "github") => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      // 1. Get Extension ID for redirect URL
      const redirectUrl = chrome.identity.getRedirectURL();

      // 2. Start OAuth flow with Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams:
            provider === "google"
              ? {
                prompt: "select_account",
              }
              : undefined,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No OAuth URL returned");

      // 3. Launch Chrome Web Auth Flow
      chrome.identity.launchWebAuthFlow(
        {
          url: data.url,
          interactive: true,
        },
        async (redirectUri) => {
          if (chrome.runtime.lastError) {
            setAuthError(
              chrome.runtime.lastError.message || "Authentication failed",
            );
            setAuthLoading(false);
            return;
          }

          if (!redirectUri) {
            setAuthError("No redirect URI returned");
            setAuthLoading(false);
            return;
          }

          // 4. Parse the hash from the redirect URI
          // The URL looks like: https://<extension-id>.chromiumapp.org/#access_token=...&refresh_token=...
          const url = new URL(redirectUri);
          const hash = url.hash.substring(1); // remove '#'
          const params = new URLSearchParams(hash);

          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (!accessToken || !refreshToken) {
            // Sometimes error details are in the query or hash
            const errorDescription =
              params.get("error_description") || "Authentication incomplete";
            setAuthError(errorDescription);
            setAuthLoading(false);
            return;
          }

          // 5. Set the session in Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setAuthError(sessionError.message);
          }

          // No need to setAuthLoading(false) here if successful,
          // because onAuthStateChange will trigger and unmount this login view
          // But just in case:
          setAuthLoading(false);
        },
      );
    } catch (err: any) {
      console.error("Login failed:", err);
      setAuthError(err.message || "An unexpected error occurred");
      setAuthLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="w-full h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-full h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-xs bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h1 className="text-xl font-bold text-center mb-2 text-neutral-800">
            Welcome to SiteCue
          </h1>
          <p className="text-xs text-center text-gray-500 mb-6">
            Sign in to sync your notes across devices
          </p>

          {authError && (
            <div className="text-rose-400 text-xs mb-4 text-center bg-rose-50 p-2 rounded border border-rose-100">
              {authError}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => handleSocialLogin("google")}
              disabled={authLoading}
              className="cursor-pointer w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-neutral-700 py-2.5 rounded text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {/* Google Icon (SVG) */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.21.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => handleSocialLogin("github")}
              disabled={authLoading}
              className="cursor-pointer w-full flex items-center justify-center gap-2 bg-[#24292F] text-white py-2.5 rounded text-sm font-medium hover:bg-[#24292F]/90 transition-colors disabled:opacity-50"
            >
              {/* GitHub Icon (SVG Path) */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </div>
        </div>
      </div>
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
  const [url, setUrl] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ✏️ 編集用のステート
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<NoteType>("info");
  const [updating, setUpdating] = useState(false);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // 🌐 スコープ管理
  const [currentFullUrl, setCurrentFullUrl] = useState<string>("");
  const [selectedScope, setSelectedScope] = useState<ScopeType>("domain");
  const [selectedType, setSelectedType] = useState<NoteType>("info");

  // 🔍 フィルタリング用ステート
  const [filterType, setFilterType] = useState<
    "all" | "info" | "alert" | "idea"
  >("all");
  const [showResolved, setShowResolved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 📊 プランと制限管理
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [totalNoteCount, setTotalNoteCount] = useState<number>(0);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!session?.user?.id) return;

      // Fetch Profile
      const { data: profile } = await supabase
        .from("sitecue_profiles")
        .select("plan")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserPlan(profile.plan);
      }

      // Fetch Count
      const { count } = await supabase
        .from("sitecue_notes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      if (count !== null) {
        setTotalNoteCount(count);
      }
    };

    fetchUserStats();
  }, [session]);

  // ✅ 安全なURL取得 (修正済み)
  useEffect(() => {
    const updateStateWithTabInfo = (info: { url: string; title?: string }) => {
      setCurrentFullUrl(info.url);
      const scopeUrls = getScopeUrls(info.url);
      setUrl(scopeUrls.exact);
      if (info.title) setTitle(info.title);
    };

    const initUrl = async () => {
      const info = await getCurrentTabInfo();
      if (info.url)
        updateStateWithTabInfo({ url: info.url, title: info.title || "" });
    };
    initUrl();

    // Chrome拡張の時だけリスナーを登録
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.windows) {
      let currentWindowId: number | null = null;

      // Initialize window ID
      chrome.windows.getCurrent().then((window) => {
        if (window.id) currentWindowId = window.id;
      });

      // 1. URL変更監視 (onUpdated)
      // 1. URL変更監視 (onUpdated)
      const updateListener = (
        _tabId: number,
        changeInfo: TabChangeInfo & { title?: string },
        tab: chrome.tabs.Tab,
      ) => {
        // Ignore events from other windows
        if (currentWindowId !== null && tab.windowId !== currentWindowId)
          return;

        if (tab.active) {
          // Update if URL changed OR Title changed
          if (changeInfo.url || changeInfo.title) {
            // If only title changed, we still need the URL to stay correct.
            // tab.url should be current.
            updateStateWithTabInfo({ url: tab.url || "", title: tab.title });
          }
        }
      };

      // 2. タブ切り替え監視 (onActivated)
      const activateListener = async (activeInfo: {
        tabId: number;
        windowId: number;
      }) => {
        // Ignore events from other windows
        if (currentWindowId !== null && activeInfo.windowId !== currentWindowId)
          return;

        try {
          const tab = await chrome.tabs.get(activeInfo.tabId);
          if (tab.url) {
            updateStateWithTabInfo({ url: tab.url, title: tab.title });
          }
        } catch (e) {
          console.error("Failed to get active tab", e);
        }
      };

      if (chrome.tabs.onUpdated)
        chrome.tabs.onUpdated.addListener(updateListener);
      if (chrome.tabs.onActivated)
        chrome.tabs.onActivated.addListener(activateListener);

      return () => {
        if (chrome.tabs.onUpdated)
          chrome.tabs.onUpdated.removeListener(updateListener);
        if (chrome.tabs.onActivated)
          chrome.tabs.onActivated.removeListener(activateListener);
      };
    }
  }, []);

  useEffect(() => {
    if (!currentFullUrl) return;
    fetchNotes();
  }, [currentFullUrl]); // URL全体が変わったら再取得

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const scopeUrls = getScopeUrls(currentFullUrl);

      // domainとexactの両方のノートを取得
      // Pinned notes should be fetched regardless of URL match or scope
      // We want: (match current URL) OR (is_pinned = true)
      // match current URL = (url_pattern = domain AND scope = domain) OR (url_pattern = exact AND scope = exact)

      // Construct the query:
      // or conditions:
      // 1. and(url_pattern.eq.${scopeUrls.domain},scope.eq.domain)
      // 2. and(url_pattern.eq.${scopeUrls.exact},scope.eq.exact)
      // 3. is_pinned.eq.true

      const { data, error } = await supabase
        .from("sitecue_notes")
        .select("*")
        .or(
          `and(url_pattern.eq."${scopeUrls.domain}",scope.eq.domain),and(url_pattern.eq."${scopeUrls.exact}",scope.eq.exact),is_favorite.eq.true`,
        );

      if (error) throw error;

      // Sorting is handled at render time by splitting into two lists
      setNotes(data || []);
    } catch (error) {
      console.error("Failed to fetch notes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmitting(true);
    try {
      const scopeUrls = getScopeUrls(currentFullUrl);
      // domain選択時はnormalized domain, exact選択時はnormalized exact urlを使用
      // getScopeUrlsはすでにnormalizeUrlを使っているが、明示的に選択する
      const targetUrlPattern =
        selectedScope === "domain" ? scopeUrls.domain : scopeUrls.exact;

      const payload = {
        user_id: session.user.id,
        url_pattern: targetUrlPattern,
        content: newNote,
        scope: selectedScope,
        note_type: selectedType,
      };

      console.log(`Saving note with:`, payload);

      const { error } = await supabase.from("sitecue_notes").insert(payload);

      if (error) throw error;

      toast.success("Cue added");
      setNewNote("");
      fetchNotes();
      setTotalNoteCount((prev) => prev + 1);
      chrome.runtime.sendMessage({ type: "REFRESH_BADGE" });
    } catch (error) {
      console.error("Failed to create note", error);
      toast.error("Failed to create note");
    } finally {
      setSubmitting(false);
    }
  };

  // ✏️ 編集モード開始
  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditType(note.note_type || "info");
  };

  // ❌ 編集キャンセル
  const cancelEditing = () => {
    setEditingId(null);
    setEditContent("");
    setEditType("info");
  };

  // 💾 更新実行 (PUT)
  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("sitecue_notes")
        .update({
          content: editContent,
          note_type: editType,
        })
        .eq("id", id);

      if (error) throw error;

      // ローカルのメモ一覧も更新（再取得しなくても画面に反映させる）
      setNotes(
        notes.map((n) =>
          n.id === id ? { ...n, content: editContent, note_type: editType } : n,
        ),
      );
      setEditingId(null);
      toast.success("Cue updated");
    } catch (error) {
      console.error("Failed to update note", error);
      toast.error("Failed to update note");
    } finally {
      setUpdating(false);
    }
  };

  // 🗑️ 削除実行
  const handleDelete = async (id: string) => {
    if (!window.confirm("このメモを削除しますか？")) return;

    try {
      const { error } = await supabase
        .from("sitecue_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // ローカルのstateから除外
      setNotes(notes.filter((note) => note.id !== id));
      setTotalNoteCount((prev) => Math.max(0, prev - 1));
      toast.success("Cue deleted");
      chrome.runtime.sendMessage({ type: "REFRESH_BADGE" });
    } catch (error) {
      console.error("Failed to delete note", error);
      toast.error("Failed to delete note");
    }
  };

  // ✅ 完了ステータス切り替え
  const handleToggleResolved = async (
    id: string,
    currentStatus: boolean | undefined,
  ) => {
    // currentStatus might be undefined if not set yet (though DB default is false), treat as false
    const nextStatus = !currentStatus;
    try {
      const { error } = await supabase
        .from("sitecue_notes")
        .update({ is_resolved: nextStatus })
        .eq("id", id);

      if (error) throw error;

      setNotes(
        notes.map((n) => (n.id === id ? { ...n, is_resolved: nextStatus } : n)),
      );
      chrome.runtime.sendMessage({ type: "REFRESH_BADGE" });
    } catch (error) {
      console.error("Failed to toggle resolved status", error);
      toast.error("Failed to update status");
    }
  };

  // ⭐ お気に入り切り替え
  const handleToggleFavorite = async (note: Note) => {
    const nextStatus = !note.is_favorite;
    try {
      const { error } = await supabase
        .from("sitecue_notes")
        .update({ is_favorite: nextStatus })
        .eq("id", note.id);

      if (error) throw error;

      // Update local state
      setNotes(
        notes.map((n) =>
          n.id === note.id ? { ...n, is_favorite: nextStatus } : n,
        ),
      );
      toast.success(
        nextStatus ? "Added to favorites" : "Removed from favorites",
      );
    } catch (error) {
      console.error("Failed to toggle favorite status", error);
      toast.error("Failed to update status");
    }
  };

  // 📌 ピン留め切り替え
  const handleTogglePinned = async (note: Note) => {
    const nextStatus = !note.is_pinned;
    try {
      const { error } = await supabase
        .from("sitecue_notes")
        .update({ is_pinned: nextStatus })
        .eq("id", note.id);

      if (error) throw error;

      // Update local state
      // Sorting is handled at render time
      setNotes(
        notes.map((n) =>
          n.id === note.id ? { ...n, is_pinned: nextStatus } : n,
        ),
      );
      toast.success(nextStatus ? "Pinned note" : "Unpinned note");
    } catch (error) {
      console.error("Failed to toggle pinned status", error);
      toast.error("Failed to update status");
    }
  };

  // 📋 メモ全体コピー
  const handleCopyNote = (note: Note) => {
    navigator.clipboard.writeText(note.content);
    setCopiedNoteId(note.id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

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

  const currentScopeNotes = filteredNotes
    .filter(
      (n) =>
        !n.is_favorite &&
        ((n.scope === "domain" &&
          n.url_pattern ===
          (currentFullUrl ? getScopeUrls(currentFullUrl).domain : "")) ||
          (n.scope === "exact" &&
            n.url_pattern ===
            (currentFullUrl ? getScopeUrls(currentFullUrl).exact : ""))),
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

  const renderNoteItem = (note: Note) => {
    // 🎨 Color Logic (No Border, Restore Icon Colors)
    // Base: white, border-gray-200, shadow-sm
    let iconBgColor = "bg-blue-400";
    let iconTextColor = "text-white";

    if (note.note_type === "alert") {
      iconBgColor = "bg-rose-400";
      iconTextColor = "text-white";
    } else if (note.note_type === "idea") {
      iconBgColor = "bg-amber-400";
      iconTextColor = "text-white";
    }

    // Resolved Styling
    const resolvedClasses = note.is_resolved
      ? "opacity-60 grayscale-[0.5]"
      : "";

    return (
      <div
        key={note.id}
        className={`bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all group relative ${resolvedClasses}`}
      >
        {editingId === note.id ? (
          // ✏️ 編集モード
          <div className="space-y-2">
            <div className="flex bg-gray-50 p-0.5 rounded-md w-fit mb-2">
              <button
                type="button"
                onClick={() => setEditType("info")}
                className={`cursor-pointer p-1 rounded ${editType === "info" ? "bg-blue-400 shadow-sm text-white" : "text-gray-400 hover:text-blue-500"}`}
                title="Info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditType("alert")}
                className={`cursor-pointer p-1 rounded ${editType === "alert" ? "bg-rose-400 shadow-sm text-white" : "text-gray-400 hover:text-rose-500"}`}
                title="Alert"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditType("idea")}
                className={`cursor-pointer p-1 rounded ${editType === "idea" ? "bg-amber-400 shadow-sm text-white" : "text-gray-400 hover:text-amber-500"}`}
                title="Idea"
              >
                <Lightbulb className="w-3.5 h-3.5" />
              </button>
            </div>
            <TextareaAutosize
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
              minRows={3}
              autoFocus
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleUpdate(note.id);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelEditing}
                className="cursor-pointer p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleUpdate(note.id)}
                disabled={updating}
                className="cursor-pointer p-1 bg-black text-white rounded hover:bg-neutral-600 disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ) : (
          // 👀 表示モード
          <div className="flex items-start gap-3">
            {/* Left Column: Icon + Checkbox (Vertical Stack) */}
            <div className="flex flex-col items-center gap-2 pt-0 min-w-6">
              <div className={`shrink-0 ${iconBgColor} p-0.5 rounded`}>
                {note.note_type === "alert" && (
                  <AlertTriangle className={`w-4 h-4 ${iconTextColor}`} />
                )}
                {note.note_type === "idea" && (
                  <Lightbulb className={`w-4 h-4 ${iconTextColor}`} />
                )}
                {(note.note_type === "info" || !note.note_type) && (
                  <Info className={`w-4 h-4 ${iconTextColor}`} />
                )}
              </div>
              <button
                onClick={() => handleToggleResolved(note.id, note.is_resolved)}
                className={`cursor-pointer shrink-0 transition-colors ${note.is_resolved ? "text-neutral-500" : "text-neutral-300 hover:text-neutral-400"}`}
                title={
                  note.is_resolved ? "Mark as unresolved" : "Mark as resolved"
                }
              >
                {note.is_resolved ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Right Column: Content + Metadata */}
            <div className="flex-1 min-w-0">
              {/* Top Right: Status Icons (Absolute relative to parent) */}
              <div className="absolute top-3 right-3 flex gap-1.5 ">
                <button
                  onClick={() => handleToggleFavorite(note)}
                  className={`cursor-pointer hover:scale-110 transition-transform ${note.is_favorite ? "text-neutral-800 fill-current" : "text-neutral-300 hover:text-neutral-500"}`}
                  title={
                    note.is_favorite
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                >
                  <Star
                    className={`w-3.5 h-3.5 ${note.is_favorite ? "fill-current" : ""}`}
                  />
                </button>
                <button
                  onClick={() => handleTogglePinned(note)}
                  className={`cursor-pointer hover:scale-110 transition-transform ${note.is_pinned ? "text-neutral-800 fill-current" : "text-neutral-300 hover:text-neutral-500"}`}
                  title={note.is_pinned ? "Unpin note" : "Pin note"}
                >
                  <Pin
                    className={`w-3.5 h-3.5 ${note.is_pinned ? "fill-current" : ""}`}
                  />
                </button>
              </div>

              {/* Content */}
              <div
                className={`text-sm pr-8 mb-2 ${note.is_resolved
                    ? "line-through text-neutral-500"
                    : "text-neutral-800"
                  }`}
              >
                <MarkdownRenderer content={note.content} />
              </div>

              {/* Metadata Footer */}
              <div className="text-[10px] text-neutral-400 flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded border ${note.scope === "exact" ? "bg-white border-neutral-200 text-neutral-600" : "bg-neutral-50 border-neutral-200 text-neutral-500"}`}
                >
                  {note.scope === "exact" ? "Page" : "Domain"}
                </span>
                <span className="opacity-70">
                  {new Date(note.created_at).toLocaleDateString()}
                </span>

                {/* External Link */}
                {note.url_pattern !==
                  (note.scope === "domain"
                    ? getScopeUrls(currentFullUrl).domain
                    : getScopeUrls(currentFullUrl).exact) && (
                    <a
                      href={`https://${note.url_pattern}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-blue-400 hover:underline transition-colors max-w-30 ml-1"
                      title={`Open ${note.url_pattern}`}
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{note.url_pattern}</span>
                    </a>
                  )}
              </div>
            </div>

            {/* Right Bottom: Action Icons (Hover only) - Positioned relative to parent */}
            <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 pl-2 rounded-l-md">
              <button
                onClick={() => handleCopyNote(note)}
                className="cursor-pointer text-neutral-300 hover:text-neutral-800 transition-colors"
                title="Copy note"
              >
                {copiedNoteId === note.id ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => startEditing(note)}
                className="cursor-pointer text-neutral-300 hover:text-neutral-800 transition-colors"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(note.id)}
                className="cursor-pointer text-neutral-300 hover:text-rose-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : favoriteNotes.length === 0 && currentScopeNotes.length === 0 ? (
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
        ) : (
          <>
            {/* Favorites Section */}
            {favoriteNotes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">
                  <span>Favorites</span>
                </div>
                <div className="space-y-3">
                  {favoriteNotes.map(renderNoteItem)}
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
                  {currentScopeNotes.map(renderNoteItem)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-200 space-y-3">
        {/* スコープ選択 */}
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

          {/* Note Type Selection */}
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

        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          {userPlan === "free" && totalNoteCount >= MAX_FREE_NOTES ? (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold mb-1">FREE Plan Limit Reached</div>
                <p className="text-xs opacity-90">
                  You have reached the {MAX_FREE_NOTES} note limit. Please delete some
                  existing notes to create new ones.
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
    </div>
  );
}
