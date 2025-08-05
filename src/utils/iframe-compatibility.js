import storageCache from "./storage-cache.js";
import { SecurityValidator } from "./securityValidator.js";
import { ErrorHandler } from "./errorHandler.js";

let userConfigCache = {
  headerModificationEnabled: true,
  lastUpdated: 0,
};

const CONFIG_CACHE_TTL = 60 * 1000;

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
    ErrorHandler.logError(
      error,
      "iframe-compatibility.updateUserConfigCache",
      "warning"
    );
  }
}

export async function canLoadInIframe(url, options = {}) {
  try {
    // Use SecurityValidator for iframe validation
    const validationResult = SecurityValidator.validateForIframe(url);

    if (!validationResult.canLoad) {
      ErrorHandler.logError(
        new Error(`Iframe blocked: ${validationResult.reason}`),
        "iframe-compatibility.canLoadInIframe",
        validationResult.risk === "critical" ? "warning" : "info"
      );
      return false;
    }

    await updateUserConfigCache();

    // For popups, check if header modification is enabled
    if (options.isPopup) {
      // Only allow if it's a trusted domain or header modification is enabled
      const urlObj = new URL(url);
      const isTrusted = SecurityValidator.isTrustedDomain(urlObj.hostname);

      if (!isTrusted && !userConfigCache.headerModificationEnabled) {
        return false;
      }
    }

    return true;
  } catch (error) {
    ErrorHandler.logError(
      error,
      "iframe-compatibility.canLoadInIframe",
      "error"
    );
    return false;
  }
}
