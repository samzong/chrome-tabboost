import { chrome } from 'jest-chrome';

import storageCache from '../../src/utils/storage-cache.js';

describe('storageCache batching', () => {
  beforeAll(() => {
    global.chrome = chrome;
  });

  beforeEach(() => {
    jest.useRealTimers();
    chrome.storage.sync.get.mockReset();
    chrome.storage.sync.set.mockReset();
    chrome.storage.sync.remove.mockReset();
    chrome.storage.sync.clear.mockReset();

    storageCache.cache = {};
    storageCache.expiration = {};
    storageCache.initialized = true;
    storageCache.pendingReadRequests = [];
    storageCache.batchReadDelay = 0;

    if (storageCache.batchReadTimer) {
      clearTimeout(storageCache.batchReadTimer);
      storageCache.batchReadTimer = null;
    }
  });

  test('returns cached value without hitting storage', async () => {
    storageCache.cache.testKey = 'cached';
    storageCache.expiration.testKey = Date.now() + 10000;

    const result = await storageCache.get('testKey');

    expect(result).toEqual({ testKey: 'cached' });
    expect(chrome.storage.sync.get).not.toHaveBeenCalled();
  });

  test('batches concurrent get calls for the same key', async () => {
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      expect(keys).toEqual(['key1']);
      setTimeout(() => callback({ key1: 'value-1' }), 0);
    });

    const [first, second] = await Promise.all([
      storageCache.get('key1'),
      storageCache.get('key1')
    ]);

    expect(chrome.storage.sync.get).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ key1: 'value-1' });
    expect(second).toEqual({ key1: 'value-1' });
  });

  test('stores defaults when key does not exist', async () => {
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      expect(keys).toEqual(['missingKey']);
      callback({});
    });

    const result = await storageCache.get({ missingKey: 'fallback' });

    expect(result).toEqual({ missingKey: 'fallback' });

    chrome.storage.sync.get.mockClear();

    const second = await storageCache.get('missingKey');

    expect(second).toEqual({ missingKey: 'fallback' });
    expect(chrome.storage.sync.get).not.toHaveBeenCalled();
  });
});
