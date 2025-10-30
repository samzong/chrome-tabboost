import { UI_CONFIG } from "./splitViewConfig";
import { safeQuerySelector } from "./splitViewUtils";

/**
 * Create a DOM element with optional configuration
 * @param {string} tag - HTML tag name
 * @param {Object} config - Element configuration
 * @returns {HTMLElement} - Configured DOM element
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
 * Apply a style object to an element
 * @param {HTMLElement} element - Target element
 * @param {Object} styles - Style map
 */
export function applyStyles(element, styles) {
  if (!element || !styles) return;
  Object.assign(element.style, styles);
}

/**
 * Add an event listener with basic error protection
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Listener function
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
 * Create a configured iframe element
 * @param {string} id - Element identifier
 * @param {string} url - Source URL
 * @returns {HTMLIFrameElement} - Configured iframe
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
 * Create the close button element
 * @param {string} action - Command stored in data attributes
 * @returns {HTMLButtonElement} - Button element
 */
export function createCloseButton(action) {
  const button = createElement("button", UI_CONFIG.closeButton);
  button.dataset.action = action;
  button.innerText = "×";
  return button;
}

/**
 * Remove an element from the DOM if it exists
 * @param {string} selector - CSS selector
 */
export function cleanupElement(selector) {
  const element = safeQuerySelector(selector);
  if (element) {
    element.remove();
  }
}
