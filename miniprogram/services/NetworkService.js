/**
 * NetworkService组件
 * A3-网络请求管理模块2.0
 * 
 * 创建日期: 2025-04-08
 * 作者: AI开发团队
 * 
 * 功能：网络请求服务门面，整合所有网络请求相关组件，提供统一的接口
 */

'use strict';

/**
 * 网络服务
 * 作为整个网络请求模块的门面，整合各组件提供统一的接口
 * @param {Object} config 配置参数
 */
function NetworkService(config) {
  // 确保使用new调用
  if (!(this instanceof NetworkService)) {
    return new NetworkService(config);
  }
  
  // 配置项
  this._config = config || {};
  
  // 依赖组件
  this._adapter = this._config.adapter; // 请求适配器
  this._configManager = this._config.configManager; // 配置管理器
  this._interceptorManager = this._config.interceptorManager; // 拦截器管理器
  this._errorHandler = this._config.errorHandler; // 错误处理器
  this._cacheManager = this._config.cacheManager; // 缓存管理器
  this._requestQueue = this._config.requestQueue; // 请求队列
  this._networkMonitor = this._config.networkMonitor; // 网络监控
  this._retryStrategy = this._config.retryStrategy; // 重试策略
  this._offlineStorage = this._config.offlineStorage; // 离线存储
  
  // 内部状态
  this._activeRequests = {}; // 当前活跃请求
  this._requestCounter = 0; // 请求计数器
  this._isOnline = true; // 网络状态
  
  // 初始化
  this._init();
}

/**
 * 初始化
 * @private
 */
NetworkService.prototype._init = function() {
  var self = this;
  
  // 初始化依赖组件
  this._initDependencies();
  
  // 设置网络监听
  if (this._networkMonitor) {
    this._networkMonitor.getNetworkType().then(function(networkType) {
      self._isOnline = networkType !== 'none';
    });
    
    this._networkMonitor.onStatusChange(function(status) {
      var wasOffline = !self._isOnline;
      self._isOnline = status.isConnected;
      
      // 如果从离线变为在线，尝试同步离线请求
      if (wasOffline && self._isOnline && self._offlineStorage) {
        self._syncOfflineRequests();
      }
    });
  }
};

/**
 * 初始化依赖组件
 * @private
 */
NetworkService.prototype._initDependencies = function() {
  // 确保有请求适配器
  if (!this._adapter) {
    throw new Error('NetworkService requires a RequestAdapter instance');
  }
  
  // 如果没有提供拦截器管理器，创建一个空的
  if (!this._interceptorManager) {
    this._interceptorManager = {
      request: {
        use: function() { return -1; },
        eject: function() {},
        forEach: function() {}
      },
      response: {
        use: function() { return -1; },
        eject: function() {},
        forEach: function() {}
      }
    };
  }
  
  // 如果没有提供错误处理器，创建一个基本的
  if (!this._errorHandler) {
    this._errorHandler = {
      handleError: function(error) { return error; },
      createError: function(code, message) { 
        return { code: code, message: message }; 
      }
    };
  }
};

/**
 * 同步离线请求
 * @private
 */
NetworkService.prototype._syncOfflineRequests = function() {
  if (!this._offlineStorage) {
    return;
  }
  
  this._offlineStorage.sync();
};

/**
 * 生成请求ID
 * @return {String} 唯一请求ID
 * @private
 */
NetworkService.prototype._generateRequestId = function() {
  return 'req_' + Date.now() + '_' + (++this._requestCounter);
};

/**
 * 应用请求配置
 * @param {Object} config 请求配置
 * @return {Object} 处理后的请求配置
 * @private
 */
