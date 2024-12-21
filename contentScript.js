// contentScript.js

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
      console.error("chrome-tabboost: Error in click handler:", error);
    }
  },
  true
);

// 函数：创建并显示弹窗
function createPopup(url) {
  try {
    console.log(`chrome-tabboost: Creating popup for URL: ${url}`);

    // 检查是否已经存在弹窗，避免重复创建
    if (document.getElementById("tabboost-popup-overlay")) {
      console.log("chrome-tabboost: Popup already exists");
      return;
    }

    // 创建弹窗覆盖层
    const popupOverlay = document.createElement("div");
    popupOverlay.id = "tabboost-popup-overlay";
    popupOverlay.setAttribute("role", "dialog");
    popupOverlay.setAttribute("aria-modal", "true");

    // 创建弹窗内容容器
    const popupContent = document.createElement("div");
    popupContent.id = "tabboost-popup-content";

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

    // 创建“在新标签页中打开”按钮
    const newTabButton = document.createElement("button");
    newTabButton.className = "tabboost-button tabboost-newtab-button";
    newTabButton.innerText = "在新标签页中打开";
    newTabButton.title = "在新标签页中打开链接";
    newTabButton.setAttribute("aria-label", "在新标签页中打开链接");
    newTabButton.addEventListener("click", () => {
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
    closeButton.addEventListener("click", closePopup);
    console.log("chrome-tabboost: Close button event listener added");

    // 组装按钮容器
    buttonsContainer.appendChild(newTabButton);
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
    `;

    // 创建 iframe 以加载链接内容
    const iframe = document.createElement("iframe");
    iframe.id = "tabboost-popup-iframe";
    iframe.src = url;
    console.log("chrome-tabboost: Iframe created and URL set");

    // 设置超时（例如 5 秒）
    const loadTimeout = setTimeout(() => {
      console.log("chrome-tabboost: Iframe load timed out");
      loader.style.display = "none";
      errorMsg.classList.add("show");
    }, 5000);

    // 监听 iframe 加载完成
    iframe.addEventListener("load", () => {
      clearTimeout(loadTimeout);
      console.log("chrome-tabboost: Iframe content loaded");
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
    });

    // 监听 iframe 加载错误
    iframe.addEventListener("error", () => {
      clearTimeout(loadTimeout);
      console.log("chrome-tabboost: Iframe failed to load content");
      loader.innerText = "加载失败";
      errorMsg.classList.add("show");
    });

    // 组装弹窗内容
    popupContent.appendChild(toolbar);
    popupContent.appendChild(loader);
    popupContent.appendChild(errorMsg); // 添加错误消息
    popupContent.appendChild(iframe);

    // 组装弹窗覆盖层
    popupOverlay.appendChild(popupContent);

    // 添加到页面
    document.body.appendChild(popupOverlay);
    console.log("chrome-tabboost: Popup overlay added to the document");

    // 触发显示动画
    requestAnimationFrame(() => {
      popupOverlay.classList.add("show");
      console.log("chrome-tabboost: Popup overlay show animation triggered");
    });

    // 监听 Esc 键关闭弹窗
    const escListener = function (event) {
      if (event.key === "Escape") {
        console.log("chrome-tabboost: Escape key pressed");
        closePopup();
      }
    };
    document.addEventListener("keydown", escListener);
    console.log("chrome-tabboost: Esc key listener added");

    // 监听错误消息中的按钮
    const openNewTabButton = errorMsg.querySelector("#tabboost-open-newtab");
    openNewTabButton.addEventListener("click", () => {
      console.log("chrome-tabboost: Open in new tab button clicked");
      window.open(url, "_blank");
      closePopup();
    });

    // 函数：关闭弹窗
    function closePopup() {
      try {
        console.log("chrome-tabboost: Closing popup");
        popupOverlay.classList.remove("show");
        setTimeout(() => {
          if (popupOverlay && popupOverlay.parentNode) {
            popupOverlay.parentNode.removeChild(popupOverlay);
            document.removeEventListener("keydown", escListener);
            console.log(
              "chrome-tabboost: Popup overlay removed and Esc listener detached"
            );
          }
        }, 300); // 与 CSS 过渡时间一致
      } catch (error) {
        console.error("chrome-tabboost: Error while closing popup:", error);
      }
    }
  } catch (error) {
    console.error("chrome-tabboost: Error in createPopup:", error);
  }
}
