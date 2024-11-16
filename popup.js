class PopupManager {
  constructor() {
    this.init();
  }

  init() {
    document.addEventListener("DOMContentLoaded", () => {
      this.loadBookmarks();
    });
  }

  // Fetch bookmarks from Chrome storage
  async fetchBookmarks() {
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

  // Load bookmarks and populate the table
  async loadBookmarks() {
    try {
      const bookmarks = await this.fetchBookmarks();
      console.log("Bookmarks:", bookmarks);

      const table = document.getElementById("list-of-tweet");
      table.innerHTML = ""; // Clear any existing rows

      if (bookmarks.length === 0) {
        this.displayNoDataMessage(table);
      } else {
        this.populateTableWithBookmarks(bookmarks, table);
      }
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    }
  }

  // Display a no-data message
  displayNoDataMessage(table) {
    const row = document.createElement("tr");
    const noDataCell = document.createElement("td");

    noDataCell.colSpan = 2;
    noDataCell.textContent = "Belum ada tweet yang di blokir";
    noDataCell.style.textAlign = "center";

    row.appendChild(noDataCell);
    table.append(row);
  }

  // Populate the table with bookmarks
  populateTableWithBookmarks(bookmarks, table) {
    bookmarks.forEach((bookmark) => {
      const row = document.createElement("tr");
      row.id = `tweet-url-${bookmark.currentTweetId}`;

      const linkCell = this.createLinkCell(bookmark);
      const actionCell = this.createActionCell(bookmark);

      row.appendChild(linkCell);
      row.appendChild(actionCell);
      table.appendChild(row);
    });
  }

  // Create the link cell for a table row
  createLinkCell(bookmark) {
    const linkCell = document.createElement("td");
    const tweetLink = document.createElement("a");

    tweetLink.href = bookmark.link;
    tweetLink.textContent =
      bookmark.tweetContent.length > 30
        ? `${bookmark.tweetContent.substring(0, 30)}...`
        : bookmark.tweetContent;

    tweetLink.target = "_blank";
    linkCell.appendChild(tweetLink);

    return linkCell;
  }

  // Create the action cell with the delete button
  createActionCell(bookmark) {
    const actionCell = document.createElement("td");
    actionCell.classList.add("action");

    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("delete-btn");
    deleteBtn.textContent = "X";

    deleteBtn.addEventListener("click", () => {
      this.removeBookmark(bookmark.currentTweetId);
    });

    actionCell.appendChild(deleteBtn);

    return actionCell;
  }

  // Remove a bookmark from storage and the UI
  async removeBookmark(tweetId) {
    try {
      const currentTweetBookmarks = await this.fetchBookmarks();

      const updatedBookmarks = currentTweetBookmarks.filter(
        (bookmark) => bookmark.currentTweetId !== tweetId
      );

      await new Promise((resolve, reject) => {
        chrome.storage.sync.set(
          { tweetLink: JSON.stringify(updatedBookmarks) },
          () => {
            chrome.runtime.lastError
              ? reject(chrome.runtime.lastError)
              : resolve();
          }
        );
      });

      const row = document.getElementById(`tweet-url-${tweetId}`);
      if (row) row.remove();

      console.log(`Bookmark with ID ${tweetId} removed successfully`);
    } catch (error) {
      console.error(`Error removing bookmark with Tweet ID ${tweetId}`, error);
    }
  }
}

new PopupManager();
