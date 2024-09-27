(() => {
  const contentTweet = document.querySelector('div[data-testid="tweetText"]');
  let text = "";
  let twitterOptions = [];

  // Function to blur tweet content
  const blurringContent = () => {
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
  };

  // Add hoax tweet to bookmark
  const addHoaxTweetToBookmark = () => {
    const newBookmark = {
      link: window.location.href,
      isHoaxTweet: true,
    };
    // TODO: Logic to store the bookmark
  };

  // Check the content of the tweet
  const checkingTweet = () => {
    if (contentTweet.children.length === 1) {
      text = contentTweet.children[0].innerHTML;
    } else if (contentTweet.children.length > 1) {
      text = Array.from(contentTweet.children)
        .map((e) => e.textContent)
        .join(" ");
    } else {
      console.log("No content found.");
    }

    console.log(text);
    blurringContent();
  };

  // Add "Periksa" button when tweet is loaded
  const tweetLoaded = async () => {
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

      checkBtn.textContent = "Periksa";
      checkBtn.className = "tweet-btn check-btn";
      checkBtn.title = "Klik untuk periksa tweet";

      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);

      twitterOptions = document.getElementsByClassName(
        "css-175oi2r r-1awozwy r-18u37iz r-1cmwbt1 r-1wtj0ep"
      );

      if (twitterOptions.length > 0) {
        twitterOptions[0].insertBefore(checkBtn, twitterOptions[0].firstChild);
        checkBtn.addEventListener("click", checkingTweet);
      } else {
        console.log("Element not found");
      }
    }
  };

  tweetLoaded();
})();
