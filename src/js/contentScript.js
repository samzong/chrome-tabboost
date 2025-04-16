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

// 添加一个标志变量，控制是否拦截Command+S
let shouldInterceptSave = true;

// 监听 Command+S / Ctrl+S 快捷键
document.addEventListener('keydown', function saveKeyListener(event) {
  // 检查是否是 Command+S (Mac) 或 Ctrl+S (Windows/Linux)
  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
    if (shouldInterceptSave) {
      // 阻止默认的保存行为
      event.preventDefault();
      
      // 显示轻量级提示
      showSaveNotification();
      
      return false;
    }
    // 如果标志为false，不拦截，让浏览器执行默认的保存行为
  }
}, true);

// 显示保存轻量级通知
function showSaveNotification() {
  // 检查是否已存在通知
  if (document.getElementById('tabboost-save-notification')) {
    return;
  }
  
  // 创建通知元素
  const notification = document.createElement('div');
  notification.id = 'tabboost-save-notification';
  notification.className = 'tabboost-notification';
  
  // 添加内容
  const message = document.createElement('span');
  message.textContent = getMessage("savePageConfirmation") || '您确定要保存此页面吗？';
  notification.appendChild(message);
  
  // 添加保存按钮
  const saveButton = document.createElement('button');
  saveButton.className = 'tabboost-notif-button';
  saveButton.textContent = getMessage("continueToSave") || '保存';
  saveButton.addEventListener('click', function() {
    // 移除通知
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
    
    // 设置标志，禁用拦截
    shouldInterceptSave = false;
    
    // 创建一个新通知，提示用户如何保存
    const saveInstructionNotification = document.createElement('div');
    saveInstructionNotification.id = 'tabboost-save-instruction';
    saveInstructionNotification.className = 'tabboost-notification';
    
    // 根据系统判断提示文本
    const isMac = navigator.platform.includes('Mac');
    let saveInstructionText = '';
    if (isMac) {
      saveInstructionText = getMessage("savePageInstructionMac") || '您可以通过菜单 File → Save Page As... 或3秒内再次按 Command+S 保存此页面';
    } else {
      saveInstructionText = getMessage("savePageInstructionOther") || '您可以通过菜单 文件 → 页面另存为... 或3秒内再次按 Ctrl+S 保存此页面';
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
    
    // 3秒后移除提示
    setTimeout(() => {
      if (saveInstructionNotification.parentNode) {
        saveInstructionNotification.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => {
          if (saveInstructionNotification.parentNode) {
            saveInstructionNotification.parentNode.removeChild(saveInstructionNotification);
          }
        }, 300);
      }
    }, 3000);
    
    // 3秒后重新启用拦截，给用户足够时间进行保存操作
    setTimeout(() => {
      shouldInterceptSave = true;
    }, 3000);
  });
  
  notification.appendChild(saveButton);
  
  // 将通知添加到页面
  document.body.appendChild(notification);
  
  // 为通知添加样式
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
  
  // 添加样式到文档头
  const style = document.createElement('style');
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
  
  // 检测暗黑模式
  const isDarkMode = window.matchMedia && 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (isDarkMode) {
    notification.style.backgroundColor = 'rgba(31, 41, 55, 0.9)';
  }
  
  // 设置自动消失定时器 (5秒后)
  setTimeout(() => {
    if (notification.parentNode) {
      // 添加淡出动画
      notification.style.animation = 'fadeOut 0.3s ease-out forwards';
      style.textContent += `
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(10px); }
        }
      `;
      
      // 动画结束后删除元素
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
}

// 监听点击事件
document.addEventListener(
  "click",
  async function (event) {
    if (event.button !== 0 || !(event.metaKey || event.ctrlKey)) {
      return;
    }

    const link = event.target.closest('a[href]');
    if (!link) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) {
      // 分屏逻辑
      chrome.runtime.sendMessage({
        action: "openInSplitView",
        url: link.href
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
            window.open(link.href, "_blank");
            
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 3000);
          }, 500);
        }
      });
    } else {
      // 预览逻辑
      await createPopup(link.href);
    }
  },
  { passive: false }  // 显式声明为非被动事件，因为我们需要调用 preventDefault
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
    
    await createPopupDOM(url);
  } catch (error) {
    console.error("chrome-tabboost: Error in createPopup:", error);
    window.open(url, "_blank");
  }
}

