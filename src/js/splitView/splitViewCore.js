import { getCurrentTab } from "../../utils/utils.js";
import storageCache from "../../utils/storage-cache.js";
import { canLoadInIframe } from "./splitViewURLValidator.js";
import {
  initSplitViewDOM,
  removeSplitViewDOM,
  updateRightViewDOM,
} from "./splitViewDOM.js";
import {
  setupSplitViewEvents,
  cleanupSplitViewEvents,
} from "./splitViewEvents.js";

storageCache.init().catch((error) => {
  console.error("splitView: Failed to initialize storage cache:", error);
});

let isSplitViewActive = false;
let leftUrl = "";
let rightUrl = "";

export async function createSplitView() {
  console.log("TabBoost: createSplitView called");

  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("TabBoost: Failed to get current tab");
      return;
    }
    console.log("TabBoost: Got current tab:", currentTab.id);

    leftUrl = currentTab.url;
    console.log("TabBoost: Left URL set to:", leftUrl);

    if (!leftUrl || leftUrl === "about:blank") {
      console.error("TabBoost: Invalid page URL");
      return;
    }

    try {
      // 首先检查是否已经存在分屏视图
      const [checkResult] = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => {
          try {
            const container = document.getElementById("tabboost-split-view-container");
            console.log("TabBoost: Checking for split view container in page");
            console.log("TabBoost: Split view container exists:", !!container);
            return !!container;
          } catch (e) {
            console.error("TabBoost: Error checking if split view container exists:", e);
            return false;
          }
        }
      });

      if (checkResult && checkResult.result) {
        console.log("TabBoost: Split view container already exists, will update it");

        // 如果已存在，确保它可见
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: () => {
            try {
              console.log("TabBoost: Checking if split view container exists:", !!document.getElementById("tabboost-split-view-container"));
              
              const container = document.getElementById("tabboost-split-view-container");
              if (container) {
                console.log("TabBoost: Making existing split view container visible");
                container.style.display = "flex";
                container.style.opacity = "1";
                container.style.zIndex = "10000";

                // 确保左右视图都可见
                const leftView = document.getElementById("tabboost-split-left");
                const rightView = document.getElementById("tabboost-split-right");
                const divider = document.getElementById("tabboost-split-divider");

                if (leftView && rightView && divider) {
                  leftView.style.display = "block";
                  leftView.style.width = "50%";
                  rightView.style.display = "block";
                  rightView.style.width = "50%";
                  divider.style.display = "block";
                }

                return true;
              }
              return false;
            } catch (e) {
              console.error("TabBoost: Error making split view container visible:", e);
              return false;
            }
          }
        });

        isSplitViewActive = true;
        console.log("TabBoost: Split view marked as active (existing container)");
        return;
      }

      // 如果不存在，直接创建简单的分屏视图，不使用动态函数执行
      console.log("TabBoost: Creating simplified split view in tab:", currentTab.id);
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: (url) => {
          try {
            // 创建基本分屏容器
            const container = document.createElement("div");
            container.id = "tabboost-split-view-container";
            container.style.position = "fixed";
            container.style.top = "0";
            container.style.left = "0";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.zIndex = "10000";
            container.style.backgroundColor = "#fff";
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.overflow = "hidden";
            console.log("TabBoost: Created split view container");
            
            // 创建控制栏
            const controlBar = document.createElement("div");
            controlBar.id = "tabboost-split-controls";
            controlBar.style.width = "100%";
            controlBar.style.height = "48px";
            controlBar.style.display = "flex";
            controlBar.style.justifyContent = "space-between";
            controlBar.style.alignItems = "center";
            controlBar.style.padding = "0 16px";
            controlBar.style.backgroundColor = "#f8f9fa";
            controlBar.style.borderBottom = "1px solid #eaeaea";
            console.log("TabBoost: Created control bar");
            
            // 添加关闭按钮
            const closeButton = document.createElement("button");
            closeButton.id = "tabboost-split-close";
            closeButton.innerText = "关闭分屏";
            closeButton.dataset.action = "close-split-view";
            closeButton.style.padding = "6px 12px";
            closeButton.style.backgroundColor = "#f1f3f4";
            closeButton.style.border = "none";
            closeButton.style.borderRadius = "4px";
            closeButton.style.cursor = "pointer";
            console.log("TabBoost: Created close button");
            
            closeButton.addEventListener("click", () => {
              chrome.runtime.sendMessage({ action: "closeSplitView" });
            });
            
            controlBar.appendChild(closeButton);
            container.appendChild(controlBar);
            
            // 创建视图容器
            const viewsContainer = document.createElement("div");
            viewsContainer.id = "tabboost-views-container";
            viewsContainer.style.display = "flex";
            viewsContainer.style.width = "100%";
            viewsContainer.style.height = "calc(100% - 48px)";
            viewsContainer.style.position = "relative";
            console.log("TabBoost: Created views container");
            
            // 创建左侧视图
            const leftView = document.createElement("div");
            leftView.id = "tabboost-split-left";
            leftView.style.width = "50%";
            leftView.style.height = "100%";
            leftView.style.overflow = "hidden";
            leftView.style.position = "relative";
            
            // 左侧关闭按钮
            const leftCloseButton = document.createElement("button");
            leftCloseButton.className = "tabboost-view-close";
            leftCloseButton.innerText = "×";
            leftCloseButton.title = "关闭左侧视图";
            leftCloseButton.dataset.action = "close-left-view";
            leftCloseButton.style.position = "absolute";
            leftCloseButton.style.top = "8px";
            leftCloseButton.style.right = "8px";
            leftCloseButton.style.zIndex = "10";
            leftCloseButton.style.width = "24px";
            leftCloseButton.style.height = "24px";
            leftCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
            leftCloseButton.style.color = "#fff";
            leftCloseButton.style.border = "none";
            leftCloseButton.style.borderRadius = "50%";
            leftCloseButton.style.cursor = "pointer";
            
            leftCloseButton.addEventListener("click", () => {
              const rightIframe = document.getElementById("tabboost-right-iframe");
              if (rightIframe && rightIframe.src && rightIframe.src !== "about:blank") {
                const rightUrl = rightIframe.src;
                chrome.runtime.sendMessage({ action: "closeSplitView" });
                setTimeout(() => {
                  window.location.href = rightUrl;
                }, 100);
              } else {
                chrome.runtime.sendMessage({ action: "closeSplitView" });
              }
            });
            
            leftView.appendChild(leftCloseButton);
            
            // 左侧iframe
            const leftIframe = document.createElement("iframe");
            leftIframe.id = "tabboost-left-iframe";
            leftIframe.style.width = "100%";
            leftIframe.style.height = "100%";
            leftIframe.style.border = "none";
            leftIframe.style.display = "block";
            leftIframe.setAttribute("loading", "lazy");
            leftIframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups allow-forms");
            leftIframe.setAttribute("data-tabboost-frame", "left");
            leftIframe.setAttribute("allowfullscreen", "true");
            leftIframe.src = url;
            
            leftView.appendChild(leftIframe);
            
            // 创建右侧视图
            const rightView = document.createElement("div");
            rightView.id = "tabboost-split-right";
            rightView.style.width = "50%";
            rightView.style.height = "100%";
            rightView.style.overflow = "hidden";
            rightView.style.position = "relative";
            
            // 右侧关闭按钮
            const rightCloseButton = document.createElement("button");
            rightCloseButton.className = "tabboost-view-close";
            rightCloseButton.innerText = "×";
            rightCloseButton.title = "关闭右侧视图";
            rightCloseButton.dataset.action = "close-right-view";
            rightCloseButton.style.position = "absolute";
            rightCloseButton.style.top = "8px";
            rightCloseButton.style.right = "8px";
            rightCloseButton.style.zIndex = "10";
            rightCloseButton.style.width = "24px";
            rightCloseButton.style.height = "24px";
            rightCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
            rightCloseButton.style.color = "#fff";
            rightCloseButton.style.border = "none";
            rightCloseButton.style.borderRadius = "50%";
            rightCloseButton.style.cursor = "pointer";
            
            rightCloseButton.addEventListener("click", () => {
              const rightIframe = document.getElementById("tabboost-right-iframe");
              if (rightIframe) {
                rightIframe.src = "about:blank";
                const rightError = document.getElementById("tabboost-right-error");
                if (rightError) {
                  rightError.style.display = "none";
                }
                leftView.style.width = "100%";
                rightView.style.display = "none";
                divider.style.display = "none";
              }
            });
            
            rightView.appendChild(rightCloseButton);
            
            // 右侧iframe
            const rightIframe = document.createElement("iframe");
            rightIframe.id = "tabboost-right-iframe";
            rightIframe.style.width = "100%";
            rightIframe.style.height = "100%";
            rightIframe.style.border = "none";
            rightIframe.style.display = "block";
            rightIframe.setAttribute("loading", "lazy");
            rightIframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups allow-forms");
            rightIframe.setAttribute("data-tabboost-frame", "right");
            rightIframe.setAttribute("allowfullscreen", "true");
            rightIframe.src = "about:blank";
            
            rightView.appendChild(rightIframe);
            
            // 创建分隔线
            const divider = document.createElement("div");
            divider.id = "tabboost-split-divider";
            divider.style.width = "6px";
            divider.style.height = "100%";
            divider.style.backgroundColor = "#e0e0e0";
            divider.style.cursor = "col-resize";
            divider.style.position = "relative";
            
            // 组装DOM
            viewsContainer.appendChild(leftView);
            viewsContainer.appendChild(divider);
            viewsContainer.appendChild(rightView);
            container.appendChild(viewsContainer);
            
            // 保存原始内容
            try {
              const originalContent = document.documentElement.outerHTML || "";
              document.body.setAttribute("data-tabboost-original-content", originalContent);
            } catch (e) {
              console.error("TabBoost: Error storing original content", e);
            }
            
            // 隐藏页面其他元素
            const existingElements = Array.from(document.body.children);
            existingElements.forEach(element => {
              element.dataset.originalDisplay = element.style.display;
              element.style.display = "none";
            });
            
            // 添加到body
            document.body.style.overflow = "hidden";
            document.body.appendChild(container);
            
            // 添加基本的拖拽功能
            let isDragging = false;
            let startX = 0;
            let leftWidth = 50;
            
            divider.addEventListener("mousedown", (e) => {
              isDragging = true;
              startX = e.clientX;
              const computedStyle = window.getComputedStyle(leftView);
              leftWidth = (parseFloat(computedStyle.width) / window.innerWidth) * 100;
              document.body.style.userSelect = "none";
              e.preventDefault();
            });
            
            document.addEventListener("mousemove", (e) => {
              if (!isDragging) return;
              
              const deltaX = e.clientX - startX;
              const containerWidth = viewsContainer.offsetWidth;
              const deltaPercent = (deltaX / containerWidth) * 100;
              
              let newLeftWidth = leftWidth + deltaPercent;
              newLeftWidth = Math.max(20, Math.min(80, newLeftWidth));
              
              leftView.style.width = `${newLeftWidth}%`;
              rightView.style.width = `${100 - newLeftWidth}%`;
            });
            
            document.addEventListener("mouseup", () => {
              if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = "";
              }
            });
            
            console.log("TabBoost: Split view container successfully created");
            return true;
          } catch (e) {
            console.error("TabBoost: Error creating split view:", e);
            return false;
          }
        },
        args: [leftUrl]
      });
      
      console.log("TabBoost: Script execution results:", results);
      
      if (results && results[0] && results[0].result) {
        isSplitViewActive = true;
        console.log("TabBoost: Split view marked as active (simplified version)");
      } else {
        console.error("TabBoost: Failed to create split view");
      }
    } catch (e) {
      console.error("TabBoost: Failed to execute split view script:", e);
      console.log("TabBoost: Will retry with minimal approach");

      // 使用极简方法创建
      try {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: (url) => {
            try {
              // 创建极简分屏视图
              const container = document.createElement("div");
              container.id = "tabboost-split-view-container";
              container.style.position = "fixed";
              container.style.top = "0";
              container.style.left = "0";
              container.style.width = "100%";
              container.style.height = "100%";
              container.style.zIndex = "10000";
              container.style.backgroundColor = "#fff";
              container.style.display = "flex";
              container.style.flexDirection = "column";
              
              // 创建极简控制栏
              const controlBar = document.createElement("div");
              controlBar.style.height = "40px";
              controlBar.style.background = "#f1f1f1";
              controlBar.style.display = "flex";
              controlBar.style.justifyContent = "flex-end";
              controlBar.style.padding = "5px";
              
              // 添加关闭按钮
              const closeBtn = document.createElement("button");
              closeBtn.innerText = "关闭";
              closeBtn.onclick = () => {
                chrome.runtime.sendMessage({ action: "closeSplitView" });
              };
              
              controlBar.appendChild(closeBtn);
              
              // 创建视图容器
              const viewsContainer = document.createElement("div");
              viewsContainer.style.display = "flex";
              viewsContainer.style.flex = "1";
              
              // 创建左右视图
              const leftView = document.createElement("div");
              leftView.id = "tabboost-split-left";
              leftView.style.width = "50%";
              
              const rightView = document.createElement("div");
              rightView.id = "tabboost-split-right";
              rightView.style.width = "50%";
              
              // 创建分隔线
              const divider = document.createElement("div");
              divider.style.width = "4px";
              divider.style.background = "#ddd";
              divider.style.cursor = "col-resize";
              
              // 创建iframe
              const leftIframe = document.createElement("iframe");
              leftIframe.id = "tabboost-left-iframe";
              leftIframe.style.width = "100%";
              leftIframe.style.height = "100%";
              leftIframe.style.border = "none";
              leftIframe.src = url;
              
              const rightIframe = document.createElement("iframe");
              rightIframe.id = "tabboost-right-iframe";
              rightIframe.style.width = "100%";
              rightIframe.style.height = "100%";
              rightIframe.style.border = "none";
              rightIframe.src = "about:blank";
              
              // 组装DOM
              leftView.appendChild(leftIframe);
              rightView.appendChild(rightIframe);
              
              viewsContainer.appendChild(leftView);
              viewsContainer.appendChild(divider);
              viewsContainer.appendChild(rightView);
              
              container.appendChild(controlBar);
              container.appendChild(viewsContainer);
              
              // 添加到页面
              document.body.appendChild(container);
              
              console.log("TabBoost: Created minimal split view container");
              return true;
            } catch (e) {
              console.error("TabBoost: Error creating minimal split view:", e);
              return false;
            }
          },
          args: [leftUrl]
        });
        
        isSplitViewActive = true;
        console.log("TabBoost: Split view marked as active (minimal version)");
      } catch (retryError) {
        console.error("TabBoost: Failed to create minimal split view:", retryError);
      }
    }
  } catch (error) {
    console.error("TabBoost: Failed to create split view:", error);
  }
}

