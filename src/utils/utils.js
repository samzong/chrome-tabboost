export async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

import { getMessage } from "./i18n.js";

export function showNotification(message) {
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
      title: getMessage("appName") || "TabBoost",
      message: message,
      priority: 2,
      requireInteraction: true
    },
    function (notificationId) {
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 3000);
    }
  );
}

import {
  DANGEROUS_PROTOCOLS,
  DANGEROUS_URL_PATTERNS,
  EXCLUDED_EXTENSIONS
} from "../config/constants.js";

/**
 * 验证URL是否安全有效
 * @param {string} url - 要检查的URL字符串
 * @returns {{isValid: boolean, sanitizedUrl: string, message: string}} 验证结果
 */
export function validateUrl(url) {
  if (!url || typeof url !== "string") {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "URL必须为非空字符串",
    };
  }

  url = url.trim();

  if (url.length === 0) {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "URL不能为空",
    };
  }

  // 检查危险协议
  if (DANGEROUS_PROTOCOLS.some((protocol) => url.toLowerCase().startsWith(protocol))) {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "URL使用了不安全的协议",
    };
  }

  // 确保URL以http或https开头
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (url.includes("://")) {
      return {
        isValid: false,
        sanitizedUrl: "",
        message: "只允许HTTP和HTTPS协议",
      };
    }
    url = "https://" + url;
  }

  try {
    const urlObj = new URL(url);
    
    // 检查文件扩展名是否在排除列表中
    const pathname = urlObj.pathname.toLowerCase();
    if (EXCLUDED_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
      return {
        isValid: false,
        sanitizedUrl: "",
        message: "不支持此文件类型",
      };
    }

    // 危险URL模式检查（如需添加）
    if (DANGEROUS_URL_PATTERNS.length > 0) {
      const fullUrl = urlObj.href.toLowerCase();
      if (DANGEROUS_URL_PATTERNS.some(pattern => fullUrl.includes(pattern))) {
        return {
          isValid: false,
          sanitizedUrl: "",
          message: "URL包含潜在危险模式",
        };
      }
    }

    return {
      isValid: true,
      sanitizedUrl: urlObj.href,
      message: "有效的URL",
    };
  } catch (error) {
    return {
      isValid: false,
      sanitizedUrl: "",
      message: "无效的URL格式",
    };
  }
}
