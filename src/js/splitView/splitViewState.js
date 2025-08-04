import storageCache from "../../utils/storage-cache.js";

/**
 * 分屏视图状态管理模块
 */
const splitViewState = {
  isActive: false,
  leftUrl: "",
  rightUrl: "",
  layoutDirection: "horizontal",

  /**
   * 初始化状态
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
   * 激活分屏视图
   * @param {string} leftUrl - 左侧视图URL
   */
  activate(leftUrl) {
    this.isActive = true;
    this.leftUrl = leftUrl;
  },

  /**
   * 停用分屏视图
   */
  deactivate() {
    this.isActive = false;
  },

  /**
   * 设置右侧视图URL
   * @param {string} url - 右侧视图URL
   */
  setRightUrl(url) {
    this.rightUrl = url;
  },

  /**
   * 设置布局方向
   * @param {string} direction - 'horizontal' 或 'vertical'
   */
  setLayoutDirection(direction) {
    this.layoutDirection = direction;
    storageCache.set({ splitViewDirection: direction });
  },

  /**
   * 保存当前比例设置
   * @param {number} ratio - 分割比例 (0-100)
   */
  saveRatio(ratio) {
    if (this.layoutDirection === "horizontal") {
      storageCache.set({ splitViewHorizontalRatio: ratio });
    } else {
      storageCache.set({ splitViewVerticalRatio: ratio });
    }
  },

  /**
   * 获取当前状态
   * @returns {Object} 当前分屏视图状态
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
