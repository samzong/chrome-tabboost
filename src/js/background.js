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
      const { splitViewEnabled } = await storageCache.get({ splitViewEnabled: true });
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
    const { splitViewEnabled } = await storageCache.get({ splitViewEnabled: true });

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
    handleSplitViewRequest(request.url)
      .then((result) => sendResponse(result))
      .catch((error) => {
        try {
          chrome.tabs.create({ url: request.url });
          sendResponse({
            status: "opened_in_new_tab",
            message: getMessage("splitViewErrorFallback"),
          });
        } catch (e) {
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
    const validationResult = validateUrl(url);

    if (!validationResult.isValid) {
      console.error(getMessage("urlValidationFailed", validationResult.reason));
      chrome.tabs.create({ url });
      return {
        status: "opened_in_new_tab_due_to_validation",
        message: getMessage("openedInNewTabSecurity", validationResult.reason),
      };
    }

    url = validationResult.sanitizedUrl;

    const canLoad = await canLoadInIframe(url);
    if (!canLoad) {
      chrome.tabs.create({ url });
      return {
        status: "opened_in_new_tab",
        message: getMessage("cannotLoadInSplitView"),
      };
    }

    const currentTab = await getCachedCurrentTab();
    if (!currentTab) {
      throw new Error(getMessage("getCurrentTabError"));
    }

    try {
      const [isActive] = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => document.getElementById("tabboost-split-view-container") !== null,
      });

      if (isActive.result) {
        await updateRightView(url);
        return { status: getMessage("rightSplitViewUpdated") };
      } else {
        await createSplitView();
        await new Promise((resolve) => setTimeout(resolve, 300));
        await updateRightView(url);
        return { status: getMessage("splitViewCreatedAndUpdated") };
      }
    } catch (error) {
      console.error(getMessage("splitViewRequestError"), error);

      try {
        await closeSplitView();
        chrome.tabs.create({ url });
        return {
          status: "opened_in_new_tab_after_error",
          message: getMessage("splitViewCreationFailed"),
        };
      } catch (cleanupError) {
        console.error(getMessage("splitViewRecoveryError"), cleanupError);
        chrome.tabs.create({ url });
        return {
          status: "recovery_failed",
          message: getMessage("recoveryFailed"),
        };
      }
    }
  } catch (error) {
    console.error(getMessage("splitViewRequestError"), error);
    throw error;
  }
}
