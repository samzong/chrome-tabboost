// storageCache.js - 用于减少对chrome.storage的频繁访问

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
    // 默认缓存过期时间（毫秒）
    this.defaultExpiration = 10 * 60 * 1000; // 10分钟，提高缓存时间
    // 使用频率计数器
    this.usageCount = {};
    // 初始化标记
    this.initialized = false;
    // 高频使用键的列表
    this.frequentKeys = [
      'iframeIgnoreEnabled',
      'iframeIgnoreList',
      'popupSizePreset',
      'customWidth',
      'customHeight',
      'autoAddToIgnoreList',
      'defaultAction',
      'splitViewEnabled'  // 新增高频键
    ];
    // 上次清理缓存的时间
    this.lastCleanup = Date.now();
    // 清理间隔（毫秒）
    this.cleanupInterval = 60 * 60 * 1000; // 延长到60分钟
    
    // 添加调用计数器，控制清理频率
    this.getCallCount = 0;
    // 每多少次get调用执行一次清理检查
    this.cleanupCheckFrequency = 100; // 增加到100次，减少检查频率
    
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
    const allKeys = [...new Set([...keys, ...this.frequentKeys])];

    // 加载所有指定的键
    return new Promise((resolve) => {
      chrome.storage.sync.get(allKeys, (result) => {
        // 将结果存入缓存
        Object.keys(result).forEach((key) => {
          this.cache[key] = result[key];
          this.setExpiration(key, this.getExpirationTime(key));
          this.usageCount[key] = 0;
        });
        
        console.log("chrome-tabboost: Storage cache initialized with keys:", Object.keys(this.cache));
        this.initialized = true;
        resolve();
      });
    });
  }

  /**
   * 获取键的过期时间，基于使用频率和重要性
   * @param {string} key 键名
   * @returns {number} 过期时间（毫秒）
   */
  getExpirationTime(key) {
    // 高频使用的重要键保留更长时间
    if (this.frequentKeys.includes(key)) {
      return 60 * 60 * 1000; // 延长到60分钟
    }
    
    // 基于使用频率动态调整过期时间
    const usageCount = this.usageCount[key] || 0;
    if (usageCount > 15) {
      return 45 * 60 * 1000; // 45分钟
    } else if (usageCount > 10) {
      return 30 * 60 * 1000; // 30分钟
    } else if (usageCount > 5) {
      return 15 * 60 * 1000; // 15分钟
    } else {
      return this.defaultExpiration; // 默认10分钟
    }
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
    
    // 增加调用计数
    this.getCallCount++;
    
    // 仅在达到指定频率或距离上次清理已经过了指定时间时才执行清理
    if (this.getCallCount >= this.cleanupCheckFrequency || 
        (Date.now() - this.lastCleanup) >= this.cleanupInterval) {
      this.maybeCleanupCache();
      this.getCallCount = 0; // 重置计数器
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

    // 更新使用频率统计
    keyList.forEach(key => {
      this.usageCount[key] = (this.usageCount[key] || 0) + 1;
    });

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
          this.setExpiration(key, this.getExpirationTime(key));
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
      this.setExpiration(key, this.getExpirationTime(key));
      
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
    const keyList = Array.isArray(keys) ? keys : [keys];
    
    // 从缓存中移除
    keyList.forEach(key => {
      delete this.cache[key];
      delete this.expiration[key];
      delete this.usageCount[key];
      
      // 从写入队列中移除
      if (key in this.writeQueue) {
        delete this.writeQueue[key];
      }
    });
    
    return new Promise((resolve) => {
      chrome.storage.sync.remove(keyList, () => {
        resolve();
      });
    });
  }

  /**
   * 清空存储和缓存
   * @returns {Promise} 操作完成的Promise
   */
  async clear() {
    return new Promise((resolve) => {
      chrome.storage.sync.clear(() => {
        this.cache = {};
        this.expiration = {};
        this.usageCount = {};
        this.writeQueue = {};
        
        if (this.writeTimerId) {
          clearTimeout(this.writeTimerId);
          this.writeTimerId = null;
        }
        
        resolve();
      });
    });
  }

  /**
   * 设置键的过期时间
   * @param {string} key 键名
   * @param {number} duration 过期时间（毫秒），默认使用this.defaultExpiration
   */
  setExpiration(key, duration = this.defaultExpiration) {
    this.expiration[key] = Date.now() + duration;
  }

  /**
   * 检查键是否已过期
   * @param {string} key 键名
   * @returns {boolean} 是否已过期
   */
  isExpired(key) {
    return !(key in this.expiration) || Date.now() > this.expiration[key];
  }

  /**
   * 手动更新缓存的值，不访问存储
   * @param {string} key 键名
   * @param {any} value 值
   */
  updateCache(key, value) {
    this.cache[key] = value;
    this.setExpiration(key, this.getExpirationTime(key));
    this.usageCount[key] = (this.usageCount[key] || 0) + 1;
  }

  /**
   * 手动使某个键的缓存失效
   * @param {string} key 键名
   */
  invalidate(key) {
    delete this.cache[key];
    delete this.expiration[key];
  }
  
  /**
   * 检查是否需要清理过期缓存
   * 定期清理不常用的缓存项以减少内存占用
   */
  maybeCleanupCache() {
    const now = Date.now();
    // 定期执行清理，避免频繁检查
    if ((now - this.lastCleanup) < this.cleanupInterval) {
      return;
    }
    
    this.lastCleanup = now;
    console.log("chrome-tabboost: Cleaning up storage cache");
    
    // 在清理前执行所有挂起的写入
    this.flushWrites();
    
    // 清理过期缓存
    Object.keys(this.cache).forEach(key => {
      // 如果不是高频键，且已过期或使用频率低，则从缓存中移除
      if (!this.frequentKeys.includes(key) && 
          (this.isExpired(key) || (this.usageCount[key] || 0) < 3)) {
        delete this.cache[key];
        delete this.expiration[key];
        delete this.usageCount[key];
      }
    });
    
    // 重置使用计数但保留高频键的计数
    Object.keys(this.usageCount).forEach(key => {
      if (!this.frequentKeys.includes(key)) {
        this.usageCount[key] = Math.max(0, Math.floor(this.usageCount[key] / 2));
      }
    });
  }
}

// 创建单例
const storageCache = new StorageCache();

// 导出单例
export default storageCache; 