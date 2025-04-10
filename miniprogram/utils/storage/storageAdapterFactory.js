/**
 * 存储适配器工厂
 * 负责创建和管理不同类型的存储适配器
 * 遵循ES5标准，确保在微信小程序环境兼容
 * 
 * 作者：AI助手
 * 创建日期：2025-04-07
 */

// 导入依赖
var storageConfig = require('./storageConfig');
var offlineStorageAdapter = require('./offlineStorageAdapter');
var MemoryStorageAdapter = require('./memoryStorageAdapter');
var EncryptedStorageAdapter = require('./encryptedStorageAdapter');
var TestAdapterWrapper = require('./testAdapterWrapper');
var OptimizedStorageAdapter = require('./optimizedStorageAdapter');

// 适配器类型
var AdapterType = {
  MEMORY: 'memory',    // 内存存储，临时存储
  LOCAL: 'local',      // 本地存储，持久化
  OFFLINE: 'offline',  // 离线存储，支持同步
  ENCRYPTED: 'encrypted', // 加密存储，数据加密
  TEST: 'test',
  OPTIMIZED: 'optimized' // 新增：优化存储适配器
};

/**
 * 存储适配器工厂
 * @param {Object} options 配置选项
 */
function StorageAdapterFactory(options) {
  this.options = options || {};
  this.adapters = {};
}

/**
 * 获取适配器
 * @param {string} type 适配器类型
 * @param {Object} adapterOptions 适配器特定选项
 * @returns {Object} 存储适配器实例
 */
StorageAdapterFactory.prototype.getAdapter = function(type, adapterOptions) {
  // 如果适配器已存在且不需要重新创建，则返回已有实例
  if (this.adapters[type] && !adapterOptions) {
    return this.adapters[type];
  }
  
  var adapter = null;
  var options = Object.assign({}, this.options, adapterOptions || {});
  
  switch (type) {
    case AdapterType.MEMORY:
      adapter = this._createMemoryAdapter(options);
      break;
      
    case AdapterType.LOCAL:
      adapter = this._createLocalAdapter(options);
      break;
      
    case AdapterType.OFFLINE:
      adapter = this._createOfflineAdapter(options);
      break;
      
    case AdapterType.ENCRYPTED:
      adapter = this._createEncryptedAdapter(options);
      break;
      
    case AdapterType.TEST:
      var baseAdapter = this.getAdapter(options.baseType || AdapterType.MEMORY, options);
      adapter = new TestAdapterWrapper(baseAdapter);
      break;
      
    case AdapterType.OPTIMIZED:
      var baseAdapter = this.getAdapter(options.baseType || AdapterType.LOCAL, options);
      adapter = new OptimizedStorageAdapter(baseAdapter, options);
      break;
      
    default:
      console.error('未知的适配器类型:', type);
      // 默认返回优化的本地适配器
      adapter = this.getAdapter(AdapterType.OPTIMIZED, options);
  }
  
  // 缓存适配器实例
  this.adapters[type] = adapter;
  return adapter;
};

/**
 * 创建内存适配器
 * @private
 * @param {Object} options 选项
 * @returns {Object} 内存存储适配器
 */
