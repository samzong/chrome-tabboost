import { UI_CONFIG, ANIMATION_CONFIG, LAYOUT_CONFIG } from './splitViewConfig.js';
import {
  createElement,
  createIframe,
  createCloseButton,
  createDivider,
  cleanupElement
} from './splitViewDOMUtils.js';
import { safeQuerySelector } from './splitViewUtils.js';
import * as i18n from "../../utils/i18n.js";
import { 
  createSettingsButton, 
  createRatioMenu, 
  addViewHoverEffects, 
  applyDefaultRatio 
} from './splitViewDOMComponents.js';

/**
 * 初始化分屏视图DOM结构
 * @param {string} leftUrl - 左侧视图URL
 * @returns {boolean} - 是否成功初始化
 */
export function initSplitViewDOM(leftUrl) {
  console.log("TabBoost: initSplitViewDOM called with URL:", leftUrl);

  try {
    if (!document || !document.body) {
      console.error("TabBoost: document or document.body is not available");
      return false;
    }

    
    cleanupElement(`#${UI_CONFIG.container.id}`);

    
    saveOriginalContent();

    
    const splitViewContainer = createElement('div', UI_CONFIG.container);
    splitViewContainer.classList.add(ANIMATION_CONFIG.initialClass);

    
    const viewsContainer = createElement('div', UI_CONFIG.viewsContainer);
    viewsContainer.setAttribute('data-split-direction', 'horizontal');

    
    const leftView = createView('left', leftUrl);
    const rightView = createView('right');

    
    viewsContainer.appendChild(leftView);
    viewsContainer.appendChild(rightView);
    splitViewContainer.appendChild(viewsContainer);

    
    hideExistingContent();
    document.body.style.overflow = 'hidden';
    document.body.appendChild(splitViewContainer);

    
    addViewHoverEffects(leftView);
    addViewHoverEffects(rightView);

    
    applyDefaultRatio();

    
    requestAnimationFrame(() => {
      splitViewContainer.classList.remove(ANIMATION_CONFIG.initialClass);
      splitViewContainer.classList.add(ANIMATION_CONFIG.visibleClass);
    });

    return true;
  } catch (error) {
    console.error("TabBoost: Error in initSplitViewDOM:", error);
    showError(i18n.getMessage("failedToInitSplitView") || "Failed to initialize split view");
    return false;
  }
}

/**
 * 创建视图（左/右）
 * @param {string} side - 'left' 或 'right'
 * @param {string} url - 视图URL
 * @returns {HTMLElement} - 视图元素
 */
function createView(side, url = 'about:blank') {
  const config = {
    ...UI_CONFIG.view,
    id: UI_CONFIG.view[side].id,
    styles: {
      ...UI_CONFIG.view.styles,
      [side === 'left' ? 'marginRight' : 'marginLeft']: '6px'
    }
  };

  const view = createElement('div', config);
  
  
  const closeButton = createCloseButton('close-split-view');
  closeButton.title = i18n.getMessage("closeSplitView") || "关闭分屏视图";
  view.appendChild(closeButton);
  
  
  const settingsButton = createSettingsButton(side);
  view.appendChild(settingsButton);
  
  
  createRatioMenu(settingsButton, side);

  
  const errorContainer = createErrorContainer(side, url);
  view.appendChild(errorContainer);

  
  const iframe = createIframe(UI_CONFIG.iframe[side].id, url);
  iframe.setAttribute('data-tabboost-frame', side);
  setupIframeEvents(iframe, errorContainer, url);
  view.appendChild(iframe);

  return view;
}

/**
 * 创建错误容器
 * @param {string} side - 'left' 或 'right'
 * @param {string} url - 视图URL
 * @returns {HTMLElement} - 错误容器元素
 */
function createErrorContainer(side, url) {
  const container = createElement('div', {
    id: `tabboost-${side}-error`,
    className: 'tabboost-iframe-error',
    styles: {
      display: 'none',
      borderRadius: '8px'
    }
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
  iframe.addEventListener('load', () => {
    if (url !== 'about:blank') {
      errorContainer.style.display = 'none';
      try {
        const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (frameDoc && frameDoc.body) {
          const style = frameDoc.createElement('style');
          style.textContent = 'body { margin: 0; padding: 0; }';
          frameDoc.head.appendChild(style);
        }
      } catch (e) {
        console.warn("TabBoost: Cannot access iframe content due to security restrictions:", e.message);
      }
    }
  });

  iframe.addEventListener('error', () => {
    if (url !== 'about:blank') {
      errorContainer.style.display = 'flex';
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
  const retryButton = container.querySelector('.tabboost-retry-load');
  const openButton = container.querySelector('.tabboost-open-in-tab');
  
  if (retryButton) retryButton.dataset.url = url;
  if (openButton) openButton.dataset.url = url;
}

/**
 * 保存原始页面内容
 */
function saveOriginalContent() {
  try {
    const maxContentLength = 500000;
    let originalContent = document.documentElement.outerHTML || "";
    
    if (originalContent.length > maxContentLength) {
      console.warn(`TabBoost: Original content exceeds ${maxContentLength} characters, saving placeholder.`);
      originalContent = `<html><head><title>${document.title}</title></head><body><div class="tabboost-restored-content">${i18n.getMessage("contentTooLarge") || "Content was too large to save."}</div></body></html>`;
    }
    
    document.body.setAttribute('data-tabboost-original-content', originalContent);
  } catch (e) {
    console.error("TabBoost: Error storing original content", e);
  }
}

/**
 * 隐藏页面现有内容
 */
function hideExistingContent() {
  Array.from(document.body.children).forEach(element => {
    if (element.id !== UI_CONFIG.container.id) {
      element.dataset.originalDisplay = element.style.display;
      element.style.display = 'none';
    }
  });
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
  try {
    document.body.innerHTML = `
      <div class="tabboost-error">
        <p>${message}</p>
        <button onclick="window.location.reload()">${i18n.getMessage("refreshPage") || "Refresh Page"}</button>
      </div>
    `;
  } catch (e) {
    console.error("TabBoost: Error setting error message:", e);
  }
}

/**
 * 移除分屏视图，恢复原始页面
 * @returns {boolean} - 是否成功移除
 */
export function removeSplitViewDOM() {
  try {
    if (!document || !document.body) return false;

    const originalContent = document.body.getAttribute('data-tabboost-original-content');
    if (!originalContent) {
      showError(i18n.getMessage("cannotFindOriginalContent") || "Cannot find original content");
      return false;
    }

    try {
      const parser = new DOMParser();
      const originalDoc = parser.parseFromString(originalContent, 'text/html');
      document.documentElement.innerHTML = originalDoc.documentElement.innerHTML;
    } catch (e) {
      showError(i18n.getMessage("failedToRestoreOriginal") || "Failed to restore original content");
      return false;
    }

    document.body.removeAttribute('data-tabboost-original-content');
    document.body.style.overflow = '';
    return true;
  } catch (error) {
    showError(i18n.getMessage("failedToRestoreOriginal") || "Failed to restore original content");
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
      rightIframe.setAttribute('data-tabboost-frame', 'right');
      
      if (!errorContainer) {
        errorContainer = createErrorContainer('right', url);
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

    
    rightView.style.display = 'block';
    
    
    const viewsContainer = safeQuerySelector(`#${UI_CONFIG.viewsContainer.id}`);
    if (viewsContainer) {
      const isVertical = viewsContainer.getAttribute('data-split-direction') === 'vertical';
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
      window.open(url, '_blank');
    } catch (e) {
      console.error("TabBoost: Failed to open URL in new tab:", e);
    }
    return false;
  }
}
