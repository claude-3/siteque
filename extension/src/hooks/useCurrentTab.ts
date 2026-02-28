import { useState, useEffect } from "react";
import { getScopeUrls, getCurrentTabInfo } from "../utils/url";

interface TabChangeInfo {
    url?: string;
}

export function useCurrentTab() {
    const [currentFullUrl, setCurrentFullUrl] = useState<string>("");
    const [url, setUrl] = useState<string>("");
    const [title, setTitle] = useState<string>("");

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

    return {
        currentFullUrl,
        url,
        title,
    };
}
