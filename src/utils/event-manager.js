class EventManager {
  constructor() {
    this.controllers = new WeakMap();
    this.listeners = new WeakMap();

    this.metrics = {
      totalListeners: 0,
      activeControllers: 0,
      memoryLeaksPrevented: 0,
      cleanupOperations: 0,
    };

    this.globalControllers = new Set();
  }

  addListener(element, event, handler, options = {}) {
    if (!element || typeof handler !== "function") {
      return null;
    }

    let controller = this.controllers.get(element);
    if (!controller) {
      controller = new AbortController();
      this.controllers.set(element, controller);
      this.globalControllers.add(controller);
      this.metrics.activeControllers++;
    }

    let elementListeners = this.listeners.get(element);
    if (!elementListeners) {
      elementListeners = new Set();
      this.listeners.set(element, elementListeners);
    }

    const listenerInfo = {
      event,
      handler,
      options,
      timestamp: Date.now(),
    };
    elementListeners.add(listenerInfo);

    try {
      element.addEventListener(event, handler, {
        ...options,
        signal: controller.signal,
      });

      this.metrics.totalListeners++;

      return controller;
    } catch (error) {
      elementListeners.delete(listenerInfo);
      return null;
    }
  }

  addMultipleListeners(element, eventConfigs) {
    if (!element || !Array.isArray(eventConfigs)) {
      return null;
    }

    const startTime = performance.now();
    let controller = null;

    eventConfigs.forEach(({ event, handler, options }) => {
      const eventController = this.addListener(
        element,
        event,
        handler,
        options
      );
      if (!controller) controller = eventController;
    });

    const duration = performance.now() - startTime;

    return controller;
  }

  cleanup(element) {
    if (!element) {
      return false;
    }

    const controller = this.controllers.get(element);
    if (controller) {
      try {
        controller.abort();

        this.controllers.delete(element);
        this.listeners.delete(element);
        this.globalControllers.delete(controller);

        this.metrics.cleanupOperations++;
        this.metrics.activeControllers--;
        this.metrics.memoryLeaksPrevented++;

        return true;
      } catch (error) {
        return false;
      }
    }

    return true;
  }

  cleanupMultiple(elements) {
    if (!Array.isArray(elements)) {
      return 0;
    }

    const startTime = performance.now();
    let successCount = 0;

    elements.forEach((element) => {
      if (this.cleanup(element)) {
        successCount++;
      }
    });

    const duration = performance.now() - startTime;

    return successCount;
  }

  emergencyCleanup() {
    const startTime = performance.now();
    let cleanedCount = 0;

    this.globalControllers.forEach((controller) => {
      try {
        controller.abort();
        cleanedCount++;
      } catch (error) {}
    });

    this.globalControllers.clear();
    this.metrics.activeControllers = 0;
    this.metrics.memoryLeaksPrevented += cleanedCount;

    const duration = performance.now() - startTime;

    return cleanedCount;
  }

  getMemoryStats() {
    const estimatedMemoryPerListener = 200;
    const estimatedMemoryUsage =
      this.metrics.totalListeners * estimatedMemoryPerListener;
    const memorySavedByWeakMap =
      this.metrics.memoryLeaksPrevented * estimatedMemoryPerListener * 10;

    return {
      ...this.metrics,
      estimatedMemoryUsage: `${(estimatedMemoryUsage / 1024).toFixed(2)} KB`,
      memorySavedByOptimization: `${(memorySavedByWeakMap / 1024 / 1024).toFixed(2)} MB`,
      memoryEfficiency:
        this.metrics.totalListeners > 0
          ? `${((this.metrics.memoryLeaksPrevented / this.metrics.totalListeners) * 100).toFixed(2)}%`
          : "0%",
      recommendation:
        memorySavedByWeakMap > 50 * 1024 * 1024
          ? "Excellent memory optimization"
          : memorySavedByWeakMap > 10 * 1024 * 1024
            ? "Good memory optimization"
            : "Consider more cleanup operations",
    };
  }

  healthCheck() {
    const stats = this.getMemoryStats();
    const activeRatio =
      this.metrics.activeControllers / (this.metrics.totalListeners || 1);

    return {
      status:
        activeRatio < 0.1
          ? "healthy"
          : activeRatio < 0.3
            ? "warning"
            : "critical",
      activeControllerRatio: `${(activeRatio * 100).toFixed(2)}%`,
      recommendations: [
        activeRatio > 0.3 ? "Recommend cleanup operations" : null,
        this.metrics.totalListeners > 1000
          ? "Too many listeners, consider optimization"
          : null,
        this.metrics.cleanupOperations < this.metrics.totalListeners * 0.8
          ? "Insufficient cleanup operations"
          : null,
      ].filter(Boolean),
      ...stats,
    };
  }
}

let globalEventManager = null;

if (typeof window !== "undefined") {
  globalEventManager = window.tabBoostEventManager =
    window.tabBoostEventManager || new EventManager();
} else {
  globalEventManager = new EventManager();
}

export default globalEventManager;
