'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type Note = {
  id: string;
  content: string;
  url_pattern: string;
  created_at: string;
  note_type?: 'info' | 'alert' | 'idea';
};

function WeaveUIInner({ initialNotes }: { initialNotes: Note[] }) {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get('url');

  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(() => {
    if (!urlParam) return new Set();
    return new Set(
      initialNotes
        .filter((note) => note.url_pattern === urlParam)
        .map((note) => note.id)
    );
  });
  const [filterType, setFilterType] = useState<"All" | "info" | "alert" | "idea">("All");
  const [format, setFormat] = useState<'markdown' | 'plaintext'>('markdown');
  const [isLoading, setIsLoading] = useState(false);
  const [resultMarkdown, setResultMarkdown] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchUsageCount() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      
      const { data, error } = await supabase
        .from('sitecue_profiles')
        .select('ai_usage_count')
        .eq('id', session.user.id)
        .single();
        
      if (!error && data) {
        setUsageCount(data.ai_usage_count || 0);
      } else {
        setUsageCount(0);
      }
    }
    fetchUsageCount();
  }, []);

  // 指定されたURLがなければ空、あればフィルタリング
  const urlFilteredNotes = urlParam 
    ? initialNotes.filter((note) => note.url_pattern === urlParam)
    : [];

  const displayNotes = urlFilteredNotes.filter((note) => {
    if (filterType === 'All') return true;
    return (note.note_type || 'info') === filterType;
  });

  const handleNoteToggle = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const handleGenerate = async () => {
    if (selectedNoteIds.size === 0) return;

    setIsLoading(true);
    setError(null);
    setResultMarkdown('');

    const contexts = displayNotes
      .filter((note) => selectedNoteIds.has(note.id))
      .map((note) => ({
        url: note.url_pattern,
        content: note.content,
      }));

    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setError('ログインセッションの取得に失敗しました。再度ログインしてください。');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788';
      const response = await fetch(`${apiUrl}/ai/weave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ contexts, format }),
      });

      if (response.status === 403) {
        setError('無料枠の上限（3回）に達しました。');
        return;
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setResultMarkdown(data.result || '');
      setUsageCount(prev => (prev !== null ? prev + 1 : 1));
    } catch (err: any) {
      console.error('Failed to weave ideas:', err);
      setError('アイデアの錬成に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left Pane: Notes List */}
      <div className="w-full lg:w-1/2 flex flex-col h-[calc(100vh-200px)]">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          Select Context 
          {urlParam && (
            <span className="text-sm text-gray-500 font-normal ml-2 truncate" title={urlParam}>
              from {urlParam}
            </span>
          )}
        </h2>
        
        {urlParam && (
          <div className="flex space-x-2 mb-4">
            {(['All', 'info', 'alert', 'idea'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filterType === type
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 overflow-y-auto p-4 space-y-3">
          {!urlParam ? (
             <div className="text-center py-8 text-gray-500">
               URLが指定されていません。拡張機能からWeaveページを開いてください。
             </div>
          ) : displayNotes.length > 0 ? (
            displayNotes.map((note) => (
              <label 
                key={note.id} 
                className={`block border rounded-md p-4 cursor-pointer transition-colors ${
                  selectedNoteIds.has(note.id) 
                    ? 'border-black bg-gray-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-black rounded border-gray-300 focus:ring-black"
                      checked={selectedNoteIds.has(note.id)}
                      onChange={() => handleNoteToggle(note.id)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        (note.note_type || 'info') === 'alert' ? 'bg-red-100 text-red-800' :
                        (note.note_type || 'info') === 'idea' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {(note.note_type || 'info').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                </div>
              </label>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              このURLに関連するメモがありません。
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Generator */}
      <div className="w-full lg:w-1/2 flex flex-col h-[calc(100vh-200px)]">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Weave Ideas</h2>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 flex flex-col h-full">
          
          <div className="mb-6">
            <span className="block text-sm font-medium text-gray-700 mb-3">
              Output Format
            </span>
            <div className="flex space-x-6">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="format"
                  value="markdown"
                  checked={format === 'markdown'}
                  onChange={() => setFormat('markdown')}
                  className="h-4 w-4 text-black border-gray-300 focus:ring-black cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-700 group-hover:text-black">Markdown</span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="format"
                  value="plaintext"
                  checked={format === 'plaintext'}
                  onChange={() => setFormat('plaintext')}
                  className="h-4 w-4 text-black border-gray-300 focus:ring-black cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-700 group-hover:text-black">Plain Text</span>
              </label>
            </div>
          </div>
          
          <div className="mb-6">
            <button
              onClick={handleGenerate}
              disabled={selectedNoteIds.size === 0 || isLoading || (usageCount !== null && usageCount >= 3)}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ✨ 錬成中... (Generating...)
                </>
              ) : (
                '✨ 錬成する（Generate）'
              )}
            </button>
            <div className="mt-2 h-4 flex items-center justify-center">
              {usageCount !== null && !isLoading && (
                <p className="text-xs text-gray-400 font-light">Free tier: {usageCount} / 3 uses</p>
              )}
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 bg-gray-50 rounded-md border border-gray-100 p-4 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm">アイデアを錬成しています...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-red-500 text-center px-4">
                  {error}
                </p>
              </div>
            ) : resultMarkdown ? (
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
                {resultMarkdown}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400 text-center">
                  生成結果がここに表示されます。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WeaveUI({ initialNotes }: { initialNotes: Note[] }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">読み込み中...</div>}>
      <WeaveUIInner initialNotes={initialNotes} />
    </Suspense>
  );
}
