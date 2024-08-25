(() => {
  const content = document.querySelector('div[data-testid="tweetText"]');
  let text = "";

  // get content(texts) of tweet
  if (content.children.length == 1) {
    text = content.children[0].innerHTML;
  } else if (content.children.length > 1) {
    text = Array.from(content.children)
      .map((e) => e.textContent)
      .join(" ");
  } else {
    console.log("there is no content");
  }

  console.log(text);
})();
