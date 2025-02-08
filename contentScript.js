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

          setTimeout(() => {
            const checkBtn = document.querySelector(".check-btn");

            if (checkBtn) {
              checkBtn.click();
            }
          }, 500);
        }
      });
    }

    showFlashMessage(message, duration, type = "success") {
      const flashDiv = document.createElement("div");
      const contentContainer = document.createElement("div");
      const messageText = document.createElement("div");
      const durationText = document.createElement("div");

      const styles = {
        position: "fixed",
        top: "15%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        padding: "12px 24px",
        borderRadius: "8px",
        color: "white",
        zIndex: "10000",
        animation: "slideIn 0.5s ease-out",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "14px",
        fontWeight: "500",
      };

      const containerStyles = {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      };

      const durationStyles = {
        fontSize: "12px",
        fontStyle: "italic",
        opacity: "0.9",
      };

      const colors = {
        success: "#4CAF50",
        error: "#F44336",
      };

      Object.assign(flashDiv.style, styles);
      Object.assign(contentContainer.style, containerStyles);
      Object.assign(durationText.style, durationStyles);

      flashDiv.style.backgroundColor = colors[type];
      messageText.textContent = message;
      durationText.textContent = `Diperiksa dalam: ${duration.toFixed(
        2
      )} detik`;
      contentContainer.appendChild(messageText);
      contentContainer.appendChild(durationText);
      flashDiv.appendChild(contentContainer);

      // Add animation keyframes
      const styleSheet = document.createElement("style");
      styleSheet.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styleSheet);
      document.body.appendChild(flashDiv);

      setTimeout(() => {
        flashDiv.style.animation = "slideIn 0.5s ease-out reverse";
        setTimeout(() => flashDiv.remove(), 500);
      }, 5000);
    }

    // Blur tweet content
    blurringContent(TweetExplanation) {
      const maxRetries = 5;
      const retryInterval = 500;
      let retryCount = 0;

      const tryBlurring = () => {
        const content = Array.from(
          document.getElementsByClassName("css-175oi2r r-12kyg2d")
        ).find((el) => el.classList.length === 2).parentElement.parentElement;

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

            .content-container {
              background-color: rgba(0, 0, 0, 0.7);
              width: 90%;
              padding: 20px;
              border-radius: 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .show-tweet-button {
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
            const explanationText = document.createElement("p");
            const contentContainer = document.createElement("div");
            const showTweetButton = document.createElement("button");
            censorOverlay = document.createElement("div");

            censorOverlay.className = "censored";
            contentContainer.className = "content-container";
            explanationText.className = "tweet-explanation";
            showTweetButton.textContent = "Lihat Tweet";
            showTweetButton.className = "show-tweet-button";
            showTweetButton.addEventListener("click", () => {
              censorOverlay.style.display = "none";
            });
            explanationText.textContent =
              typeof TweetExplanation === "object"
                ? TweetExplanation.explanation
                : TweetExplanation;
            contentContainer.appendChild(explanationText);
            contentContainer.appendChild(showTweetButton);
            censorOverlay.appendChild(contentContainer);
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
      const prompt = `buat maksimum dua keywords dari kalimat atau paragraf berikut: "${text}" dalam bahasa indonesia, buat keywords saja tanpa penjelasan apapun, hanya keywords saja`;

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
      const proxyUrl = "https://hoax-detection-proxy.glitch.me";
      const API_KEY = this.TURNBACKHOAX_API_KEY;
      const SEARCH_FIELD_OPTION = "tags";
      let allData = [];

      try {
        for (const keyword of keywords) {
          const keywordApiUrl = `https://yudistira.turnbackhoax.id/Antihoax/${SEARCH_FIELD_OPTION}/${encodeURIComponent(
            keyword
          )}/${API_KEY}`;
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
        console.error(`Error fetching data from Turnbackhoax API: ${error}`);
        throw new Error(
          `Failed to fetch data from Turnbackhoax API: ${error.message}`
        );
      }
    }

    // analyze respons from fetchturnbackhoax and tweet text, using gpt model
    async analyzeHoaxResponse(turnbackhoaxResponse, tweetText) {
      try {
        console.log("Turnbackhoax response:", turnbackhoaxResponse);

        const promtSystem =
          "Anda adalah asisten pengecekan fakta. Analisis konten dan berikan probabilitas berdasarkan bukti yang ditemukan dalam database turnbackhoax dan gaya penulisan. Jika ditemukan kecocokan dalam database atau terdeteksi gaya penulisan yang mencurigakan, tingkatkan probabilitas hoax.";
        const promtUser = `analisis tweet ini: "${tweetText}"
bandingkan informasi dari tweet dengan respon dari turnbackhoax berikut: "${turnbackhoaxResponse}"

Tugas:
1. Periksa apakah konten tweet cocok dengan respon dari turnbackhoax
2. Analisis gaya penulisan untuk tanda-tanda misinformasi (HURUF KAPITAL, tanda baca berlebihan, bahasa yang sensasional)
3. Evaluasi kredibilitas berdasarkan kecocokan konten dan gaya penulisan
4. Berikan penjelasan detail dalam bahasa Indonesia

Aturan Penilaian:
- Jika ditemukan kecocokan informasi antara tweet dengan respon turnbackhoax: probabilitas hoax > 0.8
- Jika tidak ada kecocokan informasi antara tweet dengan respon turnbackhoax tapi gaya penulisan menunjukkan beberapa tanda mencurigakan: probabilitas hoax 0.4-0.7
- Jika tidak ada kecocokan informasi dan gaya penulisan terlihat kredibel: probabilitas hoax < 0.4

Format JSON Response yang Dibutuhkan:
{
  "hoax": (probabilitas antara 0-1),
  "non_hoax": (harus 1 - probabilitas hoax),
  "explanation": "(penjelasan dalam Bahasa Indonesia mengapa tweet tersebut hoax atau tidak berdasarkan analisis (berikan klarifikasi penjelasan dari respon turnbackhoax jika ada, jika tidak ada tidak perlu memberikan informasi tambahan))"
}`;

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

        // validate probabilities if the sum of probabilities is not 1.0
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
      const startTime = performance.now();
      const tweetContent = [
        ...Array.from(
          document.getElementsByClassName("css-175oi2r r-12kyg2d")
        ).find((el) => el.classList.length === 2).parentElement.children,
      ].filter(
        (child) =>
          child !==
            Array.from(
              document.getElementsByClassName("css-175oi2r r-12kyg2d")
            ).find((el) => el.classList.length === 2) &&
          child.classList.contains("css-175oi2r")
      )[0].firstChild.firstChild.textContent;
      // let text = "";

      if (!tweetContent) {
        console.error("No content found.");
        return;
      }

      // if (contentTweet.children.length === 1) {
      //   text = contentTweet.children[0].textContent;
      // } else if (contentTweet.children.length > 1) {
      //   text = Array.from(contentTweet.children)
      //     .map((e) => e.textContent)
      //     .join(" ");
      // }

      // logic to check the tweet content
      try {
        const keywords = await this.generateKeywords(tweetContent);
        console.log(`Keywords: ${keywords}`);
        const hoaxResponse = await this.fetchTurnbackhoaxAPI(keywords);
        console.log(`Response from hoax API: ${hoaxResponse.length}`);
        const analysisResult = await this.analyzeHoaxResponse(
          hoaxResponse,
          tweetContent
        );

        const endTime = performance.now();
        const executionTime = (endTime - startTime) / 1000;

        // check if the analysis result is hoax or not
        if (analysisResult.hoax > 0.7) {
          // 4.1 if the tweet is hoax, add the tweet to the bookmark, blurr the tweet and show the analysis result
          console.log(
            `Tweet is hoax with probability: ${
              analysisResult.hoax
            } and explanation: ${
              analysisResult.explanation
            } in ${executionTime.toFixed(2)} seconds`
          );
          this.addHoaxTweetToBookmark(tweetContent, analysisResult.explanation);
          this.blurringContent(analysisResult);
          this.showFlashMessage(
            analysisResult.explanation,
            executionTime,
            "error"
          );
        } else {
          // 4.2 if not, show popup message that the tweet is not hoax
          this.showFlashMessage(
            analysisResult.explanation,
            executionTime,
            "success"
          );
          console.log(
            `Tweet is not hoax with probability: ${
              analysisResult.hoax
            } and explanation: ${
              analysisResult.explanation
            } in ${executionTime.toFixed(2)} seconds`
          );
        }
      } catch (err) {
        const endTime = performance.now();
        const executionTime = (endTime - startTime) / 1000;
        console.error("Error during tweet analysis:", err);
        this.showFlashMessage(
          "Terjadi kesalahan saat memeriksa tweet",
          executionTime,
          "error"
        );
      }
    }

    // Add "Periksa" button when the tweet is loaded
    async tweetLoaded() {
      const checkBtnExists = document.getElementsByClassName("check-btn")[0];
      // check if tweet is contain hoax or not
      try {
        this.clearAllData();
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
        const loadingSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="20" height="20" style="shape-rendering: auto; display: block;">
    <g>
      <path stroke="none" fill="#171717" d="M23 50A27 27 0 0 0 77 50A27 30.1 0 0 1 23 50">
        <animateTransform values="0 50 51.55;360 50 51.55" keyTimes="0;1" repeatCount="indefinite" dur="1s" type="rotate" attributeName="transform"></animateTransform>
      </path>
    </g>
  </svg>
`;

        let styleSheet = document.createElement("style");
        let twitterOptions = Array.from(
          document.getElementsByClassName("css-175oi2r r-12kyg2d")
        ).find((el) => el.classList.length === 2).parentElement.parentElement
          .children[1].children[1].children[0].children[0].children[1]
          .children[0];

        checkBtn.textContent = "Periksa";
        checkBtn.className = "tweet-btn check-btn";
        checkBtn.title = "Klik untuk periksa tweet";

        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);

        if (twitterOptions) {
          twitterOptions.insertBefore(checkBtn, twitterOptions.firstChild);
          checkBtn.addEventListener("click", async () => {
            checkBtn.disabled = true;
            checkBtn.innerHTML = loadingSvg;
            await this.checkingTweet();
            checkBtn.textContent = "Periksa";
            checkBtn.disabled = false;
          });
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
