/**
 * TabBoost iframe 懒加载性能验证工具
 * 世界级性能优化验证和监控
 */

class PerformanceValidator {
  constructor() {
    this.metrics = {
      beforeOptimization: {},
      afterOptimization: {},
      improvements: {},
    };
    this.startTime = performance.now();
  }

  /**
   * 开始性能监控
   */
  startMonitoring(context = "popup") {
    const startTime = performance.now();

    return {
      context,
      startTime,

      // 测量iframe创建时间
      measureIframeCreation: () => {
        const creationTime = performance.now() - startTime;
        console.log(
          `📊 ${context} iframe creation: ${creationTime.toFixed(2)}ms`
        );
        return creationTime;
      },

      // 测量首次绘制时间
      measureFirstPaint: () => {
        if ("getEntriesByType" in performance) {
          const paintEntries = performance.getEntriesByType("paint");
          const firstPaint = paintEntries.find(
            (entry) => entry.name === "first-paint"
          );
          if (firstPaint) {
            console.log(`🎨 First paint: ${firstPaint.startTime.toFixed(2)}ms`);
            return firstPaint.startTime;
          }
        }
        return null;
      },

      // 测量DOM内容加载完成时间
      measureDOMContentLoaded: () => {
        const loadTime = performance.now() - startTime;
        console.log(`📄 ${context} DOM ready: ${loadTime.toFixed(2)}ms`);
        return loadTime;
      },

      // 结束监控并返回汇总
      finish: () => {
        const totalTime = performance.now() - startTime;
        console.log(
          `✅ ${context} total optimization time: ${totalTime.toFixed(2)}ms`
        );
        return {
          context,
          totalTime,
          startTime,
          endTime: performance.now(),
        };
      },
    };
  }

  /**
   * 验证懒加载优化效果
   */
  validateLazyLoadingOptimization() {
    const results = {
      lazyLoadingEnabled: false,
      resourceHintsApplied: false,
      networkAdaptation: false,
      deviceOptimization: false,
      estimatedSavings: {
        loadTime: "0ms",
        bandwidth: "0KB",
        memoryUsage: "0MB",
      },
    };

    // 检查懒加载检测器
    if (window.tabBoostLazyLoadingDetector) {
      const detector = window.tabBoostLazyLoadingDetector;
      const stats = detector.getPerformanceStats();

      results.lazyLoadingEnabled = stats.capabilities.lazyLoading;
      results.resourceHintsApplied = stats.capabilities.resourceHints;
      results.networkAdaptation = stats.networkInfo.effectiveType !== undefined;
      results.deviceOptimization =
        stats.recommendations.suggestedStrategy !== undefined;

      // 估算性能提升
      this.calculateEstimatedSavings(stats, results);

      console.log("🚀 Lazy Loading Optimization Results:", results);
    }

    return results;
  }

  /**
   * 计算预估性能提升
   */
  calculateEstimatedSavings(stats, results) {
    let loadTimeSaving = 0;
    let bandwidthSaving = 0;
    let memorySaving = 0;

    // 基于网络状况计算节省
    if (stats.networkInfo.effectiveType) {
      switch (stats.networkInfo.effectiveType) {
        case "slow-2g":
          loadTimeSaving = 2000; // 2秒
          bandwidthSaving = 50; // 50KB
          break;
        case "2g":
          loadTimeSaving = 1500;
          bandwidthSaving = 30;
          break;
        case "3g":
          loadTimeSaving = 800;
          bandwidthSaving = 20;
          break;
        case "4g":
          loadTimeSaving = 400;
          bandwidthSaving = 10;
          break;
      }
    }

    // 基于设备性能调整
    if (stats.deviceInfo.hardwareConcurrency < 4) {
      memorySaving = 15; // 15MB
      loadTimeSaving *= 1.5;
    }

    results.estimatedSavings = {
      loadTime: `${loadTimeSaving}ms`,
      bandwidth: `${bandwidthSaving}KB`,
      memoryUsage: `${memorySaving}MB`,
    };
  }

  /**
   * 实时监控iframe加载性能
   */
  monitorIframePerformance(iframe, context) {
    const monitor = this.startMonitoring(context);

    // 监听iframe加载事件
    const loadStart = performance.now();

    iframe.addEventListener("load", () => {
      const loadTime = performance.now() - loadStart;
      console.log(`⚡ ${context} iframe loaded in: ${loadTime.toFixed(2)}ms`);

      // 检查懒加载属性
      if (iframe.loading === "lazy") {
        console.log(`✅ ${context} using native lazy loading`);
      }

      if (iframe.importance) {
        console.log(`🎯 ${context} resource importance: ${iframe.importance}`);
      }
    });

    iframe.addEventListener("error", (error) => {
      console.error(`❌ ${context} iframe failed to load:`, error);
    });

    return monitor;
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      optimizations: this.validateLazyLoadingOptimization(),
      browserInfo: {
        userAgent: navigator.userAgent,
        connection: navigator.connection
          ? {
              effectiveType: navigator.connection.effectiveType,
              downlink: navigator.connection.downlink,
              rtt: navigator.connection.rtt,
            }
          : null,
        memory: performance.memory
          ? {
              usedJSHeapSize: Math.round(
                performance.memory.usedJSHeapSize / 1024 / 1024
              ),
              totalJSHeapSize: Math.round(
                performance.memory.totalJSHeapSize / 1024 / 1024
              ),
              jsHeapSizeLimit: Math.round(
                performance.memory.jsHeapSizeLimit / 1024 / 1024
              ),
            }
          : null,
      },
      recommendations: this.getOptimizationRecommendations(),
    };

    console.log("📊 TabBoost Performance Report:", report);
    return report;
  }

  /**
   * 获取优化建议
   */
  getOptimizationRecommendations() {
    const recommendations = [];

    if (window.tabBoostLazyLoadingDetector) {
      const stats = window.tabBoostLazyLoadingDetector.getPerformanceStats();

      if (!stats.capabilities.lazyLoading) {
        recommendations.push("建议升级到支持原生懒加载的浏览器版本");
      }

      if (
        stats.networkInfo.effectiveType === "slow-2g" ||
        stats.networkInfo.effectiveType === "2g"
      ) {
        recommendations.push("检测到慢网络，已启用激进懒加载策略");
      }

      if (stats.deviceInfo.hardwareConcurrency < 4) {
        recommendations.push("检测到低性能设备，已优化资源使用");
      }
    }

    return recommendations;
  }
}

// 创建全局性能验证器
window.tabBoostPerformanceValidator = new PerformanceValidator();

export default PerformanceValidator;
