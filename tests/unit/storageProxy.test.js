import { chrome } from "jest-chrome";
import storageProxy from "../../src/utils/storage-proxy.js";

describe("StorageProxy", () => {
  beforeAll(() => {
    global.chrome = chrome;
  });

  beforeEach(() => {
    // Reset mocks
    chrome.runtime.sendMessage.mockReset();
    chrome.runtime.lastError = undefined;
  });

  describe("get", () => {
    test("sends storageGet message to background and returns data", async () => {
      const mockData = { testKey: "testValue" };
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.action).toBe("storageGet");
        expect(message.keys).toBe("testKey");
        callback({ success: true, data: mockData });
      });

      const result = await storageProxy.get("testKey");

      expect(result).toEqual(mockData);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });

    test("handles array of keys", async () => {
      const mockData = { key1: "value1", key2: "value2" };
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.action).toBe("storageGet");
        expect(message.keys).toEqual(["key1", "key2"]);
        callback({ success: true, data: mockData });
      });

      const result = await storageProxy.get(["key1", "key2"]);

      expect(result).toEqual(mockData);
    });

    test("handles object with defaults", async () => {
      const defaults = { setting1: "default1", setting2: "default2" };
      const mockData = { setting1: "actual1", setting2: "actual2" };
      
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.action).toBe("storageGet");
        expect(message.keys).toEqual(defaults);
        callback({ success: true, data: mockData });
      });

      const result = await storageProxy.get(defaults);

      expect(result).toEqual(mockData);
    });

    test("rejects on chrome.runtime.lastError", async () => {
      chrome.runtime.lastError = { message: "Extension context invalidated" };
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback();
      });

      await expect(storageProxy.get("testKey")).rejects.toThrow(
        "Extension context invalidated"
      );
    });

    test("rejects when response indicates failure", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false, error: "Storage error" });
      });

      await expect(storageProxy.get("testKey")).rejects.toThrow("Storage error");
    });

    test("rejects with generic error when response has no error message", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false });
      });

      await expect(storageProxy.get("testKey")).rejects.toThrow(
        "Failed to get storage"
      );
    });
  });

  describe("set", () => {
    test("sends storageSet message to background", async () => {
      const items = { key1: "value1", key2: "value2" };
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.action).toBe("storageSet");
        expect(message.items).toEqual(items);
        callback({ success: true });
      });

      await storageProxy.set(items);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });

    test("rejects on chrome.runtime.lastError", async () => {
      chrome.runtime.lastError = { message: "Storage quota exceeded" };
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback();
      });

      await expect(storageProxy.set({ key: "value" })).rejects.toThrow(
        "Storage quota exceeded"
      );
    });

    test("rejects when response indicates failure", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false, error: "Write error" });
      });

      await expect(storageProxy.set({ key: "value" })).rejects.toThrow(
        "Write error"
      );
    });
  });

  describe("init", () => {
    test("resolves without sending messages (no-op for content scripts)", async () => {
      await storageProxy.init();

      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });
});
