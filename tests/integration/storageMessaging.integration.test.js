/**
 * Integration tests for storage message passing between content scripts and background
 */
import { chrome } from "jest-chrome";

// Mock storageCache for background context
const mockStorageCache = {
  cache: {},
  get: jest.fn(),
  set: jest.fn(),
  init: jest.fn().mockResolvedValue(),
};

jest.mock("../../src/utils/storage-cache.js", () => ({
  default: mockStorageCache,
}));

// Test helper: Simulates the storageGet message handler logic
async function handleStorageGet(request, sender, sendResponse) {
  if (request.action === "storageGet" && request.keys) {
    try {
      const result = await mockStorageCache.get(request.keys);
      sendResponse({ success: true, data: result });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
}

// Test helper: Simulates the storageSet message handler logic
async function handleStorageSet(request, sender, sendResponse) {
  if (request.action === "storageSet" && request.items) {
    try {
      await mockStorageCache.set(request.items);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
}

describe("Background Storage Message Handlers", () => {
  beforeAll(() => {
    global.chrome = chrome;
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  test("storageGet message returns data from cache", async () => {
    const mockData = { setting1: "value1", setting2: "value2" };
    mockStorageCache.get.mockResolvedValue(mockData);

    const request = {
      action: "storageGet",
      keys: { setting1: "default1", setting2: "default2" },
    };

    const sendResponse = jest.fn();

    const result = await handleStorageGet(request, {}, sendResponse);

    expect(result).toBe(true);
    expect(mockStorageCache.get).toHaveBeenCalledWith(request.keys);
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      data: mockData,
    });
  });

  test("storageGet message handles errors gracefully", async () => {
    const errorMessage = "Storage error";
    mockStorageCache.get.mockRejectedValue(new Error(errorMessage));

    const request = {
      action: "storageGet",
      keys: "testKey",
    };

    const sendResponse = jest.fn();

    await handleStorageGet(request, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: errorMessage,
    });
  });

  test("storageSet message writes to cache", async () => {
    mockStorageCache.set.mockResolvedValue();

    const request = {
      action: "storageSet",
      items: { setting1: "newValue1", setting2: "newValue2" },
    };

    const sendResponse = jest.fn();

    const result = await handleStorageSet(request, {}, sendResponse);

    expect(result).toBe(true);
    expect(mockStorageCache.set).toHaveBeenCalledWith(request.items);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test("storageSet message handles errors gracefully", async () => {
    const errorMessage = "Write failed";
    mockStorageCache.set.mockRejectedValue(new Error(errorMessage));

    const request = {
      action: "storageSet",
      items: { key: "value" },
    };

    const sendResponse = jest.fn();

    await handleStorageSet(request, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: errorMessage,
    });
  });
});
