(function () {
  if (window.tweetInspectorInitialized) {
    return;
  }
  window.tweetInspectorInitialized = true;

  class TweetInspector {
    constructor() {
      // assigning api keys
      this.OPENAI_API_KEY = "YOUR_OPENAI_API_KEY";
      this.TURNBACKHOAX_API_KEY = "YOUR_TURNBACKHOAX_API_KEY";

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
    blurringContent(TweetExplanation) {
      const maxRetries = 5;
      const retryInterval = 500;
      let retryCount = 0;

      const tryBlurring = () => {
        const content = document.getElementsByClassName(
          "css-175oi2r r-1igl3o0 r-qklmqi r-1adg3ll r-1ny4l3l"
        )[0];

        if (content) {
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
              flex-direction: column;
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
            
            .tweet-explanation {
              margin-bottom: 20px;
              color: #fff;
              font-size: 16px;
              max-width: 80%;
              line-height: 1.4;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
            }

            .black-container {
              background-color: rgba(0, 0, 0, 0.7);
              width: 90%;
              padding: 20px;
              border-radius: 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
          `;

          let censorOverlay = content.querySelector(".censored");
          let styleSheet = document.createElement("style");

          styleSheet.textContent = styles;
          document.head.appendChild(styleSheet);

          if (!censorOverlay) {
            const explanationText = document.createElement("p");
            const blackContainer = document.createElement("div");
            censorOverlay = document.createElement("div");

            censorOverlay.className = "censored";
            blackContainer.className = "black-container";
            explanationText.className = "tweet-explanation";
            explanationText.textContent = TweetExplanation;

            blackContainer.appendChild(explanationText);
            censorOverlay.appendChild(blackContainer);
            content.style.position = "relative";
            content.appendChild(censorOverlay);
          }
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(tryBlurring, retryInterval);
        }
      };

      tryBlurring();
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

    // generate keywords using gpt api with gpt 3.5 model that receives text as input
    async generateKeywords(text) {
      const apiKey = this.OPENAI_API_KEY;
      const prompt = `buat maksimal dua keyword dari kalimat berikut: "${text}" dengan menggunakan bahasa indonesia, langsung saja tidak usah dijelaskan.`;

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
              messages: [{ role: "user", content: prompt }],
              max_tokens: 50,
            }),
          }
        );

        const data = await response.json();
        console.log("response", data);
        const keywords = data.choices[0].message.content
          .trim()
          .split(",")
          .map((keyword) => keyword.trim());

        console.log("keywords", keywords);

        return keywords;
      } catch (error) {
        console.error("Error generating keywords:", error);
      }
    }

    // Fetch data from Turnbackhoax API
    async fetchTurnbackhoaxAPI(keywords) {
      const proxyUrl = "http://localhost:3000/";
      const API_KEY = this.TURNBACKHOAX_API_KEY;
      const SEARCH_FIELD_OPTION = "tags";
      let allData = [];

      try {
        for (const keyword of keywords) {
          const keywordApiUrl = `https://yudistira.turnbackhoax.id/Antihoax/${SEARCH_FIELD_OPTION}/${keyword}/${API_KEY}`;
          const response = await fetch(
            `${proxyUrl}?url=${encodeURIComponent(keywordApiUrl)}`,
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
          allData.push(data);
        }

        const sanitizedData = JSON.parse(JSON.stringify(allData));

        allData = [];
        for (const responseArray of sanitizedData) {
          for (const item of responseArray) {
            allData.push({
              fact: item.fact,
              title: item.title,
            });
          }
        }

        const jsonResult = JSON.parse(
          JSON.stringify(allData, null, 2).replace(/\\[nr]/g, " ")
        );
        return jsonResult;
      } catch (error) {
        console.error(`Error fetching data: ${error}`);
        throw error;
      }
    }

    // analyze respons from fetchturnbackhoax and tweet text, using gpt model
    async analyzeHoaxResponse(turnbackhoaxResponse, tweetText) {
      try {
        const promtSystem =
          "You are a fact-checking assistant. Analyze content and assign probabilities based on evidence found in turnbackhoax database and writing style. If matches found in database or suspicious style detected, increase hoax probability.";
        const promtUser = `Analyze this tweet: "${tweetText}" 
      Compare with turnbackhoax data: ${turnbackhoaxResponse}
      Rules:
      - If matching content found in turnbackhoax: hoax > 0.7
      - If no matches but suspicious style: hoax 0.4-0.7 
      - If no matches and normal style: hoax < 0.4
      Return JSON with:
      {"hoax": (probability 0-1),"non_hoax": (inverse of hoax),"explanation": "(reasoning in Indonesian)"}`;

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model:
                "ft:gpt-3.5-turbo-0125:personal:detecting-hoax-based-writing-style:Ab4A7oWA",
              messages: [
                {
                  role: "system",
                  content: promtSystem,
                },
                {
                  role: "user",
                  content: promtUser,
                },
              ],
              max_tokens: 150,
              n: 1,
              temperature: 0.3,
            }),
          }
        );

        const data = await response.json();
        console.log("Raw GPT response:", data);

        const analysis = JSON.parse(data.choices[0].message.content);
        console.log("Parsed analysis:", analysis);

        // valiate probabilities if the sum of probabilities is not 1.0
        if (analysis.hoax + analysis.non_hoax !== 1.0) {
          console.error("Invalid probabilities - don't sum to 1.0");
          const total = analysis.hoax + analysis.non_hoax;
          analysis.hoax = analysis.hoax / total;
          analysis.non_hoax = analysis.non_hoax / total;
        }

        return analysis;
      } catch (error) {
        console.error("Error analyzing hoax response:", error);
        throw error;
      }
    }

    // Add hoax tweet to bookmarks
    async addHoaxTweetToBookmark(tweetContent, analysisResult) {
      const newBookmark = {
        link: window.location.href,
        currentTweetId: this.currentTweet,
        tweetContent: tweetContent,
        analysisResult: analysisResult,
      };

      try {
        this.currentTweetBookmarks = await this.fetchBookmarks();

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
    async checkingTweet() {
      const contentTweet = document.querySelector(
        'div[data-testid="tweetText"]'
      );
      let text = "";

      if (!contentTweet) {
        console.error("No content found.");
        return;
      }

      if (contentTweet.children.length === 1) {
        text = contentTweet.children[0].innerHTML;
      } else if (contentTweet.children.length > 1) {
        text = Array.from(contentTweet.children)
          .map((e) => e.textContent)
          .join(" ");
      }

      // logic to check the tweet content
      try {
        const keywords = await this.generateKeywords(text);
        console.log(`Keywords: ${keywords}`);
        const hoaxResponse = await this.fetchTurnbackhoaxAPI(keywords);
        console.log(`Response from hoax API: ${hoaxResponse.length}`);
        const analysisResult = await this.analyzeHoaxResponse(
          hoaxResponse,
          text
        );

        // check if the analysis result is hoax or not
        if (analysisResult.hoax > 0.7) {
          // 4.1 if the tweet is hoax, add the tweet to the bookmark, blurr the tweet and show the analysis result
          console.log(
            `Tweet is hoax with probability: ${analysisResult.hoax} and explanation: ${analysisResult.explanation}`
          );
          this.addHoaxTweetToBookmark(text, analysisResult.explanation);
          this.blurringContent(analysisResult);
        } else {
          // 4.2 if not, show popup message that the tweet is not hoax
          console.log(
            `Tweet is not hoax with probability: ${analysisResult.hoax} and explanation: ${analysisResult.explanation}`
          );
          alert(analysisResult.explanation);
        }
      } catch (err) {
        console.error("Error during tweet analysis:", err);
        alert("Terjadi kesalahan saat memeriksa tweet.");
      }
    }

    // Add "Periksa" button when the tweet is loaded
    async tweetLoaded() {
      const checkBtnExists = document.getElementsByClassName("check-btn")[0];

      // check if tweet is contain hoax or not
      try {
        const result = await new Promise((resolve, reject) => {
          chrome.storage.sync.get("tweetLink", (result) => {
            chrome.runtime.lastError
              ? reject(chrome.runtime.lastError)
              : resolve(result);
          });
        });

        if (result.tweetLink) {
          const currentUrl = window.location.href;
          const bookmarks = JSON.parse(result.tweetLink);

          const currentTweetId = currentUrl.split("/status/")[1]?.split("?")[0];

          const found = bookmarks.find((bookmark) => {
            const bookmarkTweetId = bookmark.link
              .split("/status/")[1]
              ?.split("?")[0];
            return bookmarkTweetId === currentTweetId;
          });

          if (found) {
            this.blurringContent(found.analysisResult);
          }
        }
      } catch (err) {
        console.error(`Error checking tweet link: ${err.message}`);
      }

      // if the button doesn't exist, create it
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
