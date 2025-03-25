// contentScript.js
import storageCache from "../utils/storageCache.js";

// 确保缓存系统在使用前初始化
const initStorageCache = async () => {
  try {
    await storageCache.init();
    console.log("chrome-tabboost: Storage cache initialized in content script");
  } catch (error) {
    console.error("chrome-tabboost: Failed to initialize storage cache:", error);
  }
};

initStorageCache();

console.log("chrome-tabboost: Content script loaded");

// 监听点击事件
document.addEventListener(
  "click",
  function (event) {
    try {
      console.log("chrome-tabboost: Click event detected");

      // 检查是否是左键点击
      if (event.button !== 0) {
        console.log("chrome-tabboost: Not a left-click");
        return;
      }

      // 检查是否按下了 Command 键（metaKey 在 macOS 上对应 Command）
      if (event.metaKey) {
        console.log("chrome-tabboost: Command key is pressed");

        // 检查是否同时按下了 Shift 键 (用于分屏模式)
        if (event.shiftKey) {
          console.log("chrome-tabboost: Shift key is also pressed - Split View mode");
          
          // 检查点击的元素是否是链接
          let target = event.target;
          while (target && target.tagName !== "A") {
            target = target.parentElement;
          }
          
          if (target && target.tagName === "A" && target.href) {
            console.log(`chrome-tabboost: Intercepted link for split view: ${target.href}`);
            event.preventDefault(); // 阻止默认行为
            event.stopPropagation(); // 阻止事件冒泡
            
            // 发送消息到 background 处理分屏
            chrome.runtime.sendMessage({
              action: "openInSplitView",
              url: target.href
            }, function(response) {
              // 处理响应
              if (response && response.status === 'error') {
                console.error("chrome-tabboost: Split view error:", response.message);
                
                // 显示临时通知，告知用户分屏失败
                const notification = document.createElement('div');
                notification.className = 'tabboost-notification';
                notification.textContent = '分屏视图加载失败，正在尝试新标签页打开...';
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
                
                // 在新标签页中打开链接
                setTimeout(() => {
                  window.open(target.href, "_blank");
                  
                  // 3秒后移除通知
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

        // 检查点击的元素是否是链接
        let target = event.target;
        while (target && target.tagName !== "A") {
          target = target.parentElement;
        }

        if (target && target.tagName === "A" && target.href) {
          console.log(`chrome-tabboost: Intercepted link: ${target.href}`);
          event.preventDefault(); // 阻止默认行为
          event.stopPropagation(); // 阻止事件冒泡

          // 创建并显示弹窗
          createPopup(target.href);
        } else {
          console.log("chrome-tabboost: Clicked element is not a valid link");
        }
      }
    } catch (error) {
      // 检查是否是扩展上下文失效错误
      if (error.message && error.message.includes("Extension context invalidated")) {
        console.warn("chrome-tabboost: 扩展上下文已失效，请刷新页面或重新加载扩展");
        // 可以尝试移除现有监听器
        try {
          document.removeEventListener("click", arguments.callee, true);
        } catch (e) {
          // 忽略移除监听器时可能出现的错误
        }
        return;
      }
      console.error("chrome-tabboost: Error in click handler:", error);
    }
  },
  true
);

// 函数：创建并显示弹窗
async function createPopup(url) {
  try {
    console.log(`chrome-tabboost: Creating popup for URL: ${url}`);

    // 检查是否已经存在弹窗，避免重复创建
    if (document.getElementById("tabboost-popup-overlay")) {
      console.log("chrome-tabboost: Popup already exists");
      return;
    }
    
    // 验证URL的安全性
    try {
      // 确保URL是有效的
      const urlObj = new URL(url);
      
      // 只允许http和https协议
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        console.error(`chrome-tabboost: 不安全的URL协议: ${urlObj.protocol}`);
        window.open(url, "_blank"); // 使用浏览器自身的安全措施
        return;
      }
      
      // 编码URL以防止XSS
      url = encodeURI(decodeURI(url));
    } catch (urlError) {
      console.error("chrome-tabboost: 无效的URL:", urlError);
      // 无效URL，不处理
      return;
    }

    // 获取忽略列表相关设置
    const config = await storageCache.get({
      iframeIgnoreEnabled: false,
      iframeIgnoreList: []
    });
    
    // 如果功能未启用，直接创建弹窗
    if (!config.iframeIgnoreEnabled) {
      createPopupDOM(url);
      return;
    }
    
    // 如果忽略列表不存在或为空，直接创建弹窗
    if (!config.iframeIgnoreList || !Array.isArray(config.iframeIgnoreList) || config.iframeIgnoreList.length === 0) {
      createPopupDOM(url);
      return;
    }
    
    // 解析URL获取域名
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // 检查域名是否在忽略列表中
    const isIgnored = config.iframeIgnoreList.some(domain => hostname.includes(domain));
    
    if (isIgnored) {
      // 如果在忽略列表中，直接在新标签页中打开
      console.log(`chrome-tabboost: URL ${url} is in ignore list, opening in new tab`);
      window.open(url, "_blank");
    } else {
      // 否则创建弹窗
      createPopupDOM(url);
    }
  } catch (error) {
    console.error("chrome-tabboost: Error in createPopup:", error);
    // 出错时在新标签页中打开
    window.open(url, "_blank");
  }
}

// 函数：创建弹窗DOM
async function createPopupDOM(url) {
  try {
    // 用于跟踪所有添加的事件监听器，以便在关闭弹窗时清理
    const eventListeners = [];
    
    // 添加事件监听器的辅助函数，用于跟踪所有添加的事件监听器
    const addTrackedEventListener = (element, eventType, listener) => {
      element.addEventListener(eventType, listener);
      eventListeners.push({ element, eventType, listener });
    };
  
    // 创建弹窗覆盖层
    const popupOverlay = document.createElement("div");
    popupOverlay.id = "tabboost-popup-overlay";
    popupOverlay.setAttribute("role", "dialog");
    popupOverlay.setAttribute("aria-modal", "true");

    // 创建弹窗内容容器
    const popupContent = document.createElement("div");
    popupContent.id = "tabboost-popup-content";
    
    // 一次性获取所有需要的设置
    const settings = await storageCache.get({
      popupSizePreset: 'default',
      customWidth: 80,
      customHeight: 80,
      autoAddToIgnoreList: false,
      iframeIgnoreList: []
    });
    
    // 应用弹窗大小
    if (settings.popupSizePreset === 'large') {
      popupContent.classList.add('size-large');
    } else if (settings.popupSizePreset === 'custom') {
      popupContent.classList.add('size-custom');
      popupContent.style.width = `${settings.customWidth}%`;
      popupContent.style.height = `${settings.customHeight}%`;
    }
    // 默认尺寸不需要额外处理

    // 创建工具栏
    const toolbar = document.createElement("div");
    toolbar.id = "tabboost-popup-toolbar";

    // 创建标题
    const title = document.createElement("span");
    title.id = "tabboost-popup-title";
    title.innerText = "加载中...";

    // 创建按钮容器
    const buttonsContainer = document.createElement("div");
    buttonsContainer.id = "tabboost-popup-buttons";

    // 创建"在新标签页中打开"按钮
    const newTabButton = document.createElement("button");
    newTabButton.className = "tabboost-button tabboost-newtab-button";
    newTabButton.innerText = "在新标签页中打开";
    newTabButton.title = "在新标签页中打开链接";
    newTabButton.setAttribute("aria-label", "在新标签页中打开链接");
    addTrackedEventListener(newTabButton, "click", () => {
      console.log("chrome-tabboost: New Tab button clicked");
      window.open(url, "_blank");
      closePopup();
    });

    // 创建关闭按钮
    const closeButton = document.createElement("button");
    closeButton.className = "tabboost-button tabboost-close-button";
    closeButton.innerHTML = "&times;"; // Unicode × 符号
    closeButton.title = "关闭弹窗";
    closeButton.setAttribute("aria-label", "关闭弹窗");
    addTrackedEventListener(closeButton, "click", closePopup);
    console.log("chrome-tabboost: Close button event listener added");

    // 组装按钮容器
    buttonsContainer.appendChild(newTabButton);

    // 创建尺寸提示按钮
    const sizeHintButton = document.createElement("button");
    sizeHintButton.className = "tabboost-button tabboost-size-hint";
    sizeHintButton.title = "在扩展选项中可调整弹窗大小";
    sizeHintButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    addTrackedEventListener(sizeHintButton, "click", () => {
      chrome.runtime.sendMessage({ action: "openOptionsPage", section: "popup-size" });
    });

    // 添加尺寸提示按钮和关闭按钮
    buttonsContainer.appendChild(sizeHintButton);
    buttonsContainer.appendChild(closeButton);

    // 组装工具栏
    toolbar.appendChild(title);
    toolbar.appendChild(buttonsContainer);

    // 创建加载指示器
    const loader = document.createElement("div");
    loader.id = "tabboost-popup-loader";
    loader.innerText = "加载中...";

    // 创建错误消息
    const errorMsg = document.createElement("div");
    errorMsg.id = "tabboost-popup-error";
    errorMsg.innerHTML = `
      <p>无法在弹窗中加载此网站。</p>
      <button id="tabboost-open-newtab">在新标签页中打开</button>
      <button id="tabboost-add-to-ignore">添加到忽略列表</button>
    `;

    // 创建 iframe 以加载链接内容
    const iframe = document.createElement("iframe");
    iframe.id = "tabboost-popup-iframe";
    
    // 标记是否已处理过加载失败
    let hasHandledFailure = false;
    
    // 保存所有定时器引用，便于一次性清理
    const timers = {
      loadTimeout: null,
      checkInterval: null,
      closeTimeout: null  // 添加关闭动画定时器的引用
    };
    
    // 创建一个函数来处理加载失败
    const handleLoadFailure = async (reason) => {
      if (hasHandledFailure) return; // 防止重复处理
      hasHandledFailure = true;
      
      console.log(`chrome-tabboost: Iframe load failed: ${reason}`);
      loader.style.display = "none";
      errorMsg.classList.add("show");
      
      // 清理所有定时器
      clearAllTimers();
      
      // 使用之前已经获取的settings中的autoAddToIgnoreList
      if (settings.autoAddToIgnoreList) {
        try {
          // 解析URL获取域名
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          
          // 使用之前已经获取的ignoreList
          let ignoreList = settings.iframeIgnoreList;
          
          // 确保ignoreList是数组
          if (!Array.isArray(ignoreList)) {
            ignoreList = [];
          }
          
          // 检查域名是否已在列表中
          if (!ignoreList.includes(hostname)) {
            ignoreList.push(hostname);
            
            // 保存更新后的列表
            await storageCache.set({ iframeIgnoreList: ignoreList });
            console.log(`chrome-tabboost: Automatically added ${hostname} to ignore list`);
            
            // 显示通知
            const autoAddNotice = document.createElement('p');
            autoAddNotice.className = 'tabboost-auto-add-notice';
            autoAddNotice.textContent = `已自动将 ${hostname} 添加到忽略列表，下次将直接在新标签页中打开`;
            errorMsg.appendChild(autoAddNotice);
          }
        } catch (error) {
          console.error("chrome-tabboost: Error auto-adding to ignore list:", error);
        }
      }
    };
    
    // 清理所有定时器的函数
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
    
    // 监听 iframe 加载错误
    iframe.onerror = () => {
      handleLoadFailure("iframe error event");
    };

    // 监听 iframe 加载完成
    iframe.onload = () => {
      try {
        // 清除超时定时器
        if (timers.loadTimeout) {
          clearTimeout(timers.loadTimeout);
          timers.loadTimeout = null;
        }
        
        console.log("chrome-tabboost: Iframe content loaded");
        
        // 检查iframe是否真的加载成功
        if (iframe.contentDocument === null || iframe.contentWindow === null) {
          // 可能是跨域限制或其他问题
          handleLoadFailure("无法访问iframe内容");
          return;
        }
        
        // 检查是否加载了错误页面
        const iframeContent = iframe.contentDocument.documentElement.innerHTML || '';
        if (iframeContent.includes('refused to connect') || 
            iframeContent.includes('拒绝连接') ||
            iframeContent.includes('ERR_CONNECTION_REFUSED')) {
          handleLoadFailure("网站拒绝连接");
          return;
        }
        
        // 加载成功，停止所有检查
        clearAllTimers();
        
        // 隐藏加载指示器
        loader.style.display = "none";

        // 更新标题为 iframe 中的页面标题
        try {
          const iframeTitle = iframe.contentDocument.title;
          title.innerText = iframeTitle || "加载页面";
        } catch (e) {
          console.log(
            "chrome-tabboost: Unable to access iframe content title due to CORS restrictions"
          );
          title.innerText = "加载页面";
        }
      } catch (e) {
        console.warn("chrome-tabboost: Error handling iframe load event:", e);
        
        // 如果是跨域错误，我们假设加载成功了
        // 因为跨域限制只是阻止我们访问内容，但iframe可能已经正确加载
        loader.style.display = "none";
        title.innerText = "加载页面";
      }
    };

    // 设置iframe源
    iframe.src = url;
    console.log("chrome-tabboost: Iframe created and URL set");

    // 设置超时（例如 5 秒）
    timers.loadTimeout = setTimeout(() => {
      handleLoadFailure("加载超时");
    }, 5000);

    // 组装弹窗内容
    popupContent.appendChild(toolbar);
    popupContent.appendChild(loader);
    popupContent.appendChild(iframe);
    popupContent.appendChild(errorMsg);
    popupOverlay.appendChild(popupContent);

    // 添加到页面
    document.body.appendChild(popupOverlay);

    // 添加监听 Esc 键关闭弹窗
    const escListener = function (event) {
      if (event.key === "Escape") {
        console.log("chrome-tabboost: Escape key pressed");
        closePopup();
      }
    };
    addTrackedEventListener(document, "keydown", escListener);
    console.log("chrome-tabboost: Esc key listener added");

    // 监听错误消息中的按钮
    const openNewTabButton = errorMsg.querySelector("#tabboost-open-newtab");
    addTrackedEventListener(openNewTabButton, "click", () => {
      console.log("chrome-tabboost: Open in new tab button clicked");
      window.open(url, "_blank");
      closePopup();
    });

    // 监听添加到忽略列表按钮
    const addToIgnoreButton = errorMsg.querySelector("#tabboost-add-to-ignore");
    addTrackedEventListener(addToIgnoreButton, "click", async () => {
      console.log("chrome-tabboost: Add to ignore list button clicked");
      try {
        // 解析URL获取域名
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        // 使用之前已获取的ignoreList
        let ignoreList = settings.iframeIgnoreList;
        
        // 确保ignoreList是数组
        if (!Array.isArray(ignoreList)) {
          ignoreList = [];
        }
        
        // 检查域名是否已在列表中
        if (!ignoreList.includes(hostname)) {
          ignoreList.push(hostname);
          
          // 保存更新后的列表
          await storageCache.set({ iframeIgnoreList: ignoreList });
          console.log(`chrome-tabboost: Added ${hostname} to ignore list`);
          // 显示成功消息
          alert(`已将 ${hostname} 添加到忽略列表，下次将直接在新标签页中打开`);
          
          // 关闭弹窗并在新标签页中打开
          window.open(url, "_blank");
          closePopup();
        } else {
          console.log(`chrome-tabboost: ${hostname} is already in ignore list`);
          alert(`${hostname} 已在忽略列表中`);
          
          // 关闭弹窗并在新标签页中打开
          window.open(url, "_blank");
          closePopup();
        }
      } catch (error) {
        console.error("chrome-tabboost: Error adding to ignore list:", error);
        alert("添加到忽略列表失败");
      }
    });
    
    // 添加额外的检测机制 - 使用间隔检查而不是多个setTimeout
    let checkCount = 0;
    timers.checkInterval = setInterval(() => {
      checkCount++;
      
      // 如果已经处理过失败，或者检查次数达到上限，停止检查
      if (hasHandledFailure || checkCount >= 5) {
        if (timers.checkInterval) {
          clearInterval(timers.checkInterval);
          timers.checkInterval = null;
        }
        return;
      }
      
      try {
        // 检查iframe是否已加载
        if (iframe.contentDocument === null || iframe.contentWindow === null) {
          // 还没加载完，继续等待
          return;
        }
        
        // 检查是否加载了错误页面
        const iframeContent = iframe.contentDocument.documentElement.innerHTML || '';
        if (iframeContent.includes('refused to connect') || 
            iframeContent.includes('拒绝连接') ||
            iframeContent.includes('ERR_CONNECTION_REFUSED')) {
          handleLoadFailure('检测到拒绝连接错误');
        }
      } catch (e) {
        // 忽略跨域错误
      }
    }, 1000);

    // 函数：关闭弹窗
    function closePopup() {
      try {
        // 清除所有定时器
        clearAllTimers();
        
        console.log("chrome-tabboost: Closing popup");
        popupOverlay.classList.remove("show");
        
        // 移除所有注册的事件监听器
        eventListeners.forEach(({ element, eventType, listener }) => {
          try {
            if (element && typeof element.removeEventListener === 'function') {
              element.removeEventListener(eventType, listener);
              console.log(`chrome-tabboost: Removed ${eventType} listener from ${element.tagName || 'document'}`);
            }
          } catch (e) {
            console.error(`chrome-tabboost: Error removing ${eventType} listener:`, e);
          }
        });
        
        // 清空事件监听器数组
        eventListeners.length = 0;
        
        // 使用单个定时器处理动画完成后的DOM移除
        timers.closeTimeout = setTimeout(() => {
          if (popupOverlay && popupOverlay.parentNode) {
            popupOverlay.parentNode.removeChild(popupOverlay);
            console.log("chrome-tabboost: Popup overlay removed");
          }
          // 清除引用，帮助垃圾回收
          if (timers.closeTimeout) {
            clearTimeout(timers.closeTimeout);
            timers.closeTimeout = null;
          }
        }, 300); // 等待动画完成
      } catch (error) {
        console.error("chrome-tabboost: Error closing popup:", error);
        // 尝试强制移除
        try {
          // 清除所有定时器
          clearAllTimers();
          
          // 尝试移除所有事件监听器，即使出错
          eventListeners.forEach(({ element, eventType, listener }) => {
            try {
              if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(eventType, listener);
              }
            } catch (e) {
              // 忽略错误，继续尝试移除其他监听器
            }
          });
          
          // 清空事件监听器数组
          eventListeners.length = 0;
          
          if (popupOverlay && popupOverlay.parentNode) {
            popupOverlay.parentNode.removeChild(popupOverlay);
          }
        } catch (e) {
          console.error("chrome-tabboost: Error force removing popup:", e);
        }
      }
    }

    // 显示弹窗并添加动画类
    requestAnimationFrame(() => {
      popupOverlay.classList.add("show");
      console.log("chrome-tabboost: Popup overlay show animation triggered");
    });
  } catch (error) {
    console.error("chrome-tabboost: Error creating popup DOM:", error);
    // 出错时在新标签页中打开
    window.open(url, "_blank");
  }
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("chrome-tabboost: Message received in content script:", request);
  
  if (request.action === "openRightSplitView" && request.url) {
    // 更新右侧分屏内容
    const rightIframe = document.getElementById('tabboost-right-iframe');
    if (rightIframe) {
      rightIframe.src = request.url;
      sendResponse({ status: "Right split view updated" });
    } else {
      sendResponse({ status: "Split view not active" });
    }
  }
  
  return true; // 保持消息通道开启，以支持异步响应
});
