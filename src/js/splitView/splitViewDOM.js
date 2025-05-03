import storageCache from "../../utils/storage-cache.js";
import * as i18n from "../../utils/i18n.js";

export function initSplitViewDOM(leftUrl) {
  console.log("TabBoost: initSplitViewDOM called with URL:", leftUrl);

  try {
    // 主函数的 try 块开始
    if (!document || !document.body) {
      console.error("TabBoost: document or document.body is not available");
      return;
    }

    try {
      const dummyMain = document.createElement("div");
      dummyMain.setAttribute("data-md-component", "main");
      dummyMain.style.display = "none";
      document.body.appendChild(dummyMain);
      console.log("TabBoost: Added dummy main element");
    } catch (e) {
      console.error("TabBoost: Failed to add dummy main element:", e);
    }

    const existingSplitView = document.getElementById(
      "tabboost-split-view-container"
    );
    if (existingSplitView) {
      console.log("TabBoost: Removing existing split view container");
      existingSplitView.remove();
    }

    try {
      const safeQuerySelector = (selector) => {
        try {
          return document.querySelector(selector);
        } catch (e) {
          console.warn(`TabBoost: Failed to query selector ${selector}:`, e);
          return null;
        }
      };

      const knownProblematicSelectors = ["[data-md-component=main]"];
      knownProblematicSelectors.forEach((selector) =>
        safeQuerySelector(selector)
      );
      console.log("TabBoost: Checked problematic selectors");
    } catch (e) {
      console.error("TabBoost: Error checking problematic selectors:", e);
    }

    let originalContent = "";
    try {
      originalContent = document.documentElement.outerHTML || "";
    } catch (e) {
      originalContent = document.body.innerHTML || "";
    }

    try {
      const maxContentLength = 500000;
      if (originalContent.length > maxContentLength) {
        console.warn(
          `TabBoost: Original content exceeds ${maxContentLength} characters, saving placeholder.`
        );
        originalContent = `<html><head><title>${document.title}</title></head><body><div class="tabboost-restored-content">${i18n.getMessage("contentTooLarge")}</div></body></html>`;
      }
      document.body.setAttribute(
        "data-tabboost-original-content",
        originalContent
      );
    } catch (e) {
      console.error("TabBoost: Error storing original content", e);
    }

    // 定义 DOM 操作函数
    function domOperations() {
      // 创建一个新的分屏视图容器
      let splitViewContainer;
      splitViewContainer = document.createElement("div");
      splitViewContainer.id = "tabboost-split-view-container";
      console.log("TabBoost: Created split view container");

      // 设置基本样式，确保容器可见
      splitViewContainer.style.position = "fixed";
      splitViewContainer.style.top = "0";
      splitViewContainer.style.left = "0";
      splitViewContainer.style.width = "100%";
      splitViewContainer.style.height = "100%";
      splitViewContainer.style.zIndex = "10000";
      splitViewContainer.style.backgroundColor = "#fff";
      splitViewContainer.style.display = "flex";
      splitViewContainer.style.flexDirection = "column";
      splitViewContainer.style.overflow = "hidden";
      console.log("TabBoost: Applied basic styles to container");

      // 先不添加隐藏类，直接显示
    // splitViewContainer.classList.add("tabboost-initially-hidden");

      const controlBar = document.createElement("div");
      controlBar.id = "tabboost-split-controls";
      console.log("TabBoost: Created control bar");

      const closeButton = document.createElement("button");
      closeButton.id = "tabboost-split-close";
      closeButton.innerText = i18n.getMessage("closeSplitView") || "Close Split View";
      closeButton.dataset.action = "close-split-view";
      console.log("TabBoost: Created close button");

      controlBar.appendChild(closeButton);
      splitViewContainer.appendChild(controlBar);
      console.log("TabBoost: Appended control bar to container");


      const viewsContainer = document.createElement("div");
      viewsContainer.id = "tabboost-views-container";
      viewsContainer.style.display = "flex";
      viewsContainer.style.width = "100%";
      viewsContainer.style.height = "calc(100% - 48px)";
      viewsContainer.style.position = "relative";
      console.log("TabBoost: Created views container");

      let leftView, leftErrorContainer;
      leftView = document.createElement("div");
      leftView.id = "tabboost-split-left";
      leftView.style.width = "50%";
      leftView.style.height = "100%";
      leftView.style.overflow = "hidden";
      leftView.style.position = "relative";

        const leftCloseButton = document.createElement("button");
        leftCloseButton.className = "tabboost-view-close";
        leftCloseButton.innerText = "×";
        leftCloseButton.title = i18n.getMessage("closeLeftView");
        leftCloseButton.dataset.action = "close-left-view";

        leftView.appendChild(leftCloseButton);

        leftErrorContainer = document.createElement("div");
        leftErrorContainer.id = "tabboost-left-error";
        leftErrorContainer.className = "tabboost-iframe-error";
        leftErrorContainer.style.display = "none";
        leftErrorContainer.innerHTML = `
          <div class="tabboost-error-content">
            <h3>Loading Issues</h3>
            <p>We're trying to bypass frame restrictions.</p>
            <button class="tabboost-retry-load" data-url="${leftUrl}">Retry Loading</button>
            <button class="tabboost-open-in-tab" data-url="${leftUrl}">Open in New Tab</button>
          </div>
        `;
        leftView.appendChild(leftErrorContainer);


      // 创建左侧iframe
      let leftIframe;
      try {
        leftIframe = document.createElement("iframe");
        leftIframe.id = "tabboost-left-iframe";
        leftIframe.style.width = "100%";
        leftIframe.style.height = "100%";
        leftIframe.style.border = "none";
        leftIframe.style.display = "block";

        // 设置属性
        leftIframe.setAttribute("loading", "lazy");
        leftIframe.setAttribute(
          "sandbox",
          "allow-same-origin allow-scripts allow-popups allow-forms"
        );
        leftIframe.setAttribute("data-tabboost-frame", "left");
        leftIframe.setAttribute("allowfullscreen", "true");
        console.log("TabBoost: Created left iframe with attributes");
      } catch (e) {
        console.error("TabBoost: Error creating left iframe:", e);
        return; // 如果创建iframe失败，直接返回
      }

      // 添加事件监听器
      try {
        leftIframe.addEventListener("load", () => {
          console.log("TabBoost: Left iframe loaded successfully:", leftUrl);
          if (leftErrorContainer) {
            leftErrorContainer.style.display = "none";
          }

          // 尝试访问iframe内容
          try {
            const frameDoc = leftIframe.contentDocument || leftIframe.contentWindow.document;
            console.log("TabBoost: Left iframe content accessible:", !!frameDoc);

            // 如果能访问内容，尝试修改iframe内容的样式
            if (frameDoc && frameDoc.body) {
              try {
                const style = frameDoc.createElement('style');
                style.textContent = 'body { margin: 0; padding: 0; }';
                frameDoc.head.appendChild(style);
                console.log("TabBoost: Added styles to left iframe content");
              } catch (styleError) {
                console.warn("TabBoost: Could not add styles to left iframe:", styleError);
              }
            }
          } catch (e) {
            console.warn("TabBoost: Cannot access left iframe content due to security restrictions:", e.message);
            // 这是正常的，因为跨域限制
          }
        });

        // 错误处理
        leftIframe.addEventListener("error", (e) => {
          console.error("TabBoost: Left iframe failed to load:", leftUrl, e);
          if (leftErrorContainer) {
            leftErrorContainer.style.display = "flex";
          }
        });

        // 设置src属性
        console.log("TabBoost: Setting left iframe src to:", leftUrl);
        leftIframe.src = leftUrl;
      } catch (e) {
        console.error("TabBoost: Error setting up left iframe events:", e);
      }

      try {
        leftView.appendChild(leftIframe);
      } catch (e) {
        console.error("TabBoost: Error appending left iframe to view:", e);
      }

      let rightView, rightErrorContainer;
      try {
        rightView = document.createElement("div");
        rightView.id = "tabboost-split-right";
        rightView.style.width = "50%";
        rightView.style.height = "100%";
        rightView.style.overflow = "hidden";
        rightView.style.position = "relative";

        const rightCloseButton = document.createElement("button");
        rightCloseButton.className = "tabboost-view-close";
        rightCloseButton.innerText = "×";
        rightCloseButton.title = i18n.getMessage("closeRightView");
        rightCloseButton.dataset.action = "close-right-view";

        rightView.appendChild(rightCloseButton);

        rightErrorContainer = document.createElement("div");
        rightErrorContainer.id = "tabboost-right-error";
        rightErrorContainer.className = "tabboost-iframe-error";
        rightErrorContainer.style.display = "none";
        rightErrorContainer.innerHTML = `
          <div class="tabboost-error-content">
            <h3>Loading Issues</h3>
            <p>We're trying to bypass frame restrictions.</p>
            <button class="tabboost-retry-load" data-url="">Retry Loading</button>
            <button class="tabboost-open-in-tab" data-url="">Open in New Tab</button>
          </div>
        `;
        rightView.appendChild(rightErrorContainer);
      } catch (e) {
        console.error("TabBoost: Error creating right view:", e);
        return; // 如果创建右视图失败，直接返回
      }

      // 创建右侧iframe
      let rightIframe;
      try {
        rightIframe = document.createElement("iframe");
        rightIframe.id = "tabboost-right-iframe";
        rightIframe.style.width = "100%";
        rightIframe.style.height = "100%";
        rightIframe.style.border = "none";
        rightIframe.style.display = "block";

        // 设置属性
        rightIframe.setAttribute("loading", "lazy");
        rightIframe.setAttribute(
          "sandbox",
          "allow-same-origin allow-scripts allow-popups allow-forms"
        );
        rightIframe.setAttribute("data-tabboost-frame", "right");
        rightIframe.setAttribute("allowfullscreen", "true");
        console.log("TabBoost: Created right iframe with attributes");
      } catch (e) {
        console.error("TabBoost: Error creating right iframe:", e);
        return; // 如果创建iframe失败，直接返回
      }

      // 添加事件监听器
      try {
        rightIframe.addEventListener("load", () => {
          console.log("TabBoost: Right iframe load event triggered, src:", rightIframe.src);

          if (rightIframe.src !== "about:blank") {
            console.log("TabBoost: Right iframe loaded with content, hiding error container");
            if (rightErrorContainer) {
              rightErrorContainer.style.display = "none";
            }

            // 尝试访问iframe内容
            try {
              const frameDoc = rightIframe.contentDocument || rightIframe.contentWindow.document;
              console.log("TabBoost: Right iframe content accessible:", !!frameDoc);

              // 如果能访问内容，尝试修改iframe内容的样式
              if (frameDoc && frameDoc.body) {
                try {
                  const style = frameDoc.createElement('style');
                  style.textContent = 'body { margin: 0; padding: 0; }';
                  frameDoc.head.appendChild(style);
                  console.log("TabBoost: Added styles to right iframe content");
                } catch (styleError) {
                  console.warn("TabBoost: Could not add styles to right iframe:", styleError);
                }
              }
            } catch (e) {
              console.warn("TabBoost: Cannot access right iframe content due to security restrictions:", e.message);
              // 这是正常的，因为跨域限制
            }
          } else {
            console.log("TabBoost: Right iframe loaded with about:blank");
          }
        });

        // 错误处理
        rightIframe.addEventListener("error", (e) => {
          console.error("TabBoost: Right iframe failed to load:", rightIframe.src, e);
          if (rightErrorContainer) {
            rightErrorContainer.style.display = "flex";
            const openButton = rightErrorContainer.querySelector(".tabboost-open-in-tab");
            if (openButton) {
              openButton.dataset.url = rightIframe.src;
            }
          }
        });

        // 设置初始src为about:blank
        console.log("TabBoost: Setting right iframe initial src to about:blank");
        rightIframe.src = "about:blank";
      } catch (e) {
        console.error("TabBoost: Error setting up right iframe events:", e);
      }

      setTimeout(() => {
        if (
          rightIframe.src !== "about:blank" &&
          (rightIframe.contentDocument === null ||
            rightIframe.contentWindow === null)
        ) {
          rightErrorContainer.style.display = "flex";
        }
      }, 5000);

      rightView.appendChild(rightIframe);

      const divider = document.createElement("div");
      divider.id = "tabboost-split-divider";
      divider.style.width = "6px";
      divider.style.height = "100%";
      divider.style.background = "#e0e0e0";
      divider.style.cursor = "col-resize";

      viewsContainer.appendChild(leftView);
      viewsContainer.appendChild(divider);
      viewsContainer.appendChild(rightView);
      splitViewContainer.appendChild(viewsContainer);

      // 不使用文档片段，直接添加到body
      console.log("TabBoost: Ready to add split view container to document");

      // 设置body样式
      document.body.style.overflow = "hidden";
      console.log("TabBoost: Set body overflow to hidden");

      try {
        // 不清除body内容，而是将所有现有元素隐藏
        console.log("TabBoost: Hiding existing body content");
        const existingElements = Array.from(document.body.children);
        existingElements.forEach(element => {
          // 保存原始display值
          element.dataset.originalDisplay = element.style.display;
          element.style.display = "none";
        });
        console.log(`TabBoost: Hidden ${existingElements.length} existing elements`);

        // 直接添加分屏容器到body
        document.body.appendChild(splitViewContainer);
        console.log("TabBoost: Added split view container to body");
      } catch (e) {
        console.error("TabBoost: Error adding split view container:", e);

        // 如果出错，尝试更简单的方法
        try {
          // 创建一个新的div作为覆盖层
          const overlay = document.createElement("div");
          overlay.id = "tabboost-overlay";
          overlay.style.position = "fixed";
          overlay.style.top = "0";
          overlay.style.left = "0";
          overlay.style.width = "100%";
          overlay.style.height = "100%";
          overlay.style.zIndex = "9999";
          overlay.style.backgroundColor = "#fff";

          overlay.appendChild(splitViewContainer);
          document.body.appendChild(overlay);
          console.log("TabBoost: Added overlay with split view container");
        } catch (overlayError) {
          console.error("TabBoost: Failed to add overlay:", overlayError);
        }
      }

      // 检查样式是否已加载
      const styleSheets = Array.from(document.styleSheets);
      const splitViewStyleLoaded = styleSheets.some(sheet => {
        try {
          return sheet.href && sheet.href.includes('splitViewStyles.css');
        } catch (e) {
          return false;
        }
      });
      console.log("TabBoost: Split view style loaded:", splitViewStyleLoaded);

      // 如果样式未加载，尝试手动注入基本样式
      if (!splitViewStyleLoaded) {
        console.log("TabBoost: Attempting to inject basic split view styles");
        const style = document.createElement('style');
        style.textContent = `
          #tabboost-split-view-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            background-color: #fff;
            display: flex;
            flex-wrap: wrap;
          }
          .tabboost-initially-hidden {
            opacity: 0;
          }
          .tabboost-visible {
            opacity: 1;
            transition: opacity 0.3s;
          }
          #tabboost-split-controls {
            width: 100%;
            height: 48px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 16px;
            background-color: #f8f9fa;
            border-bottom: 1px solid #eaeaea;
          }
          #tabboost-views-container {
            display: flex;
            width: 100%;
            height: calc(100% - 48px);
            position: relative;
          }
          #tabboost-split-left, #tabboost-split-right {
            width: 50%;
            height: 100%;
            overflow: hidden;
            position: relative;
          }
          #tabboost-left-iframe, #tabboost-right-iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        `;
        document.head.appendChild(style);
        console.log("TabBoost: Injected basic split view styles");
      }

      try {
        requestAnimationFrame(() => {
          try {
            console.log("TabBoost: Removing initially-hidden class in next animation frame");
            splitViewContainer.classList.remove("tabboost-initially-hidden");
            splitViewContainer.classList.add("tabboost-visible");
            console.log("TabBoost: Added visible class");

            // 在视图变为可见后，设置左侧 iframe 的 src
            setTimeout(() => {
              try {
                const leftIframe = document.getElementById("tabboost-left-iframe");
                if (leftIframe) {
                  console.log("TabBoost: Setting left iframe src to:", leftUrl);
                  leftIframe.src = leftUrl;
                }
              } catch (e) {
                console.error("TabBoost: Error setting left iframe src in timeout:", e);
              }
            }, 100);
          } catch (e) {
            console.error("TabBoost: Error in animation frame callback:", e);
          }
        });
      } catch (e) {
        console.error("TabBoost: Error requesting animation frame:", e);
      }
    }; // 结束 domOperations 函数

    domOperations();

    try {
      document.addEventListener("click", (event) => {
        try {
          const target = event.target;

          if (
            target.closest(
              '#tabboost-split-close, [data-action="close-split-view"]'
            )
          ) {
            chrome.runtime.sendMessage({ action: "closeSplitView" });
            return;
          }

          if (
            target.closest('.tabboost-view-close[data-action="close-left-view"]')
          ) {
            const rightIframe = document.getElementById("tabboost-right-iframe");

            if (
              rightIframe &&
              rightIframe.src &&
              rightIframe.src !== "about:blank"
            ) {
              const rightUrl = rightIframe.src;

              chrome.runtime.sendMessage({ action: "closeSplitView" });

              setTimeout(() => {
                try {
                  window.location.href = rightUrl;
                } catch (e) {
                  console.error("TabBoost: Error setting location in timeout:", e);
                }
              }, 100);
            } else {
              chrome.runtime.sendMessage({ action: "closeSplitView" });
            }
            return;
          }
        } catch (e) {
          console.error("TabBoost: Error in click event handler:", e);
        }
      });
    } catch (e) {
      console.error("TabBoost: Error adding click event listener:", e);
    }

  } catch (error) {
    console.error("TabBoost: Error in initSplitViewDOM:", error);
    try {
      document.body.innerHTML = `<div class="tabboost-error">${i18n.getMessage("failedToInitSplitView") || "Failed to initialize split view, please refresh the page"}</div>`;
    } catch (e) {
      console.error("TabBoost: Error setting error message:", e);
    }
  }
}

