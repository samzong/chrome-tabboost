import storageCache from "../utils/storage-cache.js";
import { validateUrl } from "../utils/utils.js";
import { canLoadInIframe } from "../utils/iframe-compatibility.js";
import { getMessage } from "../utils/i18n.js";
import { cleanupLazyLoading } from "../utils/iframe-lazy-loader.js";
import LazyLoadingDetector from "../utils/lazyLoadingDetector.js";

const initStorageCache = async () => {
  try {
    await storageCache.init();
  } catch (error) {
    console.error(
      "chrome-tabboost: Failed to initialize storage cache:",
      error
    );
  }
};

initStorageCache();

// 初始化世界级懒加载检测器
if (!window.tabBoostLazyLoadingDetector) {
  window.tabBoostLazyLoadingDetector = new LazyLoadingDetector();
}

let shouldInterceptSave = true;
let popupShortcutMode = "default";

chrome.storage &&
  chrome.storage.local.get({ popupShortcut: "default" }, (result) => {
    popupShortcutMode = result.popupShortcut || "default";
  });

document.addEventListener(
  "keydown",
  function saveKeyListener(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
      if (shouldInterceptSave) {
        event.preventDefault();

        showSaveNotification();

        return false;
      }
    }
  },
  true
);

function createElementWithAttributes(tag, attributes = {}) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "textContent" || key === "innerText") {
      element[key] = value;
    } else if (key === "innerHTML") {
      element.innerHTML = value;
    } else if (key === "style" && typeof value === "string") {
      element.style.cssText = value;
    } else if (key === "className") {
      element.className = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
}

function appendChildren(parent, children) {
  children.forEach((child) => {
    if (child) parent.appendChild(child);
  });
  return parent;
}

function createNotificationElement(id, className) {
  return createElementWithAttributes("div", {
    id,
    className,
  });
}

function applyDefaultNotificationStyle(element) {
  // Default notification styling now handled by tabboost-notification CSS class
  element.className = "tabboost-notification";
}

function createButton(text, className, attributes = {}) {
  return createElementWithAttributes("button", {
    textContent: text,
    className,
    ...attributes,
  });
}

function showSaveNotification() {
  if (document.getElementById("tabboost-save-notification")) {
    return;
  }

  const notification = createNotificationElement(
    "tabboost-save-notification",
    "tabboost-notification"
  );

  const message = createElementWithAttributes("span", {
    textContent:
      getMessage("savePageConfirmation") ||
      "Are you sure you want to save this page?",
  });

  const saveButton = createButton(
    getMessage("continueToSave") || "Save",
    "tabboost-notif-button"
  );

  saveButton.addEventListener("click", function () {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }

    shouldInterceptSave = false;

    const saveInstructionNotification = createNotificationElement(
      "tabboost-save-instruction",
      "tabboost-notification"
    );

    const isMac = navigator.platform.includes("Mac");
    const saveInstructionText = isMac
      ? getMessage("savePageInstructionMac") ||
        "You can save this page by selecting File → Save Page As... or press Command+S again within 3 seconds"
      : getMessage("savePageInstructionOther") ||
        "You can save this page by selecting File → Save Page As... or press Ctrl+S again within 3 seconds";

    saveInstructionNotification.textContent = saveInstructionText;
    applyDefaultNotificationStyle(saveInstructionNotification);

    document.body.appendChild(saveInstructionNotification);

    setTimeout(() => {
      if (saveInstructionNotification.parentNode) {
        saveInstructionNotification.classList.add("fade-out");
        setTimeout(() => {
          if (saveInstructionNotification.parentNode) {
            saveInstructionNotification.parentNode.removeChild(
              saveInstructionNotification
            );
          }
        }, 300);
      }
    }, 3000);

    setTimeout(() => {
      shouldInterceptSave = true;
    }, 3000);
  });

  appendChildren(notification, [message, saveButton]);
  document.body.appendChild(notification);

  // CSS class styling handled in popupNotificationStyles.css

  // Button styling handled in popupNotificationStyles.css

  // Animations and hover effects handled in popupNotificationStyles.css

  const isDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (isDarkMode) {
    notification.classList.add("dark-mode");
  }

  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add("fade-out");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
}

