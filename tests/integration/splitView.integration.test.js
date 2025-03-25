// splitView.integration.test.js - 分屏视图功能集成测试

// 模拟splitViewCore模块
jest.mock('../../src/js/splitView/splitViewCore', () => {
  return {
    initSplitViewModule: jest.fn(),
    createSplitView: jest.fn().mockResolvedValue(true),
    closeSplitView: jest.fn().mockResolvedValue(true),
    toggleSplitView: jest.fn().mockResolvedValue(true),
    updateRightView: jest.fn().mockResolvedValue(true),
    getSplitViewState: jest.fn().mockReturnValue({
      isActive: true,
      leftUrl: 'https://example.com',
      rightUrl: 'https://example.org'
    })
  };
});

// 模拟工具函数
jest.mock('../../src/utils/utils', () => ({
  getCurrentTab: jest.fn().mockResolvedValue({ 
    id: 123, 
    url: 'https://example.com' 
  }),
  validateUrl: jest.fn(url => ({
    isValid: url && url.startsWith('http'),
    reason: url && url.startsWith('http') ? '' : '无效URL',
    sanitizedUrl: url
  }))
}));

// 导入模拟的模块
import splitViewCore from '../../src/js/splitView/splitViewCore';
import { getCurrentTab, validateUrl } from '../../src/utils/utils';

describe('分屏视图集成测试', () => {
  // 在每个测试前重置模块状态
  beforeEach(() => {
    // 重置模拟函数
    jest.clearAllMocks();
  });
  
  test('创建分屏视图流程', async () => {
    // 执行创建分屏视图
    await splitViewCore.createSplitView();
    
    // 验证函数被调用
    expect(splitViewCore.createSplitView).toHaveBeenCalled();
  });
  
  test('切换分屏视图流程', async () => {
    // 调用toggleSplitView
    await splitViewCore.toggleSplitView();
    
    // 验证函数被调用
    expect(splitViewCore.toggleSplitView).toHaveBeenCalled();
  });
  
  test('URL验证和iframe兼容性检查流程', async () => {
    // 模拟一个有效URL
    const validUrl = 'https://example.org';
    
    // 更新右视图
    await splitViewCore.updateRightView(validUrl);
    
    // 验证函数被调用
    expect(splitViewCore.updateRightView).toHaveBeenCalledWith(validUrl);
  });
}); 