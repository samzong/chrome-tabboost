// i18n.js - 简化Chrome国际化API的使用

/**
 * 获取本地化消息
 * @param {string} messageName - 消息名称
 * @param {Array} substitutions - 替换参数（可选）
 * @returns {string} 本地化后的消息文本
 */
export function getMessage(messageName, substitutions = []) {
  return chrome.i18n.getMessage(messageName, substitutions);
}

/**
 * 获取用户当前语言
 * @returns {string} 当前语言代码
 */
export function getCurrentLanguage() {
  return chrome.i18n.getUILanguage();
}

/**
 * 替换DOM元素中的i18n占位符
 * 查找所有包含 data-i18n 属性的元素并替换为对应的本地化文本
 * @param {Element} rootElement - 根DOM元素，默认为document
 */
export function localizePage(rootElement = document) {
  const elements = rootElement.querySelectorAll('[data-i18n]');
  
  elements.forEach(element => {
    const messageName = element.getAttribute('data-i18n');
    
    if (messageName) {
      // 检查是否需要替换特定属性
      if (element.hasAttribute('data-i18n-attr')) {
        const attr = element.getAttribute('data-i18n-attr');
        element.setAttribute(attr, getMessage(messageName));
      } else {
        // 默认替换元素内容
        element.textContent = getMessage(messageName);
      }
    }
  });
}

/**
 * 本地化HTML模板字符串
 * @param {string} templateString - 包含__MSG_messageName__格式占位符的HTML模板
 * @returns {string} 替换后的HTML字符串
 */
export function localizeTemplate(templateString) {
  return templateString.replace(/__MSG_(\w+)__/g, (match, messageName) => {
    return getMessage(messageName) || match;
  });
}

// 导出默认对象
export default {
  getMessage,
  getCurrentLanguage,
  localizePage,
  localizeTemplate
}; 