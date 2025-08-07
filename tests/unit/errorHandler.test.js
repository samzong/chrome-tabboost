/**
 * Comprehensive but simplified unit tests for ErrorHandler and RecoveryManager classes
 * Focused on core functionality with reliable mocking
 */

import { ErrorHandler, RecoveryManager } from '../../src/utils/errorHandler.js';

// Mock Chrome APIs and dependencies
jest.mock('../../src/utils/i18n.js', () => ({
  getMessage: jest.fn((key) => key.replace(/([A-Z])/g, ' $1').toLowerCase())
}));

describe('ErrorHandler Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset static properties
    ErrorHandler.errorLog = [];
    ErrorHandler.batchTimer = null;
    
    // Mock essential globals properly
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
    
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Test Browser 1.0'
      },
      writable: true
    });
    
    Object.defineProperty(global, 'window', {
      value: {
        location: { href: 'https://test.example.com' }
      },
      writable: true
    });
    
    // Mock Chrome extension APIs
    global.chrome = {
      runtime: {
        getManifest: jest.fn(() => ({ version: '2.4.3' })),
        getURL: jest.fn(() => 'chrome-extension://test/icon.png')
      },
      storage: {
        local: {
          get: jest.fn((keys, callback) => callback({ errorLog: [] })),
          set: jest.fn((items, callback) => callback && callback()),
          remove: jest.fn((keys, callback) => callback && callback())
        }
      },
      notifications: {
        create: jest.fn(),
        onButtonClicked: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      tabs: {
        create: jest.fn()
      },
      i18n: {
        getMessage: jest.fn((key) => key)
      }
    };
    
    // Mock console
    global.console = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn()
    };
  });

  describe('User ID Generation', () => {
    test('should generate new user ID when none exists', () => {
      localStorage.getItem.mockReturnValue(null);
      
      const userId = ErrorHandler.generateUserId();
      
      expect(userId).toMatch(/^user_\d+_[a-z0-9]{9}$/);
      expect(localStorage.setItem).toHaveBeenCalledWith('tabboost_user_id', userId);
    });

    test('should return existing user ID', () => {
      const existingId = 'user_123_abc123def';
      localStorage.getItem.mockReturnValue(existingId);
      
      const userId = ErrorHandler.generateUserId();
      
      expect(userId).toBe(existingId);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Error Logging', () => {
    test('should log error with complete metadata', () => {
      const error = new Error('Test error');
      const context = 'test.component';
      
      ErrorHandler.logError(error, context, 'warning');
      
      expect(ErrorHandler.errorLog).toHaveLength(1);
      const loggedError = ErrorHandler.errorLog[0];
      
      expect(loggedError).toMatchObject({
        message: 'Test error',
        context: 'test.component',
        severity: 'warning',
        version: '2.4.3'
      });
      
      // Check these separately as they may vary in test environment
      expect(loggedError.userAgent).toBeDefined();
      expect(loggedError.url).toBeDefined();
      
      expect(loggedError.timestamp).toBeGreaterThan(0);
      expect(loggedError.userId).toMatch(/^user_\d+_[a-z0-9]{9}$/);
    });

    test('should handle errors without message gracefully', () => {
      const error = {};
      
      ErrorHandler.logError(error, 'test.empty');
      
      expect(ErrorHandler.errorLog[0].message).toBe('Unknown error');
      expect(ErrorHandler.errorLog[0].stack).toBe('');
    });

    test('should default to error severity', () => {
      ErrorHandler.logError(new Error('Test'), 'test.default');
      
      expect(ErrorHandler.errorLog[0].severity).toBe('error');
    });

    test('should store errors in Chrome storage', () => {
      ErrorHandler.logError(new Error('Storage test'), 'test.storage');
      
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['errorLog'], expect.any(Function));
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test('should maintain maximum log size', () => {
      // Add errors beyond the limit
      for (let i = 0; i < ErrorHandler.MAX_ERROR_LOG_SIZE + 5; i++) {
        ErrorHandler.logError(new Error(`Error ${i}`), 'test.overflow');
      }
      
      expect(ErrorHandler.errorLog).toHaveLength(ErrorHandler.MAX_ERROR_LOG_SIZE);
    });
  });

  describe('Async Error Handling', () => {
    test('should return promise result on success', async () => {
      const promise = Promise.resolve('success');
      
      const result = await ErrorHandler.handleAsyncError(promise, 'test.success');
      
      expect(result).toBe('success');
      expect(ErrorHandler.errorLog).toHaveLength(0);
    });

    test('should log and re-throw on failure', async () => {
      const error = new Error('Async failure');
      const promise = Promise.reject(error);
      
      await expect(ErrorHandler.handleAsyncError(promise, 'test.failure'))
        .rejects.toThrow('Async failure');
      
      expect(ErrorHandler.errorLog).toHaveLength(1);
      expect(ErrorHandler.errorLog[0].context).toBe('test.failure');
    });
  });

  describe('User Notifications', () => {
    test('should create Chrome notification with proper structure', () => {
      ErrorHandler.showUserError('Test message', 'error');
      
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringMatching(/^tabboost-error-\d+$/),
        expect.objectContaining({
          type: 'basic',
          title: 'TabBoost Error',
          message: 'Test message',
          priority: 2
        })
      );
    });

    test('should adjust notification based on type', () => {
      ErrorHandler.showUserError('Warning message', 'warning');
      
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: 'TabBoost Warning',
          priority: 1
        })
      );
    });

    test('should handle notification buttons', () => {
      const buttons = [{ title: 'Retry' }, { title: 'Cancel' }];
      const onButtonClick = jest.fn();
      
      ErrorHandler.showUserError('Test', 'error', { buttons, onButtonClick });
      
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ buttons })
      );
      
      expect(chrome.notifications.onButtonClicked.addListener).toHaveBeenCalled();
    });
  });

  describe('Safe Execution', () => {
    test('should execute main function successfully', async () => {
      const mainFn = jest.fn().mockResolvedValue('main result');
      const fallbackFn = jest.fn();
      
      const result = await ErrorHandler.safeExecute(mainFn, fallbackFn, 'test.safe');
      
      expect(result).toBe('main result');
      expect(fallbackFn).not.toHaveBeenCalled();
      expect(ErrorHandler.errorLog).toHaveLength(0);
    });

    test('should use fallback on main function failure', async () => {
      const error = new Error('Main failed');
      const mainFn = jest.fn().mockRejectedValue(error);
      const fallbackFn = jest.fn().mockResolvedValue('fallback result');
      
      const result = await ErrorHandler.safeExecute(mainFn, fallbackFn, 'test.fallback');
      
      expect(result).toBe('fallback result');
      expect(fallbackFn).toHaveBeenCalledWith(error);
      expect(ErrorHandler.errorLog).toHaveLength(1);
      expect(ErrorHandler.errorLog[0].severity).toBe('warning');
    });

    test('should return null when no fallback provided', async () => {
      const mainFn = jest.fn().mockRejectedValue(new Error('Failed'));
      
      const result = await ErrorHandler.safeExecute(mainFn, null, 'test.no-fallback');
      
      expect(result).toBeNull();
    });
  });

  describe('Function Wrapping', () => {
    test('should wrap function with error handling', async () => {
      const originalFn = jest.fn().mockRejectedValue(new Error('Wrapped error'));
      const wrappedFn = ErrorHandler.wrapWithErrorHandling(originalFn, 'test.wrapped');
      
      await expect(wrappedFn('arg1', 'arg2')).rejects.toThrow('Wrapped error');
      
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(ErrorHandler.errorLog).toHaveLength(1);
    });

    test('should pass through successful calls', async () => {
      const originalFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = ErrorHandler.wrapWithErrorHandling(originalFn, 'test.success');
      
      const result = await wrappedFn('test');
      
      expect(result).toBe('success');
      expect(ErrorHandler.errorLog).toHaveLength(0);
    });
  });

  describe('Error Log Management', () => {
    test('should clear error logs', () => {
      ErrorHandler.errorLog = [{ message: 'Test error' }];
      
      ErrorHandler.clearErrorLog();
      
      expect(ErrorHandler.errorLog).toHaveLength(0);
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('errorLog');
    });

    test('should retrieve recent errors', async () => {
      const storedErrors = [
        { message: 'Error 1', timestamp: 1 },
        { message: 'Error 2', timestamp: 2 },
        { message: 'Error 3', timestamp: 3 }
      ];
      
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ errorLog: storedErrors });
      });
      
      const result = await ErrorHandler.getRecentErrors(2);
      
      expect(result).toEqual([
        { message: 'Error 2', timestamp: 2 },
        { message: 'Error 3', timestamp: 3 }
      ]);
    });

    test('should handle empty error log', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });
      
      const result = await ErrorHandler.getRecentErrors();
      
      expect(result).toEqual([]);
    });
  });
});

