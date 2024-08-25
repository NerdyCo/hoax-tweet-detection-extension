chrome.tabs.onUpdated.addListener((tabId, tab) => {
  if (tab.url && /x\.com\/[^\/]+\/status\/\d+/.test(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["contentScript.js"],
    });
  }
});
