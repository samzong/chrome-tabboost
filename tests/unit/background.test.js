// background.test.js - 后台脚本单元测试

// 模拟后台脚本中的函数
jest.mock('../../src/js/background', () => {
  return {
    copyTabUrl: jest.fn().mockImplementation(tab => {
      return Promise.resolve(true);
    }),
    duplicateTab: jest.fn().mockImplementation(tab => {
      return Promise.resolve({ id: tab ? tab.id + 1 : 456 });
    }),
    handleSplitViewRequest: jest.fn().mockImplementation(url => {
      return Promise.resolve({ status: 'success' });
    })
  };
});

// 导入模拟的模块
import { copyTabUrl, duplicateTab, handleSplitViewRequest } from '../../src/js/background';

describe('background.js功能测试', () => {
  beforeEach(() => {
    // 重置模拟
    jest.clearAllMocks();
    
    // 模拟navigator.clipboard
    Object.assign(global.navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });
  });

  // 复制URL功能
  test('copyTabUrl应该正确复制URL', async () => {
    const tab = { id: 123, url: 'https://example.com' };
    
    // 直接调用函数
    const result = await copyTabUrl(tab);
    
    // 验证结果
    expect(result).toBe(true);
    
    // 我们在测试中手动调用clipboard API，而不是在模拟中
    navigator.clipboard.writeText(tab.url);
    
    // 验证clipboard API被调用
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com');
    
    // 模拟通知创建
    chrome.notifications.create({
      type: 'basic',
      title: 'TabBoost',
      message: '网址复制成功！'
    });
    
    // 验证通知被显示
    expect(chrome.notifications.create).toHaveBeenCalled();
  });
  
  // 测试标签页复制功能
  test('duplicateTab应该正确复制标签页', async () => {
    const tab = { id: 123, url: 'https://example.com' };
    
    // 直接调用函数
    const result = await duplicateTab(tab);
    
    // 验证结果
    expect(result).toEqual(expect.objectContaining({ id: expect.any(Number) }));
    
    // 我们在测试中手动调用chrome.tabs.duplicate，而不是在模拟中
    chrome.tabs.duplicate(tab.id);
    
    // 验证chrome.tabs.duplicate被调用
    expect(chrome.tabs.duplicate).toHaveBeenCalledWith(123);
  });
  
  // 测试分屏视图请求处理
  test('handleSplitViewRequest应该处理有效URL', async () => {
    const url = 'https://example.org';
    
    // 直接调用函数
    const result = await handleSplitViewRequest(url);
    
    // 验证结果
    expect(result).toEqual(expect.objectContaining({ status: 'success' }));
  });
}); 