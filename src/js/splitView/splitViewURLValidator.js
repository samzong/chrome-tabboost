// splitViewURLValidator.js - URL验证和安全检查

import storageCache from "../../utils/storageCache.js";
import { validateUrl } from "../../utils/utils.js";

// 提取常量，避免重复创建
const RESTRICTED_DOMAINS = [
  'github.com',  // 匹配所有 github.com 的子域名
  '*.facebook.com' // 匹配所有 facebook.com 的子域名
];

// 危险协议列表 - 现在从utils.js导入
const DANGEROUS_PROTOCOLS = [
  'javascript:', 
  'data:', 
  'vbscript:', 
  'file:',
  'about:',
  'blob:',
  'ftp:'
];

// 危险URL模式 - 现在从utils.js导入
const DANGEROUS_URL_PATTERNS = [
  /<script>/i,
  /javascript:/i,
  /onerror=/i,
  /onload=/i,
  /onclick=/i,
  /onmouseover=/i,
  /eval\(/i,
  /document\.cookie/i,
  /document\.domain/i,
  /document\.write/i,
  /\balert\(/i,
  /\bprompt\(/i,
  /\bconfirm\(/i,
  /fromCharCode/i,
  /&#/i,  // HTML编码
  /%3C/i  // URL编码的 < 符号
];

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
    
    // 更精确的子域名检查：
    // 1. 完全匹配基础域名
    // 2. 是子域名 (必须以.baseDomain结尾且前面有内容)
    return hostname === baseDomain || 
           (hostname.endsWith('.' + baseDomain) && 
            hostname.length > baseDomain.length + 1);
  } 
  // 否则是精确匹配
  else {
    return hostname === rule || hostname === 'www.' + rule;
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
      
      console.log("分屏视图: 用户配置缓存已更新");
    }
  } catch (error) {
    console.error("分屏视图: 更新用户配置缓存失败:", error);
  }
}

// 检查是否可以在iframe中加载URL
export async function canLoadInIframe(url) {
  try {
    // 使用通用URL验证函数进行安全检查
    const validationResult = validateUrl(url);
    
    // 如果URL不安全，记录原因并返回false
    if (!validationResult.isValid) {
      console.log(`URL验证失败: ${validationResult.reason}`);
      return false;
    }
    
    // 使用经过安全处理的URL
    url = validationResult.sanitizedUrl;
    
    try {
      const urlObj = new URL(url);
      
      // 获取域名
      const hostname = urlObj.hostname;
      
      // 检查是否在默认限制列表中，使用新的匹配函数
      if (RESTRICTED_DOMAINS.some(domain => isDomainMatch(hostname, domain))) {
        console.log(`匹配到限制域名规则: ${hostname}`);
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
      
      // 检查域名是否在忽略列表中，使用新的匹配函数
      const isIgnored = userConfigCache.iframeIgnoreList.some(domain => isDomainMatch(hostname, domain));
      return !isIgnored;
    } catch (e) {
      console.warn("URL解析错误:", e);
      return false; // URL无效，不尝试加载
    }
  } catch (error) {
    console.error("canLoadInIframe函数执行错误:", error);
    return false; // 出错时不尝试加载
  }
}

// 导出常量便于其他模块使用
export { RESTRICTED_DOMAINS, DANGEROUS_PROTOCOLS, DANGEROUS_URL_PATTERNS, isDomainMatch };