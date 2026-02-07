import { supabase } from './supabaseClient';

// Enable side panel on action click
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error(error));

console.log("SiteCue background script loaded.");

// --- Helper Functions ---

/**
 * Normalizes the URL to match the 'domain' or 'exact' scope in DB.
 * returns { hostname, fullPath }
 */
function getNormalizedUrl(url: string): { hostname: string; fullPath: string } | null {
    try {
        const u = new URL(url);
        if (!['http:', 'https:'].includes(u.protocol)) return null;

        // hostname: github.com
        const hostname = u.hostname;

        // fullPath: github.com/user/repo?q=1
        // (Removing protocol)
        const fullPath = `${u.hostname}${u.pathname}${u.search}`;

        return { hostname, fullPath };
    } catch (e) {
        return null; // Invalid URL
    }
}

/**
 * Fetches note count for the current URL and updates the badge.
 */
async function updateBadge(tabId: number, url: string) {
    const normalized = getNormalizedUrl(url);
    if (!normalized) {
        // Clear badge if not a valid HTTP/HTTPS URL
        await chrome.action.setBadgeText({ tabId, text: "" });
        return;
    }

    const { hostname, fullPath } = normalized;

    try {
        // We need to check for notes that match EITHER:
        // 1. scope = 'domain' AND url_pattern = hostname
        // 2. scope = 'exact' AND url_pattern = fullPath
        // AND user_id matches current user (handled by RLS automatically if session exists)

        // Supabase query:
        // select count(*) from sitecue_notes where (scope = 'domain' and url_pattern = hostname) or (scope = 'exact' and url_pattern = fullPath)

        // Since we can't easily do complex ORs with .eq() syntax on the same column in one go without raw filters,
        // let's try the .or() syntax.

        // Filter: (scope.eq.domain,url_pattern.eq.{hostname}),(scope.eq.exact,url_pattern.eq.{fullPath})
        const orQuery = `and(scope.eq.domain,url_pattern.eq.${hostname}),and(scope.eq.exact,url_pattern.eq.${fullPath})`;

        const { count, error } = await supabase
            .from('sitecue_notes')
            .select('*', { count: 'exact', head: true }) // head: true means we only want count, not data
            .eq('is_resolved', false)
            .or(orQuery);

        if (error) {
            console.error("Error fetching note count:", error);
            // If auth error, maybe clear badge or show '?'
            await chrome.action.setBadgeText({ tabId, text: "" });
            return;
        }

        const countStr = count && count > 0 ? count.toString() : "";
        await chrome.action.setBadgeText({ tabId, text: countStr });
        if (count && count > 0) {
            await chrome.action.setBadgeBackgroundColor({ tabId, color: '#3B82F6' }); // Blue
            await chrome.action.setBadgeTextColor({ tabId, color: '#FFFFFF' }); // White
        }

    } catch (err) {
        console.error("Unexpected error in updateBadge:", err);
        await chrome.action.setBadgeText({ tabId, text: "" });
    }
}

// --- Event Listeners ---

// 1. Tab Activated (Switched)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
        updateBadge(activeInfo.tabId, tab.url);
    }
});

// 2. Tab Updated (Navigated/Reloaded)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // We can update when status is 'loading' or 'complete'. 
    // 'status' change happens often. 'url' change happens on nav.
    if (changeInfo.url || changeInfo.status === 'complete') {
        if (tab.url) {
            updateBadge(tabId, tab.url);
        }
    }
});

// 3. Message from Side Panel (Note created/deleted)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'REFRESH_BADGE') {
        // Refresh badge for the active tab (or all relevant tabs, but active is most important)
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0 && tabs[0].id && tabs[0].url) {
                updateBadge(tabs[0].id, tabs[0].url);
            }
        });

        // Also handy to return something
        sendResponse({ status: 'ok' });
    }
});