export function removeSplitViewDOM() {
  try {
    if (!document || !document.body) {
      return;
    }

    let originalContent = "";
    try {
      originalContent =
        document.body.getAttribute("data-tabboost-original-content") || "";
    } catch (e) {}

    if (originalContent) {
      try {
        const parser = new DOMParser();
        const originalDoc = parser.parseFromString(
          originalContent,
          "text/html"
        );

        try {
          document.documentElement.innerHTML =
            originalDoc.documentElement.innerHTML;
        } catch (e) {
          try {
            document.body.innerHTML = originalDoc.body.innerHTML;
          } catch (e2) {
            document.body.innerHTML = `<div class="tabboost-error">${i18n.getMessage("failedToRestoreOriginal")}</div>`;
          }
        }
      } catch (e) {
        document.body.innerHTML = `
          <div class="tabboost-error">
            <p>${i18n.getMessage("failedToRestoreOriginal")}</p>
            <button onclick="window.location.reload()">${i18n.getMessage("refreshPage")}</button>
          </div>
        `;
      }
    } else {
      document.body.innerHTML = `
        <div class="tabboost-error">
          <p>${i18n.getMessage("cannotFindOriginalContent")}</p>
          <button onclick="window.location.reload()">${i18n.getMessage("refreshPage")}</button>
        </div>
      `;
    }
  } catch (error) {
    try {
      document.body.innerHTML = `
        <div class="tabboost-error">
          <p>${i18n.getMessage("failedToRestoreOriginal")}</p>
          <button onclick="window.location.reload()">${i18n.getMessage("refreshPage")}</button>
        </div>
      `;
    } catch (e) {}
  }
}

