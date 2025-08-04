/**
 * TabBoost Iframe Lazy Loading Utility
 * Uses Intersection Observer API for performance optimization
 */

// 存储待加载的iframe和它们的真实URL
const lazyIframes = new Map();
let observer = null;

/**
 * 初始化Intersection Observer
 */
function initIntersectionObserver() {
  if (observer || !("IntersectionObserver" in window)) {
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const iframe = entry.target;
          const realUrl = lazyIframes.get(iframe);

          if (realUrl && realUrl !== "about:blank") {
            // 开始加载真实URL
            iframe.src = realUrl;
            lazyIframes.delete(iframe);
            observer.unobserve(iframe);

            // 添加加载状态指示
            iframe.dataset.lazyStatus = "loading";

            // 监听加载完成
            iframe.addEventListener(
              "load",
              () => {
                iframe.dataset.lazyStatus = "loaded";
              },
              { once: true }
            );

            iframe.addEventListener(
              "error",
              () => {
                iframe.dataset.lazyStatus = "error";
              },
              { once: true }
            );
          }
        }
      });
    },
    {
      // 当iframe进入视口前100px时开始加载
      rootMargin: "100px",
      threshold: 0.1,
    }
  );
}

/**
 * 设置iframe懒加载
 * @param {HTMLIFrameElement} iframe - 要设置懒加载的iframe元素
 * @param {string} url - 真实的URL
 * @param {Object} options - 可选配置
 * @param {boolean} options.immediate - 是否立即加载，忽略懒加载
 * @returns {boolean} - 是否成功设置懒加载
 */
export function setupLazyLoading(iframe, url, options = {}) {
  try {
    // 验证参数
    if (
      !iframe ||
      !iframe.tagName ||
      iframe.tagName.toLowerCase() !== "iframe"
    ) {
      console.error(
        "TabBoost: Invalid iframe element provided to setupLazyLoading"
      );
      return false;
    }

    if (!url || typeof url !== "string") {
      console.error("TabBoost: Invalid URL provided to setupLazyLoading");
      return false;
    }

    // 如果不支持IntersectionObserver或要求立即加载，直接设置src
    if (!("IntersectionObserver" in window) || options.immediate) {
      iframe.src = url;
      iframe.dataset.lazyStatus = "immediate";
      return true;
    }

    // 初始化observer
    initIntersectionObserver();

    if (!observer) {
      // Fallback: 直接加载
      iframe.src = url;
      iframe.dataset.lazyStatus = "fallback";
      return true;
    }

    // 设置占位符
    iframe.src = "about:blank";
    iframe.dataset.lazyStatus = "pending";

    // 存储真实URL
    lazyIframes.set(iframe, url);

    // 开始观察
    observer.observe(iframe);

    return true;
  } catch (error) {
    console.error("TabBoost: Error setting up lazy loading:", error);
    // Fallback: 直接加载
    iframe.src = url;
    iframe.dataset.lazyStatus = "error-fallback";
    return false;
  }
}

/**
 * 立即加载指定的iframe，忽略懒加载
 * @param {HTMLIFrameElement} iframe - 要立即加载的iframe
 * @returns {boolean} - 是否成功触发加载
 */
export function loadImmediately(iframe) {
  try {
    const realUrl = lazyIframes.get(iframe);
    if (realUrl && observer) {
      observer.unobserve(iframe);
      iframe.src = realUrl;
      lazyIframes.delete(iframe);
      iframe.dataset.lazyStatus = "forced";
      return true;
    }
    return false;
  } catch (error) {
    console.error("TabBoost: Error forcing immediate load:", error);
    return false;
  }
}

/**
 * 清理指定iframe的懒加载设置
 * @param {HTMLIFrameElement} iframe - 要清理的iframe
 */
export function cleanupLazyLoading(iframe) {
  try {
    if (lazyIframes.has(iframe)) {
      lazyIframes.delete(iframe);
    }
    if (observer) {
      observer.unobserve(iframe);
    }
  } catch (error) {
    console.error("TabBoost: Error cleaning up lazy loading:", error);
  }
}

/**
 * 销毁懒加载系统，清理所有观察者
 */
export function destroyLazyLoader() {
  try {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    lazyIframes.clear();
  } catch (error) {
    console.error("TabBoost: Error destroying lazy loader:", error);
  }
}

/**
 * 获取懒加载状态
 * @param {HTMLIFrameElement} iframe - iframe元素
 * @returns {string} - 状态：'pending', 'loading', 'loaded', 'error', 'immediate', 'fallback', 'forced'
 */
export function getLazyStatus(iframe) {
  return iframe.dataset.lazyStatus || "unknown";
}

/**
 * 检查是否支持懒加载
 * @returns {boolean} - 是否支持
 */
export function isLazyLoadingSupported() {
  return "IntersectionObserver" in window;
}
