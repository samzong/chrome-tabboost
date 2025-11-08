import {
  getCurrentTab,
  validateUrl,
  showNotification,
} from "../utils/utils.js";
import {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
  querySplitViewStatus,
} from "./splitView.js";
import storageCache from "../utils/storage-cache.js";
import { STORAGE_MESSAGE_ACTION, LOAD_EXTENSION_SCRIPT_ACTION } from "../utils/messageChannels.js";
import { getMessage } from "../utils/i18n.js";
import { canLoadInIframe } from "../utils/iframe-compatibility.js";
import {
  toggleMuteCurrentTab,
  toggleMuteAllAudioTabs,
} from "../utils/tab-audio.js";
import {
  DEFAULT_BLOCKLIST,
  shouldBypass,
  createEntry,
  normalizePattern,
  getEntryKey,
} from "../utils/siteBlocklist.js";

let currentTabCache = {
  tab: null,
  timestamp: 0,
};

let isDuplicatingTab = false;
let blocklistLock = false;

const TAB_CACHE_TTL = 1000;

const RULE_SETS = {
  POPUP_BYPASS: "popup_bypass_rules",
  CSP_BYPASS: "csp_bypass_rules",
};

/**
 * Enable or disable declarativeNetRequest rules according to the settings
 * @param {boolean} enabled
 */
async function updateHeaderModificationRules(enabled) {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabled
        ? [RULE_SETS.POPUP_BYPASS, RULE_SETS.CSP_BYPASS]
        : [],
      disableRulesetIds: enabled
        ? []
        : [RULE_SETS.POPUP_BYPASS, RULE_SETS.CSP_BYPASS],
    });
  } catch (error) {
    console.error("TabBoost: Failed to update rule status:", error);
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

async function updateBadgeForCurrentTab() {
  try {
    const tab = await getCurrentTab();
    if (tab) {
      await updateBadgeForTab(tab.id);
    }
  } catch (error) {
    // Ignore errors
  }
}

async function updateBadgeForTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      chrome.action.setBadgeText({ text: "", tabId });
      return;
    }

    const url = tab.url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      chrome.action.setBadgeText({ text: "", tabId });
      return;
    }

    const config = await storageCache.get({ siteBlocklistConfig: DEFAULT_BLOCKLIST });
    const blocklistConfig = config.siteBlocklistConfig || DEFAULT_BLOCKLIST;
    const entries = blocklistConfig.entries || [];
    const blocked = shouldBypass(url, entries);

    if (blocked) {
      chrome.action.setBadgeText({ text: "×", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#6b7280", tabId });
    } else {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  } catch (error) {
    // Ignore errors
  }
}

chrome.tabs.onActivated.addListener(() => {
  invalidateTabCache();
  updateBadgeForCurrentTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    invalidateTabCache();
    updateBadgeForTab(tabId);
  }
});

storageCache
  .init()
  .then(async () => {
    const { headerModificationEnabled } = await storageCache.get({
      headerModificationEnabled: true,
    });

    await updateHeaderModificationRules(headerModificationEnabled);
    await updateBadgeForCurrentTab();
  })
  .catch((error) => {
    console.error(getMessage("storageInitError"), error);
  });

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.headerModificationEnabled) {
    const newValue = changes.headerModificationEnabled.newValue;
    updateHeaderModificationRules(newValue);
  }
  if (areaName === "sync" && changes.siteBlocklistConfig) {
    updateBadgeForCurrentTab();
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
    return true;
  } catch (error) {
    console.error(getMessage("urlCopyError"), error);
    showNotification(getMessage("urlCopyFailed"));
    return false;
  }
}

function duplicateTab(tab) {
  if (isDuplicatingTab) {
    return;
  }

  try {
    isDuplicatingTab = true;

    chrome.tabs.duplicate(tab.id, () => {
      setTimeout(() => {
        isDuplicatingTab = false;
      }, 500);
    });
  } catch (error) {
    console.error("Failed to copy tab:", error);
    isDuplicatingTab = false;
  }
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
  } else if (command === "toggle-mute-current-tab") {
    const result = await toggleMuteCurrentTab();
    if (result.success) {
      showNotification(getMessage(result.muted ? "tabMuted" : "tabUnmuted"));
    }
  } else if (command === "toggle-mute-all-audio-tabs") {
    const result = await toggleMuteAllAudioTabs();
    if (result.success) {
      if (result.count === 0) {
        showNotification(getMessage("noAudioTabs"));
      } else {
        showNotification(
          getMessage(result.muted ? "allTabsMuted" : "allTabsUnmuted")
        );
      }
    }
  }
});

