// iframe-compatibility.js - 统一的iframe兼容性检查模块

import storageCache from "./storage-cache.js";
import { validateUrl } from "./utils.js";
import { DANGEROUS_PROTOCOLS, DANGEROUS_URL_PATTERNS, RESTRICTED_DOMAINS } from "../config/constants.js";

// 缓存用户配置
let userConfigCache = {
  iframeIgnoreEnabled: false,
  iframeIgnoreList: [],
  lastUpdated: 0
};

// 配置缓存有效期（毫秒）
const CONFIG_CACHE_TTL = 60 * 1000; // 1分钟

/**
 * 检查域名是否匹配规则
 * @param {string} hostname 待检查的域名
 * @param {string} rule 匹配规则，支持 *.domain.com 或 domain.com 格式
 * @returns {boolean} 是否匹配
 */
function isDomainMatch(hostname, rule) {
  // 转换为小写以消除大小写差异
  hostname = hostname.toLowerCase();
  rule = rule.toLowerCase();

  // 如果规则以 *. 开头，是通配符匹配 (*.example.com)
  if (rule.startsWith('*.')) {
    const baseDomain = rule.substring(2); // 去掉 *. 前缀
    
    // 只匹配子域名，不匹配基础域名本身
    // 必须以.baseDomain结尾且前面有内容
    return hostname.endsWith('.' + baseDomain) && 
           hostname.length > baseDomain.length + 1;
  } 
  // 精确匹配 - 只匹配完全相同的域名
  else {
    return hostname === rule;
  }
}

// 更新用户配置缓存
async function updateUserConfigCache() {
  try {
    // 检查缓存是否过期
    const now = Date.now();
    if (now - userConfigCache.lastUpdated > CONFIG_CACHE_TTL) {
      const result = await storageCache.get({
        iframeIgnoreEnabled: false,
        iframeIgnoreList: []
      });
      
      userConfigCache = {
        iframeIgnoreEnabled: result.iframeIgnoreEnabled,
        iframeIgnoreList: result.iframeIgnoreList || [],
        lastUpdated: now
      };
    }
  } catch (error) {
    console.error("iframe兼容性: 更新用户配置缓存失败:", error);
  }
}

/**
 * 检查是否可以在iframe中加载URL
 * @param {string} url 要检查的URL
 * @param {Object} options 可选参数
 * @param {boolean} options.isPopup 是否为弹窗模式
 * @returns {Promise<boolean>} 是否可以在iframe中加载
 */
export async function canLoadInIframe(url, options = {}) {
  const mode = options.isPopup ? "弹窗" : "分屏视图";
  try {
    // 使用通用URL验证函数进行安全检查
    const validationResult = validateUrl(url);
    
    // 如果URL不安全，记录原因并返回false
    if (!validationResult.isValid) {
      return false;
    }
    
    // 使用经过安全处理的URL
    url = validationResult.sanitizedUrl;
    
    try {
      const urlObj = new URL(url);
      
      // 获取域名
      const hostname = urlObj.hostname;
      
      // 检查是否在默认限制列表中，使用匹配函数
      if (RESTRICTED_DOMAINS.some(domain => isDomainMatch(hostname, domain))) {
        return false;
      }
      
      // 更新用户配置缓存
      await updateUserConfigCache();
      
      // 如果功能未启用，直接返回true
      if (!userConfigCache.iframeIgnoreEnabled) {
        return true;
      }
      
      // 如果忽略列表不存在或为空，直接返回true
      if (!userConfigCache.iframeIgnoreList || !Array.isArray(userConfigCache.iframeIgnoreList) || userConfigCache.iframeIgnoreList.length === 0) {
        return true;
      }
      
      // 检查域名是否在忽略列表中，使用匹配函数
      const isIgnored = userConfigCache.iframeIgnoreList.some(domain => isDomainMatch(hostname, domain));
      return !isIgnored;
    } catch (e) {
      return false; // URL无效，不尝试加载
    }
  } catch (error) {
    return false; // 出错时不尝试加载
  }
}

// 仅导出此模块特有的函数
export { isDomainMatch }; 