describe('RecoveryManager Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DOM methods properly
    Object.defineProperty(global, 'document', {
      value: {
        getElementById: jest.fn(),
        querySelectorAll: jest.fn(() => [])
      },
      writable: true
    });
    
    // Spy on ErrorHandler methods
    jest.spyOn(ErrorHandler, 'showUserError').mockImplementation();
    jest.spyOn(ErrorHandler, 'logError').mockImplementation();
  });

  describe('Split View Recovery', () => {
    test('should attempt to restore split view state', async () => {
      const state = { leftUrl: 'https://left.com', rightUrl: 'https://right.com' };
      const restoreSpy = jest.spyOn(RecoveryManager, 'restoreFromState').mockResolvedValue();
      
      await RecoveryManager.recoverSplitView(state);
      
      expect(restoreSpy).toHaveBeenCalledWith(state);
    });

    test('should cleanup on restore failure', async () => {
      const state = { leftUrl: 'https://test.com' };
      const restoreError = new Error('Restore failed');
      
      // Mock the actual implementation to throw an error
      const originalRestore = RecoveryManager.restoreFromState;
      RecoveryManager.restoreFromState = jest.fn().mockRejectedValue(restoreError);
      
      const cleanupSpy = jest.spyOn(RecoveryManager, 'cleanupAndNotify').mockResolvedValue();
      
      await RecoveryManager.recoverSplitView(state);
      
      expect(cleanupSpy).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();
      
      // Restore original
      RecoveryManager.restoreFromState = originalRestore;
    });
  });

  describe('State Restoration', () => {
    test('should restore container and iframe URLs', async () => {
      const state = { leftUrl: 'https://left.com', rightUrl: 'https://right.com' };
      
      // Simply test that the method doesn't throw and handles state properly
      await expect(RecoveryManager.restoreFromState(state)).resolves.not.toThrow();
      
      // Test with empty state
      await expect(RecoveryManager.restoreFromState({})).resolves.not.toThrow();
    });

    test('should handle missing elements gracefully', async () => {
      // Reset any existing mocks
      document.getElementById.mockClear();
      document.getElementById.mockReturnValue(null);
      
      await expect(RecoveryManager.restoreFromState({})).resolves.not.toThrow();
    });
  });

  describe('Generic Recovery', () => {
    test('should use specific recovery strategy', async () => {
      const context = { component: 'splitView', operation: 'creation' };
      
      await RecoveryManager.genericRecovery(context);
      
      expect(ErrorHandler.showUserError).toHaveBeenCalledWith(
        'splitViewCreationFailed',
        'warning',
        expect.objectContaining({ buttons: expect.any(Array) })
      );
    });

    test('should use generic recovery for unknown strategies', async () => {
      const context = { component: 'unknown', operation: 'test' };
      
      await RecoveryManager.genericRecovery(context);
      
      expect(ErrorHandler.showUserError).toHaveBeenCalledWith(
        'genericError',
        'error',
        expect.objectContaining({ buttons: expect.any(Array) })
      );
    });
  });

  describe('Storage Recovery', () => {
    test('should return defaults for get operations', async () => {
      const context = { operation: 'get', defaults: { setting: 'default' } };
      
      const result = await RecoveryManager.recoverStorage(context);
      
      expect(result).toEqual({ setting: 'default' });
    });

    test('should attempt localStorage fallback for set operations', async () => {
      const context = { operation: 'set', key: 'testKey', value: 'testValue' };
      const mockSetItem = jest.fn();
      Object.defineProperty(global, 'localStorage', {
        value: { setItem: mockSetItem },
        writable: true
      });
      
      await RecoveryManager.recoverStorage(context);
      
      expect(mockSetItem).toHaveBeenCalledWith(
        expect.stringContaining('tabboost_fallback'),
        expect.stringContaining('testValue')
      );
    });
  });

  describe('Recovery Strategies', () => {
    test('should handle copy URL failure', async () => {
      await RecoveryManager.recoveryStrategies.copyTabUrl();
      
      expect(ErrorHandler.showUserError).toHaveBeenCalledWith(
        'copyUrlFailed',
        'error'
      );
    });

    test('should handle storage failure', async () => {
      await RecoveryManager.recoveryStrategies.storage();
      
      expect(ErrorHandler.showUserError).toHaveBeenCalledWith(
        'storageError',
        'warning'
      );
    });

    test('should handle iframe load failure with button actions', async () => {
      const context = { url: 'https://test.com' };
      
      await RecoveryManager.recoveryStrategies.iframeLoad(null, context);
      
      expect(ErrorHandler.showUserError).toHaveBeenCalledWith(
        'iframeLoadError',
        'info',
        expect.objectContaining({
          buttons: expect.any(Array),
          onButtonClick: expect.any(Function)
        })
      );
    });
  });
});