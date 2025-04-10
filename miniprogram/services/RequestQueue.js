/**
 * RequestQueue组件
 * A3-网络请求管理模块2.0
 * 
 * 创建日期: 2025-04-08 18:45:48
 * 创建者: Claude 3.7 Sonnet
 * 
 * 功能：请求队列管理，控制并发请求数量，支持请求优先级、重试、取消等功能
 * 
 * 修改日期: 2025-04-08 18:53:21
 * 修改者: Claude 3.7 Sonnet
 * 修改内容: 优化代码，补充边界检查，提升错误处理机制
 */

'use strict';

/**
 * 请求队列管理器
 * 负责控制并发请求数量，支持请求优先级、重试、取消等功能
 * @param {Object} config 配置参数
 * @param {Number} [config.maxConcurrent=5] 最大并发数
 * @param {Number} [config.retryLimit=3] 最大重试次数
 * @param {Number} [config.retryDelay=1000] 重试间隔(毫秒)
 * @param {Object} [config.adapter] 请求适配器
 * @param {Object} [config.errorHandler] 错误处理器
 */
function RequestQueue(config) {
  // 确保使用new调用
  if (!(this instanceof RequestQueue)) {
    return new RequestQueue(config);
  }
  
  // 合并默认配置和用户配置
  this._config = config || {};
  this._maxConcurrent = this._config.maxConcurrent || 5; // 最大并发数
  this._retryLimit = this._config.retryLimit || 3; // 最大重试次数
  this._retryDelay = this._config.retryDelay || 1000; // 重试间隔(毫秒)
  this._adapter = this._config.adapter || null; // 请求适配器
  this._errorHandler = this._config.errorHandler || null; // 错误处理器
  
  // 内部状态
  this._queue = []; // 请求队列
  this._activeCount = 0; // 当前活跃请求数
  this._paused = false; // 队列暂停状态
  this._requestMap = {}; // 请求映射，用于快速查找和取消
  
  // 监控点
  this._monitorPoints = {
    enqueueCount: 0,
    dequeueCount: 0,
    successCount: 0,
    failCount: 0,
    retryCount: 0,
    cancelCount: 0,
    totalProcessTime: 0, // 总处理时间(毫秒)
    maxQueueLength: 0 // 最大队列长度
  };
}

/**
 * 添加请求到队列
 * @param {Object} request 请求配置对象
 * @param {Function} callback 回调函数
 * @return {Object} 请求任务对象，可用于取消请求
 */
RequestQueue.prototype.enqueue = function(request, callback) {
  // 请求验证
  if (!request) {
    var err = { code: 'INVALID_REQUEST', message: '请求配置不能为空' };
    callback && callback(err);
    return null;
  }
  
  if (!request.url) {
    var err = { code: 'INVALID_REQUEST', message: '请求URL不能为空' };
    callback && callback(err);
    return null;
  }
  
  // 生成唯一请求ID
  var requestId = request.id || this._generateRequestId();
  request.id = requestId;
  
  // 设置默认优先级（如果未指定）
  request.priority = typeof request.priority === 'number' ? request.priority : 0;
  
  // 创建请求项
  var requestItem = {
    id: requestId,
    config: request,
    callback: callback || function() {},
    retryCount: 0,
    timestamp: Date.now(),
    priority: request.priority,
    status: 'pending' // pending, active, completed, canceled
  };
  
  // 添加到请求映射
  this._requestMap[requestId] = requestItem;
  
  // 添加到队列
  this._queue.push(requestItem);
  
  // 按优先级排序（高优先级在前）
  this._sortQueueByPriority();
  
  // 更新监控指标
  this._monitorPoints.enqueueCount++;
  
  // 更新最大队列长度
  if (this._queue.length > this._monitorPoints.maxQueueLength) {
    this._monitorPoints.maxQueueLength = this._queue.length;
  }
  
  // 如果队列未暂停，处理队列
  if (!this._paused) {
    this._processQueue();
  }
  
  // 返回请求任务对象
  return {
    requestId: requestId,
    abort: this._createAbortFunction(requestId)
  };
};

/**
 * 从队列中取出请求
 * @return {Object|null} 请求配置对象，如果队列为空则返回null
 */
RequestQueue.prototype.dequeue = function() {
  if (this._queue.length === 0) {
    return null;
  }
  
  var requestItem = this._queue.shift();
  this._monitorPoints.dequeueCount++;
  
  // 从请求映射中移除
  delete this._requestMap[requestItem.id];
  
  return requestItem.config;
};

/**
 * 暂停队列处理
 */
RequestQueue.prototype.pause = function() {
  this._paused = true;
};

/**
 * 恢复队列处理
 */
RequestQueue.prototype.resume = function() {
  if (this._paused) {
    this._paused = false;
    this._processQueue();
  }
};

/**
 * 清空队列
 * @return {Number} 移除的请求数量
 */
