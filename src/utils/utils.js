export { validateUrl } from "./url-validation.js";

export async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

import { getMessage } from "./i18n.js";
import storageCache from "./storage-cache.js";

export async function showNotification(message) {
  try {
    const { notificationsEnabled } = await storageCache.get({
      notificationsEnabled: true,
    });

    if (!notificationsEnabled) {
      return;
    }

    return new Promise((resolve) => {
      chrome.notifications.create(
        {
          type: "basic",
          iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
          title: getMessage("appName") || "TabBoost",
          message: message,
          priority: 2,
          requireInteraction: true,
        },
        function (notificationId) {
          setTimeout(() => {
            chrome.notifications.clear(notificationId);
            resolve();
          }, 3000);
        }
      );
    });
  } catch (error) {
    console.error("Error displaying notification:", error);
  }
}
