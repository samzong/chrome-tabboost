/**
 * Security validation system for TabBoost Chrome Extension
 * Provides URL validation, XSS protection, and domain reputation checking
 */

import {
  DANGEROUS_PROTOCOLS,
  DANGEROUS_FILE_TYPES,
} from "../config/constants.js";
import { ErrorHandler } from "./errorHandler.js";

class SecurityValidator {
  // XSS patterns that indicate potential security threats
  static XSS_PATTERNS = [
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /<script[\s>]/i,
    /on\w+\s*=/i,
    /&lt;script/i,
    /%3Cscript/i,
    /&#x3C;script/i,
    /\\x3Cscript/i,
    /\\u003Cscript/i,
    /expression\s*\(/i,
    /import\s+/i,
    /constructor\s*\[/i,
    /document\s*\./i,
    /window\s*\./i,
    /eval\s*\(/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
    /Function\s*\(/i,
  ];

  // Trusted domains for iframe loading
  static TRUSTED_DOMAINS = [
    "github.com",
    "www.github.com",
    "gist.github.com",
    "stackoverflow.com",
    "developer.mozilla.org",
    "wikipedia.org",
    "w3.org",
    "docs.microsoft.com",
    "nodejs.org",
    "reactjs.org",
    "vuejs.org",
    "angular.io",
  ];

  static BLOCKED_DOMAINS = [];

  /**
   * Validate a URL for security threats
   * @param {string} url - The URL to validate
   * @returns {Object} Validation result with isValid, risk, reason, and sanitizedUrl
   */
  static validateUrl(url) {
    const validation = {
      isValid: false,
      risk: "unknown",
      reason: "",
      sanitizedUrl: null,
    };

    try {
      if (!url || typeof url !== "string") {
        validation.reason = "Invalid URL format";
        validation.risk = "high";
        return validation;
      }

      const trimmedUrl = url.trim();

      if (this.checkXSSPatterns(trimmedUrl)) {
        validation.reason = "Potential XSS detected";
        validation.risk = "critical";
        ErrorHandler.logError(
          new Error(`XSS attempt blocked: ${trimmedUrl.substring(0, 100)}`),
          "SecurityValidator.validateUrl.xss",
          "critical"
        );
        return validation;
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(trimmedUrl);
      } catch (parseError) {
        try {
          parsedUrl = new URL(`https://${trimmedUrl}`);
        } catch (secondParseError) {
          validation.reason = "Malformed URL";
          validation.risk = "high";
          return validation;
        }
      }

      const allowedProtocols = ["http:", "https:"];
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        validation.reason = `Dangerous protocol: ${parsedUrl.protocol}`;
        validation.risk = "critical";

        if (DANGEROUS_PROTOCOLS.includes(parsedUrl.protocol)) {
          ErrorHandler.logError(
            new Error(`Dangerous protocol blocked: ${parsedUrl.protocol}`),
            "SecurityValidator.validateUrl.protocol",
            "critical"
          );
        }
        return validation;
      }

      if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
        validation.reason = "Invalid hostname";
        validation.risk = "high";
        return validation;
      }

      if (this.isBlockedDomain(parsedUrl.hostname)) {
        validation.reason = "Blocked domain";
        validation.risk = "critical";
        ErrorHandler.logError(
          new Error(`Blocked domain accessed: ${parsedUrl.hostname}`),
          "SecurityValidator.validateUrl.blockedDomain",
          "warning"
        );
        return validation;
      }

      const pathname = parsedUrl.pathname.toLowerCase();
      for (const fileType of DANGEROUS_FILE_TYPES) {
        if (pathname.endsWith(fileType)) {
          validation.reason = `Dangerous file type: ${fileType}`;
          validation.risk = "high";
          return validation;
        }
      }

      if (parsedUrl.search) {
        const queryString = parsedUrl.search.toLowerCase();
        if (this.checkXSSPatterns(queryString)) {
          validation.reason = "Potential XSS in query parameters";
          validation.risk = "high";
          return validation;
        }
      }

      validation.isValid = true;
      validation.risk = this.isTrustedDomain(parsedUrl.hostname)
        ? "low"
        : "medium";
      validation.sanitizedUrl = parsedUrl.href;
    } catch (error) {
      ErrorHandler.logError(error, "SecurityValidator.validateUrl", "error");
      validation.reason = "Validation error";
      validation.risk = "high";
    }

    return validation;
  }

  /**
   * Check if a string contains XSS patterns
   * @param {string} input - The string to check
   * @returns {boolean} True if XSS patterns detected
   */
  static checkXSSPatterns(input) {
    if (!input || typeof input !== "string") {
      return false;
    }

    const lowerInput = input.toLowerCase();
    return this.XSS_PATTERNS.some((pattern) => pattern.test(lowerInput));
  }

  /**
   * Check if a domain is trusted
   * @param {string} hostname - The hostname to check
   * @returns {boolean} True if domain is trusted
   */
  static isTrustedDomain(hostname) {
    if (!hostname) return false;

    const lowerHostname = hostname.toLowerCase();
    return this.TRUSTED_DOMAINS.some((domain) => {
      return lowerHostname === domain || lowerHostname.endsWith("." + domain);
    });
  }

  /**
   * Check if a domain is blocked
   * @param {string} hostname - The hostname to check
   * @returns {boolean} True if domain is blocked
   */
  static isBlockedDomain(hostname) {
    if (!hostname) return false;

    const lowerHostname = hostname.toLowerCase();
    return this.BLOCKED_DOMAINS.some((domain) => {
      return lowerHostname === domain || lowerHostname.endsWith("." + domain);
    });
  }

  /**
   * Sanitize HTML content
   * @param {string} html - The HTML to sanitize
   * @returns {string} Sanitized HTML
   */
  static sanitizeHTML(html) {
    if (!html || typeof html !== "string") {
      return "";
    }

    // Basic HTML sanitization
    return html
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g, "&amp;");
  }

  /**
   * Validate if a URL is safe for iframe loading
   * @param {string} url - The URL to validate
   * @returns {Object} Validation result with canLoad and reason
   */
  static validateForIframe(url) {
    const urlValidation = this.validateUrl(url);

    if (!urlValidation.isValid) {
      return {
        canLoad: false,
        reason: urlValidation.reason,
        risk: urlValidation.risk,
      };
    }

    try {
      const parsedUrl = new URL(urlValidation.sanitizedUrl);

      if (this.isTrustedDomain(parsedUrl.hostname)) {
        return {
          canLoad: true,
          reason: "Trusted domain",
          risk: "low",
        };
      }

      if (urlValidation.risk === "high" || urlValidation.risk === "critical") {
        return {
          canLoad: false,
          reason: "High risk URL",
          risk: urlValidation.risk,
        };
      }

      return {
        canLoad: true,
        reason: "Validation passed",
        risk: urlValidation.risk,
      };
    } catch (error) {
      ErrorHandler.logError(
        error,
        "SecurityValidator.validateForIframe",
        "warning"
      );
      return {
        canLoad: false,
        reason: "Validation error",
        risk: "high",
      };
    }
  }

  /**
   * Get CSP rules for a specific domain
   * @param {string} hostname - The hostname to get rules for
   * @returns {Object} CSP configuration
   */
  static getCSPRulesForDomain(hostname) {
    if (!hostname) {
      return {
        allowIframe: false,
        modifyHeaders: false,
      };
    }

    const isTrusted = this.isTrustedDomain(hostname);

    return {
      allowIframe: isTrusted,
      modifyHeaders: isTrusted,
      rules: isTrusted
        ? {
            "X-Frame-Options": "SAMEORIGIN",
            "Content-Security-Policy": null,
          }
        : {},
    };
  }
}

export { SecurityValidator };
