(() => {
  const contentTweet = document.querySelector('div[data-testid="tweetText"]');
  let text = "";
  let twitterOptions;

  const tweetLoaded = async () => {
    const checkBtnExists = document.getElementsByClassName("check-btn")[0];
    console.log(checkBtnExists);

    if (!checkBtnExists) {
      console.log("check button created");

      const checkBtn = document.createElement("button");

      checkBtn.textContent = "Periksa";
      checkBtn.className = "tweet-btn check-btn";
      checkBtn.title = "Klik untuk periksa tweet";

      checkBtn.style.backgroundColor = "white";
      checkBtn.style.color = "black";
      checkBtn.style.border = "none";
      checkBtn.style.padding = "10px 20px";
      checkBtn.style.borderRadius = "20px";
      checkBtn.style.cursor = "pointer";
      checkBtn.style.fontSize = "14px";
      checkBtn.style.fontFamily = "sans-serif";
      checkBtn.style.fontWeight = "bold";

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

  const checkingTweet = () => {
    // get content(texts) of tweet
    if (contentTweet.children.length == 1) {
      text = contentTweet.children[0].innerHTML;
    } else if (contentTweet.children.length > 1) {
      text = Array.from(contentTweet.children)
        .map((e) => e.textContent)
        .join(" ");
    } else {
      console.log("there is no content");
    }

    console.log(text);
  };

  tweetLoaded();
})();
