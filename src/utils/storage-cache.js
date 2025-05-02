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
      "iframeIgnoreEnabled",
      "iframeIgnoreList",
      "popupSizePreset",
      "customWidth",
      "customHeight",
      "autoAddToIgnoreList",
      "defaultAction",
      "splitViewEnabled",
    ];

    this.stableConfigKeys = [
      "popupSizePreset",
      "customWidth",
      "customHeight",
      "defaultAction",
      "splitViewEnabled",
      "iframeIgnoreEnabled",
    ];

    this.batchReadCache = {};
    this.batchReadTimer = null;
    this.batchReadDelay = 50;

    this.writeQueue = {};
    this.writeTimerId = null;
    this.writeDelay = 1000;
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

    const keysToFetch = keyList.filter((key) => !(key in this.cache) || this.isExpired(key));

    if (keysToFetch.length === 0) {
      const result = {};
      keyList.forEach((key) => {
        result[key] = key in this.cache ? this.cache[key] : defaults[key];
      });
      return Promise.resolve(result);
    }

    return new Promise((resolve) => {
      const resolvers = {};
      keysToFetch.forEach((key) => {
        if (!this.batchReadCache[key]) {
          this.batchReadCache[key] = [];
        }

        this.batchReadCache[key].push((value) => {
          resolvers[key] = value;
        });
      });

      if (this.batchReadTimer) {
        clearTimeout(this.batchReadTimer);
      }

      this.batchReadTimer = setTimeout(() => {
        this.executeBatchRead();
      }, this.batchReadDelay);

      const checkComplete = () => {
        const allResolved = keysToFetch.every((key) => key in resolvers);

        if (allResolved) {
          const result = {};
          keyList.forEach((key) => {
            if (key in resolvers) {
              result[key] = resolvers[key];
            } else if (key in this.cache) {
              result[key] = this.cache[key];
            } else {
              result[key] = defaults[key];
            }
          });

          resolve(result);
        } else {
          setTimeout(checkComplete, 10);
        }
      };

      checkComplete();
    });
  }

  /**
   * Execute batch read operation
   */
  executeBatchRead() {
    const keysToFetch = Object.keys(this.batchReadCache);

    if (keysToFetch.length === 0) {
      return;
    }

    const currentBatch = { ...this.batchReadCache };
    this.batchReadCache = {};
    this.batchReadTimer = null;

    chrome.storage.sync.get(keysToFetch, (items) => {
      Object.keys(items).forEach((key) => {
        this.cache[key] = items[key];
        this.setExpiration(key);

        if (currentBatch[key]) {
          currentBatch[key].forEach((resolver) => {
            resolver(items[key]);
          });
        }
      });

      keysToFetch.forEach((key) => {
        if (!(key in items) && currentBatch[key]) {
          currentBatch[key].forEach((resolver) => {
            resolver(undefined);
          });
        }
      });
    });
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
      console.error("chrome-tabboost: Failed to batch write:", chrome.runtime.lastError);
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
          console.error("chrome-tabboost: Failed to remove key:", chrome.runtime.lastError);
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
    this.batchReadCache = {};

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
          console.error("chrome-tabboost: Failed to clear storage:", chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }
}

const storageCache = new StorageCache();
export default storageCache;
