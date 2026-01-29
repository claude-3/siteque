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