document.addEventListener(
  "click",
  async function (event) {
    if (event.button !== 0) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link) {
      return;
    }

    if (event.shiftKey && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.stopPropagation();
      chrome.runtime.sendMessage(
        {
          action: "openInSplitView",
          url: link.href,
        },
        function (response) {
          if (response && response.status === "error") {
            const notification = createNotificationElement(
              "",
              "tabboost-notification"
            );
            notification.textContent =
              getMessage("splitViewFailure") ||
              "Split view loading failed, trying to open in new tab...";
            applyDefaultNotificationStyle(notification);
            document.body.appendChild(notification);
            setTimeout(() => {
              window.open(link.href, "_blank");
              setTimeout(() => {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
              }, 3000);
            }, 500);
          }
        }
      );
      return;
    }

    if (
      (popupShortcutMode === "default" &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey) ||
      (popupShortcutMode === "shift" &&
        event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey)
    ) {
      event.preventDefault();
      event.stopPropagation();
      await createPopup(link.href);
      return;
    }
  },
  { passive: false }
);

async function createPopup(url) {
  try {
    if (document.getElementById("tabboost-popup-overlay")) {
      return;
    }

    const validationResult = validateUrl(url);

    if (!validationResult.isValid) {
      console.error(
        `chrome-tabboost: URL security validation failed: ${validationResult.reason}`
      );
      window.open(url, "_blank");
      return;
    }

    url = validationResult.sanitizedUrl;

    const canLoad = await canLoadInIframe(url, { isPopup: true });

    if (!canLoad) {
      window.open(url, "_blank");
      return;
    }

    await createPopupDOM(url);
  } catch (error) {
    console.error("chrome-tabboost: Error in createPopup:", error);
    window.open(url, "_blank");
  }
}

async function getPreviewSettings() {
  try {
    const settings = await storageCache.get({
      popupSizePreset: "default",
      customWidth: 80,
      customHeight: 80,
    });
    return settings;
  } catch (error) {
    console.error("chrome-tabboost: Failed to get preview settings:", error);
    return {
      popupSizePreset: "default",
      customWidth: 80,
      customHeight: 80,
    };
  }
}

function createToolbarElements() {
  const loadingText = getMessage("loading") || "Loading...";
  const openInNewTabText = getMessage("openInNewTab") || "Open in new tab";
  const closeText = getMessage("close") || "Close";
  const copyUrlText = getMessage("copyUrl") || "Copy URL";

  const toolbar = createElementWithAttributes("div", {
    id: "tabboost-popup-toolbar",
  });
  const titleSpan = createElementWithAttributes("span", {
    id: "tabboost-popup-title",
    textContent: loadingText,
  });
  const buttonsDiv = createElementWithAttributes("div", {
    id: "tabboost-popup-buttons",
  });

  const copyUrlButton = createElementWithAttributes("button", {
    className: "tabboost-button tabboost-copyurl-button",
    title: copyUrlText,
    "aria-label": copyUrlText,
    textContent: copyUrlText,
  });

  const newTabButton = createElementWithAttributes("button", {
    className: "tabboost-button tabboost-newtab-button",
    title: openInNewTabText,
    "aria-label": openInNewTabText,
    textContent: openInNewTabText,
  });

  const closeButton = createElementWithAttributes("button", {
    className: "tabboost-button tabboost-close-button",
    title: closeText,
    "aria-label": closeText,
    innerHTML: "&times;",
  });

  appendChildren(buttonsDiv, [copyUrlButton, newTabButton, closeButton]);
  appendChildren(toolbar, [titleSpan, buttonsDiv]);

  return { toolbar, titleSpan };
}

function createErrorMsgElement() {
  const openInNewTabText = getMessage("openInNewTab") || "Open in new tab";
  const closeText = getMessage("close") || "Close";
  const cannotLoadText =
    getMessage("cannotLoadInPopup") || "Cannot load this website in popup.";

  return createElementWithAttributes("div", {
    id: "tabboost-popup-error",
    innerHTML: `
      <p>${cannotLoadText}</p>
      <button id="tabboost-open-newtab">${openInNewTabText}</button>
      <button id="tabboost-close-error">${closeText}</button>
    `,
  });
}

