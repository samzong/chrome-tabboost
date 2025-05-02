import { getCurrentTab, showNotification } from "../utils/utils.js";
import { localizePage, getMessage } from "../utils/i18n.js";

document.addEventListener("DOMContentLoaded", () => {
  localizePage();

  const duplicateTabButton = document.getElementById("duplicateTabButton");
  const copyUrlButton = document.getElementById("copyUrlButton");
  const openOptionsButton = document.getElementById("openOptionsButton");

  duplicateTabButton.addEventListener("click", async () => {
    let currentTab = await getCurrentTab();
    if (currentTab) {
      chrome.tabs.duplicate(currentTab.id);
    }
    window.close();
  });

  copyUrlButton.addEventListener("click", async () => {
    let currentTab = await getCurrentTab();
    if (currentTab) {
      try {
        await navigator.clipboard.writeText(currentTab.url);
        showNotification(getMessage("urlCopied"));
      } catch (err) {
        console.error("Copy failed: ", err);
        showNotification(getMessage("urlCopyFailed"));
      }
    }
    window.close();
  });

  openOptionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
