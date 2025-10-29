/**
 * Storage proxy for content scripts
 * Forwards storage requests to the background script to avoid duplicating cache in each tab
 */
class StorageProxy {
  /**
   * Get values from storage via background script
   * @param {string|Array|Object} keys - The key or list of keys or default value object to get
   * @returns {Promise} Promise resolving to the stored values
   */
  async get(keys) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "storageGet",
          keys: keys,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || "Failed to get storage"));
          }
        }
      );
    });
  }

  /**
   * Set values to storage via background script
   * @param {Object} items - The key-value pairs to store
   * @returns {Promise} Promise of completion
   */
  async set(items) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "storageSet",
          items: items,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.success) {
            resolve();
          } else {
            reject(new Error(response?.error || "Failed to set storage"));
          }
        }
      );
    });
  }

  /**
   * Initialize - no-op for content scripts, kept for API compatibility
   * @returns {Promise} Promise of completion
   */
  async init() {
    return Promise.resolve();
  }
}

const storageProxy = new StorageProxy();
export default storageProxy;
