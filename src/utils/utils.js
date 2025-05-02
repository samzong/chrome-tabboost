export async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

import { getMessage } from "./i18n.js";

export function showNotification(message) {
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
      title: getMessage("appName") || "TabBoost",
      message: message,
    },
    function (notificationId) {
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 500);
    }
  );
}

import { DANGEROUS_PROTOCOLS, DANGEROUS_URL_PATTERNS } from "../config/constants.js";

/**
 * Check if the URL is safe, prevent malicious URLs and XSS attacks
 * @param {string} url - The URL to validate
 * @returns {Object} - Object containing validation results {isValid: boolean, reason: string, sanitizedUrl: string}
 */
export function validateUrl(url) {
  const result = {
    isValid: false,
    reason: "",
    sanitizedUrl: "",
  };

  try {
    if (!url || typeof url !== "string") {
      result.reason = getMessage("urlValidationErrorEmpty");
      return result;
    }

    const decodedUrl = (() => {
      try {
        return decodeURIComponent(url);
      } catch (e) {
        result.reason = getMessage("urlValidationErrorDecoding");
        return url;
      }
    })();

    if (DANGEROUS_URL_PATTERNS.some((pattern) => pattern.test(decodedUrl))) {
      result.reason = getMessage("urlValidationErrorDangerousPattern");
      return result;
    }

    try {
      url = decodeURIComponent(encodeURIComponent(url));
    } catch (error) {
      result.reason = getMessage("urlValidationErrorNormalization");
      return result;
    }

    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      result.reason = getMessage("urlValidationErrorInvalidFormat");
      return result;
    }

    const protocol = urlObj.protocol.toLowerCase();

    if (protocol !== "http:" && protocol !== "https:") {
      result.reason = getMessage("urlValidationErrorUnsupportedProtocol", protocol);
      return result;
    }

    if (DANGEROUS_PROTOCOLS.some((p) => url.toLowerCase().startsWith(p))) {
      result.reason = getMessage("urlValidationErrorDangerousProtocol", protocol);
      return result;
    }

    const fullPath = `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
    if (DANGEROUS_URL_PATTERNS.some((pattern) => pattern.test(fullPath))) {
      result.reason = getMessage("urlValidationErrorDangerousPath", fullPath);
      return result;
    }

    result.isValid = true;
    result.sanitizedUrl = encodeURI(decodeURI(url));
    return result;
  } catch (error) {
    result.reason = getMessage("urlValidationErrorGeneric", error.message);
    return result;
  }
}
