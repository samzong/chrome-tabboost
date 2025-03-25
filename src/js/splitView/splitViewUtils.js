// splitViewUtils.js - 分屏视图通用工具函数

/**
 * 安全地查询DOM元素
 * 防止因特定元素不存在而导致错误
 * @param {string} selector - CSS选择器
 * @param {Element} [context=document] - 查询上下文
 * @returns {Element|null} - 查询到的元素或null
 */
export function safeQuerySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (e) {
    console.warn(`查询元素 ${selector} 失败:`, e);
    return null;
  }
}

/**
 * 安全地查询多个DOM元素
 * @param {string} selector - CSS选择器
 * @param {Element} [context=document] - 查询上下文
 * @returns {Array} - 查询到的元素数组
 */
export function safeQuerySelectorAll(selector, context = document) {
  try {
    return Array.from(context.querySelectorAll(selector));
  } catch (e) {
    console.warn(`查询元素集合 ${selector} 失败:`, e);
    return [];
  }
}

/**
 * 安全地添加事件监听器
 * @param {Element} element - DOM元素
 * @param {string} eventType - 事件类型
 * @param {Function} handler - 事件处理函数
 * @returns {boolean} - 是否成功添加
 */
export function safeAddEventListener(element, eventType, handler) {
  try {
    if (element) {
      element.addEventListener(eventType, handler);
      return true;
    }
    return false;
  } catch (e) {
    console.warn(`为元素添加${eventType}事件失败:`, e);
    return false;
  }
}

/**
 * 安全地移除事件监听器
 * @param {Element} element - DOM元素
 * @param {string} eventType - 事件类型
 * @param {Function} handler - 事件处理函数
 * @returns {boolean} - 是否成功移除
 */
export function safeRemoveEventListener(element, eventType, handler) {
  try {
    if (element) {
      element.removeEventListener(eventType, handler);
      return true;
    }
    return false;
  } catch (e) {
    console.warn(`从元素移除${eventType}事件失败:`, e);
    return false;
  }
}

/**
 * 提取URL中的域名
 * @param {string} url - 完整URL
 * @returns {string} - 域名
 */
export function extractHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    console.warn("URL解析错误:", e);
    return "";
  }
}

/**
 * 安全地解析URL
 * @param {string} url - URL字符串
 * @returns {URL|null} - URL对象或null
 */
export function safeParseURL(url) {
  try {
    return new URL(url);
  } catch (e) {
    console.warn("URL解析错误:", url, e);
    return null;
  }
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间(毫秒)
 * @returns {Function} - 防抖处理后的函数
 */
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 时间限制(毫秒)
 * @returns {Function} - 节流处理后的函数
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 安全地获取iframe内容
 * @param {HTMLIFrameElement} iframe - iframe元素
 * @returns {Document|null} - iframe的document或null
 */
export function safeGetIframeContent(iframe) {
  try {
    // 确保iframe存在且已加载
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
      return null;
    }
    return iframe.contentDocument;
  } catch (e) {
    // 可能因为跨域限制无法访问内容
    console.warn("获取iframe内容失败:", e);
    return null;
  }
}

/**
 * 检测iframe是否加载了错误页面
 * @param {HTMLIFrameElement} iframe - iframe元素
 * @returns {boolean} - 是否为错误页面
 */
export function detectIframeError(iframe) {
  try {
    const doc = safeGetIframeContent(iframe);
    if (!doc) return false;
    
    const content = doc.documentElement.innerHTML || '';
    // 检查常见错误模式
    return content.includes('refused to connect') || 
           content.includes('拒绝连接') ||
           content.includes('ERR_CONNECTION_REFUSED') ||
           content.includes('ERR_BLOCKED_BY_RESPONSE') ||
           content.includes('ERR_CONTENT_SECURITY_POLICY');
  } catch (e) {
    // 跨域错误通常表明iframe加载了内容，但我们无法访问它
    return false;
  }
} 