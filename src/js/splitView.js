// splitView.js - 分屏模式功能入口文件

import splitViewCore from "./splitView/splitViewCore.js";
import { canLoadInIframe } from "./splitView/splitViewURLValidator.js";

// 导出核心API，提供给其他模块使用
export const {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
  getSplitViewState
} = splitViewCore;

// 导出URL验证函数
export { canLoadInIframe };

// 初始化模块
splitViewCore.initSplitViewModule();

// 默认导出所有功能
export default splitViewCore; 