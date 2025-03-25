// 测试设置文件
// 使用自定义的Chrome API模拟
const { chrome } = require('./mocks/chromeMock');

// 全局提供chrome对象
global.chrome = chrome;

// 模拟无法在jsdom中使用的window属性
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 模拟console.error和console.warn以便在测试中捕获
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}; 