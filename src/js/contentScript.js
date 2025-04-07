// contentScript.js
import storageCache from "../utils/storage-cache.js";
import { validateUrl } from "../utils/utils.js";
import { isDomainMatch } from "../utils/iframe-compatibility.js"; 
import { DANGEROUS_URL_PATTERNS, DANGEROUS_PROTOCOLS } from "../config/constants.js";
import { canLoadInIframe } from "../utils/iframe-compatibility.js";
import { getMessage } from "../utils/i18n.js"; // 导入i18n工具

// 确保缓存系统在使用前初始化
const initStorageCache = async () => {
  try {
    await storageCache.init();
  } catch (error) {
    console.error("chrome-tabboost: Failed to initialize storage cache:", error);
  }
};

initStorageCache();

// 监听点击事件
document.addEventListener(
  "click",
  async function (event) {
    if (event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      if (event.shiftKey) {
        let target = event.target;
        while (target && target.tagName !== "A") {
          target = target.parentElement;
        }
        
        if (target && target.tagName === "A" && target.href) {
          event.preventDefault();
          event.stopPropagation();
          
          chrome.runtime.sendMessage({
            action: "openInSplitView",
            url: target.href
          }, function(response) {
            if (response && response.status === 'error') {
              const notification = document.createElement('div');
              notification.className = 'tabboost-notification';
              notification.textContent = getMessage("splitViewFailure") || '分屏视图加载失败，正在尝试新标签页打开...';
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
                window.open(target.href, "_blank");
                
                setTimeout(() => {
                  if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                  }
                }, 3000);
              }, 500);
            }
          });
        }
        return;
      }

      let target = event.target;
      while (target && target.tagName !== "A") {
        target = target.parentElement;
      }

      if (target && target.tagName === "A" && target.href) {
        event.preventDefault();
        event.stopPropagation();

        createPopup(target.href);
      }
    }
  },
  true
);

// 函数：创建并显示弹窗
async function createPopup(url) {
  try {
    if (document.getElementById("tabboost-popup-overlay")) {
      return;
    }
    
    const validationResult = validateUrl(url);
    
    if (!validationResult.isValid) {
      console.error(`chrome-tabboost: URL安全验证失败: ${validationResult.reason}`);
      window.open(url, "_blank");
      return;
    }
    
    url = validationResult.sanitizedUrl;

    const canLoad = await canLoadInIframe(url, { isPopup: true });
    
    if (!canLoad) {
      console.log(`chrome-tabboost: URL ${url} 不能在弹窗中加载，直接在新标签页中打开`);
      window.open(url, "_blank");
      return;
    }
    
    createPopupDOM(url);
  } catch (error) {
    console.error("chrome-tabboost: Error in createPopup:", error);
    window.open(url, "_blank");
  }
}

