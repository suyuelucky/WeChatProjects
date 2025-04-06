/**
 * 离线存储同步模块
 * 负责管理离线数据的同步功能
 * 遵循ES5标准，确保在微信小程序环境兼容
 */

var eventBus = require('./eventBus');

// 解决循环依赖问题 - 延迟加载方式
var _storageUtils = null;
var _storage = null;
var _networkUtils = null;

// 内部获取依赖函数，延迟加载
function getStorageUtils() {
  if (!_storageUtils) {
    _storageUtils = require('./storageUtils');
  }
  return _storageUtils;
}

function getStorage() {
  if (!_storage) {
    _storage = getStorageUtils().storage;
  }
  return _storage;
}

function getNetworkUtils() {
  if (!_networkUtils) {
    _networkUtils = require('./networkUtils');
  }
  return _networkUtils;
}

// 同步状态
var SyncStatus = {
  IDLE: 'idle',           // 空闲状态
  SYNCING: 'syncing',     // 同步中
  PENDING: 'pending',     // 等待同步
  SUCCESS: 'success',     // 同步成功
  ERROR: 'error',         // 同步错误
  CONFLICT: 'conflict'    // 同步冲突
};

// 同步操作类型
var SyncOperationType = {
  CREATE: 'create',  // 创建
  UPDATE: 'update',  // 更新
  DELETE: 'delete'   // 删除
};

// 同步优先级
var SyncPriority = {
  HIGH: 'high',       // 高优先级，立即同步
  NORMAL: 'normal',   // 普通优先级，正常同步
  LOW: 'low',         // 低优先级，空闲时同步
  BACKGROUND: 'background' // 后台同步，仅当条件满足时同步
};

// 默认配置
var DEFAULT_CONFIG = {
  syncQueueKey: 'sync_operation_queue',         // 同步队列存储键
  syncResultKey: 'sync_operation_results',      // 同步结果存储键
  syncInterval: 30 * 1000,                      // 同步间隔（30秒）
  maxRetryCount: 3,                             // 最大重试次数
  retryDelay: 5 * 1000,                         // 重试延迟（5秒）
  maxQueueSize: 1000,                           // 最大队列长度
  networkRequirement: 'any',                    // 网络要求（any, wifi, 4g）
  batchSize: 10,                                // 批量同步大小
  autoSync: true,                               // 自动同步
  conflictStrategy: 'server-wins',              // 冲突策略（server-wins, client-wins, manual）
  logEnabled: true,                             // 是否记录日志
  preserveAfterSync: false,                     // 同步后是否保留本地数据
  priorityProcessing: true                      // 是否按优先级处理
};

/**
 * 离线存储同步管理器
 * @param {Object} config 配置
 */
function OfflineStorageSync(config) {
  this.config = {};
  
  // 合并配置
  for (var key in DEFAULT_CONFIG) {
    if (DEFAULT_CONFIG.hasOwnProperty(key)) {
      this.config[key] = DEFAULT_CONFIG[key];
    }
  }
  
  if (config) {
    for (var key in config) {
      if (config.hasOwnProperty(key)) {
        this.config[key] = config[key];
      }
    }
  }
  
  this.syncQueue = [];
  this.syncResults = [];
  this.currentStatus = SyncStatus.IDLE;
  this.syncTimer = null;
  this.isInitialized = false;
  this.handlers = {};  // 存储不同数据类型的处理器
  
  // 初始化
  this.init();
}

/**
 * 初始化同步管理器
 */
OfflineStorageSync.prototype.init = function() {
  var self = this;
  
  // 加载同步队列
  this.loadSyncQueue().then(function() {
    self.loadSyncResults().then(function() {
      self.isInitialized = true;
      
      // 如果开启了自动同步，启动同步定时器
      if (self.config.autoSync) {
        self.startSyncTimer();
      }
      
      // 监听网络状态变化
      self.listenToNetworkChanges();
      
      // 监听应用状态变化
      self.listenToAppStateChanges();
      
      // 触发初始化完成事件
      eventBus.emit('offlineSync:initialized', {
        timestamp: Date.now(),
        queueSize: self.syncQueue.length,
        resultsSize: self.syncResults.length
      });
    });
  });
};

/**
 * 注册特定数据类型的同步处理器
 * @param {string} dataType 数据类型
 * @param {Object} handler 处理器
 */
