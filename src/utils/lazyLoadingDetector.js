/**
 * TabBoost iframe 懒加载特性检测和智能配置
 * 世界级 Chrome 插件性能优化专家实现
 *
 * 功能：
 * 1. 检测浏览器懒加载支持
 * 2. 网络状况自适应
 * 3. 设备性能评估
 * 4. 智能降级策略
 */

class LazyLoadingDetector {
  constructor() {
    this.capabilities = {};
    this.networkInfo = {};
    this.deviceInfo = {};
    this.init();
  }

  init() {
    this.detectLazyLoadingSupport();
    this.detectNetworkConditions();
    this.detectDeviceCapabilities();
  }

  /**
   * 检测浏览器懒加载支持能力
   */
  detectLazyLoadingSupport() {
    // 基础懒加载支持检测
    this.capabilities.lazyLoading = "loading" in HTMLIFrameElement.prototype;

    // Resource Hints 支持检测
    this.capabilities.resourceHints =
      "importance" in HTMLIFrameElement.prototype;

    // Intersection Observer 支持 (懒加载降级方案)
    this.capabilities.intersectionObserver = "IntersectionObserver" in window;

    // 检测 Chrome 版本 (不同版本懒加载行为有差异)
    if (navigator.userAgent.includes("Chrome/")) {
      const chromeVersion = parseInt(
        navigator.userAgent.match(/Chrome\/(\d+)/)[1]
      );
      this.capabilities.chromeVersion = chromeVersion;
      // Chrome 76+ 原生懒加载更稳定
      this.capabilities.stableLazyLoading = chromeVersion >= 76;
    }
  }

  /**
   * 检测网络状况，调整懒加载策略
   */
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

  /**
   * 检测设备性能能力
   */
  detectDeviceCapabilities() {
    // 内存信息 (Chrome 专有)
    if ("memory" in performance) {
      this.deviceInfo.memory = performance.memory;
    }

    // CPU 核心数
    this.deviceInfo.hardwareConcurrency = navigator.hardwareConcurrency || 2;

    // 设备像素比
    this.deviceInfo.devicePixelRatio = window.devicePixelRatio || 1;
  }

  /**
   * 为 iframe 应用智能懒加载配置
   * @param {HTMLIFrameElement} iframe
   * @param {string} context - 'popup' | 'splitview-left' | 'splitview-right'
   */
  applySmartLazyLoading(iframe, context = "popup") {
    const config = this.getLazyLoadingConfig(context);

    if (this.capabilities.lazyLoading && config.enableLazyLoading) {
      iframe.loading = config.loadingStrategy;

      // 应用资源优先级
      if (this.capabilities.resourceHints && config.importance) {
        iframe.importance = config.importance;
      }

      // 低性能设备特殊处理
      if (this.isLowPerformanceDevice()) {
        iframe.loading = "lazy";
        if (this.capabilities.resourceHints) {
          iframe.importance = "low";
        }
      }

      return true;
    } else {
      // 降级到 Intersection Observer
      return this.applyIntersectionObserverFallback(iframe, config);
    }
  }

  /**
   * 获取基于上下文的懒加载配置
   * @param {string} context
   */
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
          // Popup 优先级中等，用户主动触发
          importance: this.isSlowNetwork() ? "low" : "auto",
          loadingStrategy: this.isSlowNetwork() ? "lazy" : "lazy",
        };

      case "splitview-left":
        return {
          ...baseConfig,
          // 左侧优先加载，用户通常先关注
          importance: "auto",
          loadingStrategy: "lazy",
        };

      case "splitview-right":
        return {
          ...baseConfig,
          // 右侧延迟加载，等待用户交互
          importance: "low",
          loadingStrategy: "lazy",
        };

      default:
        return baseConfig;
    }
  }

  /**
   * 检测是否为慢网络环境
   */
  isSlowNetwork() {
    if (!this.networkInfo.effectiveType) return false;

    return (
      ["slow-2g", "2g"].includes(this.networkInfo.effectiveType) ||
      (this.networkInfo.downlink && this.networkInfo.downlink < 1.5) ||
      this.networkInfo.saveData
    );
  }

  /**
   * 检测是否为低性能设备
   */
  isLowPerformanceDevice() {
    // 内存小于 2GB
    if (
      this.deviceInfo.memory &&
      this.deviceInfo.memory.jsHeapSizeLimit < 2 * 1024 * 1024 * 1024
    ) {
      return true;
    }

    // CPU 核心数少于 4
    if (this.deviceInfo.hardwareConcurrency < 4) {
      return true;
    }

    return false;
  }

  /**
   * Intersection Observer 降级方案
   * @param {HTMLIFrameElement} iframe
   * @param {Object} config
   */
  applyIntersectionObserverFallback(iframe, config) {
    if (!this.capabilities.intersectionObserver) {
      // 完全不支持，直接加载
      return false;
    }

    // 使用 Intersection Observer 实现懒加载
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !iframe.src) {
            // 触发加载
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

  /**
   * 获取性能统计信息
   */
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

// 创建全局实例
window.tabBoostLazyLoadingDetector = new LazyLoadingDetector();

export default LazyLoadingDetector;
