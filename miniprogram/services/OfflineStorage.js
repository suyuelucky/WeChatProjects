/**
 * OfflineStorage组件
 * A3-网络请求管理模块2.0
 * 
 * 创建日期: 2025-04-08
 * 作者: AI开发团队
 * 
 * 功能：离线请求存储与管理，支持请求保存、读取、删除和同步
 */

'use strict';

/**
 * 离线存储管理器
 * 负责管理离线环境下的请求存储与同步
 * @param {Object} config 配置参数
 */
function OfflineStorage(config) {
  // 确保使用new调用
  if (!(this instanceof OfflineStorage)) {
    return new OfflineStorage(config);
  }
  
  // 配置项
  this._config = config || {};
  this._maxStorage = this._config.maxStorage || 5 * 1024 * 1024; // 默认5MB
  this._storagePrefix = this._config.storagePrefix || 'offline_'; // 存储前缀
  this._syncInterval = this._config.syncInterval || 60000; // 同步间隔(毫秒)，默认1分钟
  this._retryLimit = this._config.retryLimit || 3; // 同步重试次数
  this._autoSync = this._config.autoSync !== false; // 自动同步，默认启用
  this._storageManager = this._config.storageManager; // 存储管理器
  
  // 内部状态
  this._initialized = false;
  this._isOnline = true; // 网络状态，默认在线
  this._syncTimer = null; // 同步定时器
  this._pendingRequests = []; // 待处理请求列表
  this._requestMap = {}; // 请求映射，用于快速查找
  
  // 初始化
  this._init();
}

/**
 * 初始化
 * @private
 */
OfflineStorage.prototype._init = function() {
  if (this._initialized) {
    return;
  }
  
  // 加载存储的请求
  this._loadRequests();
  
  // 检查网络状态
  this._checkNetworkStatus();
  
  // 监听网络状态变化
  this._setupNetworkListener();
  
  // 启动自动同步
  if (this._autoSync) {
    this._startAutoSync();
  }
  
  this._initialized = true;
};

/**
 * 加载存储的请求
 * @private
 */
OfflineStorage.prototype._loadRequests = function() {
  var self = this;
  var storageKey = this._storagePrefix + 'requests';
  
  // 尝试从存储中加载请求
  this._getFromStorage(storageKey, function(err, requests) {
    if (!err && requests) {
      self._pendingRequests = requests;
      
      // 更新请求映射
      self._updateRequestMap();
    }
  });
};

/**
 * 更新请求映射
 * @private
 */
OfflineStorage.prototype._updateRequestMap = function() {
  this._requestMap = {};
  
  for (var i = 0; i < this._pendingRequests.length; i++) {
    var request = this._pendingRequests[i];
    this._requestMap[request.id] = i;
  }
};

/**
 * 保存请求列表到存储
 * @private
 */
OfflineStorage.prototype._saveRequests = function(callback) {
  var storageKey = this._storagePrefix + 'requests';
  this._setToStorage(storageKey, this._pendingRequests, callback);
};

/**
 * 检查网络状态
 * @private
 */
OfflineStorage.prototype._checkNetworkStatus = function() {
  var self = this;
  
  wx.getNetworkType({
    success: function(res) {
      self._isOnline = res.networkType !== 'none';
      
      // 如果恢复在线状态，尝试同步
      if (self._isOnline && self._pendingRequests.length > 0) {
        self._syncPendingRequests();
      }
    }
  });
};

/**
 * 设置网络状态监听
 * @private
 */
OfflineStorage.prototype._setupNetworkListener = function() {
  var self = this;
  
  wx.onNetworkStatusChange(function(res) {
    var wasOffline = !self._isOnline;
    self._isOnline = res.isConnected;
    
    // 如果从离线变为在线，尝试同步
    if (wasOffline && self._isOnline && self._pendingRequests.length > 0) {
      self._syncPendingRequests();
    }
  });
};

/**
 * 启动自动同步
 * @private
 */
OfflineStorage.prototype._startAutoSync = function() {
  var self = this;
  
  // 清除可能存在的定时器
  this._stopAutoSync();
  
  // 设置新的定时器
  this._syncTimer = setInterval(function() {
    if (self._isOnline && self._pendingRequests.length > 0) {
      self._syncPendingRequests();
    }
  }, this._syncInterval);
};

/**
 * 停止自动同步
 * @private
 */
OfflineStorage.prototype._stopAutoSync = function() {
  if (this._syncTimer) {
    clearInterval(this._syncTimer);
    this._syncTimer = null;
  }
};

/**
 * 同步待处理请求
 * @private
 */