export function updateRightViewDOM(url) {
  console.log("TabBoost: updateRightViewDOM called with URL:", url);

  try {
    if (!document || !document.body) {
      console.error("TabBoost: document or document.body is not available");
      return;
    }

    // 确保分屏视图容器存在
    const splitViewContainer = document.getElementById("tabboost-split-view-container");
    if (!splitViewContainer) {
      console.error("TabBoost: Split view container not found");
      return;
    }
    
    // 确保视图容器存在
    const viewsContainer = document.getElementById("tabboost-views-container");
    if (!viewsContainer) {
      console.error("TabBoost: Views container not found");
      return;
    }

    // 获取右侧视图
    const rightView = document.getElementById("tabboost-split-right");
    if (!rightView) {
      console.error("TabBoost: Right view not found");
      return;
    }

    // 检查右侧iframe
    let rightIframe = document.getElementById("tabboost-right-iframe");
    if (!rightIframe) {
      console.log("TabBoost: Right iframe not found, creating a new one");
      
      // 如果右侧iframe不存在，创建一个新的
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
      
      // 获取右侧错误容器
      const rightErrorContainer = document.getElementById("tabboost-right-error");
      
      // 添加事件监听器
      rightIframe.addEventListener("load", () => {
        console.log("TabBoost: Right iframe loaded successfully:", url);
        if (rightErrorContainer) {
          rightErrorContainer.style.display = "none";
        }
      });
      
      rightIframe.addEventListener("error", () => {
        console.error("TabBoost: Right iframe failed to load:", url);
        if (rightErrorContainer) {
          rightErrorContainer.style.display = "flex";
          
          // 更新错误容器中的重试和新标签按钮URL
          const retryButton = rightErrorContainer.querySelector(".tabboost-retry-load");
          const openButton = rightErrorContainer.querySelector(".tabboost-open-in-tab");
          
          if (retryButton) retryButton.dataset.url = url;
          if (openButton) openButton.dataset.url = url;
        }
      });
      
      // 将iframe添加到右视图
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
    
    console.log("TabBoost: Setting right iframe src to:", url);
    rightIframe.src = url;
    
    // 获取右侧错误容器并更新其中的URL
    const rightErrorContainer = document.getElementById("tabboost-right-error");
    if (rightErrorContainer) {
      const retryButton = rightErrorContainer.querySelector(".tabboost-retry-load");
      const openButton = rightErrorContainer.querySelector(".tabboost-open-in-tab");
      
      if (retryButton) retryButton.dataset.url = url;
      if (openButton) openButton.dataset.url = url;
    }
    
    return true;
  } catch (error) {
    console.error("TabBoost: Error in updateRightViewDOM:", error);
    try {
      // 如果更新失败，尝试在新标签页中打开URL
      window.open(url, "_blank");
    } catch (e) {
      console.error("TabBoost: Failed to open URL in new tab:", e);
    }
    return false;
  }
}

async function restoreOriginalContent() {
  const originalContent = document.body.getAttribute(
    "data-tabboost-original-content"
  );

  try {
    if (originalContent) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = originalContent;
      const restoredContentDiv = tempDiv.querySelector(
        ".tabboost-restored-content"
      );

      if (
        restoredContentDiv &&
        restoredContentDiv.textContent === i18n.getMessage("contentTooLarge")
      ) {
        window.location.reload();
        return;
      }

      document.documentElement.innerHTML = originalContent;
      window.location.reload();
    } else {
      document.body.innerHTML = `<div class="tabboost-error">${i18n.getMessage("cannotFindOriginalContent")}</div><button onclick="window.location.reload()">${i18n.getMessage("refreshPage")}</button>`;
      addErrorStyles();
    }
  } catch (error) {
    console.error("Failed to restore original content:", error);
    document.body.innerHTML = `<div class="tabboost-error">${i18n.getMessage("failedToRestoreOriginal")}</div><button onclick="window.location.reload()">${i18n.getMessage("refreshPage")}</button>`;
    addErrorStyles();
  } finally {
    document.body.removeAttribute("data-tabboost-original-content");
    document.body.style.overflow = "";
  }
}

function addErrorStyles() {
  const style = document.createElement("style");
  style.textContent = `
      .tabboost-error {
         padding: 20px;
         color: #721c24;
         background-color: #f8d7da;
         border: 1px solid #f5c6cb;
         border-radius: 4px;
         margin: 20px;
         font-family: sans-serif;
      }
      .tabboost-error + button {
         margin: 0 20px 20px 20px;
         padding: 10px 15px;
         cursor: pointer;
      }
   `;
  document.head.appendChild(style);
}
