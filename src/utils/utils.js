// 获取当前标签页
export async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  console.log("Query result:", tab); // 打印查询结果
  return tab;
}

// 显示通知
export function showNotification(message) {
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"), // 使用chrome.runtime.getURL获取正确路径
      title: "TabBoost",
      message: message,
    },
    function (notificationId) {
      // 0.5 秒后清除通知
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 500);
    }
  );
}

// 导入常量定义，而不是重复定义它们
import { DANGEROUS_PROTOCOLS, DANGEROUS_URL_PATTERNS } from "../config/constants.js";

/**
 * 检查URL是否安全，防止恶意URL和XSS攻击
 * @param {string} url - 要验证的URL
 * @returns {Object} - 包含验证结果的对象 {isValid: boolean, reason: string, sanitizedUrl: string}
 */
export function validateUrl(url) {
  const result = {
    isValid: false,
    reason: '',
    sanitizedUrl: ''
  };
  
  try {
    // 检查URL是否有效
    if (!url || typeof url !== 'string') {
      result.reason = 'URL为空或格式不正确';
      return result;
    }
    
    // 检查URL是否包含危险模式
    const decodedUrl = (() => {
      try {
        return decodeURIComponent(url);
      } catch (e) {
        result.reason = 'URL解码失败，格式不正确';
        return url; // 使用原始URL继续检查
      }
    })();
    
    if (DANGEROUS_URL_PATTERNS.some(pattern => pattern.test(decodedUrl))) {
      result.reason = 'URL包含危险模式，可能是XSS攻击';
      return result;
    }
    
    // 尝试标准化URL
    try {
      // 规范化URL，去除异常字符
      url = decodeURIComponent(encodeURIComponent(url));
    } catch (error) {
      result.reason = 'URL标准化失败，可能是恶意构造的URL';
      return result;
    }
    
    // 检查URL格式
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      result.reason = 'URL格式无效';
      return result;
    }
    
    // 检查URL协议
    const protocol = urlObj.protocol.toLowerCase();
    
    // 只允许http和https协议
    if (protocol !== 'http:' && protocol !== 'https:') {
      result.reason = `不支持的URL协议: ${protocol}`;
      return result;
    }
    
    // 检查是否为危险协议
    if (DANGEROUS_PROTOCOLS.some(p => url.toLowerCase().startsWith(p))) {
      result.reason = '检测到危险URL协议';
      return result;
    }
    
    // 检查URL路径是否包含可疑参数或片段
    const fullPath = `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
    if (DANGEROUS_URL_PATTERNS.some(pattern => pattern.test(fullPath))) {
      result.reason = 'URL路径包含危险模式';
      return result;
    }
    
    // URL通过所有安全检查
    result.isValid = true;
    // 最终安全处理：编码URL以防止XSS
    result.sanitizedUrl = encodeURI(decodeURI(url));
    return result;
  } catch (error) {
    result.reason = `URL验证过程中发生错误: ${error.message}`;
    return result;
  }
}
