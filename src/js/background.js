import { getCurrentTab, validateUrl } from "../utils/utils.js";
import {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
} from "./splitView.js";
import storageCache from "../utils/storage-cache.js";
import { getMessage } from "../utils/i18n.js";
import { canLoadInIframe } from "../utils/iframe-compatibility.js";

let currentTabCache = {
  tab: null,
  timestamp: 0,
};

const TAB_CACHE_TTL = 1000;

// 规则集ID
const RULE_SETS = {
  POPUP_BYPASS: "popup_bypass_rules",
  CSP_BYPASS: "csp_bypass_rules"
};

/**
 * 根据设置启用或禁用declarativeNetRequest规则
 * @param {boolean} enabled - 是否启用规则
 */
async function updateHeaderModificationRules(enabled) {
  try {
    console.log(`TabBoost: ${enabled ? '启用' : '禁用'}头部修改规则`);
    
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabled ? [RULE_SETS.POPUP_BYPASS, RULE_SETS.CSP_BYPASS] : [],
      disableRulesetIds: enabled ? [] : [RULE_SETS.POPUP_BYPASS, RULE_SETS.CSP_BYPASS]
    });
    
    console.log(`TabBoost: 规则状态已更新为${enabled ? '启用' : '禁用'}`);
  } catch (error) {
    console.error("TabBoost: 更新规则状态失败:", error);
  }
}

async function getCachedCurrentTab() {
  const now = Date.now();
  if (currentTabCache.tab && now - currentTabCache.timestamp < TAB_CACHE_TTL) {
    return currentTabCache.tab;
  }

  const tab = await getCurrentTab();
  if (tab) {
    currentTabCache = {
      tab,
      timestamp: now,
    };
  }
  return tab;
}

function invalidateTabCache() {
  currentTabCache = {
    tab: null,
    timestamp: 0,
  };
}

chrome.tabs.onActivated.addListener(() => {
  invalidateTabCache();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    invalidateTabCache();
  }
});

storageCache.init().then(async () => {
  // 初始化规则状态
  const { headerModificationEnabled } = await storageCache.get({
    headerModificationEnabled: true
  });
  
  await updateHeaderModificationRules(headerModificationEnabled);
}).catch((error) => {
  console.error(getMessage("storageInitError"), error);
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.headerModificationEnabled) {
    // 当headerModificationEnabled设置改变时更新规则
    const newValue = changes.headerModificationEnabled.newValue;
    updateHeaderModificationRules(newValue);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  const { defaultAction } = await storageCache.get({
    defaultAction: "open-options",
  });

  executeAction(defaultAction, tab);
});

async function executeAction(action, tab) {
  switch (action) {
    case "copy-url":
      copyTabUrl(tab);
      break;
    case "duplicate-tab":
      duplicateTab(tab);
      break;
    case "open-options":
      chrome.runtime.openOptionsPage();
      break;
    default:
      chrome.runtime.openOptionsPage();
  }
}

async function copyTabUrl(tab) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (url) => {
        return navigator.clipboard.writeText(url);
      },
      args: [tab.url],
    });
    showNotification(getMessage("urlCopied"));
  } catch (error) {
    console.error(getMessage("urlCopyError"), error);
    showNotification(getMessage("urlCopyFailed"));
  }
}

function duplicateTab(tab) {
  chrome.tabs.duplicate(tab.id);
}

function showNotification(message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "assets/icons/icon128.png",
    title: getMessage("appName"),
    message: message,
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "duplicate-tab") {
    const currentTab = await getCachedCurrentTab();
    if (currentTab) {
      duplicateTab(currentTab);
    }
  } else if (command === "copy-url") {
    const currentTab = await getCachedCurrentTab();
    if (currentTab) {
      copyTabUrl(currentTab);
    }
  } else if (command === "open-options") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openOptionsPage") {
    chrome.runtime.openOptionsPage(() => {
      if (request.section) {
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: "scrollToSection",
            section: request.section,
          });
        }, 300);
      }
    });
    return true;
  }

  if (request.action === "openInSplitView" && request.url) {
    // 处理分屏视图请求，不再检查splitViewEnabled
    handleSplitViewRequest(request.url)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        console.error("Error handling split view request:", error);
        try {
          chrome.tabs.create({ url: request.url });
          sendResponse({
            status: "opened_in_new_tab",
            message: getMessage("splitViewErrorFallback"),
          });
        } catch (e) {
          console.error("Failed to open URL in new tab:", e);
          sendResponse({ status: "error", message: error.message });
        }
      });
    return true;
  } else if (request.action === "closeSplitView") {
    closeSplitView()
      .then(() => sendResponse({ status: getMessage("splitViewClosedStatus") }))
      .catch((error) => {
        sendResponse({ status: "error", message: error.message });
      });
    return true;
  } else if (request.action === "openInNewTab") {
    try {
      chrome.tabs.create({ url: request.url });
      sendResponse({
        status: "success",
        message: getMessage("openedInNewTabStatus"),
      });
    } catch (error) {
      sendResponse({ status: "error", message: error.message });
    }
    return true;
  }
});

async function handleSplitViewRequest(url) {
  try {
    // 验证URL
    const validationResult = validateUrl(url);
    if (!validationResult.isValid) {
      throw new Error(validationResult.reason || "Invalid URL");
    }

    // 检查URL是否可以在iframe中加载
    const canLoad = await canLoadInIframe(url);
    if (!canLoad) {
      chrome.tabs.create({ url });
      return {
        status: "opened_in_new_tab",
        message: getMessage("cantLoadInIframeMessage"),
      };
    }

    // 获取当前标签页
    const currentTab = await getCurrentTab();
    if (!currentTab || !currentTab.id) {
      throw new Error("Failed to get current tab");
    }

    // 检查分屏视图是否已激活
    const isActive = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        const container = document.getElementById("tabboost-split-view-container");
        return {
          result: !!container && container.style.display !== "none",
        };
      },
    });

    if (isActive && isActive[0] && isActive[0].result) {
      // 如果分屏视图已激活，更新右侧视图
      await updateRightView(url);
      return { status: "success", message: getMessage("splitViewUpdatedStatus") };
    } else {
      // 如果分屏视图未激活，创建新的分屏视图
      await createSplitView();
      // 等待分屏视图创建完成
      setTimeout(async () => {
        await updateRightView(url);
      }, 300);
      return { status: "success", message: getMessage("splitViewCreatedStatus") };
    }
  } catch (error) {
    // 如果出现任何错误，尝试关闭分屏视图并在新标签页中打开
    try {
      await closeSplitView();
      chrome.tabs.create({ url });
      return {
        status: "opened_in_new_tab",
        message: getMessage("splitViewErrorFallback"),
      };
    } catch (e) {
      throw error;
    }
  }
}