export async function closeSplitView() {
  if (!isSplitViewActive) return;

  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("Failed to get current tab");
      return;
    }

    try {
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: removeSplitViewDOM,
      });

      isSplitViewActive = false;
    } catch (e) {
      console.error("Failed to execute restore page script:", e);

      try {
        chrome.tabs.reload(currentTab.id);
        isSplitViewActive = false;
      } catch (reloadError) {
        console.error("Failed to reload page:", reloadError);
      }
    }
  } catch (error) {
    console.error("Failed to close split view:", error);
  }
}

export async function toggleSplitView() {
  if (isSplitViewActive) {
    await closeSplitView();
  } else {
    await createSplitView();
  }
}

export async function updateRightView(url) {
  if (!isSplitViewActive) {
    console.log("TabBoost: Split view is not active, activating it first");
    await createSplitView();
  }

  rightUrl = url;
  console.log("TabBoost: Updating right view with URL:", url);
  
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("TabBoost: Failed to get current tab for updateRightView");
      return;
    }

    // 使用直接的内联函数而不是字符串执行
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (url) => {
        console.log("TabBoost: updateRightViewDOM called with URL:", url);
        
        try {
          // 获取右侧视图
          const rightView = document.getElementById("tabboost-split-right");
          if (!rightView) {
            console.error("TabBoost: Right view not found");
            return false;
          }
          
          // 获取右侧iframe
          let rightIframe = document.getElementById("tabboost-right-iframe");
          
          // 如果iframe不存在，创建一个新的
          if (!rightIframe) {
            console.log("TabBoost: Right iframe not found, creating a new one");
            rightIframe = document.createElement("iframe");
            rightIframe.id = "tabboost-right-iframe";
            rightIframe.style.width = "100%";
            rightIframe.style.height = "100%";
            rightIframe.style.border = "none";
            rightIframe.style.display = "block";
            rightIframe.setAttribute("loading", "lazy");
            rightIframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups allow-forms");
            rightIframe.setAttribute("data-tabboost-frame", "right");
            rightIframe.setAttribute("allowfullscreen", "true");
            
            rightView.appendChild(rightIframe);
            console.log("TabBoost: Added new right iframe to right view");
          }
          
          // 确保右侧视图可见
          rightView.style.display = "block";
          rightView.style.width = "50%";
          
          // 确保分隔线可见
          const divider = document.getElementById("tabboost-split-divider");
          if (divider) {
            divider.style.display = "block";
          }
          
          // 设置iframe的src
          console.log("TabBoost: Setting right iframe src to:", url);
          rightIframe.src = url;
          
          return true;
        } catch (error) {
          console.error("TabBoost: Error in updateRightViewDOM:", error);
          return false;
        }
      },
      args: [url]
    });
    
    console.log("TabBoost: Update right view results:", results);
    return { status: 'Split view created and updated' };
  } catch (error) {
    console.error("TabBoost: Failed to update right view:", error);
    
    // 如果失败，尝试另一种方法
    try {
      const currentTab = await getCurrentTab();
      if (currentTab) {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: (url) => {
            try {
              // 直接获取或创建iframe
              let iframe = document.getElementById("tabboost-right-iframe");
              
              if (!iframe) {
                const rightView = document.getElementById("tabboost-split-right");
                if (rightView) {
                  iframe = document.createElement("iframe");
                  iframe.id = "tabboost-right-iframe";
                  iframe.style.width = "100%";
                  iframe.style.height = "100%";
                  iframe.style.border = "none";
                  rightView.appendChild(iframe);
                }
              }
              
              if (iframe) {
                iframe.src = url;
                return true;
              }
              return false;
            } catch (e) {
              console.error("TabBoost: Error in simplified update:", e);
              return false;
            }
          },
          args: [url]
        });
      }
    } catch (e) {
      console.error("TabBoost: Failed to update with simplified method:", e);
    }
  }
}

export function getSplitViewState() {
  return {
    isActive: isSplitViewActive,
    leftUrl: leftUrl,
    rightUrl: rightUrl,
  };
}

export function initSplitViewModule() {}

export default {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
  getSplitViewState,
  initSplitViewModule,
};