NetworkService.prototype._applyRequestConfig = function(config) {
  var finalConfig = config || {};
  
  // 合并基础URL
  if (this._configManager && this._configManager.getConfig('baseURL') && !finalConfig.baseURL) {
    finalConfig.baseURL = this._configManager.getConfig('baseURL');
  }
  
  // 合并全局headers
  if (this._configManager && this._configManager.getConfig('headers')) {
    finalConfig.header = finalConfig.header || {};
    var globalHeaders = this._configManager.getConfig('headers');
    
    for (var key in globalHeaders) {
      if (globalHeaders.hasOwnProperty(key) && !finalConfig.header[key]) {
        finalConfig.header[key] = globalHeaders[key];
      }
    }
  }
  
  // 合并超时设置
  if (this._configManager && this._configManager.getConfig('timeout') && !finalConfig.timeout) {
    finalConfig.timeout = this._configManager.getConfig('timeout');
  }
  
  // 确保有URL
  if (!finalConfig.url) {
    throw this._errorHandler.createError('INVALID_PARAM', '请求URL不能为空');
  }
  
  // 处理baseURL
  if (finalConfig.baseURL && finalConfig.url.indexOf('http') !== 0) {
    finalConfig.url = finalConfig.baseURL.replace(/\/+$/, '') + '/' + finalConfig.url.replace(/^\/+/, '');
  }
  
  return finalConfig;
};

/**
 * 执行请求拦截器
 * @param {Object} config 请求配置
 * @return {Promise} Promise对象
 * @private
 */
NetworkService.prototype._runRequestInterceptors = function(config) {
  var chain = Promise.resolve(config);
  
  this._interceptorManager.request.forEach(function(interceptor) {
    chain = chain.then(
      interceptor.onFulfilled,
      interceptor.onRejected
    );
  });
  
  return chain;
};

/**
 * 执行响应拦截器
 * @param {Object} response 响应对象
 * @return {Promise} Promise对象
 * @private
 */
NetworkService.prototype._runResponseInterceptors = function(response) {
  var chain = Promise.resolve(response);
  
  this._interceptorManager.response.forEach(function(interceptor) {
    chain = chain.then(
      interceptor.onFulfilled,
      interceptor.onRejected
    );
  });
  
  return chain;
};

/**
 * 处理缓存
 * @param {Object} config 请求配置
 * @return {Promise} Promise对象，解析为缓存响应或null
 * @private
 */
NetworkService.prototype._handleCache = function(config) {
  var self = this;
  
  // 如果不使用缓存或没有缓存管理器
  if (!config.useCache || !this._cacheManager) {
    return Promise.resolve(null);
  }
  
  // 计算缓存键
  var cacheKey = this._generateCacheKey(config);
  
  // 如果强制刷新，跳过缓存
  if (config.forceRefresh) {
    return Promise.resolve(null);
  }
  
  // 从缓存获取
  return this._cacheManager.get(cacheKey).then(function(cachedResponse) {
    if (cachedResponse) {
      // 缓存命中
      cachedResponse.fromCache = true;
      return cachedResponse;
    }
    
    // 缓存未命中
    return null;
  }).catch(function(err) {
    // 缓存错误，忽略并继续请求
    return null;
  });
};

/**
 * 生成缓存键
 * @param {Object} config 请求配置
 * @return {String} 缓存键
 * @private
 */
NetworkService.prototype._generateCacheKey = function(config) {
  var key = config.url;
  
  // 将方法加入键
  if (config.method) {
    key += '_' + config.method.toUpperCase();
  }
  
  // 将参数加入键
  if (config.params) {
    try {
      key += '_' + JSON.stringify(config.params);
    } catch (e) {
      // 忽略序列化错误
    }
  }
  
  // 将data加入键
  if (config.data) {
    try {
      key += '_' + JSON.stringify(config.data);
    } catch (e) {
      // 忽略序列化错误
    }
  }
  
  return key;
};

/**
 * 处理离线模式
 * @param {Object} config 请求配置
 * @return {Promise} Promise对象，解析为离线响应或继续请求
 * @private
 */