OfflineStorageSync.prototype.registerHandler = function(dataType, handler) {
  if (!dataType || typeof handler !== 'object') {
    console.error('注册同步处理器失败：参数无效');
    return;
  }
  
  // 验证处理器是否包含必要的方法
  var requiredMethods = ['sync', 'validateData'];
  for (var i = 0; i < requiredMethods.length; i++) {
    var method = requiredMethods[i];
    if (typeof handler[method] !== 'function') {
      console.error('注册同步处理器失败：缺少必要方法 ' + method);
      return;
    }
  }
  
  this.handlers[dataType] = handler;
  console.log('成功注册 ' + dataType + ' 同步处理器');
};

/**
 * The addToSyncQueue method.
 * 添加数据操作到同步队列
 * @param {string} dataType 数据类型
 * @param {string} operationType 操作类型（SyncOperationType）
 * @param {Object} data 数据对象
 * @param {Object} options 选项
 * @returns {Promise<string>} 操作ID
 */
OfflineStorageSync.prototype.addToSyncQueue = function(dataType, operationType, data, options) {
  var self = this;
  options = options || {};
  
  return new Promise(function(resolve, reject) {
    if (!self.isInitialized) {
      reject(new Error('同步管理器尚未初始化'));
      return;
    }
    
    if (!self.handlers[dataType]) {
      reject(new Error('未找到数据类型 "' + dataType + '" 的处理器'));
      return;
    }
    
    // 验证操作类型
    var validOperations = Object.values(SyncOperationType);
    if (validOperations.indexOf(operationType) === -1) {
      reject(new Error('无效的操作类型：' + operationType));
      return;
    }
    
    // 验证数据
    var handler = self.handlers[dataType];
    if (handler.validateData && !handler.validateData(data, operationType)) {
      reject(new Error('数据验证失败'));
      return;
    }
    
    // 检查队列大小限制
    if (self.syncQueue.length >= self.config.maxQueueSize) {
      // 如果达到最大队列长度，根据策略处理
      if (options.overwriteOldest) {
        // 移除最旧的非高优先级项
        var removed = false;
        for (var i = 0; i < self.syncQueue.length; i++) {
          if (self.syncQueue[i].priority !== SyncPriority.HIGH) {
            self.syncQueue.splice(i, 1);
            removed = true;
            break;
          }
        }
        
        if (!removed) {
          reject(new Error('同步队列已满，且无法移除较低优先级项'));
          return;
        }
      } else {
        reject(new Error('同步队列已达到最大长度：' + self.config.maxQueueSize));
        return;
      }
    }
    
    // 创建同步操作项
    var operationId = 'op_' + dataType + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    var syncItem = {
      id: operationId,
      dataType: dataType,
      operationType: operationType,
      data: data,
      createdAt: Date.now(),
      status: SyncStatus.PENDING,
      retryCount: 0,
      priority: options.priority || SyncPriority.NORMAL,
      lastAttempt: null,
      error: null,
      dependsOn: options.dependsOn || null,
      clientId: options.clientId || null
    };
    
    // 添加到队列
    self.syncQueue.push(syncItem);
    
    // 如果是高优先级，且当前非同步状态，立即开始同步
    if (syncItem.priority === SyncPriority.HIGH && self.currentStatus === SyncStatus.IDLE) {
      self.startSync();
    }
    
    // 保存队列状态
    self.saveSyncQueue().then(function() {
      // 触发队列更新事件
      eventBus.emit('offlineSync:queueUpdated', {
        action: 'added',
        item: syncItem,
        queueSize: self.syncQueue.length
      });
      
      resolve(operationId);
    }).catch(function(error) {
      console.error('保存同步队列失败:', error);
      
      // 仍然返回操作ID，但记录错误
      resolve(operationId);
    });
  });
};

/**
 * 开始同步处理
 * @returns {Promise<boolean>} 是否成功执行同步
 */
