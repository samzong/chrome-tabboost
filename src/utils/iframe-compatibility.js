import storageCache from "./storage-cache.js";
import { validateUrl } from "./utils.js";
import { EXCLUDED_EXTENSIONS } from "../config/constants.js";

let userConfigCache = {
  headerModificationEnabled: true,
  lastUpdated: 0,
};

const CONFIG_CACHE_TTL = 60 * 1000;

function isExcludedFileType(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    return EXCLUDED_EXTENSIONS.some((ext) => path.endsWith(ext));
  } catch (e) {
    return false;
  }
}

async function updateUserConfigCache() {
  try {
    const now = Date.now();
    if (now - userConfigCache.lastUpdated > CONFIG_CACHE_TTL) {
      const result = await storageCache.get({
        headerModificationEnabled: true,
      });

      userConfigCache = {
        headerModificationEnabled:
          result.headerModificationEnabled !== undefined
            ? result.headerModificationEnabled
            : true,
        lastUpdated: now,
      };
    }
  } catch (error) {
    console.error(
      "iframe compatibility: Failed to update user config cache:",
      error
    );
  }
}

export async function canLoadInIframe(url, options = {}) {
  try {
    const validationResult = validateUrl(url);
    if (!validationResult.isValid) {
      return false;
    }

    url = validationResult.sanitizedUrl;

    if (isExcludedFileType(url)) {
      return false;
    }

    await updateUserConfigCache();

    if (options.isPopup) {
      return userConfigCache.headerModificationEnabled;
    }

    return true;
  } catch (error) {
    console.error("TabBoost: canLoadInIframe error:", error);
    return false;
  }
}
