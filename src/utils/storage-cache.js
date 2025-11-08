/**
 * Storage cache manager class
 * Used to cache chrome.storage.sync data, reducing frequent calls to the storage API
 */
class StorageCache {
  constructor() {
    this.cache = {};
    this.expiration = {};
    this.cacheExpiration = 30 * 60 * 1000;
    this.frequentUpdateExpiration = 30 * 60 * 1000;
    this.stableConfigExpiration = 12 * 60 * 60 * 1000;
    this.initialized = false;
    this.commonKeys = [
      "popupSizePreset",
      "customWidth",
      "customHeight",
      "defaultAction",
      "splitViewEnabled",
      "notificationsEnabled",
      "siteBlocklistConfig",
    ];

    this.stableConfigKeys = [
      "popupSizePreset",
      "customWidth",
      "customHeight",
      "defaultAction",
      "splitViewEnabled",
      "notificationsEnabled",
      "siteBlocklistConfig",
    ];

    this.batchReadTimer = null;
    this.batchReadDelay = 50;
    this.pendingReadRequests = [];

    this.writeQueue = {};
    this.writeTimerId = null;
    this.writeDelay = 1000;

    this.registerChangeListener();
  }

  /**
   * Initialize cache, preload common configurations
   * @param {Array} keys - List of keys to preload
   * @returns {Promise} Promise of completion
   */
  async init(keys = []) {
    if (this.initialized) return Promise.resolve();

    const allKeys = [...new Set([...keys, ...this.commonKeys])];

    return new Promise((resolve) => {
      chrome.storage.sync.get(allKeys, (result) => {
        Object.keys(result).forEach((key) => {
          this.cache[key] = result[key];
          this.setExpiration(key);
        });

        this.initialized = true;
        resolve();
      });
    });
  }

