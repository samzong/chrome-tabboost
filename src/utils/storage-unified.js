/**
 * Unified storage accessor that works in both content script and background/extension page contexts
 * Automatically detects the context and uses the appropriate storage mechanism
 */

// Detect if we're in a content script context
function isContentScript() {
  try {
    // Content scripts cannot access chrome.tabs
    return !chrome.tabs;
  } catch (e) {
    return true;
  }
}

let storageInstance = null;

async function getStorageInstance() {
  if (storageInstance) {
    return storageInstance;
  }

  if (isContentScript()) {
    // Use storage proxy in content scripts
    const { default: storageProxy } = await import("./storage-proxy.js");
    storageInstance = storageProxy;
  } else {
    // Use storage cache in background/extension pages
    const { default: storageCache } = await import("./storage-cache.js");
    storageInstance = storageCache;
  }

  return storageInstance;
}

/**
 * Get values from storage (works in any context)
 * @param {string|Array|Object} keys - The key or list of keys or default value object to get
 * @returns {Promise} Promise resolving to the stored values
 */
export async function get(keys) {
  const storage = await getStorageInstance();
  return storage.get(keys);
}

/**
 * Set values to storage (works in any context)
 * @param {Object} items - The key-value pairs to store
 * @returns {Promise} Promise of completion
 */
export async function set(items) {
  const storage = await getStorageInstance();
  return storage.set(items);
}

/**
 * Initialize storage (works in any context)
 * @returns {Promise} Promise of completion
 */
export async function init() {
  const storage = await getStorageInstance();
  if (storage.init) {
    return storage.init();
  }
  return Promise.resolve();
}
