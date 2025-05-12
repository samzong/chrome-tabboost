import { getCurrentTab } from "../../utils/utils.js";
import storageCache from "../../utils/storage-cache.js";
import { canLoadInIframe } from "../../utils/iframe-compatibility.js";
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
  console.error("Failed to initialize storage cache:", error);
});

let isSplitViewActive = false;
let leftUrl = "";
let rightUrl = "";

export async function createSplitView() {
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("Failed to get current tab");
      return;
    }

    leftUrl = currentTab.url;

    if (!leftUrl || leftUrl === "about:blank") {
      console.error("Invalid page URL");
      return;
    }

    try {
      // 首先检查是否已经存在分屏视图
      const [checkResult] = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => {
          try {
            const container = document.getElementById("tabboost-split-view-container");
            return !!container;
          } catch (e) {
            console.error("Error checking if split view container exists:", e);
            return false;
          }
        }
      });

      if (checkResult && checkResult.result) {
        // 如果已存在，确保它可见
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: () => {
            try {
              const container = document.getElementById("tabboost-split-view-container");
              if (container) {
                container.style.display = "flex";
                container.style.opacity = "1";
                container.style.zIndex = "10000";

                // 确保左右视图都可见
                const leftView = document.getElementById("tabboost-split-left");
                const rightView = document.getElementById("tabboost-split-right");

                if (leftView && rightView) {
                  leftView.style.display = "block";
                  leftView.style.width = "50%";
                  rightView.style.display = "block";
                  rightView.style.width = "50%";
                }

                return true;
              }
              return false;
            } catch (e) {
              console.error("Error making split view container visible:", e);
              return false;
            }
          }
        });

        isSplitViewActive = true;
        return;
      }

      // 如果不存在，直接创建简单的分屏视图，不使用动态函数执行
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
            container.style.overflow = "hidden";
            
            // 创建视图容器 - 直接占据100%高度，不再需要顶部控制栏
            const viewsContainer = document.createElement("div");
            viewsContainer.id = "tabboost-views-container";
            viewsContainer.style.display = "flex";
            viewsContainer.style.width = "100%";
            viewsContainer.style.height = "100%";
            viewsContainer.style.position = "relative";
            
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
            leftCloseButton.dataset.action = "close-split-view";
            leftCloseButton.style.position = "absolute";
            leftCloseButton.style.top = "8px";
            leftCloseButton.style.right = "8px";
            leftCloseButton.style.zIndex = "10";
            leftCloseButton.style.width = "24px";
            leftCloseButton.style.height = "24px";
            leftCloseButton.innerText = "×";
            leftCloseButton.title = "关闭分屏视图";
            leftCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
            leftCloseButton.style.color = "#fff";
            leftCloseButton.style.border = "none";
            leftCloseButton.style.borderRadius = "50%";
            leftCloseButton.style.cursor = "pointer";
            
            leftCloseButton.addEventListener("click", () => {
              // 关闭分屏，但保留右侧页面
              const rightIframe = document.getElementById("tabboost-right-iframe");
              if (rightIframe && rightIframe.src && rightIframe.src !== "about:blank") {
                const rightUrl = rightIframe.src;
                chrome.runtime.sendMessage({ action: "closeSplitView" });
                setTimeout(() => {
                  try {
                    window.location.href = rightUrl;
                  } catch (e) {
                    console.error("Error setting location to right URL:", e);
                  }
                }, 100);
              } else {
                chrome.runtime.sendMessage({ action: "closeSplitView" });
              }
            });
            
            leftView.appendChild(leftCloseButton);
            
            // 左侧设置按钮
            const leftSettingsButton = document.createElement("button");
            leftSettingsButton.className = "tabboost-view-settings";
            leftSettingsButton.style.position = "absolute";
            leftSettingsButton.style.top = "8px";
            leftSettingsButton.style.right = "40px";
            leftSettingsButton.style.zIndex = "10";
            leftSettingsButton.style.width = "24px";
            leftSettingsButton.style.height = "24px";
            leftSettingsButton.title = "设置分屏比例";
            leftSettingsButton.style.backgroundColor = "rgba(0,0,0,0.5)";
            leftSettingsButton.style.border = "none";
            leftSettingsButton.style.borderRadius = "50%";
            leftSettingsButton.style.cursor = "pointer";
            leftSettingsButton.style.display = "flex";
            leftSettingsButton.style.alignItems = "center";
            leftSettingsButton.style.justifyContent = "center";
            leftSettingsButton.style.padding = "0";
            leftSettingsButton.style.opacity = "0";
            leftSettingsButton.style.transition = "opacity 0.2s";

            // 创建分屏图标
            const createSplitIcon = () => {
              const icon = document.createElement("div");
              icon.style.width = "16px";
              icon.style.height = "12px";
              icon.style.position = "relative";
              icon.style.backgroundColor = "#ffffff";
              icon.style.borderRadius = "2px";
              icon.style.overflow = "hidden";

              // 创建分隔线 - 固定在中间位置
              const divider = document.createElement("div");
              divider.style.position = "absolute";
              divider.style.top = "0";
              divider.style.left = "50%";
              divider.style.width = "1px";
              divider.style.height = "100%";
              divider.style.backgroundColor = "#666666";
              divider.style.transform = "translateX(-50%)";

              icon.appendChild(divider);
              return icon;
            };

            leftSettingsButton.appendChild(createSplitIcon());
            leftView.appendChild(leftSettingsButton);
            
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
            rightCloseButton.dataset.action = "close-split-view";
            rightCloseButton.style.position = "absolute";
            rightCloseButton.style.top = "8px";
            rightCloseButton.style.right = "8px";
            rightCloseButton.style.zIndex = "10";
            rightCloseButton.style.width = "24px";
            rightCloseButton.style.height = "24px";
            rightCloseButton.innerText = "×";
            rightCloseButton.title = "关闭分屏视图";
            rightCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
            rightCloseButton.style.color = "#fff";
            rightCloseButton.style.border = "none";
            rightCloseButton.style.borderRadius = "50%";
            rightCloseButton.style.cursor = "pointer";
            
            rightCloseButton.addEventListener("click", () => {
              // 关闭分屏，保留左侧页面
              chrome.runtime.sendMessage({ action: "closeSplitView" });
            });
            
            rightView.appendChild(rightCloseButton);
            
            // 右侧设置按钮
            const rightSettingsButton = document.createElement("button");
            rightSettingsButton.className = "tabboost-view-settings";
            rightSettingsButton.style.position = "absolute";
            rightSettingsButton.style.top = "8px";
            rightSettingsButton.style.right = "40px";
            rightSettingsButton.style.zIndex = "10";
            rightSettingsButton.style.width = "24px";
            rightSettingsButton.style.height = "24px";
            rightSettingsButton.title = "设置分屏比例";
            rightSettingsButton.style.backgroundColor = "rgba(0,0,0,0.5)";
            rightSettingsButton.style.border = "none";
            rightSettingsButton.style.borderRadius = "50%";
            rightSettingsButton.style.cursor = "pointer";
            rightSettingsButton.style.display = "flex";
            rightSettingsButton.style.alignItems = "center";
            rightSettingsButton.style.justifyContent = "center";
            rightSettingsButton.style.padding = "0";
            rightSettingsButton.style.opacity = "0";
            rightSettingsButton.style.transition = "opacity 0.2s";

            rightSettingsButton.appendChild(createSplitIcon());
            rightView.appendChild(rightSettingsButton);
            
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
            
            // 组装DOM
            viewsContainer.appendChild(leftView);
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
            
            // 创建下拉菜单函数
            const createRatioMenu = (settingsButton, viewSide) => {
              const menu = document.createElement("div");
              menu.className = "tabboost-ratio-menu";
              menu.style.position = "absolute";
              menu.style.top = "35px";
              menu.style.right = viewSide === "left" ? "40px" : "40px";
              menu.style.backgroundColor = "#ffffff";
              menu.style.border = "1px solid rgba(0,0,0,0.1)";
              menu.style.borderRadius = "6px";
              menu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              menu.style.zIndex = "100";
              menu.style.display = "none";
              menu.style.padding = "4px";
              menu.style.minWidth = "120px";

              // 比例选项数据
              const ratios = [
                { left: 50, right: 50, label: "均分视图" },
                { left: 70, right: 30, label: "左侧更大" },
                { left: 30, right: 70, label: "右侧更大" }
              ];

              ratios.forEach(ratio => {
                const option = document.createElement("div");
                option.style.padding = "8px 12px";
                option.style.cursor = "pointer";
                option.style.display = "flex";
                option.style.alignItems = "center";
                option.style.gap = "12px";
                option.style.borderRadius = "4px";
                option.style.transition = "background-color 0.2s";

                // 创建比例示意图
                const diagram = document.createElement("div");
                diagram.style.width = "32px";
                diagram.style.height = "20px";
                diagram.style.position = "relative";
                diagram.style.backgroundColor = "#f5f5f5";
                diagram.style.borderRadius = "3px";
                diagram.style.overflow = "hidden";

                // 创建分隔线
                const divider = document.createElement("div");
                divider.style.position = "absolute";
                divider.style.top = "0";
                divider.style.left = `${ratio.left}%`;
                divider.style.width = "1px";
                divider.style.height = "100%";
                divider.style.backgroundColor = "#666666";
                divider.style.transform = "translateX(-50%)";

                diagram.appendChild(divider);

                // 添加文本标签
                const label = document.createElement("span");
                label.innerText = ratio.label;
                label.style.fontSize = "13px";
                label.style.color = "#333333";
                label.style.fontWeight = "500";

                option.appendChild(diagram);
                option.appendChild(label);

                // 悬停效果
                option.addEventListener("mouseover", () => {
                  option.style.backgroundColor = "#f5f5f5";
                });
                option.addEventListener("mouseout", () => {
                  option.style.backgroundColor = "transparent";
                });

                // 点击事件
                option.addEventListener("click", () => {
                  const leftView = document.getElementById("tabboost-split-left");
                  const rightView = document.getElementById("tabboost-split-right");

                  leftView.style.width = `${ratio.left}%`;
                  rightView.style.width = `${ratio.right}%`;

                  try {
                    localStorage.setItem("tabboostSplitRatio", JSON.stringify(ratio));
                  } catch (e) {
                    console.error("Error saving split ratio to localStorage:", e);
                  }

                  menu.style.display = "none";
                });

                menu.appendChild(option);
              });

              settingsButton.parentElement.appendChild(menu);

              // 切换菜单显示/隐藏
              settingsButton.addEventListener("click", () => {
                const allMenus = document.querySelectorAll(".tabboost-ratio-menu");
                allMenus.forEach(m => {
                  if (m !== menu) m.style.display = "none";
                });
                menu.style.display = menu.style.display === "none" ? "block" : "none";
              });

              // 点击其他地方关闭菜单
              document.addEventListener("click", (e) => {
                if (!settingsButton.contains(e.target) && !menu.contains(e.target)) {
                  menu.style.display = "none";
                }
              });
            };

            // 为左右设置按钮创建菜单
            createRatioMenu(leftSettingsButton, "left");
            createRatioMenu(rightSettingsButton, "right");

            // 应用保存的比例
            const applySavedRatio = () => {
              try {
                const savedRatio = localStorage.getItem("tabboostSplitRatio");
                if (savedRatio) {
                  const ratio = JSON.parse(savedRatio);
                  const leftView = document.getElementById("tabboost-split-left");
                  const rightView = document.getElementById("tabboost-split-right");

                  leftView.style.width = `${ratio.left}%`;
                  rightView.style.width = `${ratio.right}%`;
                }
              } catch (e) {
                console.error("Error applying saved split ratio:", e);
              }
            };

            // 在页面加载完成后应用保存的比例
            applySavedRatio();
            
            // 添加鼠标悬停显示/隐藏逻辑
            leftView.addEventListener("mouseenter", () => {
              const closeButton = leftView.querySelector(".tabboost-view-close");
              const settingsButton = leftView.querySelector(".tabboost-view-settings");
              if (closeButton) closeButton.style.opacity = "1";
              if (settingsButton) settingsButton.style.opacity = "1";
            });

            leftView.addEventListener("mouseleave", () => {
              const closeButton = leftView.querySelector(".tabboost-view-close");
              const settingsButton = leftView.querySelector(".tabboost-view-settings");
              if (closeButton) closeButton.style.opacity = "0";
              if (settingsButton) settingsButton.style.opacity = "0";
            });

            rightView.addEventListener("mouseenter", () => {
              const closeButton = rightView.querySelector(".tabboost-view-close");
              const settingsButton = rightView.querySelector(".tabboost-view-settings");
              if (closeButton) closeButton.style.opacity = "1";
              if (settingsButton) settingsButton.style.opacity = "1";
            });

            rightView.addEventListener("mouseleave", () => {
              const closeButton = rightView.querySelector(".tabboost-view-close");
              const settingsButton = rightView.querySelector(".tabboost-view-settings");
              if (closeButton) closeButton.style.opacity = "0";
              if (settingsButton) settingsButton.style.opacity = "0";
            });
            
            return true;
          } catch (e) {
            console.error("TabBoost: Error creating split view:", e);
            return false;
          }
        },
        args: [leftUrl]
      });
      
      if (results && results[0] && results[0].result) {
        isSplitViewActive = true;
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
              // 创建基本结构（如果不存在）
              if (!document.getElementById("tabboost-split-view-container")) {
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
                container.style.overflow = "hidden";
                
                // 创建视图容器 - 直接占据100%高度，不需要顶部控制栏
                const viewsContainer = document.createElement("div");
                viewsContainer.id = "tabboost-views-container";
                viewsContainer.style.display = "flex";
                viewsContainer.style.width = "100%";
                viewsContainer.style.height = "100%";
                
                // 创建左右视图
                const leftView = document.createElement("div");
                leftView.id = "tabboost-split-left";
                leftView.style.width = "50%";
                leftView.style.height = "100%";
                leftView.style.position = "relative";
                
                // 左侧关闭按钮
                const leftCloseButton = document.createElement("button");
                leftCloseButton.className = "tabboost-view-close";
                leftCloseButton.dataset.action = "close-split-view";
                leftCloseButton.style.position = "absolute";
                leftCloseButton.style.top = "8px";
                leftCloseButton.style.right = "8px";
                leftCloseButton.style.zIndex = "10";
                leftCloseButton.style.width = "24px";
                leftCloseButton.style.height = "24px";
                leftCloseButton.innerText = "×";
                leftCloseButton.title = "关闭分屏视图";
                leftCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
                leftCloseButton.style.color = "#fff";
                leftCloseButton.style.border = "none";
                leftCloseButton.style.borderRadius = "50%";
                leftCloseButton.style.cursor = "pointer";
                
                leftCloseButton.addEventListener("click", () => {
                  // 关闭分屏，但保留右侧页面
                  const rightIframe = document.getElementById("tabboost-right-iframe");
                  if (rightIframe && rightIframe.src && rightIframe.src !== "about:blank") {
                    const rightUrl = rightIframe.src;
                    chrome.runtime.sendMessage({ action: "closeSplitView" });
                    setTimeout(() => {
                      try {
                        window.location.href = rightUrl;
                      } catch (e) {
                        console.error("TabBoost: Error setting location to right URL:", e);
                      }
                    }, 100);
                  } else {
                    chrome.runtime.sendMessage({ action: "closeSplitView" });
                  }
                });
                
                leftView.appendChild(leftCloseButton);
                
                // 左侧iframe（当前页面）
                const leftIframe = document.createElement("iframe");
                leftIframe.id = "tabboost-left-iframe";
                leftIframe.style.width = "100%";
                leftIframe.style.height = "100%";
                leftIframe.style.border = "none";
                leftIframe.src = window.location.href;
                
                leftView.appendChild(leftIframe);
                
                const rightView = document.createElement("div");
                rightView.id = "tabboost-split-right";
                rightView.style.width = "50%";
                rightView.style.height = "100%";
                rightView.style.position = "relative";
                
                // 右侧关闭按钮
                const rightCloseButton = document.createElement("button");
                rightCloseButton.className = "tabboost-view-close";
                rightCloseButton.dataset.action = "close-split-view";
                rightCloseButton.style.position = "absolute";
                rightCloseButton.style.top = "8px";
                rightCloseButton.style.right = "8px";
                rightCloseButton.style.zIndex = "10";
                rightCloseButton.style.width = "24px";
                rightCloseButton.style.height = "24px";
                rightCloseButton.innerText = "×";
                rightCloseButton.title = "关闭分屏视图";
                rightCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
                rightCloseButton.style.color = "#fff";
                rightCloseButton.style.border = "none";
                rightCloseButton.style.borderRadius = "50%";
                rightCloseButton.style.cursor = "pointer";
                
                rightCloseButton.addEventListener("click", () => {
                  // 关闭分屏，保留左侧页面
                  chrome.runtime.sendMessage({ action: "closeSplitView" });
                });
                
                rightView.appendChild(rightCloseButton);
                
                // 右侧iframe（目标链接）
                const rightIframe = document.createElement("iframe");
                rightIframe.id = "tabboost-right-iframe";
                rightIframe.style.width = "100%";
                rightIframe.style.height = "100%";
                rightIframe.style.border = "none";
                rightIframe.src = url;
                
                rightView.appendChild(rightIframe);
                
                // 组装DOM
                viewsContainer.appendChild(leftView);
                viewsContainer.appendChild(rightView);
                
                container.appendChild(viewsContainer);
                
                // 添加到页面
                document.body.appendChild(container);
                
                return true;
              }
            } catch (e) {
              console.error("TabBoost: Error creating minimal split view:", e);
              return false;
            }
          },
          args: [leftUrl]
        });
        
        isSplitViewActive = true;
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
    await createSplitView();
  }

  rightUrl = url;
  
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("Failed to get current tab for updateRightView");
      return;
    }

    // 检查分屏视图是否存在，如果不存在则重新创建
    const checkResult = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        try {
          const container = document.getElementById("tabboost-split-view-container");
          return !!container;
        } catch (e) {
          console.error("Error checking split view container:", e);
          return false;
        }
      }
    });

    if (!checkResult || !checkResult[0].result) {
      console.log("Split view container not found, recreating...");
      await createSplitView();
    }

    // 使用直接的内联函数而不是字符串执行
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (url) => {
        try {
          // 获取右侧视图
          const rightView = document.getElementById("tabboost-split-right");
          if (!rightView) {
            console.error("Right view not found");
            return false;
          }
          
          // 获取或创建右侧iframe
          let rightIframe = document.getElementById("tabboost-right-iframe");
          
          // 如果iframe不存在，创建一个新的
          if (!rightIframe) {
            rightIframe = document.createElement("iframe");
            rightIframe.id = "tabboost-right-iframe";
            rightIframe.style.width = "100%";
            rightIframe.style.height = "100%";
            rightIframe.style.border = "none";
            rightIframe.style.display = "block";
            rightIframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups allow-forms");
            rightIframe.setAttribute("allowfullscreen", "true");
            
            rightView.appendChild(rightIframe);
          }
          
          // 确保右侧视图可见
          rightView.style.display = "block";
          rightView.style.width = "50%";
          
          // 确保左侧视图宽度正确
          const leftView = document.getElementById("tabboost-split-left");
          if (leftView) {
            leftView.style.width = "50%";
          }
          
          // 设置iframe的src
          rightIframe.src = url;
          
          return true;
        } catch (error) {
          console.error("Error in updateRightViewDOM:", error);
          return false;
        }
      },
      args: [url]
    });
    
    return { status: 'Split view created and updated' };
  } catch (error) {
    console.error("Failed to update right view:", error);
    
    // 如果失败，尝试简化方法
    try {
      const currentTab = await getCurrentTab();
      if (currentTab) {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: (url) => {
            try {
              // 检查是否存在分屏容器
              if (document.getElementById("tabboost-split-view-container")) {
                // 如果容器存在，只更新右侧iframe
                let rightIframe = document.getElementById("tabboost-right-iframe");
                if (!rightIframe) {
                  const rightView = document.getElementById("tabboost-split-right");
                  if (rightView) {
                    rightIframe = document.createElement("iframe");
                    rightIframe.id = "tabboost-right-iframe";
                    rightIframe.style.width = "100%";
                    rightIframe.style.height = "100%";
                    rightIframe.style.border = "none";
                    rightView.appendChild(rightIframe);
                  }
                }
                
                if (rightIframe) {
                  rightIframe.src = url;
                }
                return true;
              } else {
                // 如果容器不存在，创建完整的分屏视图
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
                container.style.overflow = "hidden";
                
                // 创建视图容器
                const viewsContainer = document.createElement("div");
                viewsContainer.id = "tabboost-views-container";
                viewsContainer.style.display = "flex";
                viewsContainer.style.width = "100%";
                viewsContainer.style.height = "100%";
                
                // 创建左右视图
                const leftView = document.createElement("div");
                leftView.id = "tabboost-split-left";
                leftView.style.width = "50%";
                leftView.style.height = "100%";
                leftView.style.position = "relative";
                
                // 左侧关闭按钮
                const leftCloseButton = document.createElement("button");
                leftCloseButton.className = "tabboost-view-close";
                leftCloseButton.dataset.action = "close-split-view";
                leftCloseButton.style.position = "absolute";
                leftCloseButton.style.top = "8px";
                leftCloseButton.style.right = "8px";
                leftCloseButton.style.zIndex = "10";
                leftCloseButton.style.width = "24px";
                leftCloseButton.style.height = "24px";
                leftCloseButton.innerText = "×";
                leftCloseButton.title = "关闭分屏视图";
                leftCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
                leftCloseButton.style.color = "#fff";
                leftCloseButton.style.border = "none";
                leftCloseButton.style.borderRadius = "50%";
                leftCloseButton.style.cursor = "pointer";
                
                leftCloseButton.addEventListener("click", () => {
                  // 关闭分屏，但保留右侧页面
                  const rightIframe = document.getElementById("tabboost-right-iframe");
                  if (rightIframe && rightIframe.src && rightIframe.src !== "about:blank") {
                    const rightUrl = rightIframe.src;
                    chrome.runtime.sendMessage({ action: "closeSplitView" });
                    setTimeout(() => {
                      try {
                        window.location.href = rightUrl;
                      } catch (e) {
                        console.error("TabBoost: Error setting location to right URL:", e);
                      }
                    }, 100);
                  } else {
                    chrome.runtime.sendMessage({ action: "closeSplitView" });
                  }
                });
                
                leftView.appendChild(leftCloseButton);
                
                // 左侧iframe（当前页面）
                const leftIframe = document.createElement("iframe");
                leftIframe.id = "tabboost-left-iframe";
                leftIframe.style.width = "100%";
                leftIframe.style.height = "100%";
                leftIframe.style.border = "none";
                leftIframe.src = window.location.href;
                
                leftView.appendChild(leftIframe);
                
                const rightView = document.createElement("div");
                rightView.id = "tabboost-split-right";
                rightView.style.width = "50%";
                rightView.style.height = "100%";
                rightView.style.position = "relative";
                
                // 右侧关闭按钮
                const rightCloseButton = document.createElement("button");
                rightCloseButton.className = "tabboost-view-close";
                rightCloseButton.dataset.action = "close-split-view";
                rightCloseButton.style.position = "absolute";
                rightCloseButton.style.top = "8px";
                rightCloseButton.style.right = "8px";
                rightCloseButton.style.zIndex = "10";
                rightCloseButton.style.width = "24px";
                rightCloseButton.style.height = "24px";
                rightCloseButton.innerText = "×";
                rightCloseButton.title = "关闭分屏视图";
                rightCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
                rightCloseButton.style.color = "#fff";
                rightCloseButton.style.border = "none";
                rightCloseButton.style.borderRadius = "50%";
                rightCloseButton.style.cursor = "pointer";
                
                rightCloseButton.addEventListener("click", () => {
                  // 关闭分屏，保留左侧页面
                  chrome.runtime.sendMessage({ action: "closeSplitView" });
                });
                
                rightView.appendChild(rightCloseButton);
                
                // 右侧iframe（目标链接）
                const rightIframe = document.createElement("iframe");
                rightIframe.id = "tabboost-right-iframe";
                rightIframe.style.width = "100%";
                rightIframe.style.height = "100%";
                rightIframe.style.border = "none";
                rightIframe.src = url;
                
                rightView.appendChild(rightIframe);
                
                // 组装DOM
                viewsContainer.appendChild(leftView);
                viewsContainer.appendChild(rightView);
                
                container.appendChild(viewsContainer);
                
                // 添加到页面
                document.body.appendChild(container);
                return true;
              }
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
