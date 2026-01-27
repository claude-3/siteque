// Enable side panel on action click
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error(error));

console.log("SiteCue background script loaded.");