// 统一获取预览相关设置
async function getPreviewSettings() {
  try {
    const settings = await storageCache.get({
      popupSizePreset: 'default',
      customWidth: 80,
      customHeight: 80,
      autoAddToIgnoreList: false,
      iframeIgnoreList: []
      // 如果将来有其他设置，也在这里添加
    });
    return settings;
  } catch (error) {
    console.error("chrome-tabboost: Failed to get preview settings:", error);
    // 返回默认值以保证基本功能
    return {
      popupSizePreset: 'default',
      customWidth: 80,
      customHeight: 80,
      autoAddToIgnoreList: false,
      iframeIgnoreList: []
    };
  }
}

// 函数：创建弹窗DOM元素 (优化)
function createPopupDOMElements(url, settings) {
  const fragment = document.createDocumentFragment();

  const popupOverlay = document.createElement("div");
  popupOverlay.id = "tabboost-popup-overlay";
  popupOverlay.setAttribute("role", "dialog");
  popupOverlay.setAttribute("aria-modal", "true");

  const popupContent = document.createElement("div");
  popupContent.id = "tabboost-popup-content";

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
  const sizeHintText = getMessage("popupSizeHint") || "在扩展选项中可调整弹窗大小";

  // 创建工具栏
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

  const sizeHintButton = document.createElement('button');
  sizeHintButton.className = 'tabboost-button tabboost-size-hint';
  sizeHintButton.title = sizeHintText;
  sizeHintButton.setAttribute('aria-label', sizeHintText);
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

  // 创建错误信息区域
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

  // 创建 iframe
  const iframe = document.createElement("iframe");
  iframe.id = "tabboost-popup-iframe";
  if ('loading' in HTMLIFrameElement.prototype) {
    iframe.loading = "lazy";
  }

  // 创建 iframe 包装器
  const iframeWrapper = document.createElement("div");
  iframeWrapper.id = "tabboost-iframe-wrapper";
  // 在 CSS 中设置 position: relative 和 flex: 1
  
  // 将 iframe 和 errorMsg 添加到包装器中
  iframeWrapper.appendChild(iframe);
  iframeWrapper.appendChild(errorMsg);

  // 组装元素
  popupContent.appendChild(toolbar);
  popupContent.appendChild(iframeWrapper); // 添加包装器，而不是直接添加 iframe 和 errorMsg
  popupOverlay.appendChild(popupContent);
  fragment.appendChild(popupOverlay);

  return { fragment, popupOverlay, popupContent, iframe, errorMsg, titleSpan };
}

// 使用 Promise.race 实现 iframe 加载和超时
function loadWithTimeout(iframe, url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    let timeoutId = null;
    let hasSettled = false; // 防止重复 resolve/reject

    const cleanup = () => {
      clearTimeout(timeoutId);
      iframe.onload = null; // 移除监听器
      iframe.onerror = null;
      hasSettled = true;
    };

    timeoutId = setTimeout(() => {
      if (hasSettled) return;
      cleanup();
      reject(new Error(getMessage("loadTimeout") || "加载超时"));
    }, timeout);

    iframe.onload = () => {
      if (hasSettled) return;
      // 增加对 contentDocument/contentWindow 的访问保护
      try {
        // 检查是否是 about:blank 或 null，这不算成功加载
        if (!iframe.contentWindow || !iframe.contentWindow.location || iframe.contentWindow.location.href === 'about:blank') {
          // 在某些情况下，即使加载失败（如CORS），onload也可能触发
          // 但如果内容是空的或无法访问，我们视为"空白"状态的成功加载
          console.log("chrome-tabboost: iframe onload triggered for blank or inaccessible content.");
          cleanup();
          // 传递一个特殊状态，表示内容为空或无法访问
          resolve({ status: 'blank' }); 
        } else {
           // 只有在明确不是 about:blank 且可访问时才认为 onload 成功
          cleanup();
          resolve({ status: 'success' }); 
        }
      } catch (corsError) {
         // 跨域错误，onload 触发了，但我们无法检查内容
         console.log("chrome-tabboost: iframe onload triggered, but CORS prevents content access.");
         cleanup();
         // 对于 CORS 错误，也视为一种特殊状态
         resolve({ status: 'cors' }); 
      }
    };

    iframe.onerror = () => {
      if (hasSettled) return;
      cleanup();
      reject(new Error(getMessage("cannotLoadInPopup") || "iframe 加载错误 (onerror)"));
    };

    // 注意：src 的设置现在由调用者负责，在 DOM 添加后进行
    // iframe.src = url; 
  });
}

