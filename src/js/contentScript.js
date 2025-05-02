import storageCache from "../utils/storage-cache.js";
import { validateUrl } from "../utils/utils.js";
import { canLoadInIframe } from "../utils/iframe-compatibility.js";
import { getMessage } from "../utils/i18n.js";

const initStorageCache = async () => {
  try {
    await storageCache.init();
  } catch (error) {
    console.error("chrome-tabboost: Failed to initialize storage cache:", error);
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

function showSaveNotification() {
  if (document.getElementById("tabboost-save-notification")) {
    return;
  }

  const notification = document.createElement("div");
  notification.id = "tabboost-save-notification";
  notification.className = "tabboost-notification";

  const message = document.createElement("span");
  message.textContent =
    getMessage("savePageConfirmation") || "Are you sure you want to save this page?";
  notification.appendChild(message);

  const saveButton = document.createElement("button");
  saveButton.className = "tabboost-notif-button";
  saveButton.textContent = getMessage("continueToSave") || "Save";
  saveButton.addEventListener("click", function () {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }

    shouldInterceptSave = false;

    const saveInstructionNotification = document.createElement("div");
    saveInstructionNotification.id = "tabboost-save-instruction";
    saveInstructionNotification.className = "tabboost-notification";

    const isMac = navigator.platform.includes("Mac");
    let saveInstructionText = "";
    if (isMac) {
      saveInstructionText =
        getMessage("savePageInstructionMac") ||
        "You can save this page by selecting File → Save Page As... or press Command+S again within 3 seconds";
    } else {
      saveInstructionText =
        getMessage("savePageInstructionOther") ||
        "You can save this page by selecting File → Save Page As... or press Ctrl+S again within 3 seconds";
    }

    saveInstructionNotification.textContent = saveInstructionText;
    saveInstructionNotification.style.cssText = `
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

    document.body.appendChild(saveInstructionNotification);

    setTimeout(() => {
      if (saveInstructionNotification.parentNode) {
        saveInstructionNotification.style.animation = "fadeOut 0.3s ease-out forwards";
        setTimeout(() => {
          if (saveInstructionNotification.parentNode) {
            saveInstructionNotification.parentNode.removeChild(saveInstructionNotification);
          }
        }, 300);
      }
    }, 3000);

    setTimeout(() => {
      shouldInterceptSave = true;
    }, 3000);
  });

  notification.appendChild(saveButton);

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

  const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

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
    if (event.button !== 0 || !(event.metaKey || event.ctrlKey)) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) {
      chrome.runtime.sendMessage(
        {
          action: "openInSplitView",
          url: link.href,
        },
        function (response) {
          if (response && response.status === "error") {
            const notification = document.createElement("div");
            notification.className = "tabboost-notification";
            notification.textContent =
              getMessage("splitViewFailure") ||
              "Split view loading failed, trying to open in new tab...";
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
          `;
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
    } else {
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
      console.error(`chrome-tabboost: URL security validation failed: ${validationResult.reason}`);
      window.open(url, "_blank");
      return;
    }

    url = validationResult.sanitizedUrl;

    const canLoad = await canLoadInIframe(url, { isPopup: true });

    if (!canLoad) {
      console.log(`chrome-tabboost: URL ${url} cannot be loaded in popup, opening in new tab...`);
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
      autoAddToIgnoreList: false,
      iframeIgnoreList: [],
    });
    return settings;
  } catch (error) {
    console.error("chrome-tabboost: Failed to get preview settings:", error);
    return {
      popupSizePreset: "default",
      customWidth: 80,
      customHeight: 80,
      autoAddToIgnoreList: false,
      iframeIgnoreList: [],
    };
  }
}

