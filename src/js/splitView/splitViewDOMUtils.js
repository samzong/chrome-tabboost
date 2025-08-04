import { UI_CONFIG } from "./splitViewConfig";
import { safeQuerySelector } from "./splitViewUtils";

/**
 * 创建并配置DOM元素
 * @param {string} tag - HTML标签名
 * @param {Object} config - 元素配置
 * @returns {HTMLElement} - 配置好的DOM元素
 */
export function createElement(tag, config = {}) {
  const element = document.createElement(tag);

  if (config.id) {
    element.id = config.id;
  }

  if (config.className) {
    element.className = config.className;
  }

  if (config.styles) {
    Object.assign(element.style, config.styles);
  }

  if (config.attributes) {
    Object.entries(config.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
}

/**
 * 应用样式到元素
 * @param {HTMLElement} element - 目标元素
 * @param {Object} styles - 样式对象
 */
export function applyStyles(element, styles) {
  if (!element || !styles) return;
  Object.assign(element.style, styles);
}

/**
 * 安全地添加事件监听器
 * @param {HTMLElement} element - 目标元素
 * @param {string} event - 事件名
 * @param {Function} handler - 处理函数
 */
export function addSafeEventListener(element, event, handler) {
  if (!element || !handler) return;
  try {
    element.addEventListener(event, handler);
  } catch (e) {
    console.error(`Failed to add ${event} event listener:`, e);
  }
}

/**
 * 创建iframe元素
 * @param {string} id - iframe的ID
 * @param {string} url - iframe的URL
 * @returns {HTMLIFrameElement} - 配置好的iframe元素
 */
export function createIframe(id, url = "about:blank") {
  const config = {
    ...UI_CONFIG.iframe,
    id,
    attributes: {
      ...UI_CONFIG.iframe.attributes,
      src: url,
    },
  };

  return createElement("iframe", config);
}

/**
 * 创建关闭按钮
 * @param {string} action - 按钮动作
 * @returns {HTMLButtonElement} - 配置好的按钮元素
 */
export function createCloseButton(action) {
  const button = createElement("button", UI_CONFIG.closeButton);
  button.dataset.action = action;
  button.innerText = "×";
  return button;
}

/**
 * 清理DOM元素
 * @param {string} selector - 元素选择器
 */
export function cleanupElement(selector) {
  const element = safeQuerySelector(selector);
  if (element) {
    element.remove();
  }
}
