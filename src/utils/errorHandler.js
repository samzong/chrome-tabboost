/**
 * Centralized error handling system for TabBoost Chrome Extension
 * Provides enterprise-grade error logging, recovery, and user feedback
 */

class ErrorHandler {
  static errorLog = [];
  static MAX_ERROR_LOG_SIZE = 100;
  static ERROR_BATCH_INTERVAL = 30000; // 30 seconds
  static batchTimer = null;

  /**
   * Generate a unique user ID for error tracking
   * @returns {string} User ID
   */
  static generateUserId() {
    let userId = localStorage.getItem("tabboost_user_id");
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("tabboost_user_id", userId);
    }
    return userId;
  }

  /**
   * Log an error with context
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred (e.g., 'splitView.creation')
   * @param {string} severity - Error severity: 'info', 'warning', 'error', 'critical'
   */
  static logError(error, context, severity = "error") {
    const errorData = {
      message: error.message || "Unknown error",
      stack: error.stack || "",
      timestamp: Date.now(),
      context,
      severity,
      userId: this.generateUserId(),
      version: chrome.runtime.getManifest().version,
      userAgent: navigator.userAgent,
      url: window.location ? window.location.href : "background",
    };

    // Add to local error log
    this.errorLog.push(errorData);

    // Trim log if too large
    if (this.errorLog.length > this.MAX_ERROR_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_ERROR_LOG_SIZE);
    }

    // Store in chrome.storage.local for persistence
    chrome.storage.local.get(["errorLog"], (result) => {
      const storedLog = result.errorLog || [];
      storedLog.push(errorData);

      // Keep only recent errors
      const recentErrors = storedLog.slice(-this.MAX_ERROR_LOG_SIZE);
      chrome.storage.local.set({ errorLog: recentErrors });
    });

    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.error(`[${severity.toUpperCase()}] ${context}:`, error);
    }

    // Send critical errors immediately
    if (severity === "critical") {
      this.sendErrorImmediately(errorData);
    } else {
      // Schedule batch send for non-critical errors
      this.scheduleBatchSend();
    }
  }

  /**
   * Handle async errors with proper logging and re-throwing
   * @param {Promise} promise - The promise to handle
   * @param {string} context - Context for error logging
   * @returns {Promise} The original promise with error handling
   */
  static async handleAsyncError(promise, context) {
    try {
      return await promise;
    } catch (error) {
      this.logError(error, context);
      throw error; // Re-throw for caller handling
    }
  }

  /**
   * Send critical errors immediately
   * @param {Object} errorData - The error data to send
   */
  static async sendErrorImmediately(errorData) {
    try {
      // In production, this would send to error tracking service
      // For now, just log locally
      console.error("[CRITICAL ERROR]", errorData);

      // TODO: Implement actual error reporting service integration
      // await fetch('https://error-tracking.tabboost.com/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // });
    } catch (sendError) {
      // Failed to send error, store for later retry
      console.error("Failed to send critical error:", sendError);
    }
  }

  /**
   * Schedule batch sending of errors
   */
  static scheduleBatchSend() {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.sendErrorBatch();
      this.batchTimer = null;
    }, this.ERROR_BATCH_INTERVAL);
  }

  /**
   * Send error batch
   */
  static async sendErrorBatch() {
    if (this.errorLog.length === 0) return;

    const errors = [...this.errorLog];
    this.errorLog = [];

    try {
      // In production, this would send to error tracking service
      // For now, just log locally
      console.log("[ERROR BATCH]", errors);

      // TODO: Implement actual error reporting service integration
    } catch (error) {
      // Failed to send batch, restore errors
      this.errorLog.unshift(...errors);
    }
  }

  /**
   * Show user-friendly error message
   * @param {string} message - User-friendly error message
   * @param {string} type - Notification type: 'error', 'warning', 'info'
   * @param {Object} options - Additional options
   */
  static showUserError(message, type = "error", options = {}) {
    // Try to use Chrome notifications API if available
    if (chrome.notifications && chrome.notifications.create) {
      const notificationOptions = {
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
        title:
          type === "error"
            ? "TabBoost Error"
            : type === "warning"
              ? "TabBoost Warning"
              : "TabBoost Info",
        message: message,
        priority: type === "error" ? 2 : 1,
      };

      // Add action buttons if provided
      if (options.buttons && Array.isArray(options.buttons)) {
        notificationOptions.buttons = options.buttons.slice(0, 2); // Chrome supports max 2 buttons
      }

      const notificationId = `tabboost-${type}-${Date.now()}`;
      chrome.notifications.create(notificationId, notificationOptions);

      // Handle button clicks if provided
      if (options.onButtonClick) {
        chrome.notifications.onButtonClicked.addListener(
          function buttonHandler(notifId, buttonIndex) {
            if (notifId === notificationId) {
              options.onButtonClick(buttonIndex);
              chrome.notifications.onButtonClicked.removeListener(
                buttonHandler
              );
            }
          }
        );
      }
    } else if (window.alert) {
      // Fallback to alert for content scripts
      alert(`TabBoost ${type}: ${message}`);
    }
  }

  /**
   * Clear error log
   */
  static clearErrorLog() {
    this.errorLog = [];
    chrome.storage.local.remove("errorLog");
  }

  /**
   * Get recent errors for debugging
   * @param {number} count - Number of recent errors to retrieve
   * @returns {Promise<Array>} Recent errors
   */
  static async getRecentErrors(count = 10) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["errorLog"], (result) => {
        const errors = result.errorLog || [];
        resolve(errors.slice(-count));
      });
    });
  }

  /**
   * Wrap a function with error handling
   * @param {Function} fn - Function to wrap
   * @param {string} context - Context for error logging
   * @returns {Function} Wrapped function
   */
  static wrapWithErrorHandling(fn, context) {
    return async function (...args) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        ErrorHandler.logError(error, context);
        throw error;
      }
    };
  }

  /**
   * Safe execution with fallback
   * @param {Function} fn - Function to execute
   * @param {Function} fallback - Fallback function if main fails
   * @param {string} context - Context for error logging
   * @returns {any} Result from main function or fallback
   */
  static async safeExecute(fn, fallback, context) {
    try {
      return await fn();
    } catch (error) {
      this.logError(error, context, "warning");
      if (fallback) {
        return await fallback(error);
      }
      return null;
    }
  }
}

