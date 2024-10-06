document.addEventListener("DOMContentLoaded", () => {
  // Get the stored tweetLink
  chrome.storage.sync.get("tweetLink", async (data) => {
    try {
      // Function to get the current tweet bookmarks
      const currentTweetBookmarks = () => {
        return new Promise((resolve, reject) => {
          chrome.storage.sync.get("tweetLink", (obj) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(obj.tweetLink ? JSON.parse(obj.tweetLink) : []);
            }
          });
        });
      };

      // Fetch current tweet bookmarks
      const bookmarks = await currentTweetBookmarks();
      console.log("Bookmarks:", bookmarks);

      // Get the table element
      const table = document.getElementById("list-of-tweet");

      // Clear any existing rows
      table.innerHTML = "";

      if (bookmarks.length === 0) {
        // If not bookmarks are found
        const row = document.createElement("tr");
        const noDataCell = document.createElement("td");

        noDataCell.colSpan = 2;
        noDataCell.textContent = "Belum ada tweet yang di blokir";
        noDataCell.style.textAlign = "center";

        row.appendChild(noDataCell);
        table.append(row);
      } else {
        // If there are tweets in chrome storage then show them
        bookmarks.forEach((bookmark, i) => {
          // Create table row
          const row = document.createElement("tr");
          row.id = `tweet-url-${bookmark.currentTweetId}`;

          // Create table data cell
          const linkCell = document.createElement("td");
          const tweetLink = document.createElement("a");
          tweetLink.href = bookmark.link;
          tweetLink.textContent =
            bookmark.tweetContent.length > 30
              ? bookmark.tweetContent.substring(0, 30) + "..."
              : bookmark.tweetContent;

          tweetLink.target = "_blank";

          linkCell.appendChild(tweetLink);

          // Create a table data cell (td) for the delete button
          const actionCell = document.createElement("td");
          actionCell.classList.add("action");
          const deleteBtn = document.createElement("button");
          deleteBtn.classList.add("delete-btn");
          deleteBtn.textContent = "X";

          // Add event listener to the delete button to remove the bookmark
          deleteBtn.addEventListener("click", () => {
            removeBookmark(bookmark.currentTweetId);
          });

          actionCell.appendChild(deleteBtn);

          // Append the cells to the row
          row.appendChild(linkCell);
          row.appendChild(actionCell);

          // Append the row to the table
          table.appendChild(row);
        });
      }
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    }

    // If remove button clicked
    const removeBookmark = async (tweetId) => {
      try {
        // Fetch current bookmarks
        const currentTweetBookmarks = await new Promise((resolve, reject) => {
          chrome.storage.sync.get("tweetLink", (obj) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(obj.tweetLink ? JSON.parse(obj.tweetLink) : []);
            }
          });
        });

        // Filter out bookmarks with the matching tweetId
        const updateBookmarks = currentTweetBookmarks.filter(
          (bookmark) => bookmark.currentTweetId !== tweetId
        );

        // Update chrome storage
        await new Promise((resolve, reject) => {
          chrome.storage.sync.set(
            {
              tweetLink: JSON.stringify(updateBookmarks),
            },
            () => {
              chrome.runtime.lastError
                ? reject(chrome.runtime.lastError)
                : resolve();
            }
          );
        });

        // Remove tweet from the table's row after deletion
        const row = document.getElementById(`tweet-url-${tweetId}`);
        if (row) row.remove();

        console.log(`Bookmark with ID ${tweetId} removed successfully`);
      } catch (err) {
        console.error(`Error removing bookmark with Tweet ID ${tweetId}`);
      }
    };
  });
});
