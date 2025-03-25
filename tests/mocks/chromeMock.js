// Chrome API 扩展模拟
const { chrome } = require('jest-chrome');

// 补充缺失的API
if (!chrome.action) {
  chrome.action = {
    onClicked: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListeners: jest.fn(),
      callListeners: jest.fn()
    }
  };
}

if (!chrome.scripting) {
  chrome.scripting = {
    executeScript: jest.fn().mockResolvedValue([{ result: true }])
  };
}

// 确保Chrome存储API存在
if (!chrome.storage) {
  chrome.storage = {
    sync: {
      get: jest.fn((keys, callback) => {
        // 简单返回与请求的键匹配的对象
        if (typeof keys === 'string') {
          const result = {};
          result[keys] = 'test-value-' + keys;
          callback(result);
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => {
            result[key] = 'test-value-' + key;
          });
          callback(result);
        } else if (typeof keys === 'object' && keys !== null) {
          const result = { ...keys };
          callback(result);
        } else {
          callback({});
        }
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback();
      }),
      clear: jest.fn(callback => {
        if (callback) callback();
      })
    },
    local: {
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn((items, callback) => callback && callback()),
      remove: jest.fn((keys, callback) => callback && callback()),
      clear: jest.fn(callback => callback && callback())
    }
  };
}

// 确保通用的事件API都存在
['onClicked', 'onCommand', 'onMessage'].forEach(eventName => {
  if (!chrome.action) chrome.action = {};
  if (!chrome.commands) chrome.commands = {};
  if (!chrome.runtime) chrome.runtime = {};
  
  const targets = {
    onClicked: chrome.action,
    onCommand: chrome.commands,
    onMessage: chrome.runtime
  };
  
  const target = targets[eventName];
  if (!target[eventName]) {
    target[eventName] = {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListeners: jest.fn(() => true),
      callListeners: jest.fn(),
      getListeners: jest.fn().mockReturnValue([jest.fn()])
    };
  }
});

// 补充chrome.tabs API
if (!chrome.tabs) {
  chrome.tabs = {
    duplicate: jest.fn().mockResolvedValue({ id: 456 }),
    query: jest.fn().mockResolvedValue([{ id: 123, url: 'https://example.com' }]),
    create: jest.fn().mockResolvedValue({ id: 789 }),
    update: jest.fn().mockResolvedValue({ id: 123 })
  };
}

// 补充chrome.notifications API
if (!chrome.notifications) {
  chrome.notifications = {
    create: jest.fn()
  };
}

// 导出增强后的chrome对象
module.exports = { chrome }; 