// Recovery Manager for automatic error recovery
class RecoveryManager {
  /**
   * Recovery strategies for different error types
   */
  static recoveryStrategies = {
    "splitView.creation": async (error, context) => {
      ErrorHandler.showUserError(
        chrome.i18n.getMessage("splitViewCreationFailed") ||
          "Failed to create split view. Opening in new tab instead.",
        "warning",
        {
          buttons: [
            { title: chrome.i18n.getMessage("retry") || "Retry" },
            {
              title:
                chrome.i18n.getMessage("openInNewTab") || "Open in New Tab",
            },
          ],
          onButtonClick: async (buttonIndex) => {
            if (buttonIndex === 0) {
              // Retry split view creation
              chrome.runtime.sendMessage({ action: "retryLastAction" });
            } else {
              // Open in new tab
              chrome.runtime.sendMessage({
                action: "openInNewTab",
                url: context.url,
              });
            }
          },
        }
      );
    },

    copyTabUrl: async (error, context) => {
      ErrorHandler.showUserError(
        chrome.i18n.getMessage("copyUrlFailed") ||
          "Failed to copy URL to clipboard. Check your permissions.",
        "error"
      );
    },

    storage: async (error, context) => {
      ErrorHandler.showUserError(
        chrome.i18n.getMessage("storageError") ||
          "Failed to save settings. Using default values.",
        "warning"
      );
    },

    iframeLoad: async (error, context) => {
      ErrorHandler.showUserError(
        chrome.i18n.getMessage("iframeLoadError") ||
          "This website cannot be loaded in a frame. Opening in new tab.",
        "info",
        {
          buttons: [
            {
              title:
                chrome.i18n.getMessage("openInNewTab") || "Open in New Tab",
            },
          ],
          onButtonClick: async (buttonIndex) => {
            if (buttonIndex === 0 && context.url) {
              chrome.tabs.create({ url: context.url });
            }
          },
        }
      );
    },
  };

