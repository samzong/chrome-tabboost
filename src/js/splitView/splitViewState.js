import storageCache from "../../utils/storage-cache.js";

/**
 * Split view state management module
 */
const splitViewState = {
  isActive: false,
  leftUrl: "",
  rightUrl: "",
  layoutDirection: "horizontal",

  /**
   * Initialize persisted state
   * @returns {Promise<void>}
   */
  async init() {
    try {
      const savedState = await storageCache.get({
        splitViewDirection: "horizontal",
        splitViewHorizontalRatio: 50,
        splitViewVerticalRatio: 50,
      });

      this.layoutDirection = savedState.splitViewDirection || "horizontal";
    } catch (error) {
      console.error("Failed to initialize split view state:", error);
    }
  },

  /**
   * Activate split view mode
   * @param {string} leftUrl - URL shown on the left side
   */
  activate(leftUrl) {
    this.isActive = true;
    this.leftUrl = leftUrl;
  },

  /**
   * Deactivate split view mode
   */
  deactivate() {
    this.isActive = false;
  },

  /**
   * Update the URL for the right side of the split view
   * @param {string} url - URL for the right view
   */
  setRightUrl(url) {
    this.rightUrl = url;
  },

  /**
   * Persist the current layout direction
   * @param {string} direction - "horizontal" or "vertical"
   */
  setLayoutDirection(direction) {
    this.layoutDirection = direction;
    storageCache.set({ splitViewDirection: direction });
  },

  /**
   * Persist the chosen split ratio
   * @param {number} ratio - Percentage ratio (0-100)
   */
  saveRatio(ratio) {
    if (this.layoutDirection === "horizontal") {
      storageCache.set({ splitViewHorizontalRatio: ratio });
    } else {
      storageCache.set({ splitViewVerticalRatio: ratio });
    }
  },

  /**
   * Retrieve the current split view state snapshot
   * @returns {Object}
   */
  getState() {
    return {
      isActive: this.isActive,
      leftUrl: this.leftUrl,
      rightUrl: this.rightUrl,
      layoutDirection: this.layoutDirection,
    };
  },
};

export default splitViewState;
