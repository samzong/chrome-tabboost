import { UI_CONFIG } from "./splitViewConfig";
import { safeQuerySelector } from "./splitViewUtils";

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

export function applyStyles(element, styles) {
  if (!element || !styles) return;
  Object.assign(element.style, styles);
}

export function addSafeEventListener(element, event, handler) {
  if (!element || !handler) return;
  try {
    element.addEventListener(event, handler);
  } catch (e) {
    console.error(`Failed to add ${event} event listener:`, e);
  }
}

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

export function createCloseButton(action) {
  const button = createElement("button", UI_CONFIG.closeButton);
  button.dataset.action = action;
  button.innerText = "×";
  return button;
}

export function cleanupElement(selector) {
  const element = safeQuerySelector(selector);
  if (element) {
    element.remove();
  }
}
