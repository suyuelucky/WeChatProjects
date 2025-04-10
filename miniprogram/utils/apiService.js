/**
 * API服务模块
 * 提供网络请求、离线操作和同步队列管理功能
 */

var networkUtils = require('./networkUtils');
var storageUtils = require('./storageUtils');
var timeoutHandler = require('./timeoutHandler');
var hasNetworkConnection = networkUtils.hasNetworkConnection;
var syncQueue = storageUtils.syncQueue;

// API基础配置
var API_CONFIG = {
  baseUrl: 'https://api.example.com/v1', // 替换为实际的API地址
  timeout: 30000, // 增加到30秒超时
  header: {
    'content-type': 'application/json'
  }
};

/**
 * 获取存储的token
 * @returns {Promise<string|null>}
 */
function getToken() {
  return new Promise(function(resolve) {
    try {
      resolve(wx.getStorageSync('auth_token') || null);
    } catch (error) {
      console.error('获取token失败:', error);
      resolve(null);
    }
  });
}

/**
 * 核心请求函数
 * @param {string} url - API端点
 * @param {Object} options - 请求选项
 * @returns {Promise<any>}
 */
function request(url, options) {
  options = options || {};
  
  return new Promise(function(resolve, reject) {
    // 解构选项参数
    var method = options.method || 'GET';
    var data = options.data;
    var header = options.header || {};
    var offline = options.offline || false;
    var retryCount = options.retryCount || 0;
    var maxRetries = options.maxRetries || 3;
    
    // 使用基于网络状态和历史超时的自适应超时时间
    var timeout = options.timeout || timeoutHandler.getSuggestedTimeout(url, options) || API_CONFIG.timeout;
    
    // 如果离线且不允许离线操作，则拒绝请求
    if (!hasNetworkConnection() && !offline) {
      return reject(new Error('无网络连接，请稍后再试'));
    }
    
    // 检查网络状态，对弱网络增加超时时间
    if (networkUtils.isWeakNetwork && networkUtils.isWeakNetwork()) {
      timeout = timeout * 1.5; // 弱网络下增加50%的超时时间
    }
    
    // 构建完整URL
    var apiUrl = url.startsWith('http') ? url : API_CONFIG.baseUrl + url;
    
    // 合并请求头
    var requestHeader = {};
    // 复制API_CONFIG.header到requestHeader
    for (var key in API_CONFIG.header) {
      if (API_CONFIG.header.hasOwnProperty(key)) {
        requestHeader[key] = API_CONFIG.header[key];
      }
    }
    // 复制header到requestHeader
    for (var key in header) {
      if (header.hasOwnProperty(key)) {
        requestHeader[key] = header[key];
      }
    }
    
    // 获取token并添加认证信息
    getToken().then(function(token) {
      if (token) {
        requestHeader['Authorization'] = 'Bearer ' + token;
      }
      
      // 添加请求开始时间记录
      var requestStartTime = Date.now();
      
      // 发起请求
      var requestTask = wx.request({
        url: apiUrl,
        data: data,
        method: method,
        header: requestHeader,
        timeout: timeout,
        success: function(response) {
          var requestDuration = Date.now() - requestStartTime;
          var statusCode = response.statusCode;
          var responseData = response.data;
          
          // 请求成功
          if (statusCode >= 200 && statusCode < 300) {
            // 如果请求接近超时但成功，记录警告以便后续优化
            if (requestDuration > timeout * 0.8) {
              console.warn('请求耗时较长，可能存在性能问题:', requestDuration + 'ms, URL:' + apiUrl);
            }
            resolve(responseData);
          } 
          // 需要重试的状态码
          else if ([408, 429, 500, 502, 503, 504].indexOf(statusCode) !== -1 && retryCount < maxRetries) {
            console.log('请求失败，状态码: ' + statusCode + '，第' + (retryCount + 1) + '次重试');
            
            // 创建重试选项
            var retryOptions = {};
            for (var key in options) {
              if (options.hasOwnProperty(key)) {
                retryOptions[key] = options[key];
              }
            }
            retryOptions.retryCount = retryCount + 1;
            
            // 使用指数退避策略增加等待时间，避免频繁重试
            var retryDelay = Math.min(Math.pow(2, retryCount) * 1000, 10000); // 最大等待10秒
            
            setTimeout(function() {
              request(url, retryOptions).then(resolve).catch(reject);
            }, retryDelay);
          } 
          // 其他错误
          else {
            reject(new Error('请求失败: ' + statusCode + ' ' + (responseData.message || '')));
          }
        },
        fail: function(error) {
          console.error('请求失败:', error);
          
          // 记录详细的错误信息，包括请求参数
          var errorInfo = {
            url: apiUrl,
            method: method,
            error: error,
            retryCount: retryCount,
            timestamp: Date.now()
          };
          
          // 避免记录敏感数据
          if (data && !url.includes('login') && !url.includes('auth')) {
            errorInfo.dataSize = JSON.stringify(data).length;
          }
          
          console.error('请求详细错误:', errorInfo);
          
          // 检查是否为超时错误
          var isTimeoutError = error.errMsg && (
            error.errMsg.includes('timeout') || 
            error.errMsg.includes('超时')
          );
          
          // 记录超时错误
          if (isTimeoutError) {
            timeoutHandler.recordTimeout(apiUrl, {
              method: method,
              timeout: timeout
            }, error);
          }
          
          // 对超时错误特别处理
          if (isTimeoutError && retryCount < maxRetries) {
            console.log('请求超时，第' + (retryCount + 1) + '次重试');
            
            // 创建重试选项
            var retryOptions = {};
            for (var key in options) {
              if (options.hasOwnProperty(key)) {
                retryOptions[key] = options[key];
              }
            }
            retryOptions.retryCount = retryCount + 1;
            retryOptions.timeout = timeout * 1.5; // 超时后增加超时时间
            
            // 超时情况下使用指数退避策略
            var retryDelay = Math.min(Math.pow(2, retryCount) * 1000, 10000);
            
            setTimeout(function() {
              request(url, retryOptions).then(resolve).catch(reject);
            }, retryDelay);
          }
          // 如果允许离线操作且不是GET请求，则添加到同步队列
          else if (offline && method !== 'GET') {
            // 创建同步数据
            var syncData = {
              url: url,
              options: {
                method: method,
                data: data,
                header: header
              },
              timestamp: Date.now()
            };
            
            syncQueue.add(syncData.url, 'request', syncData.options, {})
              .then(function() {
                resolve({
                  _offlineOperation: true,
                  message: '操作已保存，将在网络恢复后同步'
                });
              })
              .catch(function(err) {
                reject(err);
              });
          } else {
            reject(error);
          }
        }
      });
      
      // 超时自动取消
      setTimeout(function() {
        try {
          requestTask.abort();
        } catch (error) {
          console.error('取消请求失败:', error);
        }
      }, timeout + 500); // 额外增加500ms的缓冲时间
    }).catch(function(err) {
      reject(err);
    });
  });
}