function createPopupDOMElements(url, settings) {
  const fragment = document.createDocumentFragment();

  const popupOverlay = document.createElement("div");
  popupOverlay.id = "tabboost-popup-overlay";
  popupOverlay.setAttribute("role", "dialog");
  popupOverlay.setAttribute("aria-modal", "true");

  const popupContent = document.createElement("div");
  popupContent.id = "tabboost-popup-content";

  if (settings.popupSizePreset === "large") {
    popupContent.classList.add("size-large");
  } else if (settings.popupSizePreset === "custom") {
    popupContent.classList.add("size-custom");
    popupContent.style.width = `${settings.customWidth}%`;
    popupContent.style.height = `${settings.customHeight}%`;
  }

  const loadingText = getMessage("loading") || "Loading...";
  const openInNewTabText = getMessage("openInNewTab") || "Open in new tab";
  const closeText = getMessage("close") || "Close";
  const sizeHintText = getMessage("popupSizeHint") || "Adjust popup size in extension options";

  const toolbar = document.createElement("div");
  toolbar.id = "tabboost-popup-toolbar";

  const titleSpan = document.createElement("span");
  titleSpan.id = "tabboost-popup-title";
  titleSpan.textContent = loadingText;

  const buttonsDiv = document.createElement("div");
  buttonsDiv.id = "tabboost-popup-buttons";

  const newTabButton = document.createElement("button");
  newTabButton.className = "tabboost-button tabboost-newtab-button";
  newTabButton.title = openInNewTabText;
  newTabButton.setAttribute("aria-label", openInNewTabText);
  newTabButton.textContent = openInNewTabText;

  const sizeHintButton = document.createElement("button");
  sizeHintButton.className = "tabboost-button tabboost-size-hint";
  sizeHintButton.title = sizeHintText;
  sizeHintButton.setAttribute("aria-label", sizeHintText);
  sizeHintButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block; margin: auto;">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  `;

  const closeButton = document.createElement("button");
  closeButton.className = "tabboost-button tabboost-close-button";
  closeButton.title = closeText;
  closeButton.setAttribute("aria-label", closeText);
  closeButton.innerHTML = "&times;";

  buttonsDiv.appendChild(newTabButton);
  buttonsDiv.appendChild(sizeHintButton);
  buttonsDiv.appendChild(closeButton);

  toolbar.appendChild(titleSpan);
  toolbar.appendChild(buttonsDiv);

  const cannotLoadText = getMessage("cannotLoadInPopup") || "Cannot load this website in popup.";
  const addToIgnoreText = getMessage("addToIgnoreList") || "Add to ignore list";
  const errorMsg = document.createElement("div");
  errorMsg.id = "tabboost-popup-error";
  errorMsg.innerHTML = `
    <p>${cannotLoadText}</p>
    <button id="tabboost-open-newtab">${openInNewTabText}</button>
    <button id="tabboost-add-to-ignore">${addToIgnoreText}</button>
    <button id="tabboost-close-error">${closeText}</button>
  `;

  const iframe = document.createElement("iframe");
  iframe.id = "tabboost-popup-iframe";
  if ("loading" in HTMLIFrameElement.prototype) {
    iframe.loading = "lazy";
  }

  const iframeWrapper = document.createElement("div");
  iframeWrapper.id = "tabboost-iframe-wrapper";

  iframeWrapper.appendChild(iframe);
  iframeWrapper.appendChild(errorMsg);

  popupContent.appendChild(toolbar);
  popupContent.appendChild(iframeWrapper);
  popupOverlay.appendChild(popupContent);
  fragment.appendChild(popupOverlay);

  return { fragment, popupOverlay, popupContent, iframe, errorMsg, titleSpan };
}