RequestQueue.prototype.clear = function() {
  // 只清除队列中等待的请求，不影响活跃请求
  var removed = 0;
  
  for (var i = this._queue.length - 1; i >= 0; i--) {
    var item = this._queue[i];
    if (item.status === 'pending') {
      // 从请求映射中移除
      delete this._requestMap[item.id];
      // 通知已取消
      item.callback({ code: 'REQUEST_CANCELED', message: '请求已取消' });
      // 从队列中移除
      this._queue.splice(i, 1);
      removed++;
    }
  }
  
  return removed;
};

/**
 * 取消指定ID的请求
 * @param {String} requestId 请求ID
 * @return {Boolean} 是否成功取消
 */
RequestQueue.prototype.cancelRequest = function(requestId) {
  var requestItem = this._requestMap[requestId];
  if (!requestItem) {
    return false; // 请求不存在
  }
  
  // 如果请求在队列中等待
  if (requestItem.status === 'pending') {
    // 从队列中移除
    for (var i = 0; i < this._queue.length; i++) {
      if (this._queue[i].id === requestId) {
        this._queue.splice(i, 1);
        break;
      }
    }
    
    // 标记为已取消
    requestItem.status = 'canceled';
    
    // 通知已取消
    requestItem.callback({ code: 'REQUEST_CANCELED', message: '请求已取消' });
    
    // 从请求映射中移除
    delete this._requestMap[requestId];
    
    this._monitorPoints.cancelCount++;
    return true;
  }
  
  // 如果请求已经活跃，需要中止底层请求
  if (requestItem.status === 'active' && requestItem.abort) {
    // 先标记为已取消，防止回调中的状态冲突
    requestItem.status = 'canceled';
    
    // 减少活跃计数
    this._activeCount--;
    
    // 确保活跃计数不为负数
    if (this._activeCount < 0) {
      this._activeCount = 0;
    }
    
    // 执行中止操作
    requestItem.abort();
    
    // 通知已取消
    requestItem.callback({ code: 'REQUEST_CANCELED', message: '请求已取消' });
    
    // 从请求映射中移除
    delete this._requestMap[requestId];
    
    // 处理队列，启动下一个请求
    this._processQueue();
    
    this._monitorPoints.cancelCount++;
    return true;
  }
  
  return false; // 请求无法取消
};

/**
 * 获取队列状态
 * @return {Object} 队列状态信息
 */
RequestQueue.prototype.getQueueStatus = function() {
  return {
    queueLength: this._queue.length,
    activeRequests: this._activeCount,
    paused: this._paused,
    monitorPoints: this._monitorPoints
  };
};

/**
 * 获取队列统计信息
 * @return {Object} 统计信息
 */
RequestQueue.prototype.getStats = function() {
  // 确保活跃计数不为负数
  if (this._activeCount < 0) {
    this._activeCount = 0;
  }
  
  var stats = {
    current: {
      queueLength: this._queue.length,
      activeCount: this._activeCount,
      paused: this._paused
    },
    totals: {
      enqueued: this._monitorPoints.enqueueCount,
      dequeued: this._monitorPoints.dequeueCount,
      success: this._monitorPoints.successCount,
      failed: this._monitorPoints.failCount,
      retried: this._monitorPoints.retryCount,
      canceled: this._monitorPoints.cancelCount
    },
    performance: {
      maxQueueLength: this._monitorPoints.maxQueueLength,
      totalProcessTime: this._monitorPoints.totalProcessTime,
      averageProcessTime: this._monitorPoints.successCount > 0 ? 
        this._monitorPoints.totalProcessTime / this._monitorPoints.successCount : 0
    }
  };
  
  return stats;
};

/**
 * 重置队列监控指标
 */
RequestQueue.prototype.resetMonitor = function() {
  for (var key in this._monitorPoints) {
    this._monitorPoints[key] = 0;
  }
};

/**
 * 处理队列，发送等待中的请求
 * @private
 */
RequestQueue.prototype._processQueue = function() {
  // 如果队列已暂停，不处理
  if (this._paused) {
    return;
  }
  
  // 从队列中取出待处理的请求并发送
  while (this._activeCount < this._maxConcurrent && this._queue.length > 0) {
    // 查找处于pending状态的请求
    var pendingIndex = -1;
    for (var i = 0; i < this._queue.length; i++) {
      if (this._queue[i].status === 'pending') {
        pendingIndex = i;
        break;
      }
    }
    
    if (pendingIndex === -1) {
      break; // 没有待处理的请求
    }
    
    var requestItem = this._queue[pendingIndex];
    
    // 标记为活跃状态
    requestItem.status = 'active';
    
    // 从等待队列中移除
    this._queue.splice(pendingIndex, 1);
    
    // 增加活跃计数
    this._activeCount++;
    
    // 发送请求
    this._sendRequest(requestItem);
  }
};