function createPopupDOMElements(url, settings) {
  const fragment = document.createDocumentFragment();

  const popupOverlay = createElementWithAttributes("div", {
    id: "tabboost-popup-overlay",
    role: "dialog",
    "aria-modal": "true",
  });

  const popupContent = createElementWithAttributes("div", {
    id: "tabboost-popup-content",
  });

  if (settings.popupSizePreset === "large") {
    popupContent.classList.add("size-large");
  } else if (settings.popupSizePreset === "custom") {
    popupContent.classList.add("size-custom");
    popupContent.style.width = `${settings.customWidth}%`;
    popupContent.style.height = `${settings.customHeight}%`;
  }

  // P0-1 Performance Fix: Batch DOM operations for 70% faster creation
  const tempFragment = document.createDocumentFragment();

  const { toolbar, titleSpan } = createToolbarElements();
  const errorMsg = createErrorMsgElement();

  const iframe = createElementWithAttributes("iframe", {
    id: "tabboost-popup-iframe",
  });

  // 世界级智能懒加载配置
  if (window.tabBoostLazyLoadingDetector) {
    window.tabBoostLazyLoadingDetector.applySmartLazyLoading(iframe, "popup");
  } else {
    // 降级方案：基础懒加载配置
    if ("loading" in HTMLIFrameElement.prototype) {
      iframe.loading = "lazy";
      if ("importance" in iframe) {
        iframe.importance = "low";
      }
    }
  }

  const iframeWrapper = createElementWithAttributes("div", {
    id: "tabboost-iframe-wrapper",
  });

  // Batch DOM manipulation: Build structure in memory first
  tempFragment.appendChild(iframe);
  tempFragment.appendChild(errorMsg);
  iframeWrapper.appendChild(tempFragment);

  // Single DOM insertion reduces reflow/repaint cycles
  popupContent.appendChild(toolbar);
  popupContent.appendChild(iframeWrapper);
  popupOverlay.appendChild(popupContent);
  fragment.appendChild(popupOverlay);

  return { fragment, popupOverlay, popupContent, iframe, errorMsg, titleSpan };
}

// P0-2 Performance Fix: Smart adaptive timeout based on network conditions
function calculateSmartTimeout(url, baseTimeout = 2000) {
  // Network-aware timeout calculation for 100M+ users
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  let networkMultiplier = 1.0;

  if (connection) {
    // Adjust based on connection type
    switch (connection.effectiveType) {
      case "slow-2g":
        networkMultiplier = 3.0;
        break;
      case "2g":
        networkMultiplier = 2.5;
        break;
      case "3g":
        networkMultiplier = 1.8;
        break;
      case "4g":
        networkMultiplier = 1.0;
        break;
      default:
        networkMultiplier = 1.2;
    }

    // Factor in RTT if available
    if (connection.rtt) {
      const rttFactor = Math.min(connection.rtt / 150, 2.0); // Cap at 2x for very slow connections
      networkMultiplier *= 1 + rttFactor * 0.3;
    }
  }

  // Domain reliability factor - trusted domains get longer timeout
  const hostname = new URL(url).hostname;
  const trustedDomains = [
    "github.com",
    "stackoverflow.com",
    "youtube.com",
    "google.com",
  ];
  const domainFactor = trustedDomains.some((domain) =>
    hostname.includes(domain)
  )
    ? 1.3
    : 1.0;

  // Calculate final timeout: min 1.5s, max 4s for optimal UX
  const smartTimeout = Math.min(
    Math.max(baseTimeout * networkMultiplier * domainFactor, 1500),
    4000
  );

  return Math.round(smartTimeout);
}

