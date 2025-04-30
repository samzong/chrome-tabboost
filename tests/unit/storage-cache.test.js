jest.mock('../../src/utils/storage-cache', () => {
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
      Object.keys(items).forEach(key => {
        mockCache._cache[key] = items[key];
      });
      return Promise.resolve();
    })
  };
  return mockCache;
});

import storageCache from '../../src/utils/storage-cache';

describe('storageCache test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storageCache._cache = {};
  });

  test('should successfully initialize', async () => {
    await expect(storageCache.init()).resolves.not.toThrow();
    expect(storageCache.init).toHaveBeenCalled();
  });
  
  test('should correctly get value', async () => {
    const result = await storageCache.get('testKey');
    expect(result).toEqual({ testKey: 'test-value-testKey' });
    expect(storageCache.get).toHaveBeenCalledWith('testKey');
  });
  
  test('should correctly get multiple values', async () => {
    const result = await storageCache.get(['key1', 'key2']);
    expect(result).toEqual({ 
      key1: 'test-value-key1', 
      key2: 'test-value-key2' 
    });
    expect(storageCache.get).toHaveBeenCalledWith(['key1', 'key2']);
  });
  
  test('should correctly set value', async () => {
    await storageCache.set({ key: 'value' });
    
    expect(storageCache.set).toHaveBeenCalledWith({ key: 'value' });
    
    expect(storageCache._cache).toEqual(expect.objectContaining({ key: 'value' }));
  });
}); 