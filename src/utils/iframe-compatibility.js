import storageCache from "./storage-cache.js";
import { validateUrl } from "./utils.js";
import {
  DANGEROUS_PROTOCOLS,
  DANGEROUS_URL_PATTERNS,
  RESTRICTED_DOMAINS,
} from "../config/constants.js";

let userConfigCache = {
  iframeIgnoreEnabled: false,
  iframeIgnoreList: [],
  lastUpdated: 0,
};

const CONFIG_CACHE_TTL = 60 * 1000;

/**
 * Check if the hostname matches the rule
 * @param {string} hostname - The hostname to check
 * @param {string} rule - The matching rule, supports *.domain.com or domain.com format
 * @returns {boolean} Whether it matches
 */
function isDomainMatch(hostname, rule) {
  hostname = hostname.toLowerCase();
  rule = rule.toLowerCase();

  if (rule.startsWith("*.")) {
    const baseDomain = rule.substring(2);

    return hostname.endsWith("." + baseDomain) && hostname.length > baseDomain.length + 1;
  } else {
    return hostname === rule;
  }
}

async function updateUserConfigCache() {
  try {
    const now = Date.now();
    if (now - userConfigCache.lastUpdated > CONFIG_CACHE_TTL) {
      const result = await storageCache.get({
        iframeIgnoreEnabled: false,
        iframeIgnoreList: [],
      });

      userConfigCache = {
        iframeIgnoreEnabled: result.iframeIgnoreEnabled,
        iframeIgnoreList: result.iframeIgnoreList || [],
        lastUpdated: now,
      };
    }
  } catch (error) {
    console.error("iframe compatibility: Failed to update user config cache:", error);
  }
}

/**
 * Check if the URL can be loaded in an iframe
 * @param {string} url - The URL to check
 * @param {Object} options - Optional parameters
 * @param {boolean} options.isPopup - Whether it is a popup mode
 * @returns {Promise<boolean>} Whether it can be loaded in an iframe
 */
export async function canLoadInIframe(url) {
  try {
    const validationResult = validateUrl(url);

    if (!validationResult.isValid) {
      return false;
    }

    url = validationResult.sanitizedUrl;

    try {
      const urlObj = new URL(url);

      const hostname = urlObj.hostname;

      if (RESTRICTED_DOMAINS.some((domain) => isDomainMatch(hostname, domain))) {
        return false;
      }

      await updateUserConfigCache();

      if (!userConfigCache.iframeIgnoreEnabled) {
        return true;
      }

      if (
        !userConfigCache.iframeIgnoreList ||
        !Array.isArray(userConfigCache.iframeIgnoreList) ||
        userConfigCache.iframeIgnoreList.length === 0
      ) {
        return true;
      }

      const isIgnored = userConfigCache.iframeIgnoreList.some((domain) =>
        isDomainMatch(hostname, domain)
      );
      return !isIgnored;
    } catch (e) {
      return false;
    }
  } catch (error) {
    return false;
  }
}

export { isDomainMatch };