  /**
   * Recover split view from error state
   * @param {Object} originalState - Original split view state
   */
  static async recoverSplitView(originalState) {
    try {
      // Attempt to restore split view state
      await this.restoreFromState(originalState);
    } catch (recoveryError) {
      ErrorHandler.logError(recoveryError, "recovery.splitView", "warning");
      // Final fallback - cleanup and notify
      await this.cleanupAndNotify();
    }
  }

  /**
   * Restore split view from saved state
   * @param {Object} state - Saved state to restore
   */
  static async restoreFromState(state) {
    try {
      // Check if split view container exists
      const container = document.getElementById(
        "tabboost-split-view-container"
      );
      if (container) {
        // Reset container state
        container.style.display = "flex";
        container.style.opacity = "1";

        // Restore iframe URLs if provided
        if (state && state.leftUrl) {
          const leftIframe = document.getElementById("tabboost-left-iframe");
          if (leftIframe) {
            leftIframe.src = state.leftUrl;
          }
        }

        if (state && state.rightUrl) {
          const rightIframe = document.getElementById("tabboost-right-iframe");
          if (rightIframe) {
            rightIframe.src = state.rightUrl;
          }
        }
      }
    } catch (error) {
      ErrorHandler.logError(error, "recovery.restoreFromState", "warning");
    }
  }

  /**
   * Clean up broken elements and notify user
   */
  static async cleanupAndNotify() {
    // Remove any broken DOM elements
    const brokenElements = document.querySelectorAll(
      ".split-view-container.error, .split-view-broken, #tabboost-split-view-container.error"
    );
    brokenElements.forEach((el) => {
      el.remove();
    });

    // Notify user of recovery
    this.showRecoveryNotification();
  }

  /**
   * Show recovery notification to user
   */
  static showRecoveryNotification() {
    const message =
      chrome.i18n.getMessage("splitViewRecovered") ||
      "Split view has been recovered. Please try again.";
    ErrorHandler.showUserError(message, "info");
  }

  /**
   * Generic recovery for any component
   * @param {Object} context - Error context
   */
  static async genericRecovery(context) {
    // Check if we have a specific recovery strategy
    const strategyKey = context.component + "." + context.operation;
    if (this.recoveryStrategies[strategyKey]) {
      await this.recoveryStrategies[strategyKey](null, context);
      return;
    }

    // Otherwise use generic recovery
    console.log("Attempting generic recovery for:", context);

    // Show generic error message with retry option
    ErrorHandler.showUserError(
      chrome.i18n.getMessage("genericError") ||
        "An error occurred. Please try again.",
      "error",
      {
        buttons: [
          { title: chrome.i18n.getMessage("retry") || "Retry" },
          { title: chrome.i18n.getMessage("reload") || "Reload Extension" },
        ],
        onButtonClick: async (buttonIndex) => {
          if (buttonIndex === 0) {
            // Retry last action
            chrome.runtime.sendMessage({ action: "retryLastAction" });
          } else {
            // Reload the extension
            chrome.runtime.reload();
          }
        },
      }
    );
  }

  /**
   * Recover from storage errors
   * @param {Object} context - Error context
   */
  static async recoverStorage(context) {
    // Try to use localStorage as fallback
    try {
      if (context.operation === "get") {
        // Return default values
        return context.defaults || {};
      } else if (context.operation === "set") {
        // Try localStorage
        localStorage.setItem(
          "tabboost_fallback_" + JSON.stringify(context.key),
          JSON.stringify(context.value)
        );
      }
    } catch (error) {
      ErrorHandler.logError(error, "recovery.storage.fallback", "warning");
    }

    // Notify user
    this.recoveryStrategies.storage(null, context);
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ErrorHandler, RecoveryManager };
}
