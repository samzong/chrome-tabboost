import storageCache from "../utils/storage-cache.js";
import { validateUrl } from "../utils/utils.js";
import { canLoadInIframe } from "../utils/iframe-compatibility.js";
import { getMessage } from "../utils/i18n.js";

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

let shouldInterceptSave = true;

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
  children.forEach(child => {
    if (child) parent.appendChild(child);
  });
  return parent;
}

function createNotificationElement(id, className) {
  return createElementWithAttributes("div", {
    id,
    className
  });
}

function applyDefaultNotificationStyle(element) {
  element.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 15px;
    border-radius: 4px;
    z-index: 999999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    animation: fadeIn 0.2s ease-out;
  `;
}

function createButton(text, className, attributes = {}) {
  return createElementWithAttributes("button", {
    textContent: text,
    className,
    ...attributes
  });
}

function showSaveNotification() {
  if (document.getElementById("tabboost-save-notification")) {
    return;
  }

  const notification = createNotificationElement("tabboost-save-notification", "tabboost-notification");

  const message = createElementWithAttributes("span", {
    textContent: getMessage("savePageConfirmation") || "Are you sure you want to save this page?"
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
        saveInstructionNotification.style.animation =
          "fadeOut 0.3s ease-out forwards";
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

  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 15px;
    border-radius: 4px;
    z-index: 999999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: fadeIn 0.2s ease-out;
    max-width: 300px;
  `;

  saveButton.style.cssText = `
    padding: 4px 10px;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #tabboost-save-notification button:hover {
      background-color: #2563eb;
    }
  `;
  document.head.appendChild(style);

  const isDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (isDarkMode) {
    notification.style.backgroundColor = "rgba(31, 41, 55, 0.9)";
  }

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "fadeOut 0.3s ease-out forwards";
      style.textContent += `
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(10px); }
        }
      `;

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
    // 检查是否是左键点击
    if (event.button !== 0) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link) {
      return;
    }

    // 检查是否按下了 Command/Ctrl+Shift 组合键
    if (event.shiftKey && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.stopPropagation();

      // 发送消息到后台脚本，请求在分屏视图中打开链接
      chrome.runtime.sendMessage(
        {
          action: "openInSplitView",
          url: link.href,
        },
        function (response) {
          if (response && response.status === "error") {
            const notification = createNotificationElement("", "tabboost-notification");
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

    // 处理普通的 Command/Ctrl+Click (不带Shift)
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();

      await createPopup(link.href);
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

  const toolbar = createElementWithAttributes("div", { id: "tabboost-popup-toolbar" });
  const titleSpan = createElementWithAttributes("span", {
    id: "tabboost-popup-title",
    textContent: loadingText
  });
  const buttonsDiv = createElementWithAttributes("div", { id: "tabboost-popup-buttons" });

  const copyUrlButton = createElementWithAttributes("button", {
    className: "tabboost-button tabboost-copyurl-button",
    title: copyUrlText,
    "aria-label": copyUrlText,
    textContent: copyUrlText
  });

  const newTabButton = createElementWithAttributes("button", {
    className: "tabboost-button tabboost-newtab-button",
    title: openInNewTabText,
    "aria-label": openInNewTabText,
    textContent: openInNewTabText
  });


  const closeButton = createElementWithAttributes("button", {
    className: "tabboost-button tabboost-close-button",
    title: closeText,
    "aria-label": closeText,
    innerHTML: "&times;"
  });

  appendChildren(buttonsDiv, [copyUrlButton, newTabButton, closeButton]);
  appendChildren(toolbar, [titleSpan, buttonsDiv]);

  return { toolbar, titleSpan };
}

function createErrorMsgElement() {
  const openInNewTabText = getMessage("openInNewTab") || "Open in new tab";
  const closeText = getMessage("close") || "Close";
  const cannotLoadText = getMessage("cannotLoadInPopup") || "Cannot load this website in popup.";

  return createElementWithAttributes("div", {
    id: "tabboost-popup-error",
    innerHTML: `
      <p>${cannotLoadText}</p>
      <button id="tabboost-open-newtab">${openInNewTabText}</button>
      <button id="tabboost-close-error">${closeText}</button>
    `
  });
}

function createPopupDOMElements(url, settings) {
  const fragment = document.createDocumentFragment();

  const popupOverlay = createElementWithAttributes("div", {
    id: "tabboost-popup-overlay",
    role: "dialog",
    "aria-modal": "true"
  });

  const popupContent = createElementWithAttributes("div", {
    id: "tabboost-popup-content"
  });

  if (settings.popupSizePreset === "large") {
    popupContent.classList.add("size-large");
  } else if (settings.popupSizePreset === "custom") {
    popupContent.classList.add("size-custom");
    popupContent.style.width = `${settings.customWidth}%`;
    popupContent.style.height = `${settings.customHeight}%`;
  }

  const { toolbar, titleSpan } = createToolbarElements();
  const errorMsg = createErrorMsgElement();

  const iframe = createElementWithAttributes("iframe", {
    id: "tabboost-popup-iframe"
  });

  if ("loading" in HTMLIFrameElement.prototype) {
    iframe.loading = "lazy";
  }

  const iframeWrapper = createElementWithAttributes("div", {
    id: "tabboost-iframe-wrapper"
  });

  appendChildren(iframeWrapper, [iframe, errorMsg]);
  appendChildren(popupContent, [toolbar, iframeWrapper]);
  appendChildren(popupOverlay, [popupContent]);
  appendChildren(fragment, [popupOverlay]);

  return { fragment, popupOverlay, popupContent, iframe, errorMsg, titleSpan };
}

function loadWithTimeout(iframe, url, timeout = 5000) {
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
      reject(new Error(getMessage("loadTimeout") || "Load timeout"));
    }, timeout);

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
            if (contentType && !contentType.includes('text/html')) {
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
    const addTrackedEventListener = (element, eventType, listener) => {
      element.addEventListener(eventType, listener);
      eventListeners.push({ element, eventType, listener });
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
        popupOverlay.classList.remove("show");
        eventListeners.forEach(({ element, eventType, listener }) => {
          try {
            if (element && typeof element.removeEventListener === "function") {
              element.removeEventListener(eventType, listener);
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
      if (event.key === "Escape") closePopup();
    };
    addTrackedEventListener(document, "keydown", escListener);
    const addButtonListeners = () => {
      const newTabButton = popupOverlay.querySelector(".tabboost-newtab-button");
      const closeButton = popupOverlay.querySelector(".tabboost-close-button");
      const copyUrlButton = popupOverlay.querySelector(".tabboost-copyurl-button");

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
          navigator.clipboard.writeText(url)
            .then(() => {
              chrome.runtime.sendMessage({ 
                action: "showNotification", 
                message: getMessage("urlCopied") || "URL copied successfully!"
              });
            })
            .catch((error) => {
              console.error("chrome-tabboost: Error copying URL:", error);
              chrome.runtime.sendMessage({ 
                action: "showNotification", 
                message: getMessage("urlCopyFailed") || "Failed to copy URL!"
              });
            });
        });
      }

      const errorOpenTabButton = errorMsg.querySelector("#tabboost-open-newtab");
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
      iframe.src = url;
      const loadResult = await loadWithTimeout(iframe, url, 6000);

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
        console.log(`TabBoost: 检测到非HTML内容 (${loadResult.contentType})，在新标签页中打开`);
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
