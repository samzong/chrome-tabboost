/**
 * TabBoost iframe lazy loading performance validator
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

  startMonitoring(context = "popup") {
    const startTime = performance.now();

    return {
      context,
      startTime,

      measureIframeCreation: () => {
        const creationTime = performance.now() - startTime;
        return creationTime;
      },

      measureFirstPaint: () => {
        if ("getEntriesByType" in performance) {
          const paintEntries = performance.getEntriesByType("paint");
          const firstPaint = paintEntries.find(
            (entry) => entry.name === "first-paint"
          );
          if (firstPaint) {
            return firstPaint.startTime;
          }
        }
        return null;
      },

      measureDOMContentLoaded: () => {
        const loadTime = performance.now() - startTime;
        return loadTime;
      },

      finish: () => {
        const totalTime = performance.now() - startTime;
        return {
          context,
          totalTime,
          startTime,
          endTime: performance.now(),
        };
      },
    };
  }

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

    if (window.tabBoostLazyLoadingDetector) {
      const detector = window.tabBoostLazyLoadingDetector;
      const stats = detector.getPerformanceStats();

      results.lazyLoadingEnabled = stats.capabilities.lazyLoading;
      results.resourceHintsApplied = stats.capabilities.resourceHints;
      results.networkAdaptation = stats.networkInfo.effectiveType !== undefined;
      results.deviceOptimization =
        stats.recommendations.suggestedStrategy !== undefined;

      this.calculateEstimatedSavings(stats, results);

    }

    return results;
  }

  calculateEstimatedSavings(stats, results) {
    let loadTimeSaving = 0;
    let bandwidthSaving = 0;
    let memorySaving = 0;

    if (stats.networkInfo.effectiveType) {
      switch (stats.networkInfo.effectiveType) {
        case "slow-2g":
          loadTimeSaving = 2000;
          bandwidthSaving = 50;
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

    if (stats.deviceInfo.hardwareConcurrency < 4) {
      memorySaving = 15;
      loadTimeSaving *= 1.5;
    }

    results.estimatedSavings = {
      loadTime: `${loadTimeSaving}ms`,
      bandwidth: `${bandwidthSaving}KB`,
      memoryUsage: `${memorySaving}MB`,
    };
  }

  monitorIframePerformance(iframe, context) {
    const monitor = this.startMonitoring(context);

    const loadStart = performance.now();

    iframe.addEventListener("load", () => {
      const loadTime = performance.now() - loadStart;

      if (iframe.loading === "lazy") {
      }

      if (iframe.importance) {
      }
    });

    iframe.addEventListener("error", (error) => {
      
    });

    return monitor;
  }

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

    return report;
  }

  getOptimizationRecommendations() {
    const recommendations = [];

    if (window.tabBoostLazyLoadingDetector) {
      const stats = window.tabBoostLazyLoadingDetector.getPerformanceStats();

      if (!stats.capabilities.lazyLoading) {
        recommendations.push(
          "Recommend upgrading to a browser version that supports native lazy loading"
        );
      }

      if (
        stats.networkInfo.effectiveType === "slow-2g" ||
        stats.networkInfo.effectiveType === "2g"
      ) {
        recommendations.push(
          "Slow network detected, aggressive lazy loading strategy enabled"
        );
      }

      if (stats.deviceInfo.hardwareConcurrency < 4) {
        recommendations.push(
          "Low performance device detected, resource usage optimized"
        );
      }
    }

    return recommendations;
  }
}

window.tabBoostPerformanceValidator = new PerformanceValidator();

export default PerformanceValidator;