OfflineStorageSync.prototype.startSync = function() {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    if (!self.isInitialized) {
      reject(new Error('同步管理器尚未初始化'));
      return;
    }
    
    // 如果已经在同步中，直接返回
    if (self.currentStatus === SyncStatus.SYNCING) {
      resolve(false);
      return;
    }
    
    // 检查网络状态
    getNetworkUtils().getNetworkType().then(function(networkType) {
      // 根据网络要求检查是否可以同步
      if (!self.canSyncWithNetworkType(networkType)) {
        console.log('当前网络类型不满足同步要求:', networkType);
        resolve(false);
        return;
      }
      
      // 检查是否有需要同步的项目
      if (self.syncQueue.length === 0) {
        resolve(false);
        return;
      }
      
      // 更新状态为同步中
      self.currentStatus = SyncStatus.SYNCING;
      
      // 触发同步开始事件
      eventBus.emit('offlineSync:syncStarted', {
        timestamp: Date.now(),
        queueSize: self.syncQueue.length
      });
      
      // 处理队列中的项目
      self.processSyncQueue().then(function(results) {
        // 更新状态为空闲
        self.currentStatus = SyncStatus.IDLE;
        
        // 触发同步完成事件
        eventBus.emit('offlineSync:syncCompleted', {
          timestamp: Date.now(),
          results: results,
          successful: results.filter(function(r) { return r.success; }).length,
          failed: results.filter(function(r) { return !r.success; }).length
        });
        
        resolve(true);
      }).catch(function(error) {
        // 更新状态为空闲
        self.currentStatus = SyncStatus.IDLE;
        
        // 触发同步错误事件
        eventBus.emit('offlineSync:syncError', {
          timestamp: Date.now(),
          error: error
        });
        
        reject(error);
      });
    });
  });
};

/**
 * 处理同步队列
 * @returns {Promise<Array>} 同步结果
 */
