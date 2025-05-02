/**
 * Get localized message
 * @param {string} messageName - Message name
 * @param {Array|string} substitutions - Substitution parameters (optional)
 * @returns {string} Localized message text
 */
export function getMessage(messageName, substitutions = []) {
  if (substitutions && !Array.isArray(substitutions)) {
    substitutions = [substitutions];
  }

  const message = chrome.i18n.getMessage(messageName, substitutions);

  if (!message) {
    console.warn(`i18n: Missing message for key "${messageName}"`);
  }

  return message;
}

/**
 * Get the user's current language
 * @returns {string} The current language code
 */
export function getCurrentLanguage() {
  return chrome.i18n.getUILanguage();
}

/**
 * Replace i18n placeholders in DOM elements
 * Find all elements with data-i18n attribute and replace them with the corresponding localized text
 * @param {Element} rootElement - The root DOM element, defaults to document
 */
export function localizePage(rootElement = document) {
  const elements = rootElement.querySelectorAll("[data-i18n]");

  elements.forEach((element) => {
    const messageName = element.getAttribute("data-i18n");

    if (messageName) {
      const message = getMessage(messageName);

      if (message) {
        if (element.hasAttribute("data-i18n-attr")) {
          const attr = element.getAttribute("data-i18n-attr");
          element.setAttribute(attr, message);
        } else {
          element.textContent = message;
        }
      } else {
        console.warn(`Missing i18n message: ${messageName}`);
      }
    }
  });

  const placeholderElements = rootElement.querySelectorAll(
    "[data-i18n-placeholder]"
  );

  placeholderElements.forEach((element) => {
    const messageName = element.getAttribute("data-i18n-placeholder");

    if (messageName) {
      const message = getMessage(messageName);

      if (message) {
        element.setAttribute("placeholder", message);
      } else {
        console.warn(`Missing i18n placeholder message: ${messageName}`);
      }
    }
  });
}

/**
 * Localize HTML template strings
 * @param {string} templateString - HTML template string containing __MSG_messageName__ placeholders
 * @returns {string} Localized HTML string
 */
export function localizeTemplate(templateString) {
  return templateString.replace(/__MSG_(\w+)__/g, (match, messageName) => {
    return getMessage(messageName) || match;
  });
}

export default {
  getMessage,
  getCurrentLanguage,
  localizePage,
  localizeTemplate,
};