NetworkService.prototype._handleOfflineMode = function(config) {
  var self = this;
  
  // 如果在线或无离线存储，继续请求
  if (this._isOnline || !this._offlineStorage) {
    return Promise.resolve(null);
  }
  
  // 离线模式处理
  return new Promise(function(resolve, reject) {
    // 保存到离线存储
    self._offlineStorage.saveRequest(config, function(err, requestId) {
      if (err) {
        reject(self._errorHandler.handleError(err, { 
          phase: 'offline-save', 
          url: config.url 
        }));
        return;
      }
      
      // 创建离线响应
      resolve({
        offlineMode: true,
        requestId: requestId,
        statusCode: 0,
        data: null,
        message: '请求已保存，将在恢复网络连接时自动发送'
      });
    });
  });
};

/**
 * 处理请求队列
 * @param {Object} config 请求配置
 * @return {Promise} Promise对象，解析为请求响应
 * @private
 */
NetworkService.prototype._handleQueue = function(config) {
  var self = this;
  
  // 如果不使用队列或无请求队列，直接发送
  if (config.skipQueue || !this._requestQueue) {
    return this._sendDirectRequest(config);
  }
  
  // 使用队列发送请求
  return new Promise(function(resolve, reject) {
    var requestTask = self._requestQueue.enqueue(config, function(err, response) {
      if (err) {
        reject(self._errorHandler.handleError(err, { 
          phase: 'queue', 
          url: config.url 
        }));
      } else {
        resolve(response);
      }
    });
    
    // 保存请求任务
    var requestId = requestTask.requestId || self._generateRequestId();
    self._activeRequests[requestId] = {
      config: config,
      task: requestTask,
      timestamp: Date.now()
    };
    
    // 设置请求ID
    config._requestId = requestId;
  });
};

/**
 * 直接发送请求(不经过队列)
 * @param {Object} config 请求配置
 * @return {Promise} Promise对象，解析为请求响应
 * @private
 */
NetworkService.prototype._sendDirectRequest = function(config) {
  var self = this;
  var requestId = config._requestId || this._generateRequestId();
  
  // 保存请求信息
  this._activeRequests[requestId] = {
    config: config,
    timestamp: Date.now()
  };
  
  // 发送请求
  var requestPromise = this._adapter.send(config).then(function(response) {
    // 处理响应
    delete self._activeRequests[requestId];
    
    // 如果需要缓存，保存到缓存
    if (config.useCache && self._cacheManager && response.statusCode >= 200 && response.statusCode < 300) {
      var cacheKey = self._generateCacheKey(config);
      self._cacheManager.set(cacheKey, response, config.cacheOptions);
    }
    
    return response;
  }).catch(function(error) {
    // 处理错误
    delete self._activeRequests[requestId];
    
    // 检查是否需要重试
    if (self._retryStrategy && config.retry !== false) {
      var retryCount = config._retryCount || 0;
      
      if (self._retryStrategy.shouldRetry(error, retryCount)) {
        // 增加重试计数
        config._retryCount = retryCount + 1;
        
        // 计算重试延迟
        var delay = self._retryStrategy.getRetryDelay(retryCount);
        
        // 延迟后重试
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(self._sendDirectRequest(config));
          }, delay);
        });
      }
    }
    
    // 不重试，抛出错误
    throw self._errorHandler.handleError(error, { 
      phase: 'request', 
      url: config.url,
      retry: config._retryCount
    });
  });
  
  // 保存请求Promise
  this._activeRequests[requestId].promise = requestPromise;
  
  return requestPromise;
};

//======================== 公开API ========================//

/**
 * 发送请求
 * @param {Object} config 请求配置
 * @return {Object} 请求任务对象，包含promise和requestId
 */
