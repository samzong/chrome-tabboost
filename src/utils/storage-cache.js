// storage-cache.js - 用于减少对chrome.storage的频繁访问

/**
 * 存储缓存管理器类
 * 用于缓存chrome.storage.sync的数据，减少对存储API的频繁调用
 */
class StorageCache {
  constructor() {
    // 存储缓存数据
    this.cache = {};
    // 记录每个键的过期时间
    this.expiration = {};
    // 统一缓存过期时间（毫秒）
    this.cacheExpiration = 30 * 60 * 1000; // 30分钟统一缓存时间
    // 初始化标记
    this.initialized = false;
    // 常用键的列表
    this.commonKeys = [
      'iframeIgnoreEnabled',
      'iframeIgnoreList',
      'popupSizePreset',
      'customWidth',
      'customHeight',
      'autoAddToIgnoreList',
      'defaultAction',
      'splitViewEnabled'
    ];
    
    // 批量写入队列
    this.writeQueue = {};
    // 批量写入计时器ID
    this.writeTimerId = null;
    // 批量写入延迟（毫秒）
    this.writeDelay = 1000; // 1秒延迟，收集多个写操作一次性提交
  }

  /**
   * 初始化缓存，预加载常用配置
   * @param {Array} keys 需要预加载的键列表
   * @returns {Promise} 返回加载完成的Promise
   */
  async init(keys = []) {
    if (this.initialized) return Promise.resolve();

    // 合并用户指定的键和常用键
    const allKeys = [...new Set([...keys, ...this.commonKeys])];

    // 加载所有指定的键
    return new Promise((resolve) => {
      chrome.storage.sync.get(allKeys, (result) => {
        // 将结果存入缓存
        Object.keys(result).forEach((key) => {
          this.cache[key] = result[key];
          this.setExpiration(key);
        });
        
        console.log("chrome-tabboost: Storage cache initialized with keys:", Object.keys(this.cache));
        this.initialized = true;
        resolve();
      });
    });
  }

  /**
   * 设置键的过期时间
   * @param {string} key 键名
   */
  setExpiration(key) {
    this.expiration[key] = Date.now() + this.cacheExpiration;
  }

  /**
   * 检查键是否已过期
   * @param {string} key 键名
   * @returns {boolean} 是否已过期
   */
  isExpired(key) {
    return !this.expiration[key] || Date.now() > this.expiration[key];
  }

  /**
   * 获取存储的值
   * @param {string|Array|Object} keys 要获取的键或键的列表或默认值对象
   * @returns {Promise} 包含请求数据的Promise
   */
  async get(keys) {
    // 确保已初始化
    if (!this.initialized) {
      await this.init();
    }
    
    // 标准化keys为数组
    let keyList = [];
    let defaults = {};
    
    if (typeof keys === 'string') {
      keyList = [keys];
    } else if (Array.isArray(keys)) {
      keyList = keys;
    } else if (typeof keys === 'object' && keys !== null) {
      keyList = Object.keys(keys);
      defaults = keys;
    }

    // 检查哪些键需要从存储中获取（未缓存或已过期）
    const keysToFetch = keyList.filter(key => 
      !(key in this.cache) || this.isExpired(key)
    );

    // 如果所有键都在缓存中且未过期，直接返回缓存的值
    if (keysToFetch.length === 0) {
      const result = {};
      keyList.forEach(key => {
        result[key] = (key in this.cache) ? this.cache[key] : defaults[key];
      });
      return Promise.resolve(result);
    }

    // 否则从存储中获取缺失的键
    return new Promise((resolve) => {
      chrome.storage.sync.get(keysToFetch.length > 0 ? keysToFetch : defaults, (items) => {
        // 更新缓存
        Object.keys(items).forEach(key => {
          this.cache[key] = items[key];
          this.setExpiration(key);
        });

        // 合并从缓存和新获取的结果
        const result = {};
        keyList.forEach(key => {
          result[key] = (key in this.cache) ? this.cache[key] : 
                       (key in items) ? items[key] : 
                       defaults[key];
        });
        
        resolve(result);
      });
    });
  }

  /**
   * 设置存储的值，使用批量写入优化
   * @param {Object} items 要存储的键值对
   * @returns {Promise} 操作完成的Promise
   */
  async set(items) {
    // 更新本地缓存，立即可用
    Object.keys(items).forEach(key => {
      this.cache[key] = items[key];
      this.setExpiration(key);
      
      // 添加到写入队列
      this.writeQueue[key] = items[key];
    });
    
    // 使用防抖模式延迟批量写入
    this.scheduleWrite();
    
    // 立即返回Promise以提高响应速度
    return Promise.resolve();
  }
  
  /**
   * 调度批量写入操作
   */
  scheduleWrite() {
    // 如果已经有计时器在运行，清除它以重新开始计时
    if (this.writeTimerId) {
      clearTimeout(this.writeTimerId);
    }
    
    // 设置新的计时器，延迟执行批量写入
    this.writeTimerId = setTimeout(() => {
      this.flushWrites();
    }, this.writeDelay);
  }
  
  /**
   * 执行所有挂起的写入操作
   */
  flushWrites() {
    // 如果没有挂起的写入，直接返回
    if (Object.keys(this.writeQueue).length === 0) {
      return;
    }
    
    // 创建当前队列的副本
    const itemsToWrite = {...this.writeQueue};
    
    // 清空队列
    this.writeQueue = {};
    
    // 执行写入操作
    chrome.storage.sync.set(itemsToWrite, () => {
      if (chrome.runtime.lastError) {
        console.error("chrome-tabboost: 批量写入失败:", chrome.runtime.lastError);
        
        // 如果写入失败，尝试恢复写入队列
        Object.keys(itemsToWrite).forEach(key => {
          if (!(key in this.writeQueue)) {
            this.writeQueue[key] = itemsToWrite[key];
          }
        });
        
        // 重新调度写入（带延迟）
        setTimeout(() => {
          this.scheduleWrite();
        }, 5000); // 5秒后重试
      } else {
        console.log("chrome-tabboost: 批量写入成功，键数量:", Object.keys(itemsToWrite).length);
      }
    });
  }

  /**
   * 移除存储中的键，同时从缓存中移除
   * @param {string|Array} keys 要移除的键或键的列表
   * @returns {Promise} 操作完成的Promise
   */
  async remove(keys) {
    // 标准化keys为数组
    const keyList = Array.isArray(keys) ? keys : [keys];
    
    // 从缓存中移除
    keyList.forEach(key => {
      delete this.cache[key];
      delete this.expiration[key];
      
      // 如果键在写入队列中，也移除它
      if (key in this.writeQueue) {
        delete this.writeQueue[key];
      }
    });
    
    // 从存储中移除
    return new Promise((resolve) => {
      chrome.storage.sync.remove(keyList, () => {
        if (chrome.runtime.lastError) {
          console.error("chrome-tabboost: 移除键失败:", chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * 清除整个缓存和存储
   * @returns {Promise} 操作完成的Promise
   */
  async clear() {
    // 清空缓存
    this.cache = {};
    this.expiration = {};
    this.writeQueue = {};
    
    if (this.writeTimerId) {
      clearTimeout(this.writeTimerId);
      this.writeTimerId = null;
    }
    
    // 清空存储
    return new Promise((resolve) => {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          console.error("chrome-tabboost: 清除存储失败:", chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }
}

// 创建单例并导出
const storageCache = new StorageCache();
export default storageCache; 