// 函数：创建弹窗DOM
async function createPopupDOM(url) {
  try {
    const eventListeners = [];
    const addTrackedEventListener = (element, eventType, listener) => {
      element.addEventListener(eventType, listener);
      eventListeners.push({ element, eventType, listener });
    };
  
    const settings = await getPreviewSettings();
    const { fragment, popupOverlay, iframe, errorMsg, titleSpan } = createPopupDOMElements(url, settings);
    
    let hasHandledFailure = false;
    
    const timers = {
      checkInterval: null,
      closeTimeout: null
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
            
            const autoAddNotice = document.createElement('p');
            autoAddNotice.className = 'tabboost-auto-add-notice';
            const autoAddMessage = getMessage("autoAddToIgnoreList", [hostname]);
            autoAddNotice.textContent = autoAddMessage || `已自动将 ${hostname} 添加到忽略列表...`;
            if(errorMsg) errorMsg.appendChild(autoAddNotice);
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
            if (element && typeof element.removeEventListener === 'function') {
              element.removeEventListener(eventType, listener);
            }
          } catch (e) { /* 忽略 */ }
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
        // ... (强制移除逻辑) ...
      }
    }

    // === DOM 添加和加载逻辑 ===
    document.body.appendChild(fragment);

    // === 交互修正：立即显示弹窗和加载状态 ===
    requestAnimationFrame(() => {
      if (popupOverlay) popupOverlay.classList.add("show");
    });

    // 添加按钮和 ESC 监听器
    const escListener = (event) => { if (event.key === "Escape") closePopup(); };
    addTrackedEventListener(document, "keydown", escListener);
    const addButtonListeners = () => {
      // 使用 popupOverlay.querySelector 来查找按钮
      const newTabButton = popupOverlay.querySelector('.tabboost-newtab-button');
      if (newTabButton) {
        addTrackedEventListener(newTabButton, "click", () => {
          window.open(url, "_blank");
          closePopup();
        });
      }
      
      const closeButton = popupOverlay.querySelector('.tabboost-close-button');
      if (closeButton) {
        addTrackedEventListener(closeButton, "click", closePopup);
      }
      
      const sizeHintButton = popupOverlay.querySelector('.tabboost-size-hint');
      if (sizeHintButton) {
        addTrackedEventListener(sizeHintButton, "click", () => {
          chrome.runtime.sendMessage({ action: "openOptionsPage", section: "popup-size" });
        });
      }
      
      // 错误信息的按钮
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
              alert(`已将 ${hostname} 添加到忽略列表...`);
              window.open(url, "_blank");
              closePopup();
            } else {
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
    
      const closeErrorButton = errorMsg.querySelector("#tabboost-close-error");
      if (closeErrorButton) {
        addTrackedEventListener(closeErrorButton, "click", () => {
          if (errorMsg) errorMsg.classList.remove("show");
          if (iframe) iframe.style.opacity = "1"; 
        });
      }
    };
    addButtonListeners();

    // 开始加载并处理超时 (try...catch 块现在只包含异步加载逻辑)
    try {
      console.log("chrome-tabboost: Starting iframe load with timeout...");
      iframe.src = url; 
      const loadResult = await loadWithTimeout(iframe, url, 6000); 

      // === 加载结果处理 ===
      if (hasHandledFailure) return;
      
      // 处理不同的加载状态
      if (loadResult.status === 'blank') {
        // 空白内容处理 - 可能是加载失败或内容为空
        console.log("chrome-tabboost: iframe loaded, but content is blank or inaccessible");
        await handleLoadFailure(new Error(getMessage("cannotLoadInPopup") || "内容为空或无法访问"));
        return;
      } else if (loadResult.status === 'cors') {
        // CORS 错误处理 - 内容已加载，但由于跨域限制无法访问
        console.log("chrome-tabboost: iframe loaded with CORS restrictions");
        // 由于无法确定是否正常加载，暂时视为成功，由后续 checkInterval 检查
      } else {
        // 成功加载的情况
        console.log("chrome-tabboost: iframe load considered successful.");
        clearAllTimers();
      }

      try {
        if (iframe.contentDocument && iframe.contentDocument.title) {
          const iframeTitle = iframe.contentDocument.title;
          if (titleSpan) titleSpan.innerText = iframeTitle || getMessage("pageLoaded") || "页面已加载";
        } else {
           if (titleSpan) titleSpan.innerText = getMessage("pageLoaded") || "页面已加载";
        }
      } catch (e) {
        console.log("chrome-tabboost: CORS prevents title access after load.");
        if (titleSpan) titleSpan.innerText = getMessage("pageLoaded") || "页面已加载";
      }

    } catch (error) {
      // === 加载失败/超时处理 ===
      if (!hasHandledFailure) {
         await handleLoadFailure(error); 
      }
    }

    // 注意：我们已完全移除checkInterval检查，仅依赖iframe自身的加载事件
    // 如果iframe已成功加载（触发了onload事件），我们认为内容正常
    // 如果用户发现内容有问题，他们仍可以使用界面上的"在新标签页中打开"按钮

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
