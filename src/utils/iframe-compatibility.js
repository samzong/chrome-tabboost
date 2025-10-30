import storageCache from "./storage-cache.js";
import { validateUrl } from "./utils.js";
import { EXCLUDED_EXTENSIONS } from "../config/constants.js";

let userConfigCache = {
  headerModificationEnabled: true,
  lastUpdated: 0,
};

const CONFIG_CACHE_TTL = 60 * 1000;

/**
 * 检查URL是否为排除的文件类型
 * @param {string} url - 要检查的URL
 * @returns {boolean} 是否为排除的文件类型
 */
function isExcludedFileType(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    return EXCLUDED_EXTENSIONS.some((ext) => path.endsWith(ext));
  } catch (e) {
    return false;
  }
}

/**
 * 更新用户配置缓存
 */
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
    console.error("iframe compatibility: 更新用户配置缓存失败:", error);
  }
}

/**
 * 统一的iframe加载检查函数
 * 检查URL是否可以在iframe中加载（用于popup和splitView）
 *
 * @param {string} url - 要检查的URL
 * @param {Object} options - 选项
 * @param {boolean} options.isPopup - 是否为弹窗模式（而非分屏模式）
 * @returns {Promise<boolean>} 是否可以在iframe中加载
 */
export async function canLoadInIframe(url, options = {}) {
  try {
    // 基本URL验证
    const validationResult = validateUrl(url);
    if (!validationResult.isValid) {
      return false;
    }

    url = validationResult.sanitizedUrl;

    // 检查是否为排除的文件类型
    if (isExcludedFileType(url)) {
      console.log(`TabBoost: 排除文件类型: ${url}`);
      return false;
    }

    // 更新用户配置缓存
    await updateUserConfigCache();

    // 如果是popup模式，检查headerModificationEnabled设置
    // 分屏模式下总是允许尝试加载（会自动使用declarativeNetRequest规则）
    if (options.isPopup) {
      return userConfigCache.headerModificationEnabled;
    }

    // 由于使用declarativeNetRequest处理响应头
    // 可以假设URL是可加载的，只要它不是禁止的文件类型
    return true;
  } catch (error) {
    console.error("TabBoost: canLoadInIframe出错:", error);
    return false;
  }
}