/**
 * API服务对象
 */
var apiService = {
  /**
   * 发送GET请求
   * @param {string} url - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  get: function(url, options) {
    options = options || {};
    var newOptions = {};
    // 复制options到newOptions
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        newOptions[key] = options[key];
      }
    }
    newOptions.method = 'GET';
    return request(url, newOptions);
  },
  
  /**
   * 发送POST请求
   * @param {string} url - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  post: function(url, data, options) {
    options = options || {};
    var newOptions = {};
    // 复制options到newOptions
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        newOptions[key] = options[key];
      }
    }
    newOptions.method = 'POST';
    newOptions.data = data;
    return request(url, newOptions);
  },
  
  /**
   * 发送PUT请求
   * @param {string} url - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  put: function(url, data, options) {
    options = options || {};
    var newOptions = {};
    // 复制options到newOptions
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        newOptions[key] = options[key];
      }
    }
    newOptions.method = 'PUT';
    newOptions.data = data;
    return request(url, newOptions);
  },
  
  /**
   * 发送DELETE请求
   * @param {string} url - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  delete: function(url, options) {
    options = options || {};
    var newOptions = {};
    // 复制options到newOptions
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        newOptions[key] = options[key];
      }
    }
    newOptions.method = 'DELETE';
    return request(url, newOptions);
  },
  
  /**
   * 支持离线操作的POST请求
   * @param {string} url - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  offlinePost: function(url, data, options) {
    options = options || {};
    var newOptions = {};
    // 复制options到newOptions
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        newOptions[key] = options[key];
      }
    }
    newOptions.method = 'POST';
    newOptions.data = data;
    newOptions.offline = true;
    return request(url, newOptions);
  },
  
  /**
   * 支持离线操作的PUT请求
   * @param {string} url - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  offlinePut: function(url, data, options) {
    options = options || {};
    var newOptions = {};
    // 复制options到newOptions
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        newOptions[key] = options[key];
      }
    }
    newOptions.method = 'PUT';
    newOptions.data = data;
    newOptions.offline = true;
    return request(url, newOptions);
  },
  
  /**
   * 处理同步队列
   * @returns {Promise<Array>} - 处理结果
   */
  processSyncQueue: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      syncQueue.getAll({ status: 'pending' }).then(function(tasks) {
        var results = [];
        var processNextTask = function(index) {
          if (index >= tasks.length) {
            resolve(results);
            return;
          }
          
          var task = tasks[index];
          var taskData = task.data || {};
          
          request(taskData.url, taskData.options || {})
            .then(function(result) {
              results.push({
                id: task.id,
                success: true,
                result: result
              });
              
              // 处理成功后移除任务
              return syncQueue.remove(task.id);
            })
            .catch(function(error) {
              results.push({
                id: task.id,
                success: false,
                error: error.message
              });
              
              // 更新任务状态
              return syncQueue.updateStatus(task.id, 'error', {
                error: error.message,
                lastAttempt: Date.now()
              });
            })
            .then(function() {
              // 处理下一个任务
              processNextTask(index + 1);
            });
        };
        
        // 开始处理首个任务
        processNextTask(0);
      }).catch(function(error) {
        reject(error);
      });
    });
  }
};

// 导出apiService实例
module.exports = apiService; 