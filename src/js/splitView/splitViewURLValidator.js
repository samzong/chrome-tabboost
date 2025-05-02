import { validateUrl } from "../../utils/utils.js";
import storageCache from "../../utils/storage-cache.js";

import {
  RESTRICTED_DOMAINS,
  DANGEROUS_PROTOCOLS,
  DANGEROUS_URL_PATTERNS,
} from "../../config/constants.js";

export async function canLoadInIframe(url) {
  try {
    // Basic URL validation
    const validationResult = validateUrl(url);
    if (!validationResult.isValid) {
      console.log("URL validation failed:", validationResult.reason);
      return false;
    }

    // Check ignore list
    const { iframeIgnoreList = [] } = await storageCache.get(["iframeIgnoreList"]);
    try {
      const urlObj = new URL(url);
      if (iframeIgnoreList.includes(urlObj.hostname)) {
        console.log("URL is in ignore list:", urlObj.hostname);
        return false;
      }
    } catch (e) {
      console.error("Failed to parse URL:", e);
      return false;
    }

    // Since we're using declarativeNetRequest to handle headers,
    // we can assume the URL is loadable
    return true;
  } catch (error) {
    console.error("Error in canLoadInIframe:", error);
    return false;
  }
}

export {
  RESTRICTED_DOMAINS,
  DANGEROUS_PROTOCOLS,
  DANGEROUS_URL_PATTERNS,
};
