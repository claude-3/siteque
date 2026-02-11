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
        // We MUST quote the values to handle special characters like commas.
        const orQuery = `and(scope.eq.domain,url_pattern.eq."${hostname}"),and(scope.eq.exact,url_pattern.eq."${fullPath}")`;

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
    } else if (message.type === 'TEST_SESSION_REFRESH') {
        // Trigger manual session refresh test
        (self as any).testSessionRefresh?.();
        sendResponse({ status: 'test_started' });
    }
});

// --- Session Auto-Refresh & Monitoring ---

/**
 * Checks if the current session is close to expiring (within 5 minutes)
 * and refreshes it if necessary.
 */
async function checkSession() {
    console.log("[Session Check] Checking session status...");
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        console.log("[Session Check] No active session.");
        return;
    }

    const expiresAt = session.expires_at || 0; // unix timestamp in seconds
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = expiresAt - now;

    console.log(`[Session Check] Expires in: ${timeRemaining}s`);

    // If expires in less than 5 minutes (300s), refresh it
    if (timeRemaining < 300) {
        console.log("[Session Check] Session expiring soon... Refreshing...");
        const { data, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
            console.error("[Session Check] Refresh failed:", refreshError);
        } else {
            console.log("[Session Check] Session successfully refreshed!", data.session?.expires_at);
        }
    }
}

// Monitor auth state changes (Logging)
supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[Auth Debug] Event: ${event}`);
    if (session) {
        const expiresAt = new Date((session.expires_at || 0) * 1000).toLocaleString();
        console.log(`[Auth Debug] Session expires at: ${expiresAt}`);
    }
});

// Run checkSession every 1 minute
setInterval(checkSession, 60 * 1000);

/**
 * Manually trigger a session refresh test.
 * call this from the DevTools console: chrome.runtime.sendMessage({ type: 'TEST_SESSION_REFRESH' })
 */
(self as any).testSessionRefresh = async () => {
    console.log("[Test] Starting session refresh test...");

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        console.error("[Test] No active session to test with.", error);
        return;
    }

    // 1. Set a fake session that expires in 5 seconds
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const newExpiresAt = currentTimestamp + 5;

    const fakeExpiringSession = {
        ...session,
        expires_at: newExpiresAt,
        expires_in: 5
    };

    console.log(`[Test] Setting local session to expire in 5 seconds (${new Date(newExpiresAt * 1000).toLocaleString()})...`);

    // Apply the fake session locally
    const { error: setErrors } = await supabase.auth.setSession(fakeExpiringSession);

    if (setErrors) {
        console.error("[Test] Failed to set expiring session:", setErrors);
        return;
    }

    console.log("[Test] Wrapper session set. Waiting for auto-refresh...");

    // 2. Force the check to run after 6 seconds (to simulate the interval hitting)
    setTimeout(() => {
        console.log("[Test] 6 seconds passed. Forcing checkSession()...");
        checkSession();
    }, 6000);
};