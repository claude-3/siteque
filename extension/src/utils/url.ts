export interface TabInfo {
    url: string | null;
    title: string | null;
}

export const getCurrentTabInfo = async (): Promise<TabInfo> => {
    // 1. Chrome拡張機能として動いている場合
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return {
            url: tabs[0]?.url || null,
            title: tabs[0]?.title || null
        };
    }

    // 2. ローカル開発（Webブラウザ）の場合
    return {
        url: window.location.href,
        title: document.title
    };
};

export const getCurrentUrl = async (): Promise<string | null> => {
    const info = await getCurrentTabInfo();
    return info.url;
};

/**
 * URLからプロトコルを除去し、スコープに応じた形式に変換する
 */
export const normalizeUrl = (url: string, scope: 'domain' | 'exact'): string => {
    try {
        const u = new URL(url);
        if (scope === 'domain') {
            return u.host;
        } else {
            // exact: schemaを除去し、パスとクエリを保持
            // 例: https://example.com/path?q=1 -> example.com/path?q=1
            return u.host + u.pathname + u.search;
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