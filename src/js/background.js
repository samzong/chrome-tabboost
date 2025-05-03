import { getCurrentTab, validateUrl } from "../utils/utils.js";
import {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
  canLoadInIframe,
} from "./splitView.js";
import storageCache from "../utils/storage-cache.js";
import { getMessage } from "../utils/i18n.js";

// Add declarativeNetRequest debug listener
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  console.log("TabBoost: Setting up declarativeNetRequest debug listener");
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
    (info) => {
      console.log("TabBoost: Rule matched for frame bypass:", info);
      // 输出更详细的规则匹配信息
      console.log(`TabBoost: Rule ID ${info.rule.ruleId} matched for request ${info.request.url}`);
      if (info.rule.action && info.rule.action.type === "modifyHeaders") {
        console.log("TabBoost: Modified headers:", info.rule.action.responseHeaders);
      }
    }
  );

  // 获取当前活动规则
  chrome.declarativeNetRequest.getEnabledRulesets().then(rulesetIds => {
    console.log("TabBoost: Enabled rulesets:", rulesetIds);
  }).catch(error => {
    console.error("TabBoost: Failed to get enabled rulesets:", error);
  });
}

let currentTabCache = {
  tab: null,
  timestamp: 0,
};

const TAB_CACHE_TTL = 1000;

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

storageCache.init().catch((error) => {
  console.error(getMessage("storageInitError"), error);
});

chrome.action.onClicked.addListener(async (tab) => {
  const { defaultAction } = await storageCache.get({
    defaultAction: "copy-url",
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
    case "toggle-split-view":
      const { splitViewEnabled } = await storageCache.get({
        splitViewEnabled: true,
      });
      if (splitViewEnabled) {
        toggleSplitView(tab);
      } else {
        console.log(getMessage("splitViewDisabledLog"));
      }
      break;
    case "open-options":
      chrome.runtime.openOptionsPage();
      break;
    default:
      copyTabUrl(tab);
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
  } else if (command === "toggle-split-view") {
    const { splitViewEnabled } = await storageCache.get({
      splitViewEnabled: true,
    });

    if (splitViewEnabled) {
      const currentTab = await getCachedCurrentTab();
      if (currentTab) {
        toggleSplitView(currentTab);
      } else {
        toggleSplitView();
      }
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
    console.log("TabBoost: Received openInSplitView request for URL:", request.url);

    // 检查分屏视图功能是否启用
    storageCache.get({ splitViewEnabled: true }).then(({ splitViewEnabled }) => {
      if (!splitViewEnabled) {
        console.log("TabBoost: Split view is disabled in settings");
        chrome.tabs.create({ url: request.url });
        sendResponse({
          status: "opened_in_new_tab",
          message: getMessage("splitViewDisabled") || "Split view is disabled in settings",
        });
        return;
      }

      // 处理分屏视图请求
      handleSplitViewRequest(request.url)
        .then((result) => {
          console.log("TabBoost: Split view request handled successfully:", result);
          sendResponse(result);
        })
        .catch((error) => {
          console.error("TabBoost: Error handling split view request:", error);
          try {
            chrome.tabs.create({ url: request.url });
            sendResponse({
              status: "opened_in_new_tab",
              message: getMessage("splitViewErrorFallback"),
            });
          } catch (e) {
            console.error("TabBoost: Failed to open URL in new tab:", e);
            sendResponse({ status: "error", message: error.message });
          }
        });
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
  console.log("TabBoost: handleSplitViewRequest started for URL:", url);

  try {
    // 验证URL
    const validationResult = validateUrl(url);
    console.log("TabBoost: URL validation result:", validationResult);

    if (!validationResult.isValid) {
      console.error("TabBoost:", getMessage("urlValidationFailed", validationResult.reason));
      chrome.tabs.create({ url });
      return {
        status: "opened_in_new_tab_due_to_validation",
        message: getMessage("openedInNewTabSecurity", validationResult.reason),
      };
    }

    url = validationResult.sanitizedUrl;

    // 检查URL是否可以在iframe中加载
    console.log("TabBoost: Checking if URL can be loaded in iframe:", url);
    const canLoad = await canLoadInIframe(url);
    console.log("TabBoost: Can load in iframe result:", canLoad);

    if (!canLoad) {
      console.log("TabBoost: URL cannot be loaded in iframe, opening in new tab");
      chrome.tabs.create({ url });
      return {
        status: "opened_in_new_tab",
        message: getMessage("cannotLoadInSplitView"),
      };
    }

    // 获取当前标签页
    console.log("TabBoost: Getting current tab");
    const currentTab = await getCachedCurrentTab();
    console.log("TabBoost: Current tab:", currentTab?.id);

    if (!currentTab) {
      console.error("TabBoost: Failed to get current tab");
      throw new Error(getMessage("getCurrentTabError"));
    }

    try {
      // 检查分屏视图是否已经激活
      console.log("TabBoost: Checking if split view is already active");
      const [isActive] = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => {
          console.log("TabBoost: Checking for split view container in page");
          const container = document.getElementById("tabboost-split-view-container");
          console.log("TabBoost: Split view container exists:", container !== null);
          return container !== null;
        },
      });

      console.log("TabBoost: Split view active check result:", isActive.result);

      if (isActive.result) {
        // 分屏视图已激活，更新右侧视图
        console.log("TabBoost: Split view is active, updating right view with URL:", url);
        await updateRightView(url);
        return { status: getMessage("rightSplitViewUpdated") };
      } else {
        // 分屏视图未激活，创建新的分屏视图
        console.log("TabBoost: Split view is not active, creating new split view");
        await createSplitView();
        console.log("TabBoost: Split view created, waiting before updating right view");
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log("TabBoost: Updating right view with URL:", url);
        await updateRightView(url);
        return { status: getMessage("splitViewCreatedAndUpdated") };
      }
    } catch (error) {
      console.error("TabBoost: Error in split view creation/update:", error);

      try {
        console.log("TabBoost: Attempting to close split view and open URL in new tab");
        await closeSplitView();
        chrome.tabs.create({ url });
        return {
          status: "opened_in_new_tab_after_error",
          message: getMessage("splitViewCreationFailed"),
        };
      } catch (cleanupError) {
        console.error("TabBoost: Error during recovery:", cleanupError);
        chrome.tabs.create({ url });
        return {
          status: "recovery_failed",
          message: getMessage("recoveryFailed"),
        };
      }
    }
  } catch (error) {
    console.error("TabBoost: Unhandled error in handleSplitViewRequest:", error);
    throw error;
  }
}
