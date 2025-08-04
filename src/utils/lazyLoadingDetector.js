/**
 * TabBoost iframe lazy loading detection and smart configuration
 */

class LazyLoadingDetector {
  constructor() {
    this.capabilities = {};
    this.networkInfo = {};
    this.deviceInfo = {};

    this._precomputedConfig = null;
    this._configCacheExpiry = 0;
    this._configCacheDuration = 60000;

    this.init();
  }

  init() {
    this.detectLazyLoadingSupport();
    this.detectNetworkConditions();
    this.detectDeviceCapabilities();

    this._precomputeOptimalConfigs();
  }

  detectLazyLoadingSupport() {
    this.capabilities.lazyLoading = "loading" in HTMLIFrameElement.prototype;

    this.capabilities.resourceHints =
      "importance" in HTMLIFrameElement.prototype;

    this.capabilities.intersectionObserver = "IntersectionObserver" in window;

    if (navigator.userAgent.includes("Chrome/")) {
      const chromeVersion = parseInt(
        navigator.userAgent.match(/Chrome\/(\d+)/)[1]
      );
      this.capabilities.chromeVersion = chromeVersion;
      this.capabilities.stableLazyLoading = chromeVersion >= 76;
    }
  }

  detectNetworkConditions() {
    if ("connection" in navigator) {
      const connection = navigator.connection;
      this.networkInfo = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
  }

  detectDeviceCapabilities() {
    if ("memory" in performance) {
      this.deviceInfo.memory = performance.memory;
    }

    this.deviceInfo.hardwareConcurrency = navigator.hardwareConcurrency || 2;

    this.deviceInfo.devicePixelRatio = window.devicePixelRatio || 1;
  }

  _precomputeOptimalConfigs() {
    const now = Date.now();
    if (this._precomputedConfig && now < this._configCacheExpiry) {
      return;
    }

    const isLowPerf = this.isLowPerformanceDevice();
    const hasPrioritySupport = this.capabilities.resourceHints;
    const hasNativeLazy = this.capabilities.lazyLoading;

    this._precomputedConfig = {
      popup: {
        loading: hasNativeLazy ? "lazy" : null,
        importance: hasPrioritySupport ? (isLowPerf ? "low" : "auto") : null,
        useNative: hasNativeLazy,
        needsFallback: !hasNativeLazy,
      },
      "splitview-left": {
        loading: hasNativeLazy ? "lazy" : null,
        importance: hasPrioritySupport ? (isLowPerf ? "low" : "auto") : null,
        useNative: hasNativeLazy,
        needsFallback: !hasNativeLazy,
      },
      "splitview-right": {
        loading: hasNativeLazy ? "lazy" : null,
        importance: hasPrioritySupport ? "low" : null,
        useNative: hasNativeLazy,
        needsFallback: !hasNativeLazy,
      },
    };

    this._configCacheExpiry = now + this._configCacheDuration;
  }

  applySmartLazyLoading(iframe, context = "popup") {
    this._precomputeOptimalConfigs();

    const config = this._precomputedConfig[context];
    if (!config) {
      if (this.capabilities.lazyLoading) {
        iframe.loading = "lazy";
        return true;
      }
      return false;
    }

    if (config.useNative) {
      iframe.loading = config.loading;
      if (config.importance) {
        iframe.importance = config.importance;
      }
      return true;
    } else if (config.needsFallback) {
      return this.applyIntersectionObserverFallback(iframe, {
        importance: config.importance || "auto",
      });
    }

    return false;
  }

  getLazyLoadingConfig(context) {
    const baseConfig = {
      enableLazyLoading: true,
      loadingStrategy: "lazy",
      importance: "auto",
    };

    switch (context) {
      case "popup":
        return {
          ...baseConfig,
          importance: this.isSlowNetwork() ? "low" : "auto",
          loadingStrategy: this.isSlowNetwork() ? "lazy" : "lazy",
        };

      case "splitview-left":
        return {
          ...baseConfig,
          importance: "auto",
          loadingStrategy: "lazy",
        };

      case "splitview-right":
        return {
          ...baseConfig,
          importance: "low",
          loadingStrategy: "lazy",
        };

      default:
        return baseConfig;
    }
  }

  isSlowNetwork() {
    if (!this.networkInfo.effectiveType) return false;

    return (
      ["slow-2g", "2g"].includes(this.networkInfo.effectiveType) ||
      (this.networkInfo.downlink && this.networkInfo.downlink < 1.5) ||
      this.networkInfo.saveData
    );
  }

  isLowPerformanceDevice() {
    if (
      this.deviceInfo.memory &&
      this.deviceInfo.memory.jsHeapSizeLimit < 2 * 1024 * 1024 * 1024
    ) {
      return true;
    }

    if (this.deviceInfo.hardwareConcurrency < 4) {
      return true;
    }

    return false;
  }

  applyIntersectionObserverFallback(iframe, config) {
    if (!this.capabilities.intersectionObserver) {
      return false;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !iframe.src) {
            const originalSrc = iframe.dataset.src;
            if (originalSrc) {
              iframe.src = originalSrc;
              observer.unobserve(iframe);
            }
          }
        });
      },
      {
        rootMargin: config.importance === "low" ? "100px" : "200px",
      }
    );

    observer.observe(iframe);
    return true;
  }

  getPerformanceStats() {
    return {
      capabilities: this.capabilities,
      networkInfo: this.networkInfo,
      deviceInfo: this.deviceInfo,
      recommendations: {
        shouldUseLazyLoading: this.capabilities.lazyLoading,
        shouldUseResourceHints: this.capabilities.resourceHints,
        suggestedStrategy: this.isLowPerformanceDevice()
          ? "aggressive"
          : "balanced",
      },
    };
  }
}

window.tabBoostLazyLoadingDetector = new LazyLoadingDetector();

export default LazyLoadingDetector;
