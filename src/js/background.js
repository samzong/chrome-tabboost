import { getCurrentTab, showNotification, validateUrl } from "../utils/utils.js";
import { createSplitView, closeSplitView, toggleSplitView, updateRightView, canLoadInIframe } from "./splitView.js";
import storageCache from "../utils/storageCache.js";

// 当前标签页缓存
let currentTabCache = {
  tab: null,
  timestamp: 0
};

// 标签页缓存有效期（毫秒）
const TAB_CACHE_TTL = 1000; // 1秒

// 获取当前标签页，带缓存
async function getCachedCurrentTab() {
  const now = Date.now();
  // 检查缓存是否有效
  if (currentTabCache.tab && now - currentTabCache.timestamp < TAB_CACHE_TTL) {
    return currentTabCache.tab;
  }
  
  // 缓存无效或不存在，获取新的标签页
  const tab = await getCurrentTab();
  if (tab) {
    currentTabCache = {
      tab,
      timestamp: now
    };
  }
  return tab;
}

// 清除标签页缓存
function invalidateTabCache() {
  currentTabCache = {
    tab: null,
    timestamp: 0
  };
}

// 监听标签页变化，清除缓存
chrome.tabs.onActivated.addListener(() => {
  invalidateTabCache();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    invalidateTabCache();
  }
});

// 初始化存储缓存
storageCache.init().catch(error => {
  console.error("初始化存储缓存失败:", error);
});

// 监听插件图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  // 更新当前标签页缓存
  if (tab) {
    currentTabCache = {
      tab,
      timestamp: Date.now()
    };
  }
  
  // 获取默认操作
  const result = await storageCache.get({ defaultAction: "open-options" });
  const defaultAction = result.defaultAction; // 设置默认操作为打开设置页面

  if (defaultAction === "duplicate-tab") {
    duplicateCurrentTab();
  } else if (defaultAction === "copy-url") {
    copyCurrentTabUrl();
  } else if (defaultAction === "open-options") {
    openOptionsPage();
  } else if (defaultAction === "toggle-split-view") {
    toggleSplitView();
  }
});

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  console.log("Listener triggered"); // 确认监听器被触发
  console.log("Command received:", command); // 打印接收到的命令
  if (command === "duplicate-tab") {
    duplicateCurrentTab();
  } else if (command === "copy-url") {
    copyCurrentTabUrl();
  } else if (command === "toggle-split-view") {
    toggleSplitView();
  }
});

// 定义打开设置页面的函数
async function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

// 复制当前标签页网址
async function copyCurrentTabUrl() {
  let currentTab = await getCachedCurrentTab();
  console.log("Current tab:", currentTab); // 打印当前标签页信息
  if (currentTab) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: (url) => {
          navigator.clipboard
            .writeText(url)
            .then(() => {
              console.log("URL copied to clipboard:", url);
            })
            .catch((err) => {
              console.error("复制失败：", err);
            });
        },
        args: [currentTab.url],
      });
      console.log("URL copied:", currentTab.url);
      showNotification("网址复制成功！");
    } catch (err) {
      console.error("执行脚本失败：", err);
      showNotification("网址复制失败！");
    }
  } else {
    console.error("未找到当前标签页");
    showNotification("未找到当前标签页");
  }
}

