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
    Object.assign(popupOverlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: "10000",
      opacity: "0",
      transition: "opacity 0.3s ease",
    });

    // 创建弹窗内容容器
    const popupContent = document.createElement("div");
    popupContent.id = "tabboost-popup-content";
    Object.assign(popupContent.style, {
      position: "relative",
      width: "80%",
      height: "80%",
      backgroundColor: "#fff",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      overflow: "hidden",
      transform: "scale(0.8)",
      transition: "transform 0.3s ease",
    });

    // 创建 iframe 以加载链接内容
    const iframe = document.createElement("iframe");
    iframe.src = url;
    Object.assign(iframe.style, {
      width: "100%",
      height: "100%",
      border: "none",
    });
    console.log("chrome-tabboost: Iframe created and URL set");

    // 创建关闭按钮
    const closeButton = document.createElement("button");
    closeButton.innerText = "✖";
    Object.assign(closeButton.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "transparent",
      border: "none",
      fontSize: "16px",
      cursor: "pointer",
    });
    closeButton.title = "关闭弹窗";
    closeButton.addEventListener("click", closePopup);
    console.log("chrome-tabboost: Close button event listener added");

    // 创建右侧按钮容器
    const buttonContainer = document.createElement("div");
    Object.assign(buttonContainer.style, {
      position: "absolute",
      top: "10px",
      right: "40px",
      display: "flex",
      gap: "10px",
    });

    // 创建“在新标签页中打开”按钮
    const newTabButton = document.createElement("button");
    newTabButton.innerText = "在新标签页中打开";
    Object.assign(newTabButton.style, {
      padding: "5px 10px",
      cursor: "pointer",
    });
    newTabButton.title = "在新标签页中打开链接";
    newTabButton.addEventListener("click", () => {
      console.log("chrome-tabboost: New Tab button clicked");
      window.open(url, "_blank");
      closePopup();
    });

    // 创建“关闭”按钮
    const closeButtonAlt = document.createElement("button");
    closeButtonAlt.innerText = "关闭";
    Object.assign(closeButtonAlt.style, {
      padding: "5px 10px",
      cursor: "pointer",
    });
    closeButtonAlt.title = "关闭弹窗";
    closeButtonAlt.addEventListener("click", closePopup);
    console.log(
      "chrome-tabboost: Alternative close button event listener added"
    );

    // 组装按钮
    buttonContainer.appendChild(newTabButton);
    buttonContainer.appendChild(closeButtonAlt);

    // 组装弹窗内容
    popupContent.appendChild(closeButton);
    popupContent.appendChild(buttonContainer);
    popupContent.appendChild(iframe);

    // 组装弹窗覆盖层
    popupOverlay.appendChild(popupContent);

    // 添加到页面
    document.body.appendChild(popupOverlay);
    console.log("chrome-tabboost: Popup overlay added to the document");

    // 触发显示动画
    requestAnimationFrame(() => {
      popupOverlay.style.opacity = "1";
      popupContent.style.transform = "scale(1)";
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

    // 函数：关闭弹窗
    function closePopup() {
      try {
        console.log("chrome-tabboost: Closing popup");
        popupOverlay.style.opacity = "0";
        popupContent.style.transform = "scale(0.8)";
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