OfflineStorage.prototype._syncPendingRequests = function() {
  var self = this;
  
  // 如果不在线，不进行同步
  if (!this._isOnline) {
    return;
  }
  
  // 复制当前待处理请求列表
  var requestsToSync = this._pendingRequests.slice();
  
  // 依次处理请求
  function processNext(index) {
    if (index >= requestsToSync.length) {
      // 所有请求已处理完成
      return;
    }
    
    var request = requestsToSync[index];
    
    // 发送请求
    self._sendRequest(request, function(err) {
      if (!err) {
        // 成功，从待处理列表中移除
        self.removeRequest(request.id, function() {
          // 继续处理下一个
          processNext(index + 1);
        });
      } else {
        // 失败，记录重试次数
        request.retryCount = (request.retryCount || 0) + 1;
        
        if (request.retryCount > self._retryLimit) {
          // 已达到重试上限，标记为失败
          request.status = 'failed';
          request.lastError = err;
          
          // 更新存储
          self._saveRequests(function() {
            // 继续处理下一个
            processNext(index + 1);
          });
        } else {
          // 未达到重试上限，保留在待处理列表，稍后重试
          // 更新存储
          self._saveRequests(function() {
            // 继续处理下一个
            processNext(index + 1);
          });
        }
      }
    });
  }
  
  // 开始处理
  processNext(0);
};

/**
 * 发送请求
 * @param {Object} request 请求对象
 * @param {Function} callback 回调函数
 * @private
 */
OfflineStorage.prototype._sendRequest = function(request, callback) {
  // 如果提供了自定义适配器，使用它
  if (this._config.adapter) {
    this._config.adapter.send(request, callback);
    return;
  }
  
  // 否则使用默认的wx.request
  var requestTask = wx.request({
    url: request.url,
    method: request.method || 'GET',
    data: request.data,
    header: request.header,
    success: function(res) {
      callback(null, res);
    },
    fail: function(err) {
      callback(err);
    }
  });
};

/**
 * 从存储中获取数据
 * @param {String} key 存储键
 * @param {Function} callback 回调函数
 * @private
 */
OfflineStorage.prototype._getFromStorage = function(key, callback) {
  // 如果提供了存储管理器，使用它
  if (this._storageManager && typeof this._storageManager.get === 'function') {
    this._storageManager.get(key, callback);
    return;
  }
  
  // 否则使用wx.getStorage
  wx.getStorage({
    key: key,
    success: function(res) {
      callback(null, res.data);
    },
    fail: function(err) {
      callback(err);
    }
  });
};

/**
 * 存入数据到存储
 * @param {String} key 存储键
 * @param {*} data 存储数据
 * @param {Function} callback 回调函数
 * @private
 */
OfflineStorage.prototype._setToStorage = function(key, data, callback) {
  // 如果提供了存储管理器，使用它
  if (this._storageManager && typeof this._storageManager.set === 'function') {
    this._storageManager.set(key, data, callback);
    return;
  }
  
  // 否则使用wx.setStorage
  wx.setStorage({
    key: key,
    data: data,
    success: function() {
      callback && callback(null);
    },
    fail: function(err) {
      callback && callback(err);
    }
  });
};

/**
 * 检查存储空间
 * @param {Number} neededSize 需要的空间大小(字节)
 * @param {Function} callback 回调函数
 * @private
 */
OfflineStorage.prototype._checkStorageSpace = function(neededSize, callback) {
  var self = this;
  
  wx.getStorageInfo({
    success: function(res) {
      // 当前已用空间
      var currentSize = res.currentSize || 0;
      
      // 估算请求列表大小
      var requestsSize = 0;
      try {
        requestsSize = JSON.stringify(self._pendingRequests).length;
      } catch (e) {
        // 忽略错误
      }
      
      // 检查是否有足够空间
      if (currentSize + neededSize > self._maxStorage) {
        // 空间不足，尝试清理一些旧请求
        self._cleanupOldRequests(neededSize, function(err, freedSpace) {
          if (err || freedSpace < neededSize) {
            // 清理失败或空间仍然不足
            callback({ code: 'STORAGE_QUOTA_EXCEEDED', message: '存储空间不足' });
          } else {
            // 清理成功，空间足够
            callback(null);
          }
        });
      } else {
        // 空间足够
        callback(null);
      }
    },
    fail: function(err) {
      // 获取存储信息失败
      callback({ code: 'STORAGE_ERROR', message: '获取存储信息失败', originalError: err });
    }
  });
};

/**
 * 清理旧请求以释放空间
 * @param {Number} neededSize 需要释放的空间大小(字节)
 * @param {Function} callback 回调函数
 * @private
 */
