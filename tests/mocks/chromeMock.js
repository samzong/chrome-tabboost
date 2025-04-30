const { chrome } = require('jest-chrome');

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

if (!chrome.storage) {
  chrome.storage = {
    sync: {
      get: jest.fn((keys, callback) => {
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

if (!chrome.tabs) {
  chrome.tabs = {
    duplicate: jest.fn().mockResolvedValue({ id: 456 }),
    query: jest.fn().mockResolvedValue([{ id: 123, url: 'https://example.com' }]),
    create: jest.fn().mockResolvedValue({ id: 789 }),
    update: jest.fn().mockResolvedValue({ id: 123 })
  };
}

if (!chrome.notifications) {
  chrome.notifications = {
    create: jest.fn()
  };
}

module.exports = { chrome }; 