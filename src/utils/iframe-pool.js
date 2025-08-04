class IframePool {
  constructor() {
    this.pool = new Map();
    this.templateCache = new Map();
    this.activeIframes = new Set();

    this.metrics = {
      poolHits: 0,
      poolMisses: 0,
      creationTime: 0,
      reuseTime: 0,
    };

    this._initializeTemplates();
  }

  _initializeTemplates() {
    if (typeof document === "undefined") {
      return;
    }

    const leftTemplate = document.createElement("template");
    leftTemplate.innerHTML = `
      <iframe 
        class="tabboost-iframe-optimized tabboost-left-iframe"
        data-iframe-type="splitview-left"
        loading="lazy"
        importance="auto"
        allowfullscreen="true"
        style="width: 100%; height: 100%; border: none; display: block;">
      </iframe>
    `;
    this.templateCache.set("splitview-left", leftTemplate);

    const rightTemplate = document.createElement("template");
    rightTemplate.innerHTML = `
      <iframe 
        class="tabboost-iframe-optimized tabboost-right-iframe"
        data-iframe-type="splitview-right"
        loading="lazy"
        importance="low"
        allowfullscreen="true"
        style="width: 100%; height: 100%; border: none; display: block;">
      </iframe>
    `;
    this.templateCache.set("splitview-right", rightTemplate);

    const popupTemplate = document.createElement("template");
    popupTemplate.innerHTML = `
      <iframe 
        class="tabboost-iframe-optimized tabboost-popup-iframe"
        data-iframe-type="popup"
        loading="lazy"
        importance="auto"
        allowfullscreen="true"
        style="width: 100%; height: 100%; border: none; display: block;">
      </iframe>
    `;
    this.templateCache.set("popup", popupTemplate);
  }

  getIframe(type, id, url = "about:blank") {
    if (typeof document === "undefined") {
      return null;
    }

    const startTime = performance.now();

    const poolKey = `${type}-${id}`;
    if (this.pool.has(poolKey)) {
      const iframe = this.pool.get(poolKey);
      this.pool.delete(poolKey);
      this.activeIframes.add(iframe);

      iframe.src = url;
      iframe.id = id;

      this.metrics.poolHits++;
      this.metrics.reuseTime = performance.now() - startTime;

      return iframe;
    }

    const template = this.templateCache.get(type);
    if (!template) {
      return this._createFallbackIframe(id, url);
    }

    const iframe = template.content.cloneNode(true).firstElementChild;
    iframe.id = id;
    iframe.src = url;

    this.activeIframes.add(iframe);

    this.metrics.poolMisses++;
    this.metrics.creationTime = performance.now() - startTime;

    return iframe;
  }

  releaseIframe(iframe) {
    if (!iframe || !this.activeIframes.has(iframe)) {
      return;
    }

    iframe.src = "about:blank";
    iframe.removeAttribute("id");

    const newIframe = iframe.cloneNode(false);
    if (iframe.parentNode) {
      iframe.parentNode.replaceChild(newIframe, iframe);
    }

    const type = newIframe.dataset.iframeType;
    if (type) {
      const poolKey = `${type}-reuse-${Date.now()}`;
      this.pool.set(poolKey, newIframe);
    }

    this.activeIframes.delete(iframe);
  }

  createSplitViewPair(leftId, rightId, leftUrl, rightUrl = "about:blank") {
    const startTime = performance.now();



    const leftIframe = this.getIframe("splitview-left", leftId, leftUrl);
    const rightIframe = this.getIframe("splitview-right", rightId, rightUrl);

    if (window.tabBoostLazyLoadingDetector) {
      window.tabBoostLazyLoadingDetector.applySmartLazyLoading(
        leftIframe,
        "splitview-left"
      );
      window.tabBoostLazyLoadingDetector.applySmartLazyLoading(
        rightIframe,
        "splitview-right"
      );
    }


    return { leftIframe, rightIframe };
  }

  _createFallbackIframe(id, url) {
    if (typeof document === "undefined") {
      return null;
    }

    const iframe = document.createElement("iframe");
    iframe.id = id;
    iframe.src = url;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";
    iframe.setAttribute("allowfullscreen", "true");

    if ("loading" in HTMLIFrameElement.prototype) {
      iframe.loading = "lazy";
    }

    return iframe;
  }

  clearPool() {
    this.pool.clear();
    this.activeIframes.clear();
  }

  getPerformanceMetrics() {
    const totalRequests = this.metrics.poolHits + this.metrics.poolMisses;
    const hitRate =
      totalRequests > 0
        ? ((this.metrics.poolHits / totalRequests) * 100).toFixed(2)
        : 0;

    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      totalRequests,
      avgCreationTime: `${this.metrics.creationTime.toFixed(2)}ms`,
      avgReuseTime: `${this.metrics.reuseTime.toFixed(2)}ms`,
      poolSize: this.pool.size,
      activeCount: this.activeIframes.size,
    };
  }
}

let globalIframePool = null;

if (typeof window !== "undefined") {
  globalIframePool = window.tabBoostIframePool =
    window.tabBoostIframePool || new IframePool();
} else {
  globalIframePool = new IframePool();
}

export default globalIframePool;