OfflineStorage.prototype._cleanupOldRequests = function(neededSize, callback) {
  var self = this;
  
  // 如果没有请求可清理
  if (this._pendingRequests.length === 0) {
    callback(null, 0);
    return;
  }
  
  // 按创建时间排序(最旧的在前)
  var sortedRequests = this._pendingRequests.slice().sort(function(a, b) {
    return (a.timestamp || 0) - (b.timestamp || 0);
  });
  
  // 计算能释放的空间
  var freedSpace = 0;
  var requestsToRemove = [];
  
  for (var i = 0; i < sortedRequests.length && freedSpace < neededSize; i++) {
    var request = sortedRequests[i];
    var requestSize = 0;
    
    try {
      requestSize = JSON.stringify(request).length;
    } catch (e) {
      requestSize = 100; // 默认估算
    }
    
    freedSpace += requestSize;
    requestsToRemove.push(request.id);
    
    if (freedSpace >= neededSize) {
      break;
    }
  }
  
  // 移除选中的请求
  for (var j = 0; j < requestsToRemove.length; j++) {
    var index = this._requestMap[requestsToRemove[j]];
    if (index !== undefined) {
      this._pendingRequests.splice(index, 1);
      delete this._requestMap[requestsToRemove[j]];
    }
  }
  
  // 更新请求映射
  this._updateRequestMap();
  
  // 保存更新后的请求列表
  this._saveRequests(function(err) {
    if (err) {
      callback(err, 0);
    } else {
      callback(null, freedSpace);
    }
  });
};

/**
 * 生成唯一请求ID
 * @return {String} 唯一ID
 * @private
 */
OfflineStorage.prototype._generateRequestId = function() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * 创建错误对象
 * @param {String} code 错误代码
 * @param {String} message 错误消息
 * @param {Error} originalError 原始错误对象
 * @return {Object} 标准化的错误对象
 * @private
 */
OfflineStorage.prototype._createError = function(code, message, originalError) {
  return {
    code: code,
    message: message,
    originalError: originalError
  };
};

//======================== 公开API ========================//

/**
 * 保存请求到离线存储
 * @param {Object} request 请求对象
 * @param {Function} callback 回调函数(err, requestId)
 */
OfflineStorage.prototype.saveRequest = function(request, callback) {
  var self = this;
  
  // 参数验证
  if (!request) {
    setTimeout(function() {
      callback && callback(self._createError('INVALID_PARAM', '请求对象不能为空'), undefined);
    }, 0);
    return;
  }
  
  if (!request.url) {
    setTimeout(function() {
      callback && callback(self._createError('INVALID_PARAM', '请求URL不能为空'), undefined);
    }, 0);
    return;
  }
  
  // 估算请求大小
  var requestSize = 0;
  try {
    requestSize = JSON.stringify(request).length;
  } catch (e) {
    requestSize = 1024; // 默认估算1KB
  }
  
  // 检查存储空间
  this._checkStorageSpace(requestSize, function(err) {
    if (err) {
      callback && callback(err, undefined);
      return;
    }
    
    // 创建请求ID
    var requestId = self._generateRequestId();
    
    // 创建请求项
    var requestItem = {
      id: requestId,
      url: request.url,
      method: request.method || 'GET',
      data: request.data,
      header: request.header,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };
    
    // 添加到待处理列表
    self._pendingRequests.push(requestItem);
    self._requestMap[requestId] = self._pendingRequests.length - 1;
    
    // 保存到存储
    self._saveRequests(function(err) {
      if (err) {
        // 保存失败，从列表中移除
        self._pendingRequests.pop();
        delete self._requestMap[requestId];
        
        callback && callback(self._createError('STORAGE_ERROR', '保存请求失败', err), undefined);
      } else {
        // 保存成功
        callback && callback(null, requestId);
        
        // 如果在线，尝试立即同步
        if (self._isOnline && self._autoSync) {
          self._syncPendingRequests();
        }
      }
    });
  });
};

/**
 * 获取所有存储的请求
 * @param {Function} callback 回调函数(err, requests)
 */
OfflineStorage.prototype.getRequests = function(callback) {
  var self = this;
  
  setTimeout(function() {
    callback && callback(null, self._pendingRequests.slice());
  }, 0);
};

/**
 * 获取待同步的请求
 * @param {Function} callback 回调函数(err, requests)
 */
OfflineStorage.prototype.getPendingRequests = function(callback) {
  var self = this;
  
  setTimeout(function() {
    // 过滤出状态为pending的请求
    var pendingRequests = self._pendingRequests.filter(function(request) {
      return request.status === 'pending';
    });
    
    callback && callback(null, pendingRequests);
  }, 0);
};

/**
 * 删除请求
 * @param {String} requestId 请求ID
 * @param {Function} callback 回调函数(err)
 */
