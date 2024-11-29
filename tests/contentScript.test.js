import { jest } from "@jest/globals";
import { TweetInspector } from "../contentScript";

describe("TweetInspector", () => {
  let tweetInspector;
  let mockChrome;

  beforeEach(() => {
    mockChrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn(),
        },
        lastError: null,
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn(),
          clear: jest.fn(),
        },
      },
    };
    global.chrome = mockChrome;
    global.document = {
      createElement: jest.fn(),
      getElementsByClassName: jest.fn(),
      head: { appendChild: jest.fn() },
      querySelector: jest.fn(),
    };
    global.window = {
      location: { href: "https://twitter.com/test/status/123" },
    };
    tweetInspector = new TweetInspector();
  });

  describe("fetchBookmarks", () => {
    it("should resolve with parsed bookmarks when storage get succeeds", async () => {
      const mockBookmarks = [{ link: "test-link" }];
      mockChrome.storage.sync.get.mockImplementation((key, callback) => {
        callback({ tweetLink: JSON.stringify(mockBookmarks) });
      });

      const result = await tweetInspector.fetchBookmarks();
      expect(result).toEqual(mockBookmarks);
    });

    it("should resolve with empty array when no bookmarks exist", async () => {
      mockChrome.storage.sync.get.mockImplementation((key, callback) => {
        callback({});
      });

      const result = await tweetInspector.fetchBookmarks();
      expect(result).toEqual([]);
    });
  });

  describe("generateKeywords", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it("should generate keywords from text using GPT API", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "keyword1, keyword2",
            },
          },
        ],
      };
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await tweetInspector.generateKeywords("test text");
      expect(result).toBe("keyword1, keyword2");
    });

    it("should handle API errors gracefully", async () => {
      global.fetch.mockRejectedValueOnce(new Error("API Error"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await tweetInspector.generateKeywords("test text");
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("addHoaxTweetToBookmark", () => {
    it("should add new hoax tweet to bookmarks", async () => {
      const mockExistingBookmarks = [];
      mockChrome.storage.sync.get.mockImplementation((key, callback) => {
        callback({ tweetLink: JSON.stringify(mockExistingBookmarks) });
      });

      await tweetInspector.addHoaxTweetToBookmark("test tweet content");

      expect(mockChrome.storage.sync.set).toHaveBeenCalled();
      const setCall = mockChrome.storage.sync.set.mock.calls[0][0];
      const savedBookmarks = JSON.parse(setCall.tweetLink);
      expect(savedBookmarks[0].tweetContent).toBe("test tweet content");
      expect(savedBookmarks[0].isHoaxTweet).toBe(true);
    });
  });

  describe("clearAllData", () => {
    it("should clear all chrome storage data", async () => {
      mockChrome.storage.sync.clear.mockImplementation((callback) =>
        callback()
      );

      await tweetInspector.clearAllData();
      expect(mockChrome.storage.sync.clear).toHaveBeenCalled();
    });

    it("should handle clear errors", async () => {
      mockChrome.storage.sync.clear.mockImplementation((callback) => {
        mockChrome.runtime.lastError = new Error("Clear error");
        callback();
      });
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await tweetInspector.clearAllData();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