function loadWithTimeout(iframe, url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    let timeoutId = null;
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
          console.log(
            "chrome-tabboost: iframe onload triggered for blank or inaccessible content."
          );
          cleanup();
          resolve({ status: "blank" });
        } else {
          cleanup();
          resolve({ status: "success" });
        }
      } catch (corsError) {
        console.log("chrome-tabboost: iframe onload triggered, but CORS prevents content access.");
        cleanup();
        resolve({ status: "cors" });
      }
    };

    iframe.onerror = () => {
      if (hasSettled) return;
      cleanup();
      reject(new Error(getMessage("cannotLoadInPopup") || "iframe load error (onerror)"));
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
    const { fragment, popupOverlay, iframe, errorMsg, titleSpan } = createPopupDOMElements(
      url,
      settings
    );

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
      if (settings.autoAddToIgnoreList) {
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          let ignoreList = settings.iframeIgnoreList || [];
          if (!Array.isArray(ignoreList)) ignoreList = [];

          if (!ignoreList.includes(hostname)) {
            ignoreList.push(hostname);
            await storageCache.set({ iframeIgnoreList: ignoreList });
            console.log(`chrome-tabboost: Automatically added ${hostname} to ignore list`);

            const autoAddNotice = document.createElement("p");
            autoAddNotice.className = "tabboost-auto-add-notice";
            const autoAddMessage = getMessage("autoAddToIgnoreList", [hostname]);
            autoAddNotice.textContent =
              autoAddMessage || `Automatically added ${hostname} to ignore list...`;
            if (errorMsg) errorMsg.appendChild(autoAddNotice);
          }
        } catch (err) {
          console.error("chrome-tabboost: Error auto-adding to ignore list:", err);
        }
      }
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
      if (newTabButton) {
        addTrackedEventListener(newTabButton, "click", () => {
          window.open(url, "_blank");
          closePopup();
        });
      }

      const closeButton = popupOverlay.querySelector(".tabboost-close-button");
      if (closeButton) {
        addTrackedEventListener(closeButton, "click", closePopup);
      }

      const sizeHintButton = popupOverlay.querySelector(".tabboost-size-hint");
      if (sizeHintButton) {
        addTrackedEventListener(sizeHintButton, "click", () => {
          chrome.runtime.sendMessage({ action: "openOptionsPage", section: "popup-size" });
        });
      }

      const openNewTabButton = errorMsg.querySelector("#tabboost-open-newtab");
      if (openNewTabButton) {
        addTrackedEventListener(openNewTabButton, "click", () => {
          window.open(url, "_blank");
          closePopup();
        });
      }

      const addToIgnoreButton = errorMsg.querySelector("#tabboost-add-to-ignore");
      if (addToIgnoreButton) {
        addTrackedEventListener(addToIgnoreButton, "click", async () => {
          try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            let ignoreList = settings.iframeIgnoreList || [];
            if (!Array.isArray(ignoreList)) ignoreList = [];

            if (!ignoreList.includes(hostname)) {
              ignoreList.push(hostname);
              await storageCache.set({ iframeIgnoreList: ignoreList });
              console.log(`chrome-tabboost: Added ${hostname} to ignore list`);
              alert(
                getMessage("addedToIgnoreList", hostname) || `Added ${hostname} to ignore list...`
              );
              window.open(url, "_blank");
              closePopup();
            } else {
              alert(
                getMessage("alreadyInIgnoreList", hostname) ||
                  `${hostname} is already in the ignore list`
              );
              window.open(url, "_blank");
              closePopup();
            }
          } catch (error) {
            console.error("chrome-tabboost: Error adding to ignore list:", error);
            alert(getMessage("failedToAddToIgnoreList") || "Failed to add to ignore list");
          }
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
      console.log("chrome-tabboost: Starting iframe load with timeout...");
      iframe.src = url;
      const loadResult = await loadWithTimeout(iframe, url, 6000);

      if (hasHandledFailure) return;

      if (loadResult.status === "blank") {
        console.log("chrome-tabboost: iframe loaded, but content is blank or inaccessible");
        await handleLoadFailure(
          new Error(getMessage("cannotLoadInPopup") || "Content is blank or inaccessible")
        );
        return;
      } else if (loadResult.status === "cors") {
        console.log("chrome-tabboost: iframe loaded with CORS restrictions");
      } else {
        console.log("chrome-tabboost: iframe load considered successful.");
        clearAllTimers();
      }

      try {
        if (iframe.contentDocument && iframe.contentDocument.title) {
          const iframeTitle = iframe.contentDocument.title;
          if (titleSpan)
            titleSpan.innerText = iframeTitle || getMessage("pageLoaded") || "Page loaded";
        } else {
          if (titleSpan) titleSpan.innerText = getMessage("pageLoaded") || "Page loaded";
        }
      } catch (e) {
        console.log("chrome-tabboost: CORS prevents title access after load.");
        if (titleSpan) titleSpan.innerText = getMessage("pageLoaded") || "Page loaded";
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