// 函数：创建弹窗DOM
async function createPopupDOM(url) {
  try {
    const eventListeners = [];
    
    const addTrackedEventListener = (element, eventType, listener) => {
      element.addEventListener(eventType, listener);
      eventListeners.push({ element, eventType, listener });
    };
  
    const fragment = document.createDocumentFragment();
    
    const popupOverlay = document.createElement("div");
    popupOverlay.id = "tabboost-popup-overlay";
    popupOverlay.setAttribute("role", "dialog");
    popupOverlay.setAttribute("aria-modal", "true");

    const popupContent = document.createElement("div");
    popupContent.id = "tabboost-popup-content";
    
    const settings = await storageCache.get({
      popupSizePreset: 'default',
      customWidth: 80,
      customHeight: 80,
      autoAddToIgnoreList: false,
      iframeIgnoreList: []
    });
    
    if (settings.popupSizePreset === 'large') {
      popupContent.classList.add('size-large');
    } else if (settings.popupSizePreset === 'custom') {
      popupContent.classList.add('size-custom');
      popupContent.style.width = `${settings.customWidth}%`;
      popupContent.style.height = `${settings.customHeight}%`;
    }

    const loadingText = getMessage("loading") || "加载中...";
    const openInNewTabText = getMessage("openInNewTab") || "在新标签页中打开";
    const closeText = getMessage("close") || "关闭";

    const toolbarHtml = `
      <div id="tabboost-popup-toolbar">
        <span id="tabboost-popup-title">${loadingText}</span>
        <div id="tabboost-popup-buttons">
          <button class="tabboost-button tabboost-newtab-button" title="${openInNewTabText}" aria-label="${openInNewTabText}">${openInNewTabText}</button>
          <button class="tabboost-button tabboost-size-hint" title="${getMessage("popupSizeHint") || "在扩展选项中可调整弹窗大小"}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
          <button class="tabboost-button tabboost-close-button" title="${closeText}" aria-label="${closeText}">&times;</button>
        </div>
      </div>
      <div id="tabboost-popup-loader">${loadingText}</div>
    `;
    
    popupContent.innerHTML = toolbarHtml;
    
    const cannotLoadText = getMessage("cannotLoadInPopup") || "无法在弹窗中加载此网站。";
    const addToIgnoreText = getMessage("addToIgnoreList") || "添加到忽略列表";
    
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
    
    popupContent.appendChild(iframe);
    popupContent.appendChild(errorMsg);
    
    popupOverlay.appendChild(popupContent);
    
    fragment.appendChild(popupOverlay);
    
    let hasHandledFailure = false;
    
    const timers = {
      loadTimeout: null,
      checkInterval: null,
      closeTimeout: null
    };
    
    const handleLoadFailure = async (reason) => {
      if (hasHandledFailure) return;
      hasHandledFailure = true;
      
      const loader = document.getElementById('tabboost-popup-loader');
      if (loader) loader.style.display = "none";
      errorMsg.classList.add("show");
      
      clearAllTimers();
      
      if (settings.autoAddToIgnoreList) {
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          
          let ignoreList = settings.iframeIgnoreList;
          
          if (!Array.isArray(ignoreList)) {
            ignoreList = [];
          }
          
          if (!ignoreList.includes(hostname)) {
            ignoreList.push(hostname);
            
            await storageCache.set({ iframeIgnoreList: ignoreList });
            console.log(`chrome-tabboost: Automatically added ${hostname} to ignore list`);
            
            const autoAddNotice = document.createElement('p');
            autoAddNotice.className = 'tabboost-auto-add-notice';
            const autoAddMessage = getMessage("autoAddToIgnoreList", [hostname]);
            autoAddNotice.textContent = autoAddMessage || `已自动将 ${hostname} 添加到忽略列表，下次将直接在新标签页中打开`;
            errorMsg.appendChild(autoAddNotice);
          }
        } catch (error) {
          console.error("chrome-tabboost: Error auto-adding to ignore list:", error);
        }
      }
    };
    
    const clearAllTimers = () => {
      Object.keys(timers).forEach(key => {
        if (timers[key]) {
          if (key.includes('Interval')) {
            clearInterval(timers[key]);
          } else {
            clearTimeout(timers[key]);
          }
          timers[key] = null;
        }
      });
    };
    
    iframe.onerror = () => {
      handleLoadFailure(getMessage("cannotLoadInPopup") || "iframe error event");
    };

    iframe.onload = () => {
      try {
        if (timers.loadTimeout) {
          clearTimeout(timers.loadTimeout);
          timers.loadTimeout = null;
        }
        
        console.log("chrome-tabboost: Iframe content loaded");
        
        if (iframe.contentDocument === null || iframe.contentWindow === null) {
          handleLoadFailure(getMessage("cannotLoadInPopup") || "无法访问iframe内容");
          return;
        }
        
        const iframeContent = iframe.contentDocument.documentElement.innerHTML || '';
        if (iframeContent.includes('refused to connect') || 
            iframeContent.includes('拒绝连接') ||
            iframeContent.includes('ERR_CONNECTION_REFUSED')) {
          handleLoadFailure(getMessage("cannotLoadInPopup") || "网站拒绝连接");
          return;
        }
        
        clearAllTimers();
        
        const loader = document.getElementById('tabboost-popup-loader');
        if (loader) loader.style.display = "none";

        try {
          const iframeTitle = iframe.contentDocument.title;
          const title = document.getElementById('tabboost-popup-title');
          if (title) title.innerText = iframeTitle || getMessage("loadingPage") || "加载页面";
        } catch (e) {
          console.log(
            "chrome-tabboost: Unable to access iframe content title due to CORS restrictions"
          );
          const title = document.getElementById('tabboost-popup-title');
          if (title) title.innerText = getMessage("loadingPage") || "加载页面";
        }
      } catch (e) {
        console.warn("chrome-tabboost: Error handling iframe load event:", e);
        
        const loader = document.getElementById('tabboost-popup-loader');
        if (loader) loader.style.display = "none";
        const title = document.getElementById('tabboost-popup-title');
        if (title) title.innerText = getMessage("loadingPage") || "加载页面";
      }
    };

    iframe.src = url;
    console.log("chrome-tabboost: Iframe created and URL set");

    timers.loadTimeout = setTimeout(() => {
      handleLoadFailure(getMessage("loadTimeout") || "加载超时");
    }, 5000);

    document.body.appendChild(fragment);

    const escListener = function (event) {
      if (event.key === "Escape") {
        closePopup();
      }
    };
    addTrackedEventListener(document, "keydown", escListener);

    const addButtonListeners = () => {
      const newTabButton = document.querySelector('.tabboost-newtab-button');
      if (newTabButton) {
        addTrackedEventListener(newTabButton, "click", () => {
          window.open(url, "_blank");
          closePopup();
        });
      }
      
      const closeButton = document.querySelector('.tabboost-close-button');
      if (closeButton) {
        addTrackedEventListener(closeButton, "click", closePopup);
      }
      
      const sizeHintButton = document.querySelector('.tabboost-size-hint');
      if (sizeHintButton) {
        addTrackedEventListener(sizeHintButton, "click", () => {
          chrome.runtime.sendMessage({ action: "openOptionsPage", section: "popup-size" });
        });
      }
      
      const openNewTabButton = document.getElementById("tabboost-open-newtab");
      if (openNewTabButton) {
        addTrackedEventListener(openNewTabButton, "click", () => {
          window.open(url, "_blank");
          closePopup();
        });
      }

      const addToIgnoreButton = document.getElementById("tabboost-add-to-ignore");
      if (addToIgnoreButton) {
        addTrackedEventListener(addToIgnoreButton, "click", async () => {
          try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            let ignoreList = settings.iframeIgnoreList;
            
            if (!Array.isArray(ignoreList)) {
              ignoreList = [];
            }
            
            if (!ignoreList.includes(hostname)) {
              ignoreList.push(hostname);
              
              await storageCache.set({ iframeIgnoreList: ignoreList });
              console.log(`chrome-tabboost: Added ${hostname} to ignore list`);
              alert(`已将 ${hostname} 添加到忽略列表，下次将直接在新标签页中打开`);
              
              window.open(url, "_blank");
              closePopup();
            } else {
              console.log(`chrome-tabboost: ${hostname} is already in ignore list`);
              alert(`${hostname} 已在忽略列表中`);
              
              window.open(url, "_blank");
              closePopup();
            }
          } catch (error) {
            console.error("chrome-tabboost: Error adding to ignore list:", error);
            alert("添加到忽略列表失败");
          }
        });
      }
    
      const closeErrorButton = document.getElementById("tabboost-close-error");
      if (closeErrorButton) {
        addTrackedEventListener(closeErrorButton, "click", () => {
          const errorMsg = document.getElementById('tabboost-popup-error');
          if (errorMsg) errorMsg.classList.remove("show");
          // 移除关闭整个弹窗的调用，保留已加载的内容
          // 确保iframe完全可见
          const iframe = document.getElementById('tabboost-popup-iframe');
          if (iframe) {
            iframe.style.opacity = "1";
          }
        });
      }
    };
    
    addButtonListeners();
    
    let checkCount = 0;
    timers.checkInterval = setInterval(() => {
      checkCount++;
      
      if (hasHandledFailure || checkCount >= 5) {
        if (timers.checkInterval) {
          clearInterval(timers.checkInterval);
          timers.checkInterval = null;
        }
        return;
      }
      
      try {
        if (iframe.contentDocument === null || iframe.contentWindow === null) {
          return;
        }
        
        const iframeContent = iframe.contentDocument.documentElement.innerHTML || '';
        if (iframeContent.includes('refused to connect') || 
            iframeContent.includes('拒绝连接') ||
            iframeContent.includes('ERR_CONNECTION_REFUSED')) {
          handleLoadFailure(getMessage("cannotLoadInPopup") || '检测到拒绝连接错误');
        }
      } catch (e) {
        // 忽略跨域错误
      }
    }, 1000);

    function closePopup() {
      try {
        clearAllTimers();
        
        popupOverlay.classList.remove("show");
        
        eventListeners.forEach(({ element, eventType, listener }) => {
          try {
            if (element && typeof element.removeEventListener === 'function') {
              element.removeEventListener(eventType, listener);
            }
          } catch (e) {
            // 忽略错误，继续尝试移除其他监听器
          }
        });
        
        eventListeners.length = 0;
        
        timers.closeTimeout = setTimeout(() => {
          if (popupOverlay && popupOverlay.parentNode) {
            popupOverlay.parentNode.removeChild(popupOverlay);
          }
          if (timers.closeTimeout) {
            clearTimeout(timers.closeTimeout);
            timers.closeTimeout = null;
          }
        }, 300);
      } catch (error) {
        console.error("chrome-tabboost: Error closing popup:", error);
        try {
          clearAllTimers();
          
          eventListeners.forEach(({ element, eventType, listener }) => {
            try {
              if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(eventType, listener);
              }
            } catch (e) {
              // 忽略错误，继续尝试移除其他监听器
            }
          });
          
          eventListeners.length = 0;
          
          if (popupOverlay && popupOverlay.parentNode) {
            popupOverlay.parentNode.removeChild(popupOverlay);
          }
        } catch (e) {
          console.error("chrome-tabboost: Error force removing popup:", e);
        }
      }
    }

    requestAnimationFrame(() => {
      popupOverlay.classList.add("show");
    });
  } catch (error) {
    console.error("chrome-tabboost: Error creating popup DOM:", error);
    window.open(url, "_blank");
  }
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openRightSplitView" && request.url) {
    const rightIframe = document.getElementById('tabboost-right-iframe');
    if (rightIframe) {
      rightIframe.src = request.url;
      sendResponse({ status: "Right split view updated" });
    } else {
      sendResponse({ status: "Split view not active" });
    }
  }
  
  return true;
});
