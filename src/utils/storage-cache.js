/**
 * Storage cache manager class
 * Used to cache chrome.storage.sync data, reducing frequent calls to the storage API
 */
class StorageCache {
  constructor() {
    this.cache = {};
    this.expiration = {};
    this.cacheExpiration = 30 * 60 * 1000;
    this.frequentUpdateExpiration = 2 * 60 * 60 * 1000; // Optimized: increased to 2 hours for better cache hit rate
    this.stableConfigExpiration = 7 * 24 * 60 * 60 * 1000; // Optimized: increased to 7 days for stable configs
    this.initialized = false;
    
    // Performance metrics for monitoring optimization effectiveness
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      batchReads: 0,
      batchWrites: 0,
      avgReadDelay: 0,
      avgWriteDelay: 0
    };
    this.commonKeys = [
      "popupSizePreset",
      "customWidth",
      "customHeight",
      "defaultAction",
      "splitViewEnabled",
    ];

    this.stableConfigKeys = [
      "popupSizePreset",
      "customWidth",
      "customHeight",
      "defaultAction",
      "splitViewEnabled",
    ];

    this.batchReadCache = {};
    this.batchReadTimer = null;
    this.batchReadDelay = 10; // Optimized: reduced from 50ms to 10ms for faster response
    this.maxBatchReadDelay = 50; // Smart batching: max delay for large batches
    this.readBatchThreshold = 3; // Number of keys to trigger smart batching

    this.writeQueue = {};
    this.writeTimerId = null;
    this.writeDelay = 200; // Optimized: reduced from 1000ms to 200ms for better UX
    this.maxWriteDelay = 1000; // Fallback for large batches
    this.writeBatchThreshold = 5; // Number of keys to trigger extended delay
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

    const keysToFetch = keyList.filter(
      (key) => !(key in this.cache) || this.isExpired(key)
    );

    if (keysToFetch.length === 0) {
      // All data served from cache - performance win!
      this.metrics.cacheHits += keyList.length;
      const result = {};
      keyList.forEach((key) => {
        result[key] = key in this.cache ? this.cache[key] : defaults[key];
      });
      return Promise.resolve(result);
    }
    
    // Some keys need to be fetched - record cache misses
    this.metrics.cacheMisses += keysToFetch.length;

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

      // Smart batching: adjust delay based on batch size for optimal performance
      const currentBatchSize = Object.keys(this.batchReadCache).length;
      const smartDelay = currentBatchSize >= this.readBatchThreshold 
        ? this.maxBatchReadDelay 
        : this.batchReadDelay;
      
      this.batchReadTimer = setTimeout(() => {
        this.executeBatchRead();
      }, smartDelay);

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

    // Record batch read metrics
    this.metrics.batchReads++;
    const startTime = performance.now();

    const currentBatch = { ...this.batchReadCache };
    this.batchReadCache = {};
    this.batchReadTimer = null;

    chrome.storage.sync.get(keysToFetch, (items) => {
      // Update average read delay metric
      const readTime = performance.now() - startTime;
      this.metrics.avgReadDelay = (this.metrics.avgReadDelay + readTime) / 2;
      
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
   * Schedule batch write operation with smart delay adjustment
   */
  scheduleWrite() {
    if (this.writeTimerId) {
      clearTimeout(this.writeTimerId);
    }

    // Smart write batching: use shorter delay for small batches, longer for large batches
    const currentQueueSize = Object.keys(this.writeQueue).length;
    const smartWriteDelay = currentQueueSize >= this.writeBatchThreshold 
      ? this.maxWriteDelay 
      : this.writeDelay;

    this.writeTimerId = setTimeout(() => {
      this.flushWrites();
    }, smartWriteDelay);
  }

  /**
   * Execute all pending write operations
   */
  flushWrites() {
    if (Object.keys(this.writeQueue).length === 0) {
      return;
    }

    // Record batch write metrics
    this.metrics.batchWrites++;
    const startTime = performance.now();

    const itemsToWrite = { ...this.writeQueue };
    this.writeQueue = {};

    this._batchWrite(itemsToWrite, startTime);
  }

  async _batchWrite(itemsToWrite, startTime) {
    try {
      await chrome.storage.sync.set(itemsToWrite);
      
      // Update average write delay metric
      if (startTime) {
        const writeTime = performance.now() - startTime;
        this.metrics.avgWriteDelay = (this.metrics.avgWriteDelay + writeTime) / 2;
      }
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
          console.error(
            "chrome-tabboost: Failed to clear storage:",
            chrome.runtime.lastError
          );
        }
        resolve();
      });
    });
  }

  /**
   * Get performance metrics for monitoring optimization effectiveness
   * @returns {Object} Performance metrics object
   */
  getPerformanceMetrics() {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? (this.metrics.cacheHits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.metrics,
      cacheHitRate: `${cacheHitRate}%`,
      totalRequests,
      avgReadDelayMs: this.metrics.avgReadDelay.toFixed(2),
      avgWriteDelayMs: this.metrics.avgWriteDelay.toFixed(2),
      optimizationStatus: cacheHitRate > 70 ? 'Excellent' : cacheHitRate > 50 ? 'Good' : 'Needs Improvement'
    };
  }

  /**
   * Reset performance metrics (useful for testing and monitoring)
   */
  resetMetrics() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      batchReads: 0,
      batchWrites: 0,
      avgReadDelay: 0,
      avgWriteDelay: 0
    };
  }
}

const storageCache = new StorageCache();
export default storageCache;
