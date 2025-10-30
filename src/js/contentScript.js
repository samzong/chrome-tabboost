import { fetchSharedSyncValues } from "../utils/sharedStorageClient.js";
import { validateUrl } from "../utils/utils.js";
import { canLoadInIframe } from "../utils/iframe-compatibility.js";
import { getMessage } from "../utils/i18n.js";
import { createEventListenerTracker } from "../utils/eventListenerTracker.js";
import {
  LOAD_EXTENSION_SCRIPT_ACTION,
} from "../utils/messageChannels.js";

/* global __webpack_public_path__ */

const extensionAssetBaseUrl =
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  typeof chrome.runtime.getURL === "function"
    ? chrome.runtime.getURL("")
    : "";

if (extensionAssetBaseUrl) {
  try {
    // Ensure dynamic imports load from the extension package when injected as a content script
    // eslint-disable-next-line no-undef
    __webpack_public_path__ = extensionAssetBaseUrl;
  } catch (error) {
    // Ignore webpack public path configuration errors
  }
}

function getExtensionAssetUrl(relativePath) {
  if (typeof chrome === "undefined" || !chrome.runtime?.getURL) {
    return relativePath;
  }

  if (relativePath.startsWith("chrome-extension://")) {
    return relativePath;
  }

  return chrome.runtime.getURL(relativePath.replace(/^\//, ""));
}

function sendChunkInjectionRequest(url, chunkId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: LOAD_EXTENSION_SCRIPT_ACTION,
        payload: {
          url,
          chunkId,
        },
      },
      (response) => {
        const lastError = chrome.runtime && chrome.runtime.lastError;
        if (lastError) {
          reject(lastError);
          return;
        }

        if (response && response.success) {
          resolve();
        } else {
          const errorMessage =
            (response && response.error) || "Unknown chunk injection failure";
          reject(new Error(errorMessage));
        }
      }
    );
  });
}

if (typeof __webpack_require__ === "function") {
  // Custom webpack chunk loader: In Chrome extension content scripts, standard webpack chunk loading
  // does not work due to extension security policies and CSP restrictions. Chunks must be loaded
  // via the background script, which has access to extension resources. This override ensures
  // dynamic imports function correctly in content scripts.
  __webpack_require__.l = function loadChunkViaBackground(url, done, key, chunkId) {
    const resolvedUrl = getExtensionAssetUrl(url);

    sendChunkInjectionRequest(resolvedUrl, chunkId)
      .then(() => {
        done();
      })
      .catch((error) => {
        done(error);
      });
  };
}

const POPUP_IFRAME_TIMEOUT_MS = 5000;
const CAPTURE_PHASE_HOST_WHITELIST = ["feishu.cn", "larksuite.com"];

let splitViewControllerModule;
let splitViewControllerImportPromise;

function resolveSplitViewControllerModule(module) {
  splitViewControllerModule = module && module.default ? module.default : module;
  return splitViewControllerModule;
}


async function getSplitViewController() {
  if (splitViewControllerModule) {
    return splitViewControllerModule;
  }

  if (!splitViewControllerImportPromise) {
    splitViewControllerImportPromise = import(
      /* webpackChunkName: "split-view-controller" */ "./splitView/splitViewController.js"
    )
      .then(resolveSplitViewControllerModule)
      .catch((error) => {
        splitViewControllerImportPromise = null;
        throw error;
      });
  }

  return splitViewControllerImportPromise;
}

const shouldUseCapturePhase = (() => {
  try {
    const { hostname } = window.location;
    return CAPTURE_PHASE_HOST_WHITELIST.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch (error) {
    console.error(
      "chrome-tabboost: Failed to resolve hostname for capture phase:",
      error
    );
    return false;
  }
})();

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

const clickListenerOptions = shouldUseCapturePhase
  ? { capture: true, passive: false }
  : { passive: false };

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
  clickListenerOptions
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
  const defaults = {
    popupSizePreset: "default",
    customWidth: 80,
    customHeight: 80,
  };

  try {
    const settings = await fetchSharedSyncValues(defaults);
    return { ...defaults, ...settings };
  } catch (error) {
    console.error("chrome-tabboost: Failed to get preview settings:", error);
    return defaults;
  }
}

