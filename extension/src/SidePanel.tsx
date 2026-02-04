import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Send, FileText, Loader2, Pencil, X, Check, Trash2, Info, AlertTriangle, Lightbulb, CheckSquare, Square } from 'lucide-react';
import type { Database } from '../../types/supabase';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { getCurrentUrl, getScopeUrls } from './utils/url';
import Header from './components/Header';

type Note = Database['public']['Tables']['sitecue_notes']['Row'];
type NoteType = Database['public']['Tables']['sitecue_notes']['Insert']['note_type']; // Use Insert type as it allows optional if undefined, but helpful for enum values

// 🌐 スコープ選択用の型
type ScopeType = 'domain' | 'exact';

interface TabChangeInfo {
    url?: string;
}

export default function SidePanel() {
    const [session, setSession] = useState<Session | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) setAuthError(error.message);
        setAuthLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (!session) {
        return (
            <div className="w-full h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-full max-w-xs bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h1 className="text-xl font-bold text-center mb-6 text-gray-800">SiteCue Login</h1>
                    {authError && <div className="text-red-500 text-xs mb-4 text-center">{authError}</div>}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-black text-white py-2 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            {authLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sign In'}
                        </button>
                    </form>
                    <p className="mt-4 text-xs text-center text-gray-500">
                        Don't have an account? Sign up on the web dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return <NotesUI session={session} onLogout={handleLogout} />;
}

function NotesUI({ session, onLogout }: { session: Session; onLogout: () => void }) {
    const [url, setUrl] = useState<string>('');
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ✏️ 編集用のステート
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [updating, setUpdating] = useState(false);

    // 🌐 スコープ管理
    const [currentFullUrl, setCurrentFullUrl] = useState<string>('');
    const [selectedScope, setSelectedScope] = useState<ScopeType>('domain');
    const [selectedType, setSelectedType] = useState<NoteType>('info');

    // ✅ 安全なURL取得 (修正済み)
    useEffect(() => {
        const updateStateWithUrl = (url: string) => {
            setCurrentFullUrl(url);
            const scopeUrls = getScopeUrls(url);
            setUrl(scopeUrls.exact);
        };

        const initUrl = async () => {
            const currentUrl = await getCurrentUrl();
            if (currentUrl) updateStateWithUrl(currentUrl);
        };
        initUrl();

        // Chrome拡張の時だけリスナーを登録
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            // 1. URL変更監視 (onUpdated)
            const updateListener = (_tabId: number, changeInfo: TabChangeInfo, tab: chrome.tabs.Tab) => {
                if (tab.active && changeInfo.url) {
                    updateStateWithUrl(changeInfo.url);
                }
            };

            // 2. タブ切り替え監視 (onActivated)
            const activateListener = async (activeInfo: { tabId: number; windowId: number }) => {
                try {
                    const tab = await chrome.tabs.get(activeInfo.tabId);
                    if (tab.url) {
                        updateStateWithUrl(tab.url);
                    }
                } catch (e) {
                    console.error('Failed to get active tab', e);
                }
            };

            if (chrome.tabs.onUpdated) chrome.tabs.onUpdated.addListener(updateListener);
            if (chrome.tabs.onActivated) chrome.tabs.onActivated.addListener(activateListener);

            return () => {
                if (chrome.tabs.onUpdated) chrome.tabs.onUpdated.removeListener(updateListener);
                if (chrome.tabs.onActivated) chrome.tabs.onActivated.removeListener(activateListener);
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
            // or条件で取得: (url_pattern = domain AND scope = domain) OR (url_pattern = exact AND scope = exact)
            // SQL injection is not possible here as library handles escaping, but logic-wise:
            // .or(`and(url_pattern.eq.${scopeUrls.domain},scope.eq.domain),and(url_pattern.eq.${scopeUrls.exact},scope.eq.exact)`)

            const { data, error } = await supabase
                .from('sitecue_notes')
                .select('*')
                .or(`and(url_pattern.eq.${scopeUrls.domain},scope.eq.domain),and(url_pattern.eq.${scopeUrls.exact},scope.eq.exact)`);

            if (error) throw error;

            // ソート: exact -> domain の順
            const sortedNotes = (data || []).sort((a: Note, b: Note) => {
                if (a.scope === b.scope) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                return a.scope === 'exact' ? -1 : 1;
            });

            setNotes(sortedNotes);
        } catch (error) {
            console.error('Failed to fetch notes', error);
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
            const targetUrlPattern = selectedScope === 'domain' ? scopeUrls.domain : scopeUrls.exact;

            const payload = {
                user_id: session.user.id,
                url_pattern: targetUrlPattern,
                content: newNote,
                scope: selectedScope,
                note_type: selectedType
            };

            console.log(`Saving note with:`, payload);

            const { error } = await supabase
                .from('sitecue_notes')
                .insert(payload);

            if (error) throw error;

            toast.success('Cue added');
            setNewNote('');
            fetchNotes();
        } catch (error) {
            console.error('Failed to create note', error);
            toast.error('Failed to create note');
        } finally {
            setSubmitting(false);
        }
    };

    // ✏️ 編集モード開始
    const startEditing = (note: Note) => {
        setEditingId(note.id);
        setEditContent(note.content);
    };

    // ❌ 編集キャンセル
    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    // 💾 更新実行 (PUT)
    const handleUpdate = async (id: string) => {
        if (!editContent.trim()) return;
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('sitecue_notes')
                .update({ content: editContent })
                .eq('id', id);

            if (error) throw error;

            // ローカルのメモ一覧も更新（再取得しなくても画面に反映させる）
            setNotes(notes.map(n => n.id === id ? { ...n, content: editContent } : n));
            setEditingId(null);
            toast.success('Cue updated');
        } catch (error) {
            console.error('Failed to update note', error);
            toast.error('Failed to update note');
        } finally {
            setUpdating(false);
        }
    };

    // 🗑️ 削除実行
    const handleDelete = async (id: string) => {
        if (!window.confirm('このメモを削除しますか？')) return;

        try {
            const { error } = await supabase
                .from('sitecue_notes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // ローカルのstateから除外
            setNotes(notes.filter(note => note.id !== id));
            toast.success('Cue deleted');
        } catch (error) {
            console.error('Failed to delete note', error);
            toast.error('Failed to delete note');
        }
    };

    // ✅ 完了ステータス切り替え
    const handleToggleResolved = async (id: string, currentStatus: boolean | undefined) => {
        // currentStatus might be undefined if not set yet (though DB default is false), treat as false
        const nextStatus = !currentStatus;
        try {
            const { error } = await supabase
                .from('sitecue_notes')
                .update({ is_resolved: nextStatus })
                .eq('id', id);

            if (error) throw error;

            setNotes(notes.map(n => n.id === id ? { ...n, is_resolved: nextStatus } : n));
        } catch (error) {
            console.error('Failed to toggle resolved status', error);
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="w-full h-screen bg-gray-50 flex flex-col font-sans">
            <Toaster position="bottom-center" toastOptions={{
                style: { fontSize: '12px', padding: '8px 12px', borderRadius: '8px', background: '#333', color: '#fff' }
            }} />
            <Header
                url={url}
                domain={currentFullUrl ? getScopeUrls(currentFullUrl).domain : ''}
                session={session}
                onLogout={onLogout}
            />

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No cues found for this site.</p>
                    </div>
                ) : (
                    notes.map((note) => (
                        <div key={note.id} className={`bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow group relative ${note.note_type === 'alert' ? 'border-red-200 bg-red-50/10' : 'border-gray-200'} ${note.is_resolved ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                            {editingId === note.id ? (
                                // ✏️ 編集モード
                                <div className="space-y-2">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[60px]"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={cancelEditing}
                                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleUpdate(note.id)}
                                            disabled={updating}
                                            className="p-1 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                                        >
                                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // 👀 表示モード
                                <>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleToggleResolved(note.id, note.is_resolved)}
                                            className={`mt-0.5 shrink-0 transition-colors ${note.is_resolved ? 'text-gray-500' : 'text-gray-300 hover:text-gray-400'}`}
                                            title={note.is_resolved ? "Mark as unresolved" : "Mark as resolved"}
                                        >
                                            {note.is_resolved ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        </button>
                                        <div className="mt-0.5 shrink-0">
                                            {note.note_type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                            {note.note_type === 'idea' && <Lightbulb className="w-4 h-4 text-yellow-500" />}
                                            {(note.note_type === 'info' || !note.note_type) && <Info className="w-4 h-4 text-blue-500" />}
                                        </div>
                                        <div className={`text-sm text-gray-800 whitespace-pre-wrap pr-6 flex-1 ${note.is_resolved ? 'line-through text-gray-500' : ''}`}>{note.content}</div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-2 flex justify-between items-center pl-6">
                                        <span className={`px-1.5 py-0.5 rounded ${note.scope === 'exact' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {note.scope === 'exact' ? 'Page' : 'Domain'}
                                        </span>
                                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                                    </div>

                                    {/* アクションボタン (ホバー時に出現) */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => startEditing(note)}
                                            className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full"
                                            title="Edit"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(note.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                {/* スコープ選択 */}
                <div className='flex items-center justify-between'>
                    <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 hover:text-black">
                            <input
                                type="radio"
                                name="scope"
                                checked={selectedScope === 'domain'}
                                onChange={() => setSelectedScope('domain')}
                                className="text-black focus:ring-black"
                            />
                            <span>Domain</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 hover:text-black">
                            <input
                                type="radio"
                                name="scope"
                                checked={selectedScope === 'exact'}
                                onChange={() => setSelectedScope('exact')}
                                className="text-black focus:ring-black"
                            />
                            <span>This Page</span>
                        </label>
                    </div>

                    {/* Note Type Selection */}
                    <div className="flex bg-gray-100 p-0.5 rounded-md">
                        <button
                            type="button"
                            onClick={() => setSelectedType('info')}
                            className={`p-1 rounded ${selectedType === 'info' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Info"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('alert')}
                            className={`p-1 rounded ${selectedType === 'alert' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Alert"
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('idea')}
                            className={`p-1 rounded ${selectedType === 'idea' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Idea"
                        >
                            <Lightbulb className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder={`Add a cue to ${selectedScope === 'domain' ? 'this domain' : 'this page'}...`}
                        className="flex-1 resize-none border border-gray-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[40px] max-h-[100px]"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />
                    <button
                        disabled={submitting || !newNote.trim()}
                        type="submit"
                        className="bg-black text-white p-2 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>
    );
}