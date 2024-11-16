chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    /x\.com\/[^\/]+\/status\/\d+/.test(tab.url)
  ) {
    const tweet_url = tab.url.split("/");
    const tweet_id = tweet_url[tweet_url.length - 1];

    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["contentScript.js"],
      })
      .then(() => {
        chrome.tabs.sendMessage(tabId, {
          message: "TabUpdated",
          tweetId: tweet_id,
        });
      })
      .catch((error) => console.error("Script execution failed:", error));
  }
});
