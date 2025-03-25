// splitViewCore.js - 分屏视图的核心功能和状态管理

import { getCurrentTab } from "../../utils/utils.js";
import storageCache from "../../utils/storage-cache.js";
import { canLoadInIframe } from "./splitViewURLValidator.js";
import { initSplitViewDOM, removeSplitViewDOM, updateRightViewDOM } from "./splitViewDOM.js";
import { setupSplitViewEvents, cleanupSplitViewEvents } from "./splitViewEvents.js";

// 确保缓存在使用前初始化
storageCache.init().catch(error => {
  console.error("splitView: 初始化存储缓存失败:", error);
});

// 保存分屏状态的变量
let isSplitViewActive = false;
let leftUrl = "";
let rightUrl = "";

// 创建分屏视图
export async function createSplitView() {
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("无法获取当前标签页");
      return;
    }

    // 获取当前URL作为左侧初始URL
    leftUrl = currentTab.url;

    // 确保URL可用
    if (!leftUrl || leftUrl === 'about:blank') {
      console.error("无效的页面URL");
      return;
    }

    // 将当前页面转换为分屏模式
    try {
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: initSplitViewDOM,
        args: [leftUrl]
      });
      
      isSplitViewActive = true;
      console.log("分屏模式已激活");
    } catch (e) {
      console.error("执行分屏视图脚本失败:", e);
      // 尝试重试一次
      setTimeout(() => {
        try {
          chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: initSplitViewDOM,
            args: [leftUrl]
          });
          
          isSplitViewActive = true;
          console.log("分屏模式已通过重试激活");
        } catch (retryError) {
          console.error("重试执行分屏视图脚本失败:", retryError);
        }
      }, 500);
    }
  } catch (error) {
    console.error("创建分屏视图失败:", error);
  }
}

// 关闭分屏视图
export async function closeSplitView() {
  if (!isSplitViewActive) return;
  
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("无法获取当前标签页");
      return;
    }

    // 恢复左侧内容为主界面
    try {
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: removeSplitViewDOM
      });
      
      isSplitViewActive = false;
      console.log("分屏模式已关闭");
    } catch (e) {
      console.error("执行恢复页面脚本失败:", e);
      
      // 尝试重新加载页面作为恢复的备选方案
      try {
        chrome.tabs.reload(currentTab.id);
        isSplitViewActive = false;
        console.log("通过页面重载关闭分屏模式");
      } catch (reloadError) {
        console.error("重载页面失败:", reloadError);
      }
    }
  } catch (error) {
    console.error("关闭分屏视图失败:", error);
  }
}

// 切换分屏视图
export async function toggleSplitView() {
  if (isSplitViewActive) {
    await closeSplitView();
  } else {
    await createSplitView();
  }
}

// 更新分屏右侧内容
export async function updateRightView(url) {
  if (!isSplitViewActive) return;
  
  rightUrl = url;
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("无法获取当前标签页");
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      function: updateRightViewDOM,
      args: [url]
    });
  } catch (error) {
    console.error("更新右侧视图失败:", error);
  }
}

// 获取分屏状态
export function getSplitViewState() {
  return {
    isActive: isSplitViewActive,
    leftUrl: leftUrl,
    rightUrl: rightUrl
  };
}

// 初始化分屏视图模块
export function initSplitViewModule() {
  console.log("初始化分屏视图模块");
  // 可以在这里执行任何需要在模块加载时进行的操作
}

// 向外部导出的API接口
export default {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
  getSplitViewState,
  initSplitViewModule
}; 