/**
 * TabBoost Iframe Lazy Loading Utility
 * Uses Intersection Observer API for performance optimization
 */

const lazyIframes = new Map();
let observer = null;

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
            iframe.src = realUrl;
            lazyIframes.delete(iframe);
            observer.unobserve(iframe);

            iframe.dataset.lazyStatus = "loading";

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
      rootMargin: "100px",
      threshold: 0.1,
    }
  );
}

export function setupLazyLoading(iframe, url, options = {}) {
  try {
    if (
      !iframe ||
      !iframe.tagName ||
      iframe.tagName.toLowerCase() !== "iframe"
    ) {
      return false;
    }

    if (!url || typeof url !== "string") {
      return false;
    }

    if (!("IntersectionObserver" in window) || options.immediate) {
      iframe.src = url;
      iframe.dataset.lazyStatus = "immediate";
      return true;
    }

    initIntersectionObserver();

    if (!observer) {
      iframe.src = url;
      iframe.dataset.lazyStatus = "fallback";
      return true;
    }

    iframe.src = "about:blank";
    iframe.dataset.lazyStatus = "pending";

    lazyIframes.set(iframe, url);

    observer.observe(iframe);

    return true;
  } catch (error) {
    iframe.src = url;
    iframe.dataset.lazyStatus = "error-fallback";
    return false;
  }
}

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
    return false;
  }
}

export function cleanupLazyLoading(iframe) {
  try {
    if (lazyIframes.has(iframe)) {
      lazyIframes.delete(iframe);
    }
    if (observer) {
      observer.unobserve(iframe);
    }
  } catch (error) {}
}

export function destroyLazyLoader() {
  try {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    lazyIframes.clear();
  } catch (error) {}
}

export function getLazyStatus(iframe) {
  return iframe.dataset.lazyStatus || "unknown";
}

export function isLazyLoadingSupported() {
  return "IntersectionObserver" in window;
}