OfflineStorage.prototype.removeRequest = function(requestId, callback) {
  var self = this;
  
  // 参数验证
  if (!requestId) {
    setTimeout(function() {
      callback && callback(self._createError('INVALID_PARAM', '请求ID不能为空'));
    }, 0);
    return;
  }
  
  // 查找请求
  var index = this._requestMap[requestId];
  if (index === undefined) {
    setTimeout(function() {
      callback && callback(self._createError('NOT_FOUND', '请求不存在'));
    }, 0);
    return;
  }
  
  // 从待处理列表中移除
  this._pendingRequests.splice(index, 1);
  delete this._requestMap[requestId];
  
  // 更新请求映射
  this._updateRequestMap();
  
  // 保存到存储
  this._saveRequests(function(err) {
    if (err) {
      callback && callback(self._createError('STORAGE_ERROR', '删除请求失败', err));
    } else {
      callback && callback(null);
    }
  });
};

/**
 * 清空所有请求
 * @param {Function} callback 回调函数(err)
 */
OfflineStorage.prototype.clearRequests = function(callback) {
  var self = this;
  
  // 清空待处理列表
  this._pendingRequests = [];
  this._requestMap = {};
  
  // 保存到存储
  this._saveRequests(function(err) {
    if (err) {
      callback && callback(self._createError('STORAGE_ERROR', '清空请求失败', err));
    } else {
      callback && callback(null);
    }
  });
};

/**
 * 手动同步请求
 * @param {Function} callback 回调函数(err, results)
 */
OfflineStorage.prototype.sync = function(callback) {
  var self = this;
  
  // 如果不在线，无法同步
  if (!this._isOnline) {
    setTimeout(function() {
      callback && callback(self._createError('OFFLINE', '当前处于离线状态，无法同步'));
    }, 0);
    return;
  }
  
  // 如果没有待处理请求，直接返回
  if (this._pendingRequests.length === 0) {
    setTimeout(function() {
      callback && callback(null, []);
    }, 0);
    return;
  }
  
  // 记录同步开始时间
  var startTime = Date.now();
  
  // 获取待同步的请求
  this.getPendingRequests(function(err, pendingRequests) {
    if (err) {
      callback && callback(err);
      return;
    }
    
    if (pendingRequests.length === 0) {
      callback && callback(null, []);
      return;
    }
    
    var results = [];
    var completedCount = 0;
    
    // 处理每个请求
    pendingRequests.forEach(function(request) {
      self._sendRequest(request, function(err, response) {
        completedCount++;
        
        results.push({
          requestId: request.id,
          success: !err,
          response: response,
          error: err
        });
        
        if (!err) {
          // 成功，从待处理列表中移除
          self.removeRequest(request.id, function() {
            // 检查是否所有请求都已处理完成
            if (completedCount === pendingRequests.length) {
              var syncTime = Date.now() - startTime;
              callback && callback(null, results, { time: syncTime });
            }
          });
        } else {
          // 失败，增加重试计数
          request.retryCount = (request.retryCount || 0) + 1;
          
          if (request.retryCount > self._retryLimit) {
            // 已达到重试上限，标记为失败
            request.status = 'failed';
            request.lastError = err;
          }
          
          // 更新存储
          self._saveRequests(function() {
            // 检查是否所有请求都已处理完成
            if (completedCount === pendingRequests.length) {
              var syncTime = Date.now() - startTime;
              callback && callback(null, results, { time: syncTime });
            }
          });
        }
      });
    });
  });
};

/**
 * 获取存储统计信息
 * @param {Function} callback 回调函数(err, stats)
 */
OfflineStorage.prototype.getStats = function(callback) {
  var self = this;
  
  wx.getStorageInfo({
    success: function(res) {
      var stats = {
        totalRequests: self._pendingRequests.length,
        pendingRequests: 0,
        failedRequests: 0,
        storageUsage: {
          current: res.currentSize || 0,
          limit: self._maxStorage
        },
        isOnline: self._isOnline
      };
      
      // 统计不同状态的请求数量
      self._pendingRequests.forEach(function(request) {
        if (request.status === 'pending') {
          stats.pendingRequests++;
        } else if (request.status === 'failed') {
          stats.failedRequests++;
        }
      });
      
      callback && callback(null, stats);
    },
    fail: function(err) {
      callback && callback(self._createError('STORAGE_ERROR', '获取存储信息失败', err));
    }
  });
};

/**
 * 销毁实例，清理资源
 */
OfflineStorage.prototype.destroy = function() {
  // 停止自动同步
  this._stopAutoSync();
  
  // 清除状态
  this._initialized = false;
  this._pendingRequests = [];
  this._requestMap = {};
};

// 导出模块
module.exports = OfflineStorage; 