NetworkService.prototype.send = function(config) {
  var self = this;
  
  try {
    // 应用请求配置
    var finalConfig = this._applyRequestConfig(config);
    
    // 创建请求链
    var chain = Promise.resolve(finalConfig);
    
    // 运行请求拦截器
    chain = chain.then(function(config) {
      return self._runRequestInterceptors(config);
    });
    
    // 处理缓存
    chain = chain.then(function(config) {
      return self._handleCache(config).then(function(cachedResponse) {
        if (cachedResponse) {
          return Promise.resolve(cachedResponse);
        }
        return config;
      });
    });
    
    // 处理离线模式
    chain = chain.then(function(result) {
      // 如果已经有结果(来自缓存)，直接返回
      if (result && result.statusCode) {
        return result;
      }
      
      return self._handleOfflineMode(result).then(function(offlineResponse) {
        if (offlineResponse) {
          return offlineResponse;
        }
        return result;
      });
    });
    
    // 处理队列和发送请求
    chain = chain.then(function(result) {
      // 如果已经有结果(来自缓存或离线处理)，直接返回
      if (result && (result.statusCode || result.offlineMode)) {
        return result;
      }
      
      return self._handleQueue(result);
    });
    
    // 运行响应拦截器
    chain = chain.then(function(response) {
      return self._runResponseInterceptors(response);
    });
    
    // 创建请求任务对象
    var requestId = this._generateRequestId();
    var requestTask = {
      requestId: requestId,
      promise: chain,
      abort: function() {
        // 取消请求
        self.cancel(requestId);
      }
    };
    
    // 将promise附加到请求任务对象上便于链式调用
    requestTask.then = function(onFulfilled, onRejected) {
      return chain.then(onFulfilled, onRejected);
    };
    requestTask.catch = function(onRejected) {
      return chain.catch(onRejected);
    };
    
    return requestTask;
  } catch (error) {
    // 处理配置错误
    var errorObj = this._errorHandler.handleError(error, { phase: 'config' });
    var failedPromise = Promise.reject(errorObj);
    
    return {
      requestId: this._generateRequestId(),
      promise: failedPromise,
      abort: function() {},
      then: function(onFulfilled, onRejected) {
        return failedPromise.then(onFulfilled, onRejected);
      },
      catch: function(onRejected) {
        return failedPromise.catch(onRejected);
      }
    };
  }
};

/**
 * 取消请求
 * @param {String} requestId 请求ID
 * @return {Boolean} 是否成功取消
 */
NetworkService.prototype.cancel = function(requestId) {
  if (!requestId || !this._activeRequests[requestId]) {
    return false;
  }
  
  var requestInfo = this._activeRequests[requestId];
  
  // 如果请求已经发送并且有abort方法
  if (requestInfo.task && typeof requestInfo.task.abort === 'function') {
    requestInfo.task.abort();
  }
  
  // 如果使用请求队列，通过队列取消
  if (this._requestQueue && requestInfo.config && requestInfo.config._queueId) {
    this._requestQueue.cancelRequest(requestInfo.config._queueId);
  }
  
  // 从活跃请求中移除
  delete this._activeRequests[requestId];
  
  return true;
};

/**
 * 发送批量请求
 * @param {Array} requests 请求配置数组
 * @param {Object} options 批量请求选项
 * @return {Promise} Promise对象，解析为响应数组
 */
NetworkService.prototype.batch = function(requests, options) {
  var self = this;
  options = options || {};
  
  // 参数验证
  if (!Array.isArray(requests)) {
    return Promise.reject(this._errorHandler.createError(
      'INVALID_PARAM',
      'batch请求参数必须是数组'
    ));
  }
  
  // 空数组直接返回
  if (requests.length === 0) {
    return Promise.resolve([]);
  }
  
  // 判断是否并行处理
  var parallel = options.parallel !== false;
  var maxConcurrent = options.maxConcurrent || 5;
  
  if (parallel) {
    // 并行处理
    if (options.skipQueue) {
      // 使用Promise.all直接并行处理
      var requestPromises = requests.map(function(config) {
        return self.send(config).promise;
      });
      return Promise.all(requestPromises);
    } else {
      // 使用队列控制并发
      var batchConfig = {
        requests: requests,
        maxConcurrent: maxConcurrent
      };
      
      // 如果有请求队列，使用批量方法
      if (this._requestQueue && typeof this._requestQueue.enqueueBatch === 'function') {
        return new Promise(function(resolve, reject) {
          self._requestQueue.enqueueBatch(batchConfig, function(err, responses) {
            if (err) {
              reject(self._errorHandler.handleError(err, { phase: 'batch' }));
            } else {
              resolve(responses);
            }
          });
        });
      } else {
        // 手动实现批量处理
        return this._processBatchRequests(requests, maxConcurrent);
      }
    }
  } else {
    // 串行处理
    return this._processSequentialRequests(requests);
  }
};

