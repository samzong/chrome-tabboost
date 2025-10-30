import {
  UI_CONFIG,
  ANIMATION_CONFIG,
  LAYOUT_CONFIG,
} from "./splitViewConfig.js";
import {
  createElement,
  createIframe,
  createCloseButton,
} from "./splitViewDOMUtils.js";
import { safeQuerySelector } from "./splitViewUtils.js";
import * as i18n from "../../utils/i18n.js";
import {
  createSettingsButton,
  createRatioMenu,
  addViewHoverEffects,
  applyDefaultRatio,
} from "./splitViewDOMComponents.js";

const ORIGINAL_ROOT_ID = "tabboost-original-content-root";
const ORIGINAL_ROOT_ATTR = "data-tabboost-original-root";
const ORIGINAL_STATE_DATA_KEY = "tabboostOriginalState";

/**
 * 初始化分屏视图DOM结构
 * @param {string} leftUrl - 左侧视图URL
 * @returns {{success: boolean, container?: HTMLElement, leftContentRoot?: HTMLElement, rightView?: HTMLElement, reused?: boolean, reason?: string, error?: Error}}
 */
export function initSplitViewDOM(leftUrl) {
  try {
    if (!document || !document.body) {
      return { success: false, reason: "document-unavailable" };
    }

    const existingContainer = safeQuerySelector(`#${UI_CONFIG.container.id}`);
    if (existingContainer) {
      existingContainer.style.display = "flex";
      return { success: true, container: existingContainer, reused: true };
    }

    const originalNodes = Array.from(document.body.childNodes);
    const originalState = captureOriginalState();

    const splitViewContainer = createElement("div", UI_CONFIG.container);
    splitViewContainer.classList.add(ANIMATION_CONFIG.initialClass);

    const viewsContainer = createElement("div", UI_CONFIG.viewsContainer);
    viewsContainer.setAttribute("data-split-direction", "horizontal");

    const leftView = createView("left", leftUrl, { useIframe: false });
    const rightView = createView("right");

    const leftContentRoot = createElement("div", {
      id: ORIGINAL_ROOT_ID,
      styles: {
        width: "100%",
        height: "100%",
        overflow: "auto",
        position: "relative",
        boxSizing: "border-box",
        margin: "0",
        padding: "0",
        display: "block",
      },
    });
    leftContentRoot.setAttribute(ORIGINAL_ROOT_ATTR, "true");

    leftView.appendChild(leftContentRoot);
    // Mark left view as containing original content for CSS styling
    leftView.setAttribute("data-has-original-content", "true");
    viewsContainer.appendChild(leftView);
    viewsContainer.appendChild(rightView);
    splitViewContainer.appendChild(viewsContainer);

    relocateOriginalNodes(originalNodes, leftContentRoot);

    document.body.appendChild(splitViewContainer);
    splitViewContainer.dataset[ORIGINAL_STATE_DATA_KEY] =
      JSON.stringify(originalState);
    lockDocument();

    addViewHoverEffects(leftView);
    addViewHoverEffects(rightView);
    applyDefaultRatio();

    requestAnimationFrame(() => {
      splitViewContainer.classList.remove(ANIMATION_CONFIG.initialClass);
      splitViewContainer.classList.add(ANIMATION_CONFIG.visibleClass);
      leftContentRoot.scrollTo(originalState.scrollX, originalState.scrollY);
    });

    return {
      success: true,
      container: splitViewContainer,
      leftContentRoot,
      rightView,
    };
  } catch (error) {
    console.error("TabBoost: Error in initSplitViewDOM:", error);
    return { success: false, error };
  }
}

/**
 * 创建视图（左/右）
 * @param {string} side - 'left' 或 'right'
 * @param {string} url - 视图URL
 * @returns {HTMLElement} - 视图元素
 */
function createView(side, url = "about:blank", options = {}) {
  const { useIframe = true } = options;
  const config = {
    ...UI_CONFIG.view,
    id: UI_CONFIG.view[side].id,
    styles: {
      ...UI_CONFIG.view.styles,
      [side === "left" ? "marginRight" : "marginLeft"]: "6px",
    },
  };

  const view = createElement("div", config);

  const closeButton = createCloseButton("close-split-view");
  closeButton.title = i18n.getMessage("closeSplitView") || "关闭分屏视图";
  view.appendChild(closeButton);

  const settingsButton = createSettingsButton(side);
  view.appendChild(settingsButton);

  createRatioMenu(settingsButton, side);

  if (useIframe) {
    const errorContainer = createErrorContainer(side, url);
    view.appendChild(errorContainer);

    const iframe = createIframe(UI_CONFIG.iframe[side].id, url);
    iframe.setAttribute("data-tabboost-frame", side);
    setupIframeEvents(iframe, errorContainer, url);
    view.appendChild(iframe);
  }

  return view;
}

/**
 * 创建错误容器
 * @param {string} side - 'left' 或 'right'
 * @param {string} url - 视图URL
 * @returns {HTMLElement} - 错误容器元素
 */
function createErrorContainer(side, url) {
  const container = createElement("div", {
    id: `tabboost-${side}-error`,
    className: "tabboost-iframe-error",
    styles: {
      display: "none",
      borderRadius: "8px",
    },
  });

  container.innerHTML = `
    <div class="tabboost-error-content">
      <h3>${i18n.getMessage("loadingIssues") || "Loading Issues"}</h3>
      <p>${i18n.getMessage("bypassingFrameRestrictions") || "We're trying to bypass frame restrictions."}</p>
      <button class="tabboost-retry-load" data-url="${url}">${i18n.getMessage("retryLoading") || "Retry Loading"}</button>
      <button class="tabboost-open-in-tab" data-url="${url}">${i18n.getMessage("openInNewTab") || "Open in New Tab"}</button>
    </div>
  `;

  return container;
}

