import storageCache from "../../utils/storage-cache.js";

const splitViewState = {
  isActive: false,
  leftUrl: "",
  rightUrl: "",
  layoutDirection: "horizontal",

  async init() {
    try {
      const savedState = await storageCache.get({
        splitViewDirection: "horizontal",
        splitViewHorizontalRatio: 50,
        splitViewVerticalRatio: 50,
      });

      this.layoutDirection = savedState.splitViewDirection || "horizontal";
    } catch (error) {
      
    }
  },

  activate(leftUrl) {
    this.isActive = true;
    this.leftUrl = leftUrl;
  },

  deactivate() {
    this.isActive = false;
  },

  setRightUrl(url) {
    this.rightUrl = url;
  },

  setLayoutDirection(direction) {
    this.layoutDirection = direction;
    storageCache.set({ splitViewDirection: direction });
  },

  saveRatio(ratio) {
    if (this.layoutDirection === "horizontal") {
      storageCache.set({ splitViewHorizontalRatio: ratio });
    } else {
      storageCache.set({ splitViewVerticalRatio: ratio });
    }
  },

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