/**
 * 处理批量请求(手动实现)
 * @param {Array} requests 请求配置数组
 * @param {Number} maxConcurrent 最大并发数
 * @return {Promise} Promise对象，解析为响应数组
 * @private
 */
NetworkService.prototype._processBatchRequests = function(requests, maxConcurrent) {
  var self = this;
  var results = new Array(requests.length);
  var completed = 0;
  var running = 0;
  var index = 0;
  
  return new Promise(function(resolve, reject) {
    function startNextRequest() {
      if (index >= requests.length) {
        return;
      }
      
      var currentIndex = index++;
      var config = requests[currentIndex];
      running++;
      
      self.send(config).promise.then(function(response) {
        results[currentIndex] = response;
        running--;
        completed++;
        
        if (completed === requests.length) {
          resolve(results);
        } else {
          startNextRequest();
        }
      }).catch(function(error) {
        results[currentIndex] = { error: error };
        running--;
        completed++;
        
        if (completed === requests.length) {
          resolve(results);
        } else {
          startNextRequest();
        }
      });
    }
    
    // 启动初始批次请求
    for (var i = 0; i < Math.min(maxConcurrent, requests.length); i++) {
      startNextRequest();
    }
  });
};

/**
 * 处理串行请求
 * @param {Array} requests 请求配置数组
 * @return {Promise} Promise对象，解析为响应数组
 * @private
 */
NetworkService.prototype._processSequentialRequests = function(requests) {
  var self = this;
  var results = [];
  
  return requests.reduce(function(chain, config) {
    return chain.then(function() {
      return self.send(config).promise.then(function(response) {
        results.push(response);
      }).catch(function(error) {
        results.push({ error: error });
      });
    });
  }, Promise.resolve()).then(function() {
    return results;
  });
};

/**
 * 获取活跃请求
 * @return {Object} 活跃请求对象，键为请求ID
 */
NetworkService.prototype.getActiveRequests = function() {
  var result = {};
  
  for (var requestId in this._activeRequests) {
    if (this._activeRequests.hasOwnProperty(requestId)) {
      var requestInfo = this._activeRequests[requestId];
      result[requestId] = {
        url: requestInfo.config.url,
        method: requestInfo.config.method,
        timestamp: requestInfo.timestamp,
        elapsedTime: Date.now() - requestInfo.timestamp
      };
    }
  }
  
  return result;
};

/**
 * 取消所有请求
 * @return {Number} 取消的请求数量
 */
NetworkService.prototype.cancelAll = function() {
  var count = 0;
  
  for (var requestId in this._activeRequests) {
    if (this._activeRequests.hasOwnProperty(requestId)) {
      if (this.cancel(requestId)) {
        count++;
      }
    }
  }
  
  return count;
};

/**
 * 清空缓存
 * @param {Object} options 清空选项
 * @return {Promise} Promise对象
 */
NetworkService.prototype.clearCache = function(options) {
  if (!this._cacheManager) {
    return Promise.resolve();
  }
  
  return this._cacheManager.clear(options);
};

/**
 * 同步离线请求
 * @param {Function} callback 回调函数
 */
NetworkService.prototype.syncOfflineRequests = function(callback) {
  if (!this._offlineStorage) {
    callback && callback(null, []);
    return;
  }
  
  this._offlineStorage.sync(callback);
};

/**
 * 获取网络状态
 * @return {Object} 网络状态对象
 */
NetworkService.prototype.getNetworkStatus = function() {
  if (this._networkMonitor) {
    return {
      isOnline: this._isOnline,
      type: this._networkMonitor.getNetworkType()
    };
  }
  
  return {
    isOnline: true,
    type: 'unknown'
  };
};

// 导出模块
module.exports = NetworkService; 