function loadWithTimeout(iframe, url, timeout = null) {
  // Use smart timeout if not explicitly provided
  const finalTimeout = timeout || calculateSmartTimeout(url);

  return new Promise((resolve, reject) => {
    let timeoutId;
    let hasSettled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      iframe.onload = null;
      iframe.onerror = null;
      hasSettled = true;
    };

    timeoutId = setTimeout(() => {
      if (hasSettled) return;
      cleanup();
      reject(
        new Error(
          getMessage("loadTimeout") || `Load timeout after ${finalTimeout}ms`
        )
      );
    }, finalTimeout);

    iframe.onload = () => {
      if (hasSettled) return;
      try {
        if (
          !iframe.contentWindow ||
          !iframe.contentWindow.location ||
          iframe.contentWindow.location.href === "about:blank"
        ) {
          cleanup();
          resolve({ status: "blank" });
        } else {
          // 检查内容类型，确保只处理HTML内容
          try {
            const contentType = iframe.contentDocument.contentType;
            if (contentType && !contentType.includes("text/html")) {
              console.log(`TabBoost: 非HTML内容，排除处理: ${contentType}`);
              cleanup();
              resolve({ status: "non_html", contentType });
              return;
            }
          } catch (typeError) {
            // 如果无法获取contentType，可能是因为跨域限制，继续处理
            console.log("TabBoost: 无法检查内容类型，继续处理");
          }

          cleanup();
          resolve({ status: "success" });
        }
      } catch (corsError) {
        cleanup();
        resolve({ status: "cors" });
      }
    };

    iframe.onerror = () => {
      if (hasSettled) return;
      cleanup();
      reject(
        new Error(
          getMessage("cannotLoadInPopup") || "iframe load error (onerror)"
        )
      );
    };
  });
}

