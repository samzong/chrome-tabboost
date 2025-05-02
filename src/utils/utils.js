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

import {
  DANGEROUS_PROTOCOLS,
  DANGEROUS_URL_PATTERNS,
} from "../config/constants.js";

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
      return invalidateUrl(result, "urlValidationErrorEmpty");
    }

    let decodedUrl;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch (e) {
      return invalidateUrl(result, "urlValidationErrorDecoding");
    }

    if (DANGEROUS_URL_PATTERNS.some((pattern) => pattern.test(decodedUrl))) {
      return invalidateUrl(result, "urlValidationErrorDangerousPattern");
    }

    try {
      url = decodeURIComponent(encodeURIComponent(url));
    } catch (error) {
      return invalidateUrl(result, "urlValidationErrorNormalization");
    }

    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return invalidateUrl(result, "urlValidationErrorInvalidFormat");
    }

    const protocol = urlObj.protocol.toLowerCase();

    if (protocol !== "http:" && protocol !== "https:") {
      return invalidateUrl(result, "urlValidationErrorUnsupportedProtocol", protocol);
    }

    if (DANGEROUS_PROTOCOLS.some((p) => url.toLowerCase().startsWith(p))) {
      return invalidateUrl(result, "urlValidationErrorDangerousProtocol", protocol);
    }

    const fullPath = `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
    if (DANGEROUS_URL_PATTERNS.some((pattern) => pattern.test(fullPath))) {
      return invalidateUrl(result, "urlValidationErrorDangerousPath", fullPath);
    }

    result.isValid = true;
    result.sanitizedUrl = encodeURI(decodeURI(url));
    return result;
  } catch (error) {
    return invalidateUrl(result, "urlValidationErrorGeneric", error.message);
  }
}

function invalidateUrl(result, errorMessageKey, ...substitutions) {
  result.reason = getMessage(errorMessageKey, substitutions);
  return result;
}
