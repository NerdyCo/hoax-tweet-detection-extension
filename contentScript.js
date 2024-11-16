class TweetInspector {
  constructor() {
    this.currentTweet = "";
    this.currentTweetBookmarks = [];
    this.init();
  }

  init() {
    chrome.runtime.onMessage.addListener((obj, sender, response) => {
      const { message, tweetId } = obj;

      if (message === "TabUpdated" && tweetId !== this.currentTweet) {
        this.currentTweet = tweetId;

        setTimeout(() => {
          this.tweetLoaded();
        }, 300);
      }
    });
  }

  // Blur tweet content
  blurringContent() {
    const content = document.getElementsByClassName(
      "css-175oi2r r-1igl3o0 r-qklmqi r-1adg3ll r-1ny4l3l"
    )[0];

    const styles = `
      .censored {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        text-align: center;
        z-index: 10;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.18);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      
      .censor-btn {
        background-color: white;
        color: black;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 14px;
        font-family: sans-serif;
        font-weight: bold;
      }
    `;

    let censorOverlay = content.querySelector(".censored");
    let styleSheet = document.createElement("style");

    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    if (!censorOverlay) {
      const censorButton = document.createElement("button");
      censorOverlay = document.createElement("div");

      censorOverlay.className = "censored";
      censorButton.className = "censor-btn";
      censorButton.textContent = "Lihat Tweet";

      censorButton.addEventListener("click", () => {
        content.removeChild(censorOverlay);
      });

      censorOverlay.appendChild(censorButton);
      content.style.position = "relative";
      content.appendChild(censorOverlay);
    }
  }

  // Fetch bookmarks from Chrome storage
  fetchBookmarks() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get("tweetLink", (obj) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(obj.tweetLink ? JSON.parse(obj.tweetLink) : []);
        }
      });
    });
  }

  // Fetch data from Turnbackhoax API
  async fetchTurnbackhoaxAPI(text) {
    const API_KEY = "99a3f08eeedadb6f32b9d7c3d96580c1";
    const SEARCH_FIELD_OPTION = "content";
    const url = `https://yudistira.turnbackhoax.id/Antihoax/${SEARCH_FIELD_OPTION}/${text}/${API_KEY}`;

    try {
      let response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.text}`);
      }

      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(`Error fetching data: ${error}`);
    }
  }

  // Add hoax tweet to bookmarks
  async addHoaxTweetToBookmark(tweetContent) {
    const newBookmark = {
      link: window.location.href,
      isHoaxTweet: true,
      currentTweetId: this.currentTweet,
      tweetContent: tweetContent,
    };

    try {
      this.currentTweetBookmarks = await this.fetchBookmarks();
      console.log(this.currentTweetBookmarks);

      await new Promise((resolve, reject) => {
        chrome.storage.sync.set(
          {
            tweetLink: JSON.stringify(
              [...this.currentTweetBookmarks, newBookmark].sort((a, b) =>
                a.link.localeCompare(b.link)
              )
            ),
          },
          () => {
            chrome.runtime.lastError
              ? reject(chrome.runtime.lastError)
              : resolve();
          }
        );
      });

      console.log("Bookmark added successfully");
    } catch (err) {
      console.error(`Error adding bookmark: ${err.message}`);
    }
  }

  // Check the content of the tweet
  checkingTweet() {
    const contentTweet = document.querySelector('div[data-testid="tweetText"]');
    let text = "";

    if (contentTweet && contentTweet.children.length === 1) {
      text = contentTweet.children[0].innerHTML;
    } else if (contentTweet && contentTweet.children.length > 1) {
      text = Array.from(contentTweet.children)
        .map((e) => e.textContent)
        .join(" ");
    } else {
      console.error("No content found.");
    }

    this.addHoaxTweetToBookmark(text);
  }

  // Add "Periksa" button when the tweet is loaded
  tweetLoaded() {
    const checkBtnExists = document.getElementsByClassName("check-btn")[0];

    if (!checkBtnExists) {
      console.log("Check button created");

      const checkBtn = document.createElement("button");
      const styles = `
        .tweet-btn.check-btn {
          background-color: white;
          color: black;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          font-family: sans-serif;
          font-weight: bold;
        }
      `;

      let styleSheet = document.createElement("style");
      let twitterOptions = document.getElementsByClassName(
        "css-175oi2r r-1awozwy r-18u37iz r-1cmwbt1 r-1wtj0ep"
      )[0];

      checkBtn.textContent = "Periksa";
      checkBtn.className = "tweet-btn check-btn";
      checkBtn.title = "Klik untuk periksa tweet";

      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);

      if (twitterOptions) {
        twitterOptions.insertBefore(checkBtn, twitterOptions.firstChild);
        checkBtn.addEventListener("click", this.checkingTweet.bind(this));
      } else {
        console.error("Element not found");
      }
    }
  }
}

new TweetInspector();