  registerChangeListener() {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.onChanged
    ) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") {
        return;
      }

      Object.entries(changes).forEach(([key, { newValue }]) => {
        if (newValue === undefined) {
          delete this.cache[key];
          delete this.expiration[key];
          return;
        }

        this.cache[key] = newValue;
        this.setExpiration(key);
      });
    });
  }

  /**
   * Set the expiration time for the key, based on the configuration stability
   * @param {string} key - Key name
   */
  setExpiration(key) {
    if (this.stableConfigKeys.includes(key)) {
      this.expiration[key] = Date.now() + this.stableConfigExpiration;
    } else {
      this.expiration[key] = Date.now() + this.frequentUpdateExpiration;
    }
  }

  /**
   * Check if the key has expired
   * @param {string} key - Key name
   * @returns {boolean} Whether it has expired
   */
  isExpired(key) {
    return !this.expiration[key] || Date.now() > this.expiration[key];
  }

  /**
   * Get the stored value, supports batch read optimization
   * @param {string|Array|Object} keys - The key or list of keys or default value object to get
   * @returns {Promise} Promise of completion
   */
  async get(keys) {
    if (!this.initialized) {
      await this.init();
    }

    let keyList = [];
    let defaults = {};

    if (typeof keys === "string") {
      keyList = [keys];
    } else if (Array.isArray(keys)) {
      keyList = keys;
    } else if (typeof keys === "object" && keys !== null) {
      keyList = Object.keys(keys);
      defaults = keys;
    }

    const keysToFetch = keyList.filter(
      (key) => !(key in this.cache) || this.isExpired(key)
    );

    if (keysToFetch.length === 0) {
      return Promise.resolve(this.buildResult(keyList, defaults));
    }

    return this.enqueueBatchRequest({ keyList, defaults, keysToFetch });
  }

  /**
   * Execute batch read operation
   */
  executeBatchRead() {
    const requests = this.pendingReadRequests;

    if (!requests || requests.length === 0) {
      this.batchReadTimer = null;
      return;
    }

    this.pendingReadRequests = [];
    this.batchReadTimer = null;

    const keysToFetch = Array.from(
      new Set(
        requests.reduce((allKeys, request) => {
          allKeys.push(...request.keysToFetch);
          return allKeys;
        }, [])
      )
    );

    if (keysToFetch.length === 0) {
      requests.forEach((request) => {
        request.resolve(this.buildResult(request.keyList, request.defaults));
      });
      return;
    }

    chrome.storage.sync.get(keysToFetch, (items) => {
      const lastError = chrome.runtime && chrome.runtime.lastError;
      if (lastError) {
        console.error("chrome-tabboost: Failed to batch read:", lastError);
      }

      const resolvedItems = items || {};

      Object.keys(resolvedItems).forEach((key) => {
        this.cache[key] = resolvedItems[key];
        this.setExpiration(key);
      });

      keysToFetch.forEach((key) => {
        if (!(key in resolvedItems)) {
          const defaultValue = this.findDefaultForKey(requests, key);
          this.cache[key] = defaultValue;
          this.setExpiration(key);
        }
      });

      requests.forEach((request) => {
        request.resolve(this.buildResult(request.keyList, request.defaults));
      });
    });
  }

  enqueueBatchRequest(request) {
    return new Promise((resolve) => {
      this.pendingReadRequests.push({ ...request, resolve });

      if (this.batchReadTimer) {
        clearTimeout(this.batchReadTimer);
      }

      this.batchReadTimer = setTimeout(() => {
        this.executeBatchRead();
      }, this.batchReadDelay);
    });
  }

  buildResult(keyList, defaults = {}) {
    const result = {};

    keyList.forEach((key) => {
      if (key in this.cache && !this.isExpired(key)) {
        result[key] = this.cache[key];
      } else if (key in defaults) {
        result[key] = defaults[key];
        this.cache[key] = defaults[key];
        this.setExpiration(key);
      } else {
        result[key] = undefined;
      }
    });

    return result;
  }

  findDefaultForKey(requests, key) {
    for (let i = 0; i < requests.length; i += 1) {
      if (requests[i].defaults && key in requests[i].defaults) {
        return requests[i].defaults[key];
      }
    }

    return undefined;
  }

  /**
   * Set the stored value, using batch write optimization
   * @param {Object} items - The key-value pairs to store
   * @returns {Promise} Promise of completion
   */
  async set(items) {
    Object.keys(items).forEach((key) => {
      this.cache[key] = items[key];
      this.setExpiration(key);

      this.writeQueue[key] = items[key];
    });

    this.scheduleWrite();

    return Promise.resolve();
  }

  /**
   * Schedule batch write operation
   */
  scheduleWrite() {
    if (this.writeTimerId) {
      clearTimeout(this.writeTimerId);
    }

    this.writeTimerId = setTimeout(() => {
      this.flushWrites();
    }, this.writeDelay);
  }

  /**
   * Execute all pending write operations
   */
  flushWrites() {
    if (Object.keys(this.writeQueue).length === 0) {
      return;
    }

    const itemsToWrite = { ...this.writeQueue };

    this.writeQueue = {};

    this._batchWrite(itemsToWrite);
  }

  async _batchWrite(itemsToWrite) {
    try {
      await chrome.storage.sync.set(itemsToWrite);
    } catch (error) {
      console.error(
        "chrome-tabboost: Failed to batch write:",
        chrome.runtime.lastError
      );
      throw error;
    }
  }

  /**
   * Remove the key from storage, also remove it from the cache
   * @param {string|Array} keys - The key or list of keys to remove
   * @returns {Promise} Promise of completion
   */
  async remove(keys) {
    const keyList = Array.isArray(keys) ? keys : [keys];

    keyList.forEach((key) => {
      delete this.cache[key];
      delete this.expiration[key];

      if (key in this.writeQueue) {
        delete this.writeQueue[key];
      }
    });

    return new Promise((resolve) => {
      chrome.storage.sync.remove(keyList, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "chrome-tabboost: Failed to remove key:",
            chrome.runtime.lastError
          );
        }
        resolve();
      });
    });
  }

  /**
   * Clear the entire cache and storage
   * @returns {Promise} Promise of completion
   */
  async clear() {
    this.cache = {};
    this.expiration = {};
    this.writeQueue = {};
    this.pendingReadRequests = [];

    if (this.writeTimerId) {
      clearTimeout(this.writeTimerId);
      this.writeTimerId = null;
    }

    if (this.batchReadTimer) {
      clearTimeout(this.batchReadTimer);
      this.batchReadTimer = null;
    }

    return new Promise((resolve) => {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          console.error(
            "chrome-tabboost: Failed to clear storage:",
            chrome.runtime.lastError
          );
        }
        resolve();
      });
    });
  }
}

const storageCache = new StorageCache();
export default storageCache;
