export const getCurrentUrl = async (): Promise<string | null> => {
    // 1. Chrome拡張機能として動いている場合
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0]?.url || null;
    }

    // 2. ローカル開発（Webブラウザ）の場合
    // テスト用に現在のURL、または固定のダミーURLを返す
    return window.location.href;
    // return "https://example.com/test-page"; // 特定のURLでテストしたい場合はこちら
};

/**
 * URLからプロトコルを除去し、スコープに応じた形式に変換する
 */
export const normalizeUrl = (url: string, scope: 'domain' | 'exact'): string => {
    try {
        const u = new URL(url);
        if (scope === 'domain') {
            return u.hostname;
        } else {
            // exact: schemaを除去し、パスとクエリを保持
            // 例: https://example.com/path?q=1 -> example.com/path?q=1
            return u.hostname + u.pathname + u.search;
        }
    } catch (e) {
        // URL解析に失敗した場合はそのまま返す（または適宜ハンドリング）
        return url.replace(/^https?:\/\//, '');
    }
};

/**
 * 現在のURLから、検索対象となる全てのURLパターンを取得する
 */
export const getScopeUrls = (currentUrl: string): { domain: string, exact: string } => {
    return {
        domain: normalizeUrl(currentUrl, 'domain'),
        exact: normalizeUrl(currentUrl, 'exact')
    };
};