/**
 * 发送请求
 * @param {Object} requestItem 请求项
 * @private
 */
RequestQueue.prototype._sendRequest = function(requestItem) {
  var self = this;
  var config = requestItem.config;
  var startTime = Date.now();
  
  var handleResponse = function(error, response) {
    // 计算处理时间
    var processTime = Date.now() - startTime;
    self._monitorPoints.totalProcessTime += processTime;
    
    // 检查请求是否已被取消，避免重复处理
    if (requestItem.status === 'canceled') {
      return;
    }
    
    // 标记为已完成
    requestItem.status = 'completed';
    
    // 减少活跃计数
    self._activeCount--;
    
    // 确保活跃计数不为负数
    if (self._activeCount < 0) {
      self._activeCount = 0;
    }
    
    // 从请求映射中移除
    delete self._requestMap[requestItem.id];
    
    // 如果出错且可以重试
    if (error && requestItem.retryCount < self._retryLimit) {
      requestItem.retryCount++;
      self._monitorPoints.retryCount++;
      
      // 使用重试策略处理
      var retryDelay = self._getRetryDelay(requestItem.retryCount);
      
      // 延迟重试
      setTimeout(function() {
        // 重置为等待状态
        requestItem.status = 'pending';
        
        // 重新加入队列
        self._queue.push(requestItem);
        
        // 重新按优先级排序
        self._sortQueueByPriority();
        
        // 重新加入请求映射
        self._requestMap[requestItem.id] = requestItem;
        
        // 处理队列
        self._processQueue();
      }, retryDelay);
      
      return;
    }
    
    // 更新监控指标
    if (error) {
      self._monitorPoints.failCount++;
      
      // 使用错误处理器处理错误
      if (self._errorHandler && typeof self._errorHandler.handleError === 'function') {
        error = self._errorHandler.handleError(error, {
          requestId: requestItem.id,
          url: config.url,
          method: config.method
        });
      }
    } else {
      self._monitorPoints.successCount++;
    }
    
    // 调用回调
    requestItem.callback(error, response);
    
    // 处理队列，发送下一个请求
    self._processQueue();
  };
  
  var requestTask;
  
  // 使用适配器发送请求
  if (this._adapter) {
    try {
      var adapterResult = this._adapter.send(config, handleResponse);
      
      // 如果适配器返回Promise
      if (adapterResult && typeof adapterResult.then === 'function') {
        adapterResult.then(
          function(response) {
            handleResponse(null, response);
          },
          function(error) {
            handleResponse(error);
          }
        );
      }
      
      // 保存中止函数
      if (adapterResult && adapterResult.abort) {
        requestItem.abort = adapterResult.abort;
      }
    } catch (error) {
      handleResponse({
        code: 'ADAPTER_ERROR',
        message: '适配器执行错误',
        error: error
      });
    }
  } else {
    // 没有适配器，默认使用wx.request
    try {
      requestTask = wx.request({
        url: config.url,
        data: config.data,
        header: config.header,
        method: config.method || 'GET',
        dataType: config.dataType || 'json',
        success: function(res) {
          handleResponse(null, res);
        },
        fail: function(err) {
          handleResponse({
            code: 'REQUEST_FAILED',
            message: '请求失败',
            error: err
          });
        }
      });
      
      // 保存中止函数
      if (requestTask && requestTask.abort) {
        requestItem.abort = function() {
          requestTask.abort();
        };
      }
    } catch (error) {
      handleResponse({
        code: 'REQUEST_ERROR',
        message: '请求执行错误',
        error: error
      });
    }
  }
};

/**
 * 获取重试延迟时间
 * @param {Number} retryCount 重试次数
 * @return {Number} 延迟时间(毫秒)
 * @private
 */
RequestQueue.prototype._getRetryDelay = function(retryCount) {
  if (this._config.retryStrategy && typeof this._config.retryStrategy.getRetryDelay === 'function') {
    return this._config.retryStrategy.getRetryDelay(retryCount);
  }
  
  // 默认使用指数退避策略
  return this._retryDelay * Math.pow(2, retryCount - 1);
};

/**
 * 按优先级排序队列（高优先级在前）
 * @private
 */
RequestQueue.prototype._sortQueueByPriority = function() {
  this._queue.sort(function(a, b) {
    // 优先级高的在前面
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    // 优先级相同，按先进先出排序
    return a.timestamp - b.timestamp;
  });
};

/**
 * 生成唯一请求ID
 * @return {String} 唯一ID
 * @private
 */
RequestQueue.prototype._generateRequestId = function() {
  return 'req_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
};

/**
 * 创建中止函数
 * @param {String} requestId 请求ID
 * @return {Function} 中止函数
 * @private
 */
RequestQueue.prototype._createAbortFunction = function(requestId) {
  var self = this;
  return function() {
    return self.cancelRequest(requestId);
  };
};

// 导出组件
module.exports = RequestQueue; 