function createToolbarElements() {
  const loadingText = getMessage("loading") || "Loading...";
  const openInNewTabText = getMessage("openInNewTab") || "Open in new tab";
  const refreshText = getMessage("refreshPreview") || "Refresh";
  const copyUrlText = getMessage("copyUrl") || "Copy URL";
  const closeText = getMessage("close") || "Close";

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

  const refreshButton = createElementWithAttributes("button", {
    className: "tabboost-button tabboost-refresh-button",
    title: refreshText,
    "aria-label": refreshText,
    textContent: refreshText,
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

  appendChildren(buttonsDiv, [
    copyUrlButton,
    refreshButton,
    newTabButton,
    closeButton,
  ]);
  appendChildren(toolbar, [titleSpan, buttonsDiv]);

  return { toolbar, titleSpan };
}

function createErrorMsgElement() {
  const openInNewTabText = getMessage("openInNewTab") || "Open in new tab";
  const retryText = getMessage("retryLoading") || "Retry loading";
  const cannotLoadText =
    getMessage("cannotLoadInPopup") || "Cannot load this website in popup.";

  return createElementWithAttributes("div", {
    id: "tabboost-popup-error",
    innerHTML: `
      <p>${cannotLoadText}</p>
      <button id="tabboost-open-newtab">${openInNewTabText}</button>
      <button id="tabboost-retry-error">${retryText}</button>
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

  const { toolbar, titleSpan } = createToolbarElements();
  const errorMsg = createErrorMsgElement();

  const iframe = createElementWithAttributes("iframe", {
    id: "tabboost-popup-iframe",
  });

  if ("loading" in HTMLIFrameElement.prototype) {
    iframe.loading = "lazy";
  }

  const iframeWrapper = createElementWithAttributes("div", {
    id: "tabboost-iframe-wrapper",
  });

  appendChildren(iframeWrapper, [iframe, errorMsg]);
  appendChildren(popupContent, [toolbar, iframeWrapper]);
  appendChildren(popupOverlay, [popupContent]);
  appendChildren(fragment, [popupOverlay]);

  return { fragment, popupOverlay, popupContent, iframe, errorMsg, titleSpan };
}

function evaluateIframeLoad(iframe) {
  let currentHref = "";
  try {
    currentHref =
      iframe.contentWindow &&
      iframe.contentWindow.location &&
      iframe.contentWindow.location.href;
  } catch (corsError) {
    return { status: "cors" };
  }

  const declaredSrc = iframe.getAttribute("src") || iframe.src;

  if (!currentHref || currentHref === "about:blank") {
    if (declaredSrc && declaredSrc !== "about:blank") {
      return { status: "pending" };
    }
    return { status: "blank" };
  }

  try {
    const contentType =
      iframe.contentDocument && iframe.contentDocument.contentType;
    if (contentType && !contentType.includes("text/html")) {
      return { status: "non_html", contentType };
    }
  } catch (typeError) {
    /* Ignore, treat as success */
  }

  return { status: "success" };
}

function loadWithTimeout(iframe, url, timeout = POPUP_IFRAME_TIMEOUT_MS) {
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

      const outcome = evaluateIframeLoad(iframe);

      if (outcome.status === "pending") {
        return;
      }

      cleanup();
      resolve(outcome);
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
    const eventListenerTracker = createEventListenerTracker();
    const addTrackedEventListener = (target, eventType, listener, options) =>
      eventListenerTracker.add(target, eventType, listener, options);

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

    const resetBeforeLoad = () => {
      if (errorMsg) {
        errorMsg.classList.remove("show");
        const messageElement = errorMsg.querySelector("p");
        if (messageElement) {
          messageElement.textContent =
            getMessage("cannotLoadInPopup") ||
            "Cannot load this website in popup.";
        }
      }
      if (titleSpan) {
        titleSpan.innerText = getMessage("loading") || "Loading...";
      }
      if (iframe) {
        iframe.style.opacity = "1";
      }
    };

    const closePopup = () => {
      try {
        clearAllTimers();
        if (!popupOverlay) return;
        popupOverlay.classList.remove("show");
        eventListenerTracker.removeAll();
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

    const handleLoadFailure = async (error) => {
      if (hasHandledFailure) return;
      hasHandledFailure = true;
      clearAllTimers();

      console.error("chrome-tabboost: Popup load failure:", error.message);

      const isTimeout =
        error &&
        error.message &&
        error.message.toLowerCase().includes("timeout");

      if (isTimeout) {
        const lateLoadHandler = async () => {
          const outcome = evaluateIframeLoad(iframe);
          if (outcome.status === "pending") {
            return;
          }

          hasHandledFailure = false;
          if (errorMsg) {
            errorMsg.classList.remove("show");
          }

          await handleSuccessfulLoad(outcome);
        };

        addTrackedEventListener(iframe, "load", lateLoadHandler, {
          once: true,
        });
      }

      if (errorMsg) {
        errorMsg.classList.add("show");
        const messageElement = errorMsg.querySelector("p");
        if (messageElement && error && error.message) {
          messageElement.textContent = error.message;
        }
      }
    };

    const handleSuccessfulLoad = async (loadResult) => {
      if (errorMsg) {
        errorMsg.classList.remove("show");
      }

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
        await handleLoadFailure(
          new Error(
            getMessage("cannotLoadInPopup") ||
              "Cannot load this website in popup."
          )
        );
        return;
      }

      try {
        if (iframe.contentDocument && iframe.contentDocument.title) {
          const iframeTitle = iframe.contentDocument.title;
          if (titleSpan)
            titleSpan.innerText =
              iframeTitle || getMessage("pageLoaded") || "Page loaded";
        } else if (titleSpan) {
          titleSpan.innerText = getMessage("pageLoaded") || "Page loaded";
        }
      } catch (e) {
        if (titleSpan) {
          titleSpan.innerText = getMessage("pageLoaded") || "Page loaded";
        }
      }
    };

    const loadIframeContent = async () => {
      hasHandledFailure = false;
      clearAllTimers();
      resetBeforeLoad();

      try {
        const loadPromise = loadWithTimeout(
          iframe,
          url,
          POPUP_IFRAME_TIMEOUT_MS
        );
        iframe.src = url;
        const loadResult = await loadPromise;

        if (hasHandledFailure) {
          return;
        }

        await handleSuccessfulLoad(loadResult);
      } catch (error) {
        if (!hasHandledFailure) {
          await handleLoadFailure(error);
        }
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
        const onIframeLoad = () => {
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

            try {
              if (iframe.contentWindow) {
                addTrackedEventListener(
                  iframe.contentWindow,
                  "load",
                  () => {
                    try {
                      const doc = iframe.contentDocument;
                      if (!doc || !doc.head) {
                        return;
                      }

                      const script = doc.createElement("script");
                      script.textContent = `
                        document.addEventListener('keydown', function(event) {
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            event.stopPropagation();
                            window.parent.postMessage({ action: 'closePopup' }, '*');
                          }
                        }, true);
                      `;
                      doc.head.appendChild(script);
                    } catch (err) {
                      /* Ignore */
                    }
                  },
                  { once: true }
                );
              }
            } catch (err) {
              /* Ignore */
            }
          }
        };

        addTrackedEventListener(iframe, "load", onIframeLoad);

        const messageListener = (event) => {
          if (event?.data?.action === "closePopup") {
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

      const refreshButton = popupOverlay.querySelector(
        ".tabboost-refresh-button"
      );
      if (refreshButton) {
        addTrackedEventListener(refreshButton, "click", () => {
          loadIframeContent();
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

      const retryErrorButton = errorMsg.querySelector("#tabboost-retry-error");
      if (retryErrorButton) {
        addTrackedEventListener(retryErrorButton, "click", () => {
          loadIframeContent();
        });
      }
    };
    addButtonListeners();

    await loadIframeContent();
  } catch (error) {
    console.error("chrome-tabboost: Error creating popup DOM:", error);
    eventListenerTracker.removeAll();
    window.open(url, "_blank");
  }
}

const SPLIT_VIEW_NAMESPACE = "tabboost.splitView";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.namespace === SPLIT_VIEW_NAMESPACE) {
    handleSplitViewMessage(request, sendResponse);
    return true;
  }

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

async function handleSplitViewMessage(request, sendResponse) {
  const { command, payload = {} } = request;

  try {
    let result;

    switch (command) {
      case "init": {
        const controller = await getSplitViewController();
        result = controller.ensureActive(
          payload.leftUrl || window.location.href
        );
        break;
      }
      case "teardown": {
        const controller = await getSplitViewController();
        result = controller.teardown();
        break;
      }
      case "updateRight": {
        const controller = await getSplitViewController();
        result = controller.updateRightView(
          payload.url,
          payload.leftUrl || window.location.href
        );
        break;
      }
      case "status": {
        const controller = await getSplitViewController();
        result = {
          success: true,
          status: controller.getStatus(),
        };
        break;
      }
      default:
        result = { success: false, error: "unknown-command" };
    }

    sendResponse(result);
  } catch (error) {
    console.error("chrome-tabboost: split view controller error:", error);
    sendResponse({ success: false, error: error.message });
  }
}