StorageAdapterFactory.prototype._createMemoryAdapter = function(options) {
  // 简单的内存存储实现
  var storage = {};
  
  return {
    getItem: function(key) {
      return storage[key] ? JSON.parse(JSON.stringify(storage[key])) : null;
    },
    
    setItem: function(key, value) {
      try {
        storage[key] = JSON.parse(JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('存储数据失败:', error);
        return false;
      }
    },
    
    removeItem: function(key) {
      if (storage[key]) {
        delete storage[key];
        return true;
      }
      return false;
    },
    
    clear: function() {
      storage = {};
      return true;
    },
    
    keys: function() {
      return Object.keys(storage);
    },
    
    getStorageInfo: function() {
      var keys = Object.keys(storage);
      var size = 0;
      
      // 估算存储大小
      for (var i = 0; i < keys.length; i++) {
        size += JSON.stringify(storage[keys[i]]).length;
      }
      
      return {
        keys: keys,
        currentSize: size,
        limitSize: options.maxSize || 10 * 1024 * 1024
      };
    }
  };
};

/**
 * 创建本地适配器
 * @private
 * @param {Object} options 选项
 * @returns {Object} 本地存储适配器
 */
StorageAdapterFactory.prototype._createLocalAdapter = function(options) {
  // 基于微信小程序的本地存储实现
  return {
    getItem: function(key) {
      try {
        var value = wx.getStorageSync(key);
        return value !== '' ? value : null;
      } catch (error) {
        console.error('读取存储数据失败:', error);
        return null;
      }
    },
    
    setItem: function(key, value) {
      try {
        wx.setStorageSync(key, value);
        return true;
      } catch (error) {
        console.error('存储数据失败:', error);
        return false;
      }
    },
    
    removeItem: function(key) {
      try {
        wx.removeStorageSync(key);
        return true;
      } catch (error) {
        console.error('删除存储数据失败:', error);
        return false;
      }
    },
    
    clear: function() {
      try {
        wx.clearStorageSync();
        return true;
      } catch (error) {
        console.error('清除存储失败:', error);
        return false;
      }
    },
    
    keys: function() {
      try {
        var res = wx.getStorageInfoSync();
        return res.keys || [];
      } catch (error) {
        console.error('获取存储键失败:', error);
        return [];
      }
    },
    
    getStorageInfo: function() {
      try {
        var res = wx.getStorageInfoSync();
        return {
          keys: res.keys || [],
          currentSize: res.currentSize || 0,
          limitSize: res.limitSize || 10 * 1024 * 1024
        };
      } catch (error) {
        console.error('获取存储信息失败:', error);
        return {
          keys: [],
          currentSize: 0,
          limitSize: 10 * 1024 * 1024
        };
      }
    }
  };
};

/**
 * 创建离线适配器
 * @private
 * @param {Object} options 选项
 * @returns {Object} 离线存储适配器
 */
StorageAdapterFactory.prototype._createOfflineAdapter = function(options) {
  return offlineStorageAdapter.getOfflineStorageAdapterInstance(options);
};

/**
 * 创建加密适配器
 * @private
 * @param {Object} options 选项
 * @returns {Object} 加密存储适配器
 */
StorageAdapterFactory.prototype._createEncryptedAdapter = function(options) {
  // 获取基础适配器，默认是本地适配器
  var baseAdapter = this.getAdapter(options.baseAdapter || AdapterType.LOCAL);
  
  // TODO: 实现实际的加密解密功能
  // 这里仅为简化实现，实际应使用专业加密库
  function encrypt(data, key) {
    // 简单模拟加密，实际项目中请使用proper加密
    var str = JSON.stringify(data);
    return { encrypted: true, data: str };
  }
  
  function decrypt(data, key) {
    // 简单模拟解密
    if (data && data.encrypted) {
      try {
        return JSON.parse(data.data);
      } catch (e) {
        return null;
      }
    }
    return data;
  }
  
  // 返回带加密功能的适配器
  return {
    getItem: function(key) {
      var encryptedData = baseAdapter.getItem(key);
      return encryptedData ? decrypt(encryptedData, options.encryptionKey) : null;
    },
    
    setItem: function(key, value) {
      var encryptedData = encrypt(value, options.encryptionKey);
      return baseAdapter.setItem(key, encryptedData);
    },
    
    removeItem: function(key) {
      return baseAdapter.removeItem(key);
    },
    
    clear: function() {
      return baseAdapter.clear();
    },
    
    keys: function() {
      return baseAdapter.keys();
    },
    
    getStorageInfo: function() {
      return baseAdapter.getStorageInfo();
    }
  };
};

// 单例实例
var storageAdapterFactoryInstance = null;

/**
 * 获取存储适配器工厂单例
 * @param {Object} options 全局配置选项
 * @returns {StorageAdapterFactory} 存储适配器工厂实例
 */
function getStorageAdapterFactoryInstance(options) {
  if (!storageAdapterFactoryInstance) {
    storageAdapterFactoryInstance = new StorageAdapterFactory(options);
  }
  return storageAdapterFactoryInstance;
}

// 导出
module.exports = {
  StorageAdapterFactory: StorageAdapterFactory,
  getStorageAdapterFactoryInstance: getStorageAdapterFactoryInstance,
  AdapterType: AdapterType
}; 