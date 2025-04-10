/**
 * 离线存储适配器
 * 提供在离线环境下的数据存储和同步功能
 * 遵循ES5标准，确保在微信小程序环境兼容
 * 
 * 作者：AI助手
 * 创建日期：2025-04-07
 */

// 避免循环依赖 - 使用延迟加载方式
var _eventBus = null;
var _storageUtils = null;
var _networkUtils = null;

// 获取依赖的辅助函数
function getEventBus() {
  if (!_eventBus) {
    _eventBus = require('../eventBus');
  }
  return _eventBus;
}

function getStorageUtils() {
  if (!_storageUtils) {
    _storageUtils = require('../storageUtils');
  }
  return _storageUtils;
}

function getNetworkUtils() {
  if (!_networkUtils) {
    _networkUtils = require('../networkUtils');
  }
  return _networkUtils;
}

// 同步状态
var SyncState = {
  IDLE: 'idle',           // 空闲状态
  SYNCING: 'syncing',     // 同步中
  PENDING: 'pending',     // 等待同步
  ERROR: 'error'          // 同步错误
};

// 网络状态
var NetworkState = {
  ONLINE: 'online',      // 在线
  OFFLINE: 'offline',    // 离线
  UNSTABLE: 'unstable'   // 不稳定
};

// 冲突解决策略
var ConflictStrategy = {
  CLIENT_WINS: 'client-wins',   // 客户端数据优先
  SERVER_WINS: 'server-wins',   // 服务器数据优先
  TIMESTAMP: 'timestamp',       // 时间戳较新的优先
  VERSION: 'version',           // 版本号较高的优先
  MANUAL: 'manual'              // 手动解决
};

// 默认配置
var DEFAULT_CONFIG = {
  storagePrefix: 'offline_',     // 存储键前缀
  syncQueueKey: 'sync_queue',    // 同步队列存储键
  conflictLogsKey: 'conflict_logs', // 冲突日志存储键
  maxRetryCount: 3,              // 最大重试次数
  retryDelay: 5000,              // 重试延迟(毫秒)
  batchSize: 10,                 // 批量同步大小
  defaultConflictStrategy: ConflictStrategy.TIMESTAMP, // 默认冲突解决策略
  autoSync: true,                // 是否自动同步
  networkCheckInterval: 30000,   // 网络检查间隔(毫秒)
  storageQuota: 9 * 1024 * 1024  // 存储配额(9MB默认)
};

/**
 * 离线存储适配器
 * @param {Object} options 配置选项
 */
function OfflineStorageAdapter(options) {
  this.options = {};
  
  // 合并默认配置
  for (var key in DEFAULT_CONFIG) {
    if (DEFAULT_CONFIG.hasOwnProperty(key)) {
      this.options[key] = DEFAULT_CONFIG[key];
    }
  }
  
  // 合并自定义配置
  if (options) {
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        this.options[key] = options[key];
      }
    }
  }
  
  // 内部状态
  this._storage = {};          // 本地存储数据
  this._serverStorage = {};    // 服务器存储数据(模拟)
  this._syncQueue = [];        // 同步队列
  this._conflictLogs = [];     // 冲突日志
  this._networkState = true;   // 网络状态(默认在线)
  this._networkTimeout = null; // 网络检查定时器
  this._syncState = SyncState.IDLE; // 同步状态
  this._eventHandlers = {};    // 事件处理器
  this._initialized = false;   // 初始化状态
  this._quotaWarning = false;  // 配额警告标志
  
  // 初始化
  this.init();
}

/**
 * 初始化适配器
 */
OfflineStorageAdapter.prototype.init = function() {
  if (this._initialized) return;
  
  // 加载同步队列
  this._loadSyncQueue();
  
  // 加载冲突日志
  this._loadConflictLogs();
  
  // 检查网络状态
  this._checkNetworkStatus();
  
  // 如果启用自动同步，启动网络状态检查
  if (this.options.autoSync) {
    this._startNetworkCheck();
  }
  
  this._initialized = true;
};