OfflineStorageSync.prototype.processSyncQueue = function() {
  var self = this;
  
  return new Promise(function(resolve) {
    var results = [];
    var batch = [];
    
    // 根据配置，确定处理批次大小
    var batchSize = self.config.batchSize;
    
    // 如果启用优先级处理，进行排序
    if (self.config.priorityProcessing) {
      self.syncQueue.sort(function(a, b) {
        // 首先按优先级排序
        var priorityOrder = {
          'high': 0,
          'normal': 1,
          'low': 2,
          'background': 3
        };
        
        var aPriority = priorityOrder[a.priority] || 1;
        var bPriority = priorityOrder[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // 然后按创建时间排序
        return a.createdAt - b.createdAt;
      });
    }
    
    // 过滤出可以处理的项目（考虑依赖关系）
    var processableItems = self.getProcessableItems();
    
    // 取出当前批次需要处理的项目
    batch = processableItems.slice(0, batchSize);
    
    if (batch.length === 0) {
      resolve(results);
      return;
    }
    
    // 同步每个项目
    var promises = [];
    for (var i = 0; i < batch.length; i++) {
      promises.push(self.processSyncItem(batch[i]));
    }
    
    Promise.all(promises).then(function(itemResults) {
      // 收集结果
      results = results.concat(itemResults);
      
      // 更新同步队列和结果
      self.updateQueueAfterProcessing(batch, itemResults).then(function() {
        // 保存同步结果
        self.saveSyncResults().then(function() {
          // 检查是否还有项目需要处理
          if (self.syncQueue.length > 0) {
            // 递归处理下一批
            self.processSyncQueue().then(function(nextResults) {
              resolve(results.concat(nextResults));
            });
          } else {
            resolve(results);
          }
        });
      });
    });
  });
};

/**
 * 获取当前可以处理的同步项目
 * @returns {Array} 可处理的同步项目
 */
OfflineStorageSync.prototype.getProcessableItems = function() {
  var completedIds = this.syncResults
    .filter(function(result) { return result.success; })
    .map(function(result) { return result.id; });
  
  return this.syncQueue.filter(function(item) {
    // 检查依赖是否已处理
    if (item.dependsOn) {
      return completedIds.indexOf(item.dependsOn) !== -1;
    }
    return true;
  });
};

/**
 * 处理单个同步项目
 * @param {Object} item 同步项目
 * @returns {Promise<Object>} 同步结果
 */
OfflineStorageSync.prototype.processSyncItem = function(item) {
  var self = this;
  
  return new Promise(function(resolve) {
    // 更新最后尝试时间
    item.lastAttempt = Date.now();
    
    // 获取对应的处理器
    var handler = self.handlers[item.dataType];
    if (!handler) {
      resolve({
        id: item.id,
        success: false,
        error: '未找到数据类型 "' + item.dataType + '" 的处理器',
        timestamp: Date.now()
      });
      return;
    }
    
    // 调用处理器的同步方法
    handler.sync(item.operationType, item.data).then(function(result) {
      // 同步成功
      resolve({
        id: item.id,
        success: true,
        result: result,
        timestamp: Date.now()
      });
    }).catch(function(error) {
      // 是否应该重试
      var shouldRetry = item.retryCount < self.config.maxRetryCount;
      
      // 检查错误是否是冲突
      var isConflict = error && error.isConflict;
      
      if (isConflict && handler.resolveConflict) {
        // 调用冲突解决方法
        handler.resolveConflict(item.data, error.serverData, self.config.conflictStrategy)
          .then(function(resolvedData) {
            // 更新数据并重试
            item.data = resolvedData;
            item.status = SyncStatus.PENDING;
            resolve({
              id: item.id,
              success: false,
              error: '冲突已解决，等待重试',
              isConflict: true,
              isResolved: true,
              shouldRetry: true,
              timestamp: Date.now()
            });
          })
          .catch(function() {
            // 无法解决冲突
            resolve({
              id: item.id,
              success: false,
              error: '无法解决同步冲突',
              isConflict: true,
              isResolved: false,
              shouldRetry: false,
              timestamp: Date.now()
            });
          });
      } else {
        // 普通错误处理
        resolve({
          id: item.id,
          success: false,
          error: error ? error.message || String(error) : '未知错误',
          shouldRetry: shouldRetry,
          timestamp: Date.now()
        });
      }
    });
  });
};

/**
 * 处理同步后更新队列和结果
 * @param {Array} processedItems 已处理的项目
 * @param {Array} results 处理结果
 * @returns {Promise} 操作完成
 */
OfflineStorageSync.prototype.updateQueueAfterProcessing = function(processedItems, results) {
  var self = this;
  
  return new Promise(function(resolve) {
    // 遍历处理结果
    for (var i = 0; i < results.length; i++) {
      var result = results[i];
      var item = processedItems.find(function(item) { return item.id === result.id; });
      
      if (!item) continue;
      
      if (result.success) {
        // 成功处理，从队列中移除
        var index = self.syncQueue.findIndex(function(qi) { return qi.id === item.id; });
        if (index !== -1) {
          self.syncQueue.splice(index, 1);
        }
        
        // 添加到结果列表
        self.syncResults.push(result);
      } else if (result.shouldRetry) {
        // 需要重试，更新状态
        item.retryCount++;
        item.status = SyncStatus.PENDING;
        item.error = result.error;
      } else {
        // 不再重试，从队列中移除
        var index = self.syncQueue.findIndex(function(qi) { return qi.id === item.id; });
        if (index !== -1) {
          self.syncQueue.splice(index, 1);
        }
        
        // 添加到结果列表（失败）
        self.syncResults.push(result);
      }
    }
    
    // 保存更新后的队列
    self.saveSyncQueue().then(resolve);
  });
};

/**
 * 加载同步队列
 * @returns {Promise} 加载完成
 */
OfflineStorageSync.prototype.loadSyncQueue = function() {
  var self = this;
  
  return getStorage().get(this.config.syncQueueKey, [])
    .then(function(queue) {
      self.syncQueue = Array.isArray(queue) ? queue : [];
      return self.syncQueue;
    })
    .catch(function(error) {
      console.error('加载同步队列失败:', error);
      self.syncQueue = [];
      return self.syncQueue;
    });
};

/**
 * 保存同步队列
 * @returns {Promise} 保存完成
 */
OfflineStorageSync.prototype.saveSyncQueue = function() {
  var storage = getStorage();
  return storage.set(this.config.syncQueueKey, this.syncQueue);
};

/**
 * 加载同步结果
 * @returns {Promise} 加载完成
 */
OfflineStorageSync.prototype.loadSyncResults = function() {
  var self = this;
  
  return getStorage().get(this.config.syncResultKey, [])
    .then(function(results) {
      self.syncResults = Array.isArray(results) ? results : [];
      return self.syncResults;
    })
    .catch(function(error) {
      console.error('加载同步结果失败:', error);
      self.syncResults = [];
      return self.syncResults;
    });
};

/**
 * 保存同步结果
 * @returns {Promise} 保存完成
 */
OfflineStorageSync.prototype.saveSyncResults = function() {
  var storage = getStorage();
  return storage.set(this.config.syncResultKey, this.syncResults);
};

/**
 * 启动同步定时器
 */
OfflineStorageSync.prototype.startSyncTimer = function() {
  var self = this;
  
  if (this.syncTimer) {
    clearInterval(this.syncTimer);
  }
  
  this.syncTimer = setInterval(function() {
    if (self.syncQueue.length > 0 && self.currentStatus === SyncStatus.IDLE) {
      self.startSync();
    }
  }, this.config.syncInterval);
};

/**
 * 停止同步定时器
 */
OfflineStorageSync.prototype.stopSyncTimer = function() {
  if (this.syncTimer) {
    clearInterval(this.syncTimer);
    this.syncTimer = null;
  }
};

/**
 * 检查是否可以在当前网络类型下同步
 * @param {string} networkType 网络类型
 * @returns {boolean} 是否可以同步
 */
OfflineStorageSync.prototype.canSyncWithNetworkType = function(networkType) {
  var requirement = this.config.networkRequirement;
  
  switch (requirement) {
    case 'wifi':
      return networkType === 'wifi';
    case '4g':
      return networkType === 'wifi' || networkType === '4g';
    case 'any':
      return networkType !== 'none';
    default:
      return true;
  }
};

/**
 * 监听网络状态变化
 */
OfflineStorageSync.prototype.listenToNetworkChanges = function() {
  var self = this;
  
  getNetworkUtils().onNetworkStatusChange(function(res) {
    var isConnected = res.isConnected;
    var networkType = res.networkType;
    
    // 记录网络状态变化事件
    eventBus.emit('offlineSync:networkChanged', {
      isConnected: isConnected,
      networkType: networkType,
      timestamp: Date.now()
    });
    
    // 如果网络连接恢复，尝试同步
    if (isConnected && self.canSyncWithNetworkType(networkType)) {
      self.startSync();
    }
  });
};

/**
 * 监听应用状态变化
 */
OfflineStorageSync.prototype.listenToAppStateChanges = function() {
  var self = this;
  
  // 监听小程序显示事件
  wx.onAppShow(function() {
    eventBus.emit('offlineSync:appShown');
    
    // 如果有待同步项目，启动同步
    if (self.syncQueue.length > 0) {
      self.startSync();
    }
  });
  
  // 监听小程序隐藏事件
  wx.onAppHide(function() {
    eventBus.emit('offlineSync:appHidden');
  });
};

/**
 * 获取同步状态
 * @returns {Object} 同步状态信息
 */
OfflineStorageSync.prototype.getSyncStatus = function() {
  return {
    status: this.currentStatus,
    queueSize: this.syncQueue.length,
    resultsSize: this.syncResults.length,
    lastSync: this.syncQueue.length > 0 ? this.syncQueue[this.syncQueue.length - 1].lastAttempt : null,
    isPending: this.syncQueue.length > 0,
    highPriorityCount: this.syncQueue.filter(function(item) {
      return item.priority === SyncPriority.HIGH;
    }).length
  };
};

/**
 * 清除同步结果
 * @returns {Promise} 操作完成
 */
OfflineStorageSync.prototype.clearSyncResults = function() {
  var self = this;
  
  return new Promise(function(resolve) {
    self.syncResults = [];
    self.saveSyncResults().then(function() {
      eventBus.emit('offlineSync:resultsCleared');
      resolve();
    });
  });
};

/**
 * 清除所有数据和队列
 * @returns {Promise} 操作完成
 */
OfflineStorageSync.prototype.reset = function() {
  var self = this;
  
  return new Promise(function(resolve) {
    // 停止定时器
    self.stopSyncTimer();
    
    // 清空队列和结果
    self.syncQueue = [];
    self.syncResults = [];
    
    // 重置状态
    self.currentStatus = SyncStatus.IDLE;
    
    // 保存空队列和结果
    Promise.all([
      self.saveSyncQueue(),
      self.saveSyncResults()
    ]).then(function() {
      eventBus.emit('offlineSync:reset');
      
      // 如果配置了自动同步，重启定时器
      if (self.config.autoSync) {
        self.startSyncTimer();
      }
      
      resolve();
    });
  });
};

/**
 * 销毁同步管理器
 */
OfflineStorageSync.prototype.destroy = function() {
  this.stopSyncTimer();
  this.handlers = {};
};

// 创建单例实例
var offlineSyncInstance = null;

/**
 * 获取OfflineStorageSync实例 (单例模式)
 * @param {Object} config 配置
 * @returns {OfflineStorageSync} 实例
 */
function getOfflineSyncInstance(config) {
  if (!offlineSyncInstance) {
    offlineSyncInstance = new OfflineStorageSync(config);
  } else if (config) {
    console.warn('OfflineStorageSync已初始化，无法更改配置');
  }
  return offlineSyncInstance;
}

// 导出
module.exports = {
  OfflineStorageSync: OfflineStorageSync,
  SyncStatus: SyncStatus,
  SyncOperationType: SyncOperationType,
  SyncPriority: SyncPriority,
  getOfflineSyncInstance: getOfflineSyncInstance
}; 