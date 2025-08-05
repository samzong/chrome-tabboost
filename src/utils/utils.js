export async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

import { getMessage } from "./i18n.js";

export async function showNotification(message) {
  try {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["notificationsEnabled"], (result) => {
        const notificationsEnabled =
          result.notificationsEnabled !== undefined
            ? result.notificationsEnabled
            : true;

        if (!notificationsEnabled) {
          resolve();
          return;
        }

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
    });
  } catch (error) {}
}

import { SecurityValidator } from "./securityValidator.js";

/**
 * Verify if the URL is safe and valid
 * @param {string} url
 * @returns {{isValid: boolean, sanitizedUrl: string, message: string, reason?: string}}
 */
export function validateUrl(url) {
  const validation = SecurityValidator.validateUrl(url);

  return {
    isValid: validation.isValid,
    sanitizedUrl: validation.sanitizedUrl || "",
    message:
      validation.reason || (validation.isValid ? "Valid URL" : "Invalid URL"),
    reason: validation.reason,
  };
}

/**
 * Legacy validation function for backward compatibility
 * @deprecated Use validateUrl instead
 */
export function validateUrlLegacy(url) {
  if (!url || typeof url !== "string") {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "URL must be a non-empty string",
    };
  }

  url = url.trim();

  if (url.length === 0) {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "URL cannot be empty",
    };
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (url.includes("://")) {
      return {
        isValid: false,
        sanitizedUrl: "",
        message: "Only HTTP and HTTPS protocols are allowed",
      };
    }
    url = "https://" + url;
  }

  try {
    const urlObj = new URL(url);

    const pathname = urlObj.pathname.toLowerCase();
    if (EXCLUDED_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
      return {
        isValid: false,
        sanitizedUrl: "",
        message: "This file type is not supported",
      };
    }

    if (DANGEROUS_URL_PATTERNS.length > 0) {
      const fullUrl = urlObj.href.toLowerCase();
      if (DANGEROUS_URL_PATTERNS.some((pattern) => fullUrl.includes(pattern))) {
        return {
          isValid: false,
          sanitizedUrl: "",
          message: "URL contains potential dangerous patterns",
        };
      }
    }

    return {
      isValid: true,
      sanitizedUrl: urlObj.href,
      message: "Valid URL",
    };
  } catch (error) {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "Invalid URL format",
    };
  }
}