/**
 * 获取存储项
 * @param {string} key 存储键
 * @returns {*} 存储的数据，如果不存在则返回null
 */
OfflineStorageAdapter.prototype.getItem = function(key) {
  if (!key) return null;
  
  // 从本地存储获取
  return this._storage[key] ? JSON.parse(JSON.stringify(this._storage[key])) : null;
};

/**
 * 设置存储项
 * @param {string} key 存储键
 * @param {*} value 要存储的数据
 * @returns {boolean} 操作是否成功
 */
OfflineStorageAdapter.prototype.setItem = function(key, value) {
  if (!key) return false;
  
  try {
    // 验证存储配额
    var newValue = JSON.stringify(value);
    var oldSize = this._storage[key] ? JSON.stringify(this._storage[key]).length : 0;
    var newSize = newValue.length;
    var sizeDiff = newSize - oldSize;
    
    if (sizeDiff > 0 && this.getStorageInfo().currentSize + sizeDiff > this.options.storageQuota) {
      // 存储空间不足，设置警告
      this._quotaWarning = true;
      
      // 尝试清理一些空间
      var freedSpace = this.cleanLeastRecentlyUsed(sizeDiff * 1.5); // 多清理一些空间
      if (freedSpace < sizeDiff) {
        // 清理空间不足，操作失败
        return false;
      }
    }
    
    // 保存数据到本地存储
    this._storage[key] = JSON.parse(JSON.stringify(value));
    
    // 如果在线，同步到服务器
    if (this._networkState) {
      this._serverStorage[key] = JSON.parse(JSON.stringify(value));
    } else {
      // 离线状态，添加到同步队列
      this._addToSyncQueue(key, 'set', value);
    }
    
    // 触发数据变更事件
    this._triggerEvent('dataChanged', {
      key: key,
      operation: 'set',
      timestamp: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error('保存数据失败:', error);
    return false;
  }
};

/**
 * 删除存储项
 * @param {string} key 存储键
 * @returns {boolean} 操作是否成功
 */
OfflineStorageAdapter.prototype.removeItem = function(key) {
  if (!key || !this._storage[key]) return false;
  
  try {
    // 从本地存储删除
    delete this._storage[key];
    
    // 如果在线，从服务器删除
    if (this._networkState) {
      delete this._serverStorage[key];
    } else {
      // 离线状态，添加到同步队列
      this._addToSyncQueue(key, 'remove');
    }
    
    // 触发数据变更事件
    this._triggerEvent('dataChanged', {
      key: key,
      operation: 'remove',
      timestamp: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error('删除数据失败:', error);
    return false;
  }
};

/**
 * 获取同步队列
 * @returns {Array} 同步队列
 */
OfflineStorageAdapter.prototype.getSyncQueue = function() {
  return JSON.parse(JSON.stringify(this._syncQueue));
};

/**
 * 从服务器获取存储项
 * @param {string} key 存储键
 * @returns {*} 服务器上存储的数据，如果不存在则返回null
 */
OfflineStorageAdapter.prototype.getItemFromServer = function(key) {
  if (!key) return null;
  
  // 从服务器存储获取(模拟)
  return this._serverStorage[key] ? JSON.parse(JSON.stringify(this._serverStorage[key])) : null;
};

/**
 * 模拟网络状态
 * @param {boolean} state 网络状态(true表示在线，false表示离线)
 * @returns {boolean} 设置后的状态
 */
OfflineStorageAdapter.prototype.simulateNetworkState = function(state) {
  var oldState = this._networkState;
  this._networkState = !!state;
  
  // 如果状态发生变化，触发状态变更事件
  if (oldState !== this._networkState) {
    var newStateStr = this._networkState ? 'online' : 'offline';
    
    // 调用状态变更回调
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(newStateStr);
    }
    
    // 触发网络状态变更事件
    this._triggerEvent('networkStateChanged', {
      state: newStateStr,
      timestamp: Date.now()
    });
    
    // 如果网络恢复在线，尝试同步
    if (this._networkState && this._syncQueue.length > 0 && this.options.autoSync) {
      this.sync();
    }
  }
  
  return this._networkState;
};

/**
 * 执行同步操作
 * @returns {boolean} 同步是否启动
 */
OfflineStorageAdapter.prototype.sync = function() {
  var self = this;
  
  // 如果已经在同步中或离线，不重复启动
  if (this._syncState === SyncState.SYNCING || !this._networkState) {
    return false;
  }
  
  // 没有需要同步的项目
  if (this._syncQueue.length === 0) {
    return false;
  }
  
  // 设置同步状态
  this._syncState = SyncState.SYNCING;
  
  // 触发同步开始事件
  this._triggerEvent('syncStarted', {
    queueSize: this._syncQueue.length,
    timestamp: Date.now()
  });
  
  // 执行同步操作(这里是模拟)
  setTimeout(function() {
    try {
      // 处理同步队列中的操作
      var syncedCount = 0;
      var failedCount = 0;
      var conflictCount = 0;
      
      // 复制队列以便处理，不直接操作原队列
      var queueCopy = self._syncQueue.slice();
      var newQueue = [];
      
      // 处理每个队列项
      for (var i = 0; i < queueCopy.length; i++) {
        var item = queueCopy[i];
        
        // 处理不同操作类型
        if (item.operation === 'set') {
          // 设置操作，检查冲突
          var serverData = self._serverStorage[item.key];
          if (serverData) {
            // 存在服务器数据，检查冲突
            var conflict = self._detectConflict(item.key, item.data, serverData);
            if (conflict) {
              // 存在冲突，根据策略解决
              var resolved = self._resolveConflict(item.key, item.data, serverData, self.options.defaultConflictStrategy);
              if (resolved) {
                // 冲突已解决
                syncedCount++;
              } else {
                // 冲突未解决，保留在队列中
                newQueue.push(item);
                failedCount++;
              }
              conflictCount++;
            } else {
              // 没有冲突，更新服务器数据
              self._serverStorage[item.key] = JSON.parse(JSON.stringify(item.data));
              syncedCount++;
            }
          } else {
            // 不存在服务器数据，直接创建
            self._serverStorage[item.key] = JSON.parse(JSON.stringify(item.data));
            syncedCount++;
          }
        } else if (item.operation === 'remove') {
          // 删除操作
          delete self._serverStorage[item.key];
          syncedCount++;
        }
      }
      
      // 更新同步队列
      self._syncQueue = newQueue;
      
      // 保存更新后的同步队列
      self._saveSyncQueue();
      
      // 设置同步状态为空闲
      self._syncState = SyncState.IDLE;
      
      // 触发同步完成事件
      self._triggerEvent('syncCompleted', {
        success: true,
        synced: syncedCount,
        failed: failedCount,
        conflicts: conflictCount,
        remaining: newQueue.length,
        timestamp: Date.now()
      });
    } catch (error) {
      // 同步发生错误
      console.error('同步过程错误:', error);
      
      // 设置同步状态为错误
      self._syncState = SyncState.ERROR;
      
      // 触发同步错误事件
      self._triggerEvent('syncError', {
        error: error.message || '未知错误',
        timestamp: Date.now()
      });
    }
  }, 500); // 模拟网络延迟
  
  return true;
};

/**
 * 获取存储信息
 * @returns {Object} 存储信息
 */
OfflineStorageAdapter.prototype.getStorageInfo = function() {
  var keys = Object.keys(this._storage);
  var currentSize = 0;
  
  // 计算当前存储大小
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    currentSize += JSON.stringify(this._storage[key]).length;
  }
  
  return {
    currentSize: currentSize,
    limitSize: this.options.storageQuota,
    keys: keys
  };
};

/**
 * 清理最近最少使用的数据
 * @param {number} bytesToFree 需要释放的字节数
 * @returns {number} 实际释放的字节数
 */
OfflineStorageAdapter.prototype.cleanLeastRecentlyUsed = function(bytesToFree) {
  if (!bytesToFree || bytesToFree <= 0) return 0;
  
  var keys = Object.keys(this._storage);
  var self = this;
  var freedBytes = 0;
  
  // 获取所有存储项的访问时间
  var itemsWithTime = keys.map(function(key) {
    return {
      key: key,
      timestamp: (self._storage[key].timestamp || 0),
      size: JSON.stringify(self._storage[key]).length
    };
  });
  
  // 按访问时间升序排序(最早访问的排前面)
  itemsWithTime.sort(function(a, b) {
    return a.timestamp - b.timestamp;
  });
  
  // 从最早访问的开始删除，直到释放足够空间
  for (var i = 0; i < itemsWithTime.length && freedBytes < bytesToFree; i++) {
    var item = itemsWithTime[i];
    
    // 不删除正在同步队列中的项
    var inSyncQueue = this._syncQueue.some(function(queueItem) {
      return queueItem.key === item.key;
    });
    
    if (!inSyncQueue) {
      freedBytes += item.size;
      delete this._storage[item.key];
      
      // 触发清理事件
      this._triggerEvent('itemCleaned', {
        key: item.key,
        size: item.size,
        timestamp: Date.now()
      });
    }
  }
  
  // 重置配额警告状态
  if (freedBytes > 0) {
    this._quotaWarning = false;
  }
  
  return freedBytes;
};

/**
 * 检查是否有配额警告
 * @returns {boolean} 是否有配额警告
 */
OfflineStorageAdapter.prototype.hasQuotaWarning = function() {
  return this._quotaWarning;
};

/**
 * 添加到同步队列
 * @private
 * @param {string} key 键
 * @param {string} operation 操作类型('set'或'remove')
 * @param {*} data 数据(仅用于'set'操作)
 */
OfflineStorageAdapter.prototype._addToSyncQueue = function(key, operation, data) {
  // 检查是否已在队列中
  var existingIndex = -1;
  for (var i = 0; i < this._syncQueue.length; i++) {
    if (this._syncQueue[i].key === key) {
      existingIndex = i;
      break;
    }
  }
  
  // 如果存在，更新它
  if (existingIndex >= 0) {
    if (operation === 'remove') {
      // 如果新操作是删除，可能需要特殊处理
      if (this._syncQueue[existingIndex].operation === 'set') {
        // 如果之前是设置操作，现在是删除，直接移除这个队列项
        this._syncQueue.splice(existingIndex, 1);
      } else {
        // 更新操作
        this._syncQueue[existingIndex].operation = operation;
        this._syncQueue[existingIndex].timestamp = Date.now();
      }
    } else {
      // 更新操作
      this._syncQueue[existingIndex].operation = operation;
      this._syncQueue[existingIndex].data = data ? JSON.parse(JSON.stringify(data)) : null;
      this._syncQueue[existingIndex].timestamp = Date.now();
    }
  } else {
    // 不存在，添加新项
    this._syncQueue.push({
      key: key,
      operation: operation,
      data: operation === 'set' ? JSON.parse(JSON.stringify(data)) : null,
      timestamp: Date.now(),
      retryCount: 0
    });
  }
  
  // 保存更新后的同步队列
  this._saveSyncQueue();
  
  // 如果队列从空变为非空，且在线且自动同步，触发同步
  if (this._syncQueue.length === 1 && this._networkState && this.options.autoSync) {
    this.sync();
  }
};

/**
 * 加载同步队列
 * @private
 */
OfflineStorageAdapter.prototype._loadSyncQueue = function() {
  // 这里是模拟实现，实际应该从本地存储读取
  this._syncQueue = [];
};

/**
 * 保存同步队列
 * @private
 */
OfflineStorageAdapter.prototype._saveSyncQueue = function() {
  // 这里是模拟实现，实际应该保存到本地存储
};

/**
 * 加载冲突日志
 * @private
 */
OfflineStorageAdapter.prototype._loadConflictLogs = function() {
  // 这里是模拟实现，实际应该从本地存储读取
  this._conflictLogs = [];
};

/**
 * 保存冲突日志
 * @private
 */
OfflineStorageAdapter.prototype._saveConflictLogs = function() {
  // 这里是模拟实现，实际应该保存到本地存储
};

/**
 * 检查网络状态
 * @private
 */
OfflineStorageAdapter.prototype._checkNetworkStatus = function() {
  var self = this;
  
  // 在实际应用中，应该使用wx.getNetworkType获取实际状态
  // 这里简化为直接设置为在线状态
  this._networkState = true;
  
  // 触发网络状态事件
  this._triggerEvent('networkStateChanged', {
    state: 'online',
    timestamp: Date.now()
  });
};

/**
 * 启动网络状态检查
 * @private
 */
OfflineStorageAdapter.prototype._startNetworkCheck = function() {
  var self = this;
  
  // 清除现有定时器
  if (this._networkTimeout) {
    clearInterval(this._networkTimeout);
  }
  
  // 创建新定时器，定期检查网络状态
  this._networkTimeout = setInterval(function() {
    self._checkNetworkStatus();
  }, this.options.networkCheckInterval);
};

/**
 * 停止网络状态检查
 * @private
 */
OfflineStorageAdapter.prototype._stopNetworkCheck = function() {
  if (this._networkTimeout) {
    clearInterval(this._networkTimeout);
    this._networkTimeout = null;
  }
};

/**
 * 检测数据冲突
 * @private
 * @param {string} key 键
 * @param {*} clientData 客户端数据
 * @param {*} serverData 服务器数据
 * @returns {boolean} 是否存在冲突
 */
OfflineStorageAdapter.prototype._detectConflict = function(key, clientData, serverData) {
  // 简单实现：比较JSON字符串是否相同
  return JSON.stringify(clientData) !== JSON.stringify(serverData);
};

/**
 * 解决数据冲突
 * @private
 * @param {string} key 键
 * @param {*} clientData 客户端数据
 * @param {*} serverData 服务器数据
 * @param {string} strategy 冲突解决策略
 * @returns {boolean} 是否成功解决冲突
 */
OfflineStorageAdapter.prototype._resolveConflict = function(key, clientData, serverData, strategy) {
  var winnerData = null;
  var resolvedBy = '';
  
  // 根据策略解决冲突
  switch (strategy) {
    case ConflictStrategy.CLIENT_WINS:
      winnerData = clientData;
      resolvedBy = 'client-wins';
      break;
      
    case ConflictStrategy.SERVER_WINS:
      winnerData = serverData;
      resolvedBy = 'server-wins';
      break;
      
    case ConflictStrategy.TIMESTAMP:
      // 比较时间戳，选择较新的
      if (clientData.timestamp && serverData.timestamp) {
        if (clientData.timestamp > serverData.timestamp) {
          winnerData = clientData;
        } else {
          winnerData = serverData;
        }
        resolvedBy = 'timestamp';
      } else {
        // 缺少时间戳，默认使用服务器数据
        winnerData = serverData;
        resolvedBy = 'default-to-server';
      }
      break;
      
    case ConflictStrategy.VERSION:
      // 比较版本号，选择较高的
      if (clientData.version !== undefined && serverData.version !== undefined) {
        if (clientData.version > serverData.version) {
          winnerData = clientData;
        } else {
          winnerData = serverData;
        }
        resolvedBy = 'version';
      } else {
        // 缺少版本号，默认使用服务器数据
        winnerData = serverData;
        resolvedBy = 'default-to-server';
      }
      break;
      
    case ConflictStrategy.MANUAL:
      // 手动解决需要外部介入，先保持未解决状态
      return false;
      
    default:
      // 默认使用服务器数据
      winnerData = serverData;
      resolvedBy = 'default-to-server';
  }
  
  // 记录冲突日志
  this._conflictLogs.push({
    key: key,
    resolvedBy: resolvedBy,
    clientData: JSON.parse(JSON.stringify(clientData)),
    serverData: JSON.parse(JSON.stringify(serverData)),
    winnerData: JSON.parse(JSON.stringify(winnerData)),
    timestamp: Date.now()
  });
  
  // 保存冲突日志
  this._saveConflictLogs();
  
  // 更新数据
  this._storage[key] = JSON.parse(JSON.stringify(winnerData));
  this._serverStorage[key] = JSON.parse(JSON.stringify(winnerData));
  
  // 触发冲突解决事件
  this._triggerEvent('conflictResolved', {
    key: key,
    resolvedBy: resolvedBy,
    timestamp: Date.now()
  });
  
  return true;
};

/**
 * 触发事件
 * @private
 * @param {string} eventName 事件名称
 * @param {Object} data 事件数据
 */
OfflineStorageAdapter.prototype._triggerEvent = function(eventName, data) {
  if (!eventName) return;
  
  // 调用事件处理器
  var handlers = this._eventHandlers[eventName] || [];
  handlers.forEach(function(handler) {
    try {
      handler(data);
    } catch (error) {
      console.error('事件处理器执行错误:', error);
    }
  });
  
  // 发送到事件总线(如果可用)
  try {
    var eventBus = getEventBus();
    if (eventBus) {
      eventBus.emit('offlineAdapter:' + eventName, data);
    }
  } catch (error) {
    console.error('发送到事件总线错误:', error);
  }
};

/**
 * 注册事件处理器
 * @param {string} eventName 事件名称
 * @param {Function} handler 处理函数
 * @returns {Function} 用于取消注册的函数
 */
OfflineStorageAdapter.prototype.on = function(eventName, handler) {
  if (!eventName || typeof handler !== 'function') return function() {};
  
  // 确保事件处理器数组存在
  if (!this._eventHandlers[eventName]) {
    this._eventHandlers[eventName] = [];
  }
  
  // 添加处理器
  this._eventHandlers[eventName].push(handler);
  
  // 返回取消注册的函数
  var self = this;
  return function() {
    self.off(eventName, handler);
  };
};

/**
 * 取消注册事件处理器
 * @param {string} eventName 事件名称
 * @param {Function} handler 处理函数
 */
OfflineStorageAdapter.prototype.off = function(eventName, handler) {
  if (!eventName || !this._eventHandlers[eventName]) return;
  
  if (handler) {
    // 移除特定处理器
    var index = this._eventHandlers[eventName].indexOf(handler);
    if (index !== -1) {
      this._eventHandlers[eventName].splice(index, 1);
    }
  } else {
    // 移除所有处理器
    this._eventHandlers[eventName] = [];
  }
};

// 单例实例
var offlineStorageAdapterInstance = null;

/**
 * 获取离线存储适配器单例
 * @param {Object} options 配置选项
 * @returns {OfflineStorageAdapter} 离线存储适配器实例
 */
function getOfflineStorageAdapterInstance(options) {
  if (!offlineStorageAdapterInstance) {
    offlineStorageAdapterInstance = new OfflineStorageAdapter(options);
  }
  return offlineStorageAdapterInstance;
}

// 导出
module.exports = {
  OfflineStorageAdapter: OfflineStorageAdapter,
  getOfflineStorageAdapterInstance: getOfflineStorageAdapterInstance,
  NetworkState: NetworkState,
  SyncState: SyncState,
  ConflictStrategy: ConflictStrategy
}; 