// 复制当前标签页
async function duplicateCurrentTab() {
  let currentTab = await getCachedCurrentTab();
  if (currentTab) {
    chrome.tabs.duplicate(currentTab.id);
  }
}

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("chrome-tabboost: Background received message:", request);
  
  // 处理打开选项页请求
  if (request.action === "openOptionsPage") {
    console.log("chrome-tabboost: Opening options page, section:", request.section);
    chrome.runtime.openOptionsPage(() => {
      // 向选项页发送消息，指示要滚动到的部分
      if (request.section) {
        setTimeout(() => {
          chrome.runtime.sendMessage({ 
            action: "scrollToSection", 
            section: request.section 
          });
        }, 300); // 给选项页一些加载时间
      }
    });
    return true;
  }
  
  // 处理在分屏视图中打开URL的请求
  if (request.action === "openInSplitView" && request.url) {
    handleSplitViewRequest(request.url)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error("Split view error:", error);
        // 如果发生错误，尝试在新标签页中打开
        try {
          chrome.tabs.create({ url: request.url });
          sendResponse({ 
            status: "opened_in_new_tab", 
            message: "分屏模式发生错误，已在新标签页中打开" 
          });
        } catch (e) {
          sendResponse({ status: "error", message: error.message });
        }
      });
    return true; // 保持消息通道开启，以支持异步响应
  }
  else if (request.action === "closeSplitView") {
    closeSplitView()
      .then(() => sendResponse({ status: "Split view closed" }))
      .catch(error => {
        console.error("Close split view error:", error);
        sendResponse({ status: "error", message: error.message });
      });
    return true;
  }
  else if (request.action === "openInNewTab") {
    // 在新标签页中打开链接
    try {
      chrome.tabs.create({ url: request.url });
      sendResponse({ 
        status: "success", 
        message: "已在新标签页中打开" 
      });
    } catch (error) {
      console.error("打开新标签页失败:", error);
      sendResponse({ status: "error", message: error.message });
    }
    return true;
  }
});

// 处理分屏请求
async function handleSplitViewRequest(url) {
  try {
    // 使用通用URL验证函数进行安全检查
    const validationResult = validateUrl(url);
    
    // 如果URL不安全，记录原因并在新标签页中打开
    if (!validationResult.isValid) {
      console.error(`URL验证失败: ${validationResult.reason}`);
      chrome.tabs.create({ url }); // 让浏览器处理不安全的URL
      return { 
        status: "opened_in_new_tab_due_to_validation", 
        message: `由于安全原因，已在新标签页中打开: ${validationResult.reason}` 
      };
    }
    
    // 使用经过安全处理的URL
    url = validationResult.sanitizedUrl;

    // 检查URL是否可以在iframe中加载
    const canLoad = await canLoadInIframe(url);
    if (!canLoad) {
      console.log(`URL ${url} 不允许在iframe中加载，将在新标签页中打开`);
      chrome.tabs.create({ url });
      return { 
        status: "opened_in_new_tab", 
        message: "此网站不允许在分屏中加载，已在新标签页中打开" 
      };
    }
    
    const currentTab = await getCachedCurrentTab();
    if (!currentTab) {
      throw new Error("无法获取当前标签页");
    }

    try {
      // 检查分屏是否已激活
      const [isActive] = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => document.getElementById('tabboost-split-view-container') !== null
      });
      
      if (isActive.result) {
        // 如果分屏已激活，则只更新右侧内容
        await updateRightView(url);
        return { status: "Right split view updated" };
      } else {
        // 否则创建新的分屏视图
        await createSplitView();
        // 稍等片刻确保分屏视图已创建
        await new Promise(resolve => setTimeout(resolve, 300));
        // 然后更新右侧内容
        await updateRightView(url);
        return { status: "Split view created and right view updated" };
      }
    } catch (error) {
      console.error("处理分屏请求时发生错误:", error);
      
      // 在捕获到错误时尝试恢复
      try {
        // 如果分屏视图创建失败，尝试关闭现有分屏视图
        await closeSplitView();
        
        // 然后在新标签页中打开链接
        chrome.tabs.create({ url });
        return { 
          status: "opened_in_new_tab_after_error", 
          message: "分屏创建失败，已在新标签页中打开" 
        };
      } catch (cleanupError) {
        console.error("尝试恢复时出错:", cleanupError);
        // 最后的尝试，直接打开新标签
        chrome.tabs.create({ url });
        return { 
          status: "recovery_failed",
          message: "恢复失败，已在新标签页中打开" 
        };
      }
    }
  } catch (error) {
    console.error("处理分屏请求出错:", error);
    throw error;
  }
}