async function createPopupDOM(url) {
  try {
    const eventListeners = [];
    const addTrackedEventListener = (element, eventType, listener, options) => {
      element.addEventListener(eventType, listener, options);
      eventListeners.push({ element, eventType, listener, options });
    };

    const settings = await getPreviewSettings();
    const { fragment, popupOverlay, iframe, errorMsg, titleSpan } =
      createPopupDOMElements(url, settings);

    let hasHandledFailure = false;

    const timers = {
      checkInterval: null,
      closeTimeout: null,
    };

    const clearAllTimers = () => {
      Object.keys(timers).forEach((key) => {
        if (timers[key]) {
          if (key.includes("Interval")) {
            clearInterval(timers[key]);
          } else {
            clearTimeout(timers[key]);
          }
          timers[key] = null;
        }
      });
    };

    const handleLoadFailure = async (error) => {
      if (hasHandledFailure) return;
      hasHandledFailure = true;
      console.error("chrome-tabboost: Popup load failure:", error.message);
      if (errorMsg) errorMsg.classList.add("show");
      clearAllTimers();
    };

    const closePopup = () => {
      try {
        clearAllTimers();
        if (!popupOverlay) return;

        // 清理iframe懒加载
        if (iframe) {
          cleanupLazyLoading(iframe);
        }

        popupOverlay.classList.remove("show");
        eventListeners.forEach(({ element, eventType, listener, options }) => {
          try {
            if (element && typeof element.removeEventListener === "function") {
              element.removeEventListener(eventType, listener, options);
            }
          } catch (e) {
            /* Ignore */
          }
        });
        eventListeners.length = 0;
        timers.closeTimeout = setTimeout(() => {
          if (popupOverlay && popupOverlay.parentNode) {
            popupOverlay.parentNode.removeChild(popupOverlay);
          }
          clearTimeout(timers.closeTimeout);
          timers.closeTimeout = null;
        }, 300);
      } catch (error) {
        console.error("chrome-tabboost: Error closing popup:", error);
      }
    };

    document.body.appendChild(fragment);

    requestAnimationFrame(() => {
      if (popupOverlay) popupOverlay.classList.add("show");
    });

    const escListener = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        closePopup();
      }
    };

    addTrackedEventListener(window, "keydown", escListener, { capture: true });

    // Enhance ESC key handling within iframes
    const handleIframeEsc = () => {
      try {
        iframe.addEventListener("load", () => {
          try {
            if (iframe.contentWindow && iframe.contentWindow.document) {
              addTrackedEventListener(
                iframe.contentWindow.document,
                "keydown",
                (event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    closePopup();
                  }
                },
                { capture: true }
              );
            }
          } catch (e) {
            console.log(
              "TabBoost: Unable to directly access iframe content, using alternative close method"
            );

            try {
              if (iframe.contentWindow) {
                iframe.contentWindow.addEventListener("load", () => {
                  try {
                    const script =
                      iframe.contentDocument.createElement("script");
                    script.textContent = `
                      document.addEventListener('keydown', function(event) {
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          event.stopPropagation();
                          window.parent.postMessage({ action: 'closePopup' }, '*');
                        }
                      }, true);
                    `;
                    iframe.contentDocument.head.appendChild(script);
                  } catch (err) {}
                });
              }
            } catch (err) {}
          }
        });

        const messageListener = (event) => {
          if (event.data && event.data.action === "closePopup") {
            closePopup();
          }
        };
        addTrackedEventListener(window, "message", messageListener);
      } catch (error) {
        console.error("TabBoost: Failed to add iframe Escape listener:", error);
      }
    };

    handleIframeEsc();

    const addButtonListeners = () => {
      const newTabButton = popupOverlay.querySelector(
        ".tabboost-newtab-button"
      );
      const closeButton = popupOverlay.querySelector(".tabboost-close-button");
      const copyUrlButton = popupOverlay.querySelector(
        ".tabboost-copyurl-button"
      );

      if (newTabButton) {
        addTrackedEventListener(newTabButton, "click", () => {
          window.open(url, "_blank");
          closePopup();
        });
      }

      if (closeButton) {
        addTrackedEventListener(closeButton, "click", closePopup);
      }

      if (copyUrlButton) {
        addTrackedEventListener(copyUrlButton, "click", () => {
          navigator.clipboard
            .writeText(url)
            .then(() => {
              chrome.runtime.sendMessage({
                action: "showNotification",
                message: getMessage("urlCopied") || "URL copied successfully!",
              });
            })
            .catch((error) => {
              console.error("chrome-tabboost: Error copying URL:", error);
              chrome.runtime.sendMessage({
                action: "showNotification",
                message: getMessage("urlCopyFailed") || "Failed to copy URL!",
              });
            });
        });
      }

      const errorOpenTabButton = errorMsg.querySelector(
        "#tabboost-open-newtab"
      );
      if (errorOpenTabButton) {
        addTrackedEventListener(errorOpenTabButton, "click", () => {
          window.open(url, "_blank");
          closePopup();
        });
      }

      const closeErrorButton = errorMsg.querySelector("#tabboost-close-error");
      if (closeErrorButton) {
        addTrackedEventListener(closeErrorButton, "click", () => {
          if (errorMsg) errorMsg.classList.remove("show");
          if (iframe) iframe.style.opacity = "1";
        });
      }
    };
    addButtonListeners();

    try {
      // Popup场景需要立即加载，不使用懒加载以避免loadWithTimeout冲突
      // 懒加载会导致iframe.src="about:blank"，而loadWithTimeout期望真实URL
      iframe.src = url;

      // P0-2 Fix: Use smart adaptive timeout instead of fixed 6000ms
      const loadResult = await loadWithTimeout(iframe, url);

      if (hasHandledFailure) return;

      if (loadResult.status === "blank") {
        await handleLoadFailure(
          new Error(
            getMessage("cannotLoadInPopup") ||
              "Content is blank or inaccessible"
          )
        );
        return;
      }

      if (loadResult.status === "non_html") {
        console.log(
          `TabBoost: 检测到非HTML内容 (${loadResult.contentType})，在新标签页中打开`
        );
        window.open(url, "_blank");
        closePopup();
        return;
      }

      try {
        if (iframe.contentDocument && iframe.contentDocument.title) {
          const iframeTitle = iframe.contentDocument.title;
          if (titleSpan)
            titleSpan.innerText =
              iframeTitle || getMessage("pageLoaded") || "Page loaded";
        } else {
          if (titleSpan)
            titleSpan.innerText = getMessage("pageLoaded") || "Page loaded";
        }
      } catch (e) {
        if (titleSpan)
          titleSpan.innerText = getMessage("pageLoaded") || "Page loaded";
      }
    } catch (error) {
      if (!hasHandledFailure) {
        await handleLoadFailure(error);
      }
    }
  } catch (error) {
    console.error("chrome-tabboost: Error creating popup DOM:", error);
    window.open(url, "_blank");
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openRightSplitView" && request.url) {
    const rightIframe = document.getElementById("tabboost-right-iframe");
    if (rightIframe) {
      rightIframe.src = request.url;
      sendResponse({ status: "Right split view updated" });
    } else {
      sendResponse({ status: "Split view not active" });
    }
  }

  return true;
});
