import { getCurrentTab } from "../../utils/utils.js";
import splitViewState from "./splitViewState.js";

const SPLIT_VIEW_NAMESPACE = "tabboost.splitView";

splitViewState.init().catch((error) => {
  console.error("Failed to initialize split view state:", error);
});

function isNoReceiverError(error) {
  if (!error) {
    return false;
  }

  const message = typeof error === "string" ? error : error.message;
  return (
    typeof message === "string" &&
    message.includes("Could not establish connection")
  );
}

function sendSplitViewCommand(tabId, command, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      {
        namespace: SPLIT_VIEW_NAMESPACE,
        command,
        payload,
      },
      (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        resolve(response);
      }
    );
  });
}

export async function createSplitView() {
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab || !currentTab.id) {
      console.error(
        "TabBoost: Unable to determine current tab when creating split view"
      );
      return false;
    }

    const leftUrl = currentTab.url;
    if (!leftUrl || leftUrl === "about:blank") {
      console.error("TabBoost: Left URL is not usable for split view");
      return false;
    }

    const response = await sendSplitViewCommand(currentTab.id, "init", {
      leftUrl,
    });
    if (!response || response.success !== true) {
      throw new Error(response?.error || "split-view-init-failed");
    }

    splitViewState.activate(leftUrl);
    return true;
  } catch (error) {
    if (!isNoReceiverError(error)) {
      console.error("TabBoost: Failed to create split view:", error);
    }
    splitViewState.deactivate();
    return false;
  }
}

export async function closeSplitView() {
  if (!splitViewState.getState().isActive) {
    return true;
  }

  try {
    const currentTab = await getCurrentTab();
    if (!currentTab || !currentTab.id) {
      console.error(
        "TabBoost: Unable to determine current tab when closing split view"
      );
      return false;
    }

    const response = await sendSplitViewCommand(currentTab.id, "teardown");
    if (response?.success || response?.alreadyInactive) {
      splitViewState.deactivate();
      return true;
    }

    throw new Error(response?.error || "split-view-teardown-failed");
  } catch (error) {
    if (!isNoReceiverError(error)) {
      console.error("TabBoost: Failed to close split view:", error);
    }
    splitViewState.deactivate();
    return false;
  }
}

export async function toggleSplitView() {
  if (splitViewState.getState().isActive) {
    return closeSplitView();
  }

  return createSplitView();
}

export async function updateRightView(url) {
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab || !currentTab.id) {
      console.error(
        "TabBoost: Unable to determine current tab when updating split view"
      );
      return false;
    }

    const leftUrl = splitViewState.getState().leftUrl || currentTab.url;
    const response = await sendSplitViewCommand(currentTab.id, "updateRight", {
      url,
      leftUrl,
    });

    if (!response || response.success !== true) {
      throw new Error(response?.error || "split-view-update-failed");
    }

    splitViewState.activate(leftUrl);
    splitViewState.setRightUrl(url);
    return true;
  } catch (error) {
    console.error("TabBoost: Failed to update right split view:", error);

    try {
      await chrome.tabs.create({ url });
      return true;
    } catch (fallbackError) {
      console.error("TabBoost: Failed to open fallback tab:", fallbackError);
      return false;
    }
  }
}

export function getSplitViewState() {
  return splitViewState.getState();
}

export function initSplitViewModule() {
  splitViewState.init();
}

export async function querySplitViewStatus() {
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab || !currentTab.id) {
      return { isActive: false };
    }

    const response = await sendSplitViewCommand(currentTab.id, "status");
    return response?.status || { isActive: false };
  } catch (error) {
    if (!isNoReceiverError(error)) {
      console.warn("TabBoost: Unable to query split view status:", error);
    }
    return { isActive: false, error: error?.message };
  }
}

export default {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
  getSplitViewState,
  initSplitViewModule,
  querySplitViewStatus,
};
