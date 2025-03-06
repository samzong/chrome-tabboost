import { getCurrentTab, showNotification } from "./utils.js";
import { createSplitView, closeSplitView, toggleSplitView, updateRightView, canLoadInIframe } from "./splitView.js";

// 监听插件图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  // 获取默认操作
  chrome.storage.sync.get(["defaultAction"], (result) => {
    const defaultAction = result.defaultAction || "open-options"; // 设置默认操作为打开设置页面

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
  let currentTab = await getCurrentTab();
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
  let currentTab = await getCurrentTab();
  if (currentTab) {
    chrome.tabs.duplicate(currentTab.id);
  }
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background:", request);
  
  if (request.action === "openInPopup") {
    // 原有功能保持不变
    sendResponse({ status: "Message received by background" });
  }
  
  // 处理分屏视图相关消息
  else if (request.action === "openInSplitView") {
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
  // 检查URL是否可以在iframe中加载
  if (!canLoadInIframe(url)) {
    console.log(`URL ${url} 不允许在iframe中加载，将在新标签页中打开`);
    chrome.tabs.create({ url });
    return { 
      status: "opened_in_new_tab", 
      message: "此网站不允许在分屏中加载，已在新标签页中打开" 
    };
  }
  
  const currentTab = await getCurrentTab();
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
    } catch (e) {
      // 如果关闭也失败，忽略并继续
      console.warn("关闭分屏视图失败:", e);
    }
    
    // 重新抛出错误，让上层处理
    throw error;
  }
}