/**
 * 设置iframe事件
 * @param {HTMLIFrameElement} iframe - iframe元素
 * @param {HTMLElement} errorContainer - 错误容器
 * @param {string} url - iframe URL
 */
function setupIframeEvents(iframe, errorContainer, url) {
  iframe.addEventListener("load", () => {
    if (url !== "about:blank") {
      errorContainer.style.display = "none";
      try {
        const frameDoc =
          iframe.contentDocument || iframe.contentWindow.document;
        if (frameDoc && frameDoc.body) {
          // Inject styles to remove page margins for proper display in split-view
          const style = frameDoc.createElement("style");
          style.textContent = "body { margin: 0; padding: 0; }";
          frameDoc.head.appendChild(style);
        }
      } catch (e) {
        // If unable to access iframe content (e.g., cross-origin restrictions), this is expected
        // In this case, the page's original styles are preserved; may need CSS-level handling
      }
    }
  });

  iframe.addEventListener("error", () => {
    if (url !== "about:blank") {
      errorContainer.style.display = "flex";
      updateErrorButtons(errorContainer, url);
    }
  });
}

/**
 * 更新错误按钮数据
 * @param {HTMLElement} container - 错误容器
 * @param {string} url - URL
 */
function updateErrorButtons(container, url) {
  const retryButton = container.querySelector(".tabboost-retry-load");
  const openButton = container.querySelector(".tabboost-open-in-tab");

  if (retryButton) retryButton.dataset.url = url;
  if (openButton) openButton.dataset.url = url;
}

/**
 * 保存原始页面内容
 */
function captureOriginalState() {
  return {
    overflow: document.body.style.overflow || "",
    scrollX: window.scrollX || 0,
    scrollY: window.scrollY || 0,
  };
}

function lockDocument() {
  document.body.style.overflow = "hidden";
}

function relocateOriginalNodes(nodes, target) {
  const fragment = document.createDocumentFragment();

  nodes.forEach((node) => {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.id === UI_CONFIG.container.id
    ) {
      return;
    }

    fragment.appendChild(node);
  });

  target.appendChild(fragment);
}

function parseOriginalState(container) {
  const raw = container?.dataset?.[ORIGINAL_STATE_DATA_KEY];
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("TabBoost: Failed to parse original state payload:", error);
    return null;
  }
}

function restoreOriginalContent(container) {
  const targetRoot = container?.querySelector(`#${ORIGINAL_ROOT_ID}`);
  if (!targetRoot) {
    return;
  }

  const fragment = document.createDocumentFragment();

  while (targetRoot.firstChild) {
    fragment.appendChild(targetRoot.firstChild);
  }

  document.body.insertBefore(fragment, container);
}

function restoreDocumentState(state) {
  if (!state) {
    document.body.style.overflow = "";
    window.scrollTo(0, 0);
    return;
  }

  document.body.style.overflow = state.overflow || "";
  window.scrollTo(state.scrollX || 0, state.scrollY || 0);
}

/**
 * 移除分屏视图，恢复原始页面
 * @returns {boolean} - 是否成功移除
 */
export function removeSplitViewDOM() {
  try {
    if (!document || !document.body) {
      return false;
    }

    const container = safeQuerySelector(`#${UI_CONFIG.container.id}`);
    if (!container) {
      return false;
    }

    const originalState = parseOriginalState(container);
    restoreOriginalContent(container);
    container.remove();
    restoreDocumentState(originalState);

    return true;
  } catch (error) {
    console.error("TabBoost: Failed to remove split view DOM:", error);
    return false;
  }
}

/**
 * 更新右侧视图DOM
 * @param {string} url - 右侧视图URL
 * @returns {boolean} - 是否成功更新
 */
export function updateRightViewDOM(url) {
  try {
    const rightView = safeQuerySelector(`#${UI_CONFIG.view.right.id}`);
    if (!rightView) {
      console.error("TabBoost: Right view not found");
      return false;
    }

    let rightIframe = safeQuerySelector(`#${UI_CONFIG.iframe.right.id}`);
    let errorContainer = safeQuerySelector(`#tabboost-right-error`);

    if (!rightIframe) {
      rightIframe = createIframe(UI_CONFIG.iframe.right.id, url);
      rightIframe.setAttribute("data-tabboost-frame", "right");

      if (!errorContainer) {
        errorContainer = createErrorContainer("right", url);
        rightView.appendChild(errorContainer);
      }

      setupIframeEvents(rightIframe, errorContainer, url);
      rightView.appendChild(rightIframe);
    } else {
      rightIframe.src = url;
      if (errorContainer) {
        updateErrorButtons(errorContainer, url);
      }
    }

    rightView.style.display = "block";

    const viewsContainer = safeQuerySelector(`#${UI_CONFIG.viewsContainer.id}`);
    if (viewsContainer) {
      const isVertical =
        viewsContainer.getAttribute("data-split-direction") === "vertical";
      if (isVertical) {
        rightView.style.width = LAYOUT_CONFIG.vertical.rightWidth;
        rightView.style.height = LAYOUT_CONFIG.vertical.rightHeight;
      } else {
        rightView.style.width = LAYOUT_CONFIG.horizontal.rightWidth;
        rightView.style.height = LAYOUT_CONFIG.horizontal.rightHeight;
      }
    }

    return true;
  } catch (error) {
    console.error("TabBoost: Error in updateRightViewDOM:", error);
    try {
      window.open(url, "_blank");
    } catch (e) {
      console.error("TabBoost: Failed to open URL in new tab:", e);
    }
    return false;
  }
}
