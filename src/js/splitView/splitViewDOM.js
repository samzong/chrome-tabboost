import { UI_CONFIG, ANIMATION_CONFIG } from './splitViewConfig';
import {
  createElement,
  createIframe,
  createCloseButton,
  createDivider,
  cleanupElement
} from './splitViewDOMUtils';
import * as i18n from "../../utils/i18n.js";

export function initSplitViewDOM(leftUrl) {
  console.log("TabBoost: initSplitViewDOM called with URL:", leftUrl);

  try {
    if (!document || !document.body) {
      console.error("TabBoost: document or document.body is not available");
      return;
    }

    // 清理现有的分屏视图
    cleanupElement('#tabboost-split-view-container');

    // 保存原始内容
    saveOriginalContent();

    // 创建主容器
    const splitViewContainer = createElement('div', UI_CONFIG.container);
    splitViewContainer.classList.add(ANIMATION_CONFIG.initialClass);

    // 创建视图容器
    const viewsContainer = createElement('div', UI_CONFIG.viewsContainer);

    // 创建左侧视图
    const leftView = createView('left', leftUrl);
    const rightView = createView('right');

    // 组装DOM
    viewsContainer.appendChild(leftView);
    viewsContainer.appendChild(rightView);
    splitViewContainer.appendChild(viewsContainer);

    // 隐藏现有内容并添加分屏视图
    hideExistingContent();
    document.body.style.overflow = 'hidden';
    document.body.appendChild(splitViewContainer);

    // 动画显示
    requestAnimationFrame(() => {
      splitViewContainer.classList.remove(ANIMATION_CONFIG.initialClass);
      splitViewContainer.classList.add(ANIMATION_CONFIG.visibleClass);
    });

  } catch (error) {
    console.error("TabBoost: Error in initSplitViewDOM:", error);
    showError(i18n.getMessage("failedToInitSplitView"));
  }
}

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
  
  // 添加关闭按钮
  const closeButton = createCloseButton('close-split-view');
  closeButton.title = i18n.getMessage("closeSplitView") || "关闭分屏视图";
  view.appendChild(closeButton);

  // 添加错误容器
  const errorContainer = createErrorContainer(side, url);
  view.appendChild(errorContainer);

  // 添加iframe
  const iframe = createIframe(UI_CONFIG.iframe[side].id, url);
  setupIframeEvents(iframe, errorContainer, url);
  view.appendChild(iframe);

  return view;
}

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
      <h3>Loading Issues</h3>
      <p>We're trying to bypass frame restrictions.</p>
      <button class="tabboost-retry-load" data-url="${url}">Retry Loading</button>
      <button class="tabboost-open-in-tab" data-url="${url}">Open in New Tab</button>
    </div>
  `;

  return container;
}

function setupIframeEvents(iframe, errorContainer, url) {
  iframe.addEventListener('load', () => {
    console.log(`TabBoost: ${iframe.id} loaded successfully:`, url);
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
    console.error(`TabBoost: ${iframe.id} failed to load:`, url);
    if (url !== 'about:blank') {
      errorContainer.style.display = 'flex';
      updateErrorButtons(errorContainer, url);
    }
  });
}

function updateErrorButtons(container, url) {
  const retryButton = container.querySelector('.tabboost-retry-load');
  const openButton = container.querySelector('.tabboost-open-in-tab');
  
  if (retryButton) retryButton.dataset.url = url;
  if (openButton) openButton.dataset.url = url;
}

function saveOriginalContent() {
  try {
    const maxContentLength = 500000;
    let originalContent = document.documentElement.outerHTML || "";
    
    if (originalContent.length > maxContentLength) {
      console.warn(`TabBoost: Original content exceeds ${maxContentLength} characters, saving placeholder.`);
      originalContent = `<html><head><title>${document.title}</title></head><body><div class="tabboost-restored-content">${i18n.getMessage("contentTooLarge")}</div></body></html>`;
    }
    
    document.body.setAttribute('data-tabboost-original-content', originalContent);
  } catch (e) {
    console.error("TabBoost: Error storing original content", e);
  }
}

function hideExistingContent() {
  Array.from(document.body.children).forEach(element => {
    element.dataset.originalDisplay = element.style.display;
    element.style.display = 'none';
  });
}

function showError(message) {
  try {
    document.body.innerHTML = `
      <div class="tabboost-error">
        <p>${message}</p>
        <button onclick="window.location.reload()">${i18n.getMessage("refreshPage")}</button>
      </div>
    `;
  } catch (e) {
    console.error("TabBoost: Error setting error message:", e);
  }
}

export function removeSplitViewDOM() {
  try {
    if (!document || !document.body) return;

    const originalContent = document.body.getAttribute('data-tabboost-original-content');
    if (!originalContent) {
      showError(i18n.getMessage("cannotFindOriginalContent"));
      return;
    }

    try {
      const parser = new DOMParser();
      const originalDoc = parser.parseFromString(originalContent, 'text/html');
      document.documentElement.innerHTML = originalDoc.documentElement.innerHTML;
    } catch (e) {
      showError(i18n.getMessage("failedToRestoreOriginal"));
    }

    document.body.removeAttribute('data-tabboost-original-content');
    document.body.style.overflow = '';
  } catch (error) {
    showError(i18n.getMessage("failedToRestoreOriginal"));
  }
}

export function updateRightViewDOM(url) {
  console.log("TabBoost: updateRightViewDOM called with URL:", url);

  try {
    const rightView = document.getElementById(UI_CONFIG.view.right.id);
    if (!rightView) {
      console.error("TabBoost: Right view not found");
      return false;
    }

    let rightIframe = document.getElementById(UI_CONFIG.iframe.right.id);
    if (!rightIframe) {
      rightIframe = createIframe(UI_CONFIG.iframe.right.id, url);
      const errorContainer = createErrorContainer('right', url);
      setupIframeEvents(rightIframe, errorContainer, url);
      rightView.appendChild(rightIframe);
    } else {
      rightIframe.src = url;
    }

    rightView.style.display = 'block';
    rightView.style.width = '50%';

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
