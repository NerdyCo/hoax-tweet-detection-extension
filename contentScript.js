(function () {
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

    // Create keywords generator using gpt api with gpt 3.5 model that receives text as input
    async generateKeywords(text) {
      const apiKey = "your-api-key";
      const prompt = `Generate keywords for the following text: ${text}`;

      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo-0125",
              messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
              max_tokens: 50,
              n: 1,
              temperature: 0.5,
            }),
          }
        );

        const data = await response.json();
        const keywords = data.choices[0].message.content.trim();
        console.log("Generated Keywords:", keywords);

        return keywords;
      } catch (error) {
        console.error("Error generating keywords:", error);
      }
    }
    // Fetch data from Turnbackhoax API
    async fetchTurnbackhoaxAPI(text) {
      const proxyUrl = "http://localhost:3000/proxy";
      const API_KEY = "99a3f08eeedadb6f32b9d7c3d96580c1";
      const SEARCH_FIELD_OPTION = "content";
      const apiUrl = `https://yudistira.turnbackhoax.id/Antihoax/${SEARCH_FIELD_OPTION}/${text}/${API_KEY}`;

      try {
        const response = await fetch(
          `${proxyUrl}?url=${encodeURIComponent(apiUrl)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data);

        return data;
      } catch (error) {
        console.error(`Error fetching data: ${error}`);
        throw error;
      }
    }

    // analyze respons from fetchturnbackhoax and tweet text using gpt model
    async analyzeHoaxResponse(turnbackhoaxResponse, tweetText) {
      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a fact-checking assistant. Analyze the tweet content and the response from the hoax database to determine if the tweet contains misinformation.",
                },
                {
                  role: "user",
                  content: `Tweet content: ${tweetText}\nHoax database response: ${JSON.stringify(
                    turnbackhoaxResponse
                  )}\nPlease analyze if this tweet contains misinformation based on the database response.`,
                },
              ],
              max_tokens: 150,
              n: 1,
              temperature: 0.3,
            }),
          }
        );

        const data = await response.json();
        const analysis = data.choices[0].message.content.trim();
        console.log("Hoax Analysis:", analysis);

        return analysis;
      } catch (error) {
        console.error("Error analyzing hoax response:", error);
        throw error;
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
      const contentTweet = document.querySelector(
        'div[data-testid="tweetText"]'
      );
      let text = "";

      if (contentTweet) {
        if (contentTweet.children.length === 1) {
          text = contentTweet.children[0].innerHTML;
        } else if (contentTweet.children.length > 1) {
          text = Array.from(contentTweet.children)
            .map((e) => e.textContent)
            .join(" ");
        }
        this.addHoaxTweetToBookmark(text);
      } else {
        console.error("No content found.");
      }
    }
    // Add "Periksa" button when the tweet is loaded
    async tweetLoaded() {
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

    // make function that remove all chrome storage's data
    async clearAllData() {
      try {
        await new Promise((resolve, reject) => {
          chrome.storage.sync.clear(() => {
            chrome.runtime.lastError
              ? reject(chrome.runtime.lastError)
              : resolve();
          });
        });
        console.log("All data cleared successfully");
      } catch (error) {
        console.error("Error clearing data:", error);
      }
    }
  }

  new TweetInspector();
})();
