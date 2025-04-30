
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
    console.warn(`Failed to query element ${selector}:`, e);
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
    console.warn(`Failed to query element collection ${selector}:`, e);
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
    console.warn(`Failed to add ${eventType} event to element:`, e);
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
    console.warn(`Failed to remove ${eventType} event from element:`, e);
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
    console.warn("Failed to parse URL:", e);
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
    console.warn("Failed to parse URL:", url, e);
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
  return function(...args) {
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
    console.warn("Failed to get iframe content:", e);
    return null;
  }
}

/**
 * Detect if iframe has loaded an error page
 * @param {HTMLIFrameElement} iframe - iframe element
 * @returns {boolean} - Whether it is an error page
 */
export function detectIframeError(iframe) {
  try {
    const doc = safeGetIframeContent(iframe);
    if (!doc) return false;
    
    const content = doc.documentElement.innerHTML || '';
    return content.includes('refused to connect') || 
           content.includes('Refuse connection') ||
           content.includes('ERR_CONNECTION_REFUSED') ||
           content.includes('ERR_BLOCKED_BY_RESPONSE') ||
           content.includes('ERR_CONTENT_SECURITY_POLICY');
  } catch (e) {
    return false;
  }
} 