import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const customStorageAdapter = {
    getItem: async (key: string) => {
        // Chrome拡張機能の環境かチェック
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const result = await chrome.storage.local.get(key);
            return (result[key] as string) || null;
        }
        // 普通のブラウザ環境なら localStorage を使用
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key);
        }
        return null;
    },
    setItem: async (key: string, value: string) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({ [key]: value });
            return;
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
        }
    },
    removeItem: async (key: string) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.remove(key);
            return;
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
        }
    },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: customStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});