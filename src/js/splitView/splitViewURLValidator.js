// splitViewURLValidator.js - URL验证和安全检查

import storageCache from "../../utils/storageCache.js";
import { validateUrl } from "../../utils/utils.js";

// 提取常量，避免重复创建
const RESTRICTED_DOMAINS = [
  'accounts.google.com', 
  'mail.google.com', 
  'www.youtube.com',
  'youtube.com',
  'github.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'instagram.com',
  'netflix.com',
  'amazon.com',
  'apple.com',
  'microsoft.com',
  'login',   // 包含login的域名通常不允许iframe加载
  'signin',  // 包含signin的域名通常不允许iframe加载
  'auth',    // 包含auth的域名通常不允许iframe加载
  'account', // 包含account的域名通常不允许iframe加载
  'payment', // 支付相关
  'checkout', // 结账相关
  'banking', // 银行相关
  'wallet',  // 钱包相关
  'secure',  // 安全相关
  'admin',   // 管理后台
  'webmail', // 邮件服务
  'dashboard', // 控制面板
  'pay',     // 支付相关
  'bank',    // 银行相关
  'finance'  // 金融相关
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

const EXACT_MATCH_DOMAINS = ['x.com', 'twitter.com'];

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
      
      // 特殊处理某些已知的网站
      // 这些网站需要精确匹配，而不是部分匹配
      for (const domain of EXACT_MATCH_DOMAINS) {
        if (hostname === domain || hostname === 'www.' + domain) {
          console.log(`精确匹配到限制域名: ${domain}`);
          return false;
        }
      }
      
      // 检查是否在默认限制列表中
      if (RESTRICTED_DOMAINS.some(domain => hostname.includes(domain))) {
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
      
      // 检查域名是否在忽略列表中
      const isIgnored = userConfigCache.iframeIgnoreList.some(domain => hostname.includes(domain));
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
export { RESTRICTED_DOMAINS, EXACT_MATCH_DOMAINS, DANGEROUS_PROTOCOLS, DANGEROUS_URL_PATTERNS };