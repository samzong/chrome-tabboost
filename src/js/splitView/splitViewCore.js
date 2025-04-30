import { getCurrentTab } from "../../utils/utils.js";
import storageCache from "../../utils/storage-cache.js";
import { canLoadInIframe } from "./splitViewURLValidator.js";
import { initSplitViewDOM, removeSplitViewDOM, updateRightViewDOM } from "./splitViewDOM.js";
import { setupSplitViewEvents, cleanupSplitViewEvents } from "./splitViewEvents.js";

storageCache.init().catch(error => {
  console.error("splitView: Failed to initialize storage cache:", error);
});

let isSplitViewActive = false;
let leftUrl = "";
let rightUrl = "";

export async function createSplitView() {
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      return;
    }

    leftUrl = currentTab.url;

    if (!leftUrl || leftUrl === 'about:blank') {
      console.error("Invalid page URL");
      return;
    }

    try {
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: initSplitViewDOM,
        args: [leftUrl]
      });
      
      isSplitViewActive = true;
    } catch (e) {
      console.error("Failed to execute split view script:", e);
      setTimeout(() => {
        try {
          chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: initSplitViewDOM,
            args: [leftUrl]
          });
          
          isSplitViewActive = true;
        } catch (retryError) {
          console.error("Failed to retry execute split view script:", retryError);
        }
      }, 500);
    }
  } catch (error) {
    console.error("Failed to create split view:", error);
  }
}

export async function closeSplitView() {
  if (!isSplitViewActive) return;
  
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("Failed to get current tab");
      return;
    }

    try {
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: removeSplitViewDOM
      });
      
      isSplitViewActive = false;
    } catch (e) {
      console.error("Failed to execute restore page script:", e);
      
      try {
        chrome.tabs.reload(currentTab.id);
        isSplitViewActive = false;
      } catch (reloadError) {
        console.error("Failed to reload page:", reloadError);
      }
    }
  } catch (error) {
    console.error("Failed to close split view:", error);
  }
}

export async function toggleSplitView() {
  if (isSplitViewActive) {
    await closeSplitView();
  } else {
    await createSplitView();
  }
}

export async function updateRightView(url) {
  if (!isSplitViewActive) return;
  
  rightUrl = url;
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("Failed to get current tab");
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      function: updateRightViewDOM,
      args: [url]
    });
  } catch (error) {
    console.error("Failed to update right view:", error);
  }
}

export function getSplitViewState() {
  return {
    isActive: isSplitViewActive,
    leftUrl: leftUrl,
    rightUrl: rightUrl
  };
}

export function initSplitViewModule() {
}

export default {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
  getSplitViewState,
  initSplitViewModule
}; 