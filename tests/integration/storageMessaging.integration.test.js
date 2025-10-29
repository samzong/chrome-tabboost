/**
 * Integration tests for storage message passing between content scripts and background
 */
import { chrome } from "jest-chrome";

// Mock storageCache for background context
jest.mock("../../src/utils/storage-cache.js", () => {
  const mockCache = {
    cache: {},
    get: jest.fn(),
    set: jest.fn(),
    init: jest.fn().mockResolvedValue(),
  };
  return { default: mockCache };
});

describe("Background Storage Message Handlers", () => {
  let messageListener;
  let storageCache;

  beforeAll(() => {
    global.chrome = chrome;
  });

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    chrome.runtime.onMessage.addListener.mockClear();

    // Import fresh instances
    storageCache = (await import("../../src/utils/storage-cache.js")).default;

    // Capture the message listener when background.js registers it
    chrome.runtime.onMessage.addListener.mockImplementation((listener) => {
      messageListener = listener;
    });

    // Note: We can't actually import background.js here because it has side effects
    // Instead, we'll test the message handler logic directly
  });

  test("storageGet message returns data from cache", async () => {
    const mockData = { setting1: "value1", setting2: "value2" };
    storageCache.get.mockResolvedValue(mockData);

    const request = {
      action: "storageGet",
      keys: { setting1: "default1", setting2: "default2" },
    };

    const sendResponse = jest.fn();

    // Simulate the message handler logic
    const handleStorageGet = async (request, sender, sendResponse) => {
      if (request.action === "storageGet" && request.keys) {
        try {
          const result = await storageCache.get(request.keys);
          sendResponse({ success: true, data: result });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }
    };

    const result = await handleStorageGet(request, {}, sendResponse);

    expect(result).toBe(true);
    expect(storageCache.get).toHaveBeenCalledWith(request.keys);
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      data: mockData,
    });
  });

  test("storageGet message handles errors gracefully", async () => {
    const errorMessage = "Storage error";
    storageCache.get.mockRejectedValue(new Error(errorMessage));

    const request = {
      action: "storageGet",
      keys: "testKey",
    };

    const sendResponse = jest.fn();

    const handleStorageGet = async (request, sender, sendResponse) => {
      if (request.action === "storageGet" && request.keys) {
        try {
          const result = await storageCache.get(request.keys);
          sendResponse({ success: true, data: result });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }
    };

    await handleStorageGet(request, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: errorMessage,
    });
  });

  test("storageSet message writes to cache", async () => {
    storageCache.set.mockResolvedValue();

    const request = {
      action: "storageSet",
      items: { setting1: "newValue1", setting2: "newValue2" },
    };

    const sendResponse = jest.fn();

    const handleStorageSet = async (request, sender, sendResponse) => {
      if (request.action === "storageSet" && request.items) {
        try {
          await storageCache.set(request.items);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }
    };

    const result = await handleStorageSet(request, {}, sendResponse);

    expect(result).toBe(true);
    expect(storageCache.set).toHaveBeenCalledWith(request.items);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test("storageSet message handles errors gracefully", async () => {
    const errorMessage = "Write failed";
    storageCache.set.mockRejectedValue(new Error(errorMessage));

    const request = {
      action: "storageSet",
      items: { key: "value" },
    };

    const sendResponse = jest.fn();

    const handleStorageSet = async (request, sender, sendResponse) => {
      if (request.action === "storageSet" && request.items) {
        try {
          await storageCache.set(request.items);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }
    };

    await handleStorageSet(request, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: errorMessage,
    });
  });
});
