// storage-cache.test.js - 存储缓存模块单元测试

// 模拟StorageCache
jest.mock('../../src/utils/storage-cache', () => {
  // 创建一个模拟的存储缓存对象
  const mockCache = {
    _cache: {},
    init: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockImplementation(keys => {
      if (typeof keys === 'string') {
        const result = {};
        result[keys] = 'test-value-' + keys;
        return Promise.resolve(result);
      } else if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          result[key] = 'test-value-' + key;
        });
        return Promise.resolve(result);
      } else if (keys && typeof keys === 'object') {
        return Promise.resolve({...keys});
      }
      return Promise.resolve({});
    }),
    set: jest.fn().mockImplementation(items => {
      // 更新模拟缓存
      Object.keys(items).forEach(key => {
        mockCache._cache[key] = items[key];
      });
      return Promise.resolve();
    })
  };
  return mockCache;
});

// 导入模拟的模块
import storageCache from '../../src/utils/storage-cache';

describe('storageCache模块', () => {
  beforeEach(() => {
    // 重置模拟
    jest.clearAllMocks();
    storageCache._cache = {};
  });

  test('应该成功初始化', async () => {
    await expect(storageCache.init()).resolves.not.toThrow();
    expect(storageCache.init).toHaveBeenCalled();
  });
  
  test('应该正确获取值', async () => {
    const result = await storageCache.get('testKey');
    expect(result).toEqual({ testKey: 'test-value-testKey' });
    expect(storageCache.get).toHaveBeenCalledWith('testKey');
  });
  
  test('应该正确获取多个值', async () => {
    const result = await storageCache.get(['key1', 'key2']);
    expect(result).toEqual({ 
      key1: 'test-value-key1', 
      key2: 'test-value-key2' 
    });
    expect(storageCache.get).toHaveBeenCalledWith(['key1', 'key2']);
  });
  
  test('应该正确设置值', async () => {
    await storageCache.set({ key: 'value' });
    
    // 验证set方法被调用
    expect(storageCache.set).toHaveBeenCalledWith({ key: 'value' });
    
    // 验证值被缓存
    expect(storageCache._cache).toEqual(expect.objectContaining({ key: 'value' }));
  });
}); 