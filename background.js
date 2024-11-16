class BackgroundScript {
  constructor() {
    this.init();
  }

  init() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });
  }

  // Handle tab updates
  handleTabUpdate(tabId, changeInfo, tab) {
    if (
      changeInfo.status === "complete" &&
      tab.url &&
      /x\.com\/[^\/]+\/status\/\d+/.test(tab.url)
    ) {
      const tweetId = this.extractTweetIdFromUrl(tab.url);
      if (tweetId) {
        this.executeContentScript(tabId, tweetId);
      }
    }
  }

  // Extract tweet ID from URL
  extractTweetIdFromUrl(url) {
    const tweetUrlParts = url.split("/");
    return tweetUrlParts[tweetUrlParts.length - 1];
  }

  // Execute the content script in the updated tab
  executeContentScript(tabId, tweetId) {
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["contentScript.js"],
      })
      .then(() => {
        chrome.tabs.sendMessage(tabId, {
          message: "TabUpdated",
          tweetId: tweetId,
        });
      })
      .catch((error) => console.error("Script execution failed:", error));
  }
}

new BackgroundScript();
