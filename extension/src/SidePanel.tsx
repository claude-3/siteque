import { useEffect, useState } from 'react';
import axios from 'axios';
import { Send, FileText, Loader2, LogOut } from 'lucide-react';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

const API_BASE = 'http://localhost:8787';

interface Note {
    id: string;
    content: string;
    url_pattern: string;
    created_at: string;
}

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

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
            if (tabs[0]?.url) {
                try {
                    const u = new URL(tabs[0].url);
                    setUrl(u.hostname);
                } catch (e) {
                    setUrl(tabs[0].url);
                }
            }
        });

        const listener = (_tabId: number, changeInfo: TabChangeInfo, tab: chrome.tabs.Tab) => {
            if (tab.active && changeInfo.url) {
                try {
                    const u = new URL(changeInfo.url);
                    setUrl(u.hostname);
                } catch (e) {
                    setUrl(changeInfo.url);
                }
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
        return () => chrome.tabs.onUpdated.removeListener(listener);
    }, []);

    useEffect(() => {
        if (!url) return;
        fetchNotes();
    }, [url]);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/notes`, {
                params: { url },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });
            setNotes(res.data);
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
            await axios.post(`${API_BASE}/notes`, {
                url_pattern: url,
                content: newNote
            }, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });
            setNewNote('');
            fetchNotes();
        } catch (error) {
            console.error('Failed to create note', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full h-screen bg-gray-50 flex flex-col font-sans">
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        SiteCue
                    </h1>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]" title={url}>{url || 'Waiting...'}</p>
                </div>
                <button onClick={onLogout} className="text-gray-400 hover:text-black">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>

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
                        <div key={note.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</div>
                            <div className="text-[10px] text-gray-400 mt-2 text-right">
                                {new Date(note.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a cue..."
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
