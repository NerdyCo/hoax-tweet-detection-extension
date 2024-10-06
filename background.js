chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    /x\.com\/[^\/]+\/status\/\d+/.test(tab.url)
  ) {
    const parts = tab.url.split("/");
    const lastPart = parts[parts.length - 1];

    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["contentScript.js"],
      })
      .then(() => {
        chrome.tabs.sendMessage(tabId, {
          message: "TabUpdated",
          tweetId: lastPart,
          angka: 0,
        });
      })
      .catch((error) => console.error("Script execution failed:", error));
  }
});