chrome.runtime.onMessage.addListener((request = {}, sender, sendResponse) => {
  if (request.action === STORAGE_MESSAGE_ACTION) {
    const payload = request.payload || {};
    const queryArg =
      payload.defaults !== undefined
        ? payload.defaults
        : payload.keys !== undefined
          ? payload.keys
          : undefined;

    if (queryArg === undefined) {
      sendResponse({ success: true, data: {} });
      return false;
    }

    storageCache
      .get(queryArg)
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error(
          "TabBoost: Failed to resolve shared storage request",
          error
        );
        sendResponse({
          success: false,
          error: error.message || "Unknown error",
        });
      });

    return true;
  }

  if (request.action === LOAD_EXTENSION_SCRIPT_ACTION) {
    const payload = request.payload || {};
    const url = payload.url;
    const chunkId = payload.chunkId;

    if (!url) {
      sendResponse({ success: false, error: "Missing chunk URL" });
      return false;
    }

    if (!sender.tab || typeof sender.tab.id !== "number") {
      sendResponse({ success: false, error: "Missing tab context for chunk injection" });
      return false;
    }

    let relativePath;

    try {
      const parsedUrl = new URL(url);
      relativePath = parsedUrl.pathname.replace(/^\//, "");
    } catch (error) {
      relativePath = url;
    }

    const target = {
      tabId: sender.tab.id,
    };

    if (typeof sender.frameId === "number") {
      target.frameIds = [sender.frameId];
    }

    chrome.scripting
      .executeScript({
        target,
        files: [relativePath],
        world: "ISOLATED",
        injectImmediately: true,
      })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("TabBoost: Failed to inject chunk", {
          chunkId,
          relativePath,
          error,
        });
        sendResponse({ success: false, error: error.message || "Injection failed" });
      });

    return true;
  }

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

  if (request.action === "showNotification" && request.message) {
    showNotification(request.message);
    return true;
  }

  if (request.action === "duplicateCurrentTab") {
    getCurrentTab().then((tab) => {
      if (tab) {
        duplicateTab(tab);
      }
    });
    return true;
  }

  if (request.action === "copyCurrentTabUrl") {
    getCurrentTab().then((tab) => {
      if (tab && tab.url) {
        copyTabUrl(tab).then((success) => {
          if (!success) {
            console.error("Failed to copy URL");
          }
        });
      }
    });
    return true;
  }

  if (request.action === "toggleMuteCurrentTab") {
    toggleMuteCurrentTab().then((result) => {
      if (result.success) {
        showNotification(getMessage(result.muted ? "tabMuted" : "tabUnmuted"));
        sendResponse({ success: true, muted: result.muted });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  }

  if (request.action === "toggleMuteAllAudioTabs") {
    toggleMuteAllAudioTabs().then((result) => {
      if (result.success) {
        if (result.count === 0) {
          showNotification(getMessage("noAudioTabs"));
        } else {
          showNotification(
            getMessage(result.muted ? "allTabsMuted" : "allTabsUnmuted")
          );
        }
        sendResponse({
          success: true,
          muted: result.muted,
          count: result.count,
        });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  }

  if (request.action === "openInSplitView" && request.url) {
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

  if (request.action === "getSiteBlocklistConfig") {
    storageCache
      .get({ siteBlocklistConfig: DEFAULT_BLOCKLIST })
      .then((data) => {
        sendResponse({ success: true, config: data.siteBlocklistConfig || DEFAULT_BLOCKLIST });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === "setSiteBlocklistConfig") {
    const { config } = request;
    if (blocklistLock) {
      sendResponse({ success: false, error: "Operation in progress" });
      return true;
    }

    if (!config || !Array.isArray(config.entries)) {
      sendResponse({ success: false, error: "Invalid config" });
      return true;
    }

    if (config.entries.length > 200) {
      sendResponse({ success: false, error: "Too many entries (max 200)" });
      return true;
    }

    blocklistLock = true;
    storageCache
      .set({ siteBlocklistConfig: config })
      .then(() => {
        sendResponse({ success: true });
        updateBadgeForCurrentTab();
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      })
      .finally(() => {
        blocklistLock = false;
      });
    return true;
  }

  if (request.action === "addSiteToBlocklist") {
    const { domain } = request;
    if (!domain) {
      sendResponse({ success: false, error: "Missing domain" });
      return true;
    }

    if (blocklistLock) {
      sendResponse({ success: false, error: "Operation in progress" });
      return true;
    }
    blocklistLock = true;

    storageCache
      .get({ siteBlocklistConfig: DEFAULT_BLOCKLIST })
      .then((data) => {
        const config = data.siteBlocklistConfig || DEFAULT_BLOCKLIST;
        const entries = config.entries || [];
        const newEntry = createEntry(domain);
        if (!newEntry) {
          sendResponse({ success: false, error: "Invalid domain" });
          return;
        }

        if (entries.some((entry) => getEntryKey(entry) === newEntry.key)) {
          sendResponse({ success: false, error: "Already in blocklist" });
          return;
        }

        const newConfig = {
          ...config,
          entries: [...entries, newEntry],
        };

        storageCache.set({ siteBlocklistConfig: newConfig })
          .then(() => {
            sendResponse({ success: true });
            updateBadgeForCurrentTab();
          })
          .catch((error) => {
            sendResponse({ success: false, error: error.message });
          });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      })
      .finally(() => {
        blocklistLock = false;
      });
    return true;
  }

  if (request.action === "isTabBlocked") {
    const { url } = request;
    if (!url) {
      sendResponse({ success: false, blocked: false });
      return true;
    }

    storageCache
      .get({ siteBlocklistConfig: DEFAULT_BLOCKLIST })
      .then((data) => {
        const config = data.siteBlocklistConfig || DEFAULT_BLOCKLIST;
        const entries = config.entries || [];
        const blocked = shouldBypass(url, entries);
        sendResponse({ success: true, blocked });
      })
      .catch(() => {
        sendResponse({ success: false, blocked: false });
      });
    return true;
  }

  if (request.action === "removeSiteFromBlocklist") {
    const { domain } = request;
    if (!domain) {
      sendResponse({ success: false, error: "Missing domain" });
      return true;
    }

    if (blocklistLock) {
      sendResponse({ success: false, error: "Operation in progress" });
      return true;
    }
    blocklistLock = true;

    storageCache
      .get({ siteBlocklistConfig: DEFAULT_BLOCKLIST })
      .then((data) => {
        const config = data.siteBlocklistConfig || DEFAULT_BLOCKLIST;
        const entries = config.entries || [];
        const targetEntry = createEntry(domain);
        if (!targetEntry) {
          sendResponse({ success: false, error: "Invalid domain" });
          return;
        }

        const targetKey = targetEntry.key;
        const filteredEntries = entries.filter(
          (e) => getEntryKey(e) !== targetKey
        );

        if (filteredEntries.length === entries.length) {
          sendResponse({ success: false, error: "Domain not in blocklist" });
          return;
        }

        const newConfig = {
          ...config,
          entries: filteredEntries,
        };

        storageCache.set({ siteBlocklistConfig: newConfig })
          .then(() => {
            sendResponse({ success: true });
            updateBadgeForCurrentTab();
          })
          .catch((error) => {
            sendResponse({ success: false, error: error.message });
          });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      })
      .finally(() => {
        blocklistLock = false;
      });
    return true;
  }
});

async function handleSplitViewRequest(url) {
  try {
    const validationResult = validateUrl(url);
    if (!validationResult.isValid) {
      throw new Error(validationResult.reason || "Invalid URL");
    }

    const canLoad = await canLoadInIframe(url);
    if (!canLoad) {
      chrome.tabs.create({ url });
      return {
        status: "opened_in_new_tab",
        message: getMessage("cantLoadInIframeMessage"),
      };
    }

    const currentTab = await getCurrentTab();
    if (!currentTab || !currentTab.id) {
      throw new Error("Failed to get current tab");
    }

    const status = await querySplitViewStatus();
    const updated = await updateRightView(url);

    if (!updated) {
      throw new Error("split-view-update-failed");
    }

    const wasActive = Boolean(status?.isActive);
    return {
      status: "success",
      message: wasActive
        ? getMessage("splitViewUpdatedStatus")
        : getMessage("splitViewCreatedStatus"),
    };
  } catch (error) {
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
