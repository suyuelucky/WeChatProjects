/**
 * 测试适配器包装器
 * 将实际的存储适配器包装成测试套件可用的格式
 * 遵循ES5标准，确保在微信小程序环境兼容
 * 
 * 作者：AI助手
 * 创建日期：2025-04-07
 */

// 导入依赖
var storageAdapterFactory = require('./storageAdapterFactory');
var storageConfig = require('./storageConfig');

/**
 * 创建测试适配器包装器
 * @param {Object} adapter 实际的存储适配器
 * @param {Object} options 测试选项
 * @returns {Object} 符合测试接口的适配器
 */
function createTestAdapter(adapter, options) {
  options = options || {};
  
  // 测试记录
  var operations = [];
  var networkState = true;
  var quotaWarning = false;
  
  // 创建符合测试接口的适配器
  var testAdapter = {
    // 存储容器(直接映射)
    _storage: {},
    _serverStorage: {},
    _syncQueue: [],
    _conflictLogs: [],
    _networkState: networkState,
    _conflictStrategy: options.conflictStrategy || 'timestamp',
    _quotaWarning: quotaWarning,
    
    // 基本存储方法
    getItem: function(key) {
      logOperation('getItem', key);
      
      if (shouldSimulateError('getItem', options)) {
        throw new Error('模拟获取错误');
      }
      
      return adapter.getItem(key);
    },
    
    setItem: function(key, value) {
      logOperation('setItem', key, value);
      
      if (shouldSimulateError('setItem', options)) {
        throw new Error('模拟设置错误');
      }
      
      // 更新内部状态
      this._storage[key] = value;
      
      if (this._networkState) {
        this._serverStorage[key] = JSON.parse(JSON.stringify(value));
      } else {
        // 添加到同步队列
        addToSyncQueue(this, key, 'set', value);
      }
      
      return adapter.setItem(key, value);
    },
    
    removeItem: function(key) {
      logOperation('removeItem', key);
      
      if (shouldSimulateError('removeItem', options)) {
        throw new Error('模拟删除错误');
      }
      
      // 更新内部状态
      delete this._storage[key];
      
      if (this._networkState) {
        delete this._serverStorage[key];
      } else {
        // 添加到同步队列
        addToSyncQueue(this, key, 'remove');
      }
      
      return adapter.removeItem(key);
    },
    
    // 服务器数据操作
    getItemFromServer: function(key) {
      return this._serverStorage[key] ? JSON.parse(JSON.stringify(this._serverStorage[key])) : null;
    },
    
    removeServerItem: function(key) {
      delete this._serverStorage[key];
      return true;
    },
    
    simulateServerData: function(key, data) {
      this._serverStorage[key] = JSON.parse(JSON.stringify(data));
      return true;
    },
    
    // 同步相关
    getSyncQueue: function() {
      return JSON.parse(JSON.stringify(this._syncQueue));
    },
    
    sync: function() {
      logOperation('sync');
      
      if (shouldSimulateError('sync', options)) {
        throw new Error('模拟同步错误');
      }
      
      if (!this._networkState) {
        return false;
      }
      
      var syncCount = 0;
      var failCount = 0;
      
      // 处理同步队列
      var newQueue = [];
      
      this._syncQueue.forEach(function(item) {
        if (item.operation === 'set') {
          // 设置操作
          this._serverStorage[item.key] = JSON.parse(JSON.stringify(item.data));
          syncCount++;
        } else if (item.operation === 'remove') {
          // 删除操作
          delete this._serverStorage[item.key];
          syncCount++;
        } else {
          // 未知操作，保留在队列中
          newQueue.push(item);
          failCount++;
        }
      }, this);
      
      // 更新同步队列
      this._syncQueue = newQueue;
      
      // 如果适配器有实际的同步方法，调用它
      if (adapter.sync && typeof adapter.sync === 'function') {
        adapter.sync();
      }
      
      return true;
    },
    
    simulateSync: function() {
      return this.sync();
    },
    
    // 网络状态
    simulateNetworkState: function(state) {
      logOperation('simulateNetworkState', state);
      
      var oldState = this._networkState;
      this._networkState = !!state;
      
      // 触发状态变更事件
      if (oldState !== this._networkState && typeof this.onStateChange === 'function') {
        this.onStateChange(this._networkState ? 'online' : 'offline');
      }
      
      return this._networkState;
    },
    
    // 存储信息
    getStorageInfo: function() {
      if (shouldSimulateError('getStorageInfo', options)) {
        throw new Error('模拟获取存储信息错误');
      }
      
      var storageInfo = adapter.getStorageInfo ? adapter.getStorageInfo() : {
        currentSize: 0,
        limitSize: options.storageLimit || 10 * 1024 * 1024,
        keys: []
      };
      
      return {
        currentSize: storageInfo.currentSize,
        limitSize: storageInfo.limitSize,
        keys: storageInfo.keys
      };
    },
    
    cleanLeastRecentlyUsed: function(bytesToFree) {
      logOperation('cleanLeastRecentlyUsed', bytesToFree);
      
      if (shouldSimulateError('cleanLeastRecentlyUsed', options)) {
        throw new Error('模拟清理存储错误');
      }
      
      var freedBytes = 0;
      
      // 尝试从适配器清理空间
      if (adapter.cleanLeastRecentlyUsed && typeof adapter.cleanLeastRecentlyUsed === 'function') {
        freedBytes = adapter.cleanLeastRecentlyUsed(bytesToFree);
      } else {
        // 模拟清理
        this._quotaWarning = false;
        freedBytes = bytesToFree;
      }
      
      return freedBytes;
    },
    
    hasQuotaWarning: function() {
      return this._quotaWarning;
    },
    
    // 事件监听器
    onStateChange: null,
    
    // 测试辅助方法
    getOperations: function() {
      return operations;
    },
    
    clearOperations: function() {
      operations = [];
    },
    
    simulateQuotaWarning: function(isWarning) {
      this._quotaWarning = !!isWarning;
    }
  };
  
  // 内部辅助函数
  function logOperation(type, key, value) {
    operations.push({
      type: type,
      key: key,
      value: value,
      timestamp: Date.now()
    });
  }
  
  function shouldSimulateError(operation, options) {
    if (!options.simulateErrors) return false;
    
    var errorRates = options.errorRates || {};
    var rate = errorRates[operation] || 0;
    
    return Math.random() < rate;
  }
  
  function addToSyncQueue(adapter, key, operation, data) {
    // 检查是否已存在于队列中
    var existingIndex = -1;
    for (var i = 0; i < adapter._syncQueue.length; i++) {
      if (adapter._syncQueue[i].key === key) {
        existingIndex = i;
        break;
      }
    }
    
    // 处理现有项
    if (existingIndex >= 0) {
      if (operation === 'remove') {
        // 如果新操作是删除，且原操作是设置，直接从队列中删除
        if (adapter._syncQueue[existingIndex].operation === 'set') {
          adapter._syncQueue.splice(existingIndex, 1);
        } else {
          // 更新操作
          adapter._syncQueue[existingIndex].operation = operation;
          adapter._syncQueue[existingIndex].timestamp = Date.now();
        }
      } else {
        // 更新操作
        adapter._syncQueue[existingIndex].operation = operation;
        adapter._syncQueue[existingIndex].data = data ? JSON.parse(JSON.stringify(data)) : null;
        adapter._syncQueue[existingIndex].timestamp = Date.now();
      }
    } else {
      // 添加新项
      adapter._syncQueue.push({
        key: key,
        operation: operation,
        data: operation === 'set' ? JSON.parse(JSON.stringify(data)) : null,
        timestamp: Date.now(),
        retryCount: 0
      });
    }
  }
  
  // 初始化
  // 尝试从适配器获取初始存储状态
  if (adapter.keys && typeof adapter.keys === 'function') {
    var keys = adapter.keys();
    keys.forEach(function(key) {
      var value = adapter.getItem(key);
      if (value !== null) {
        testAdapter._storage[key] = value;
        testAdapter._serverStorage[key] = JSON.parse(JSON.stringify(value));
      }
    });
  }
  
  return testAdapter;
}

/**
 * 将实际的存储适配器包装为测试套件适配器
 * @param {string} adapterType 适配器类型
 * @param {Object} options 选项
 * @returns {Object} 测试适配器
 */
function wrapRealAdapter(adapterType, options) {
  options = options || {};
  
  // 获取适配器工厂
  var factory = storageAdapterFactory.getStorageAdapterFactoryInstance();
  
  // 获取真实适配器
  var realAdapter = factory.getAdapter(adapterType, options);
  
  // 包装为测试适配器
  return createTestAdapter(realAdapter, options);
}

// 导出
module.exports = {
  createTestAdapter: createTestAdapter,
  wrapRealAdapter: wrapRealAdapter
}; 