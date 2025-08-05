/**
 * Safely query DOM elements
 * Prevent errors due to specific elements not existing
 * @param {string} selector - CSS selector
 * @param {Element} [context=document] - Query context
 * @returns {Element|null} - Queried element or null
 */
export function safeQuerySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (e) {
    return null;
  }
}

/**
 * Safely query multiple DOM elements
 * @param {string} selector - CSS selector
 * @param {Element} [context=document] - Query context
 * @returns {Array} - Queried element array
 */
export function safeQuerySelectorAll(selector, context = document) {
  try {
    return Array.from(context.querySelectorAll(selector));
  } catch (e) {
    return [];
  }
}

/**
 * Safely add event listeners
 * @param {Element} element - DOM element
 * @param {string} eventType - Event type
 * @param {Function} handler - Event handler function
 * @returns {boolean} - Whether the event listener was successfully added
 */
export function safeAddEventListener(element, eventType, handler) {
  try {
    if (element) {
      element.addEventListener(eventType, handler);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Safely remove event listeners
 * @param {Element} element - DOM element
 * @param {string} eventType - Event type
 * @param {Function} handler - Event handler function
 * @returns {boolean} - Whether the event listener was successfully removed
 */
export function safeRemoveEventListener(element, eventType, handler) {
  try {
    if (element) {
      element.removeEventListener(eventType, handler);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Extract the domain name from the URL
 * @param {string} url - Full URL
 * @returns {string} - Domain name
 */
export function extractHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return "";
  }
}

/**
 * Safely parse URL
 * @param {string} url - URL string
 * @returns {URL|null} - URL object or null
 */
export function safeParseURL(url) {
  try {
    return new URL(url);
  } catch (e) {
    return null;
  }
}

/**
 * Debounce function
 * @param {Function} func - Function to execute
 * @param {number} wait - Wait time (milliseconds)
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to execute
 * @param {number} limit - Time limit (milliseconds)
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Safely get iframe content
 * @param {HTMLIFrameElement} iframe - iframe element
 * @returns {Document|null} - iframe's document or null
 */
export function safeGetIframeContent(iframe) {
  try {
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
      return null;
    }
    return iframe.contentDocument;
  } catch (e) {
    return null;
  }
}
