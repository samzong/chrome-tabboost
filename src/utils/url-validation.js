import {
  DANGEROUS_PROTOCOLS,
  DANGEROUS_URL_PATTERNS,
  EXCLUDED_EXTENSIONS,
} from "../config/constants.js";

export function validateUrl(url) {
  if (!url || typeof url !== "string") {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "URL must be a non-empty string",
    };
  }

  url = url.trim();

  if (url.length === 0) {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "URL cannot be empty",
    };
  }

  if (
    DANGEROUS_PROTOCOLS.some((protocol) =>
      url.toLowerCase().startsWith(protocol)
    )
  ) {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "URL uses an unsafe protocol",
    };
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (url.includes("://")) {
      return {
        isValid: false,
        sanitizedUrl: "",
        message: "Only HTTP and HTTPS protocols are allowed",
      };
    }
    url = "https://" + url;
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    if (EXCLUDED_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
      return {
        isValid: false,
        sanitizedUrl: "",
        message: "This file type is not supported",
      };
    }

    if (DANGEROUS_URL_PATTERNS.length > 0) {
      const fullUrl = urlObj.href.toLowerCase();
      if (DANGEROUS_URL_PATTERNS.some((pattern) => fullUrl.includes(pattern))) {
        return {
          isValid: false,
          sanitizedUrl: "",
          message: "URL contains potential dangerous patterns",
        };
      }
    }

    return {
      isValid: true,
      sanitizedUrl: urlObj.href,
      message: "Valid URL",
    };
  } catch (error) {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "Invalid URL format",
    };
  }
}
