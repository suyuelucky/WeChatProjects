/**
 * RequestAdapter
 * 网络请求适配器，提供统一的请求接口，支持多种请求实现
 * 符合微信小程序环境的ES5语法标准
 */

/**
 * 拦截器管理器
 * @constructor
 */
function InterceptorManager() {
  this.handlers = [];
}

/**
 * 添加拦截器
 * @param {Function} fulfilled 成功处理函数
 * @param {Function} rejected 失败处理函数
 * @returns {Number} 拦截器ID，用于后续移除
 */
InterceptorManager.prototype.use = function(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  
  return this.handlers.length - 1;
};

/**
 * 移除拦截器
 * @param {Number} id 拦截器ID
 */
InterceptorManager.prototype.eject = function(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * 遍历所有拦截器
 * @param {Function} fn 遍历回调函数
 */
InterceptorManager.prototype.forEach = function(fn) {
  for (var i = 0; i < this.handlers.length; i++) {
    var h = this.handlers[i];
    if (h !== null) {
      fn(h);
    }
  }
};

/**
 * 克隆对象
 * @param {Object} obj 需要克隆的对象
 * @returns {Object} 克隆后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  var copy = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepClone(obj[key]);
    }
  }
  
  return copy;
}

/**
 * 合并对象属性
 * @param {Object} target 目标对象
 * @param {Object} source 源对象
 * @returns {Object} 合并后的对象
 */
function merge(target, source) {
  if (!source) {
    return target;
  }
  
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key];
    }
  }
  
  return target;
}

/**
 * 判断是否为绝对URL
 * @param {string} url URL地址
 * @returns {boolean} 是否为绝对URL
 */
function isAbsoluteURL(url) {
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
}

/**
 * 组合URL
 * @param {string} baseURL 基础URL
 * @param {string} relativeURL 相对URL
 * @returns {string} 组合后的URL
 */
function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}

/**
 * 请求适配器构造函数
 * @param {Object} config 配置对象
 * @constructor
 */
function RequestAdapter(config) {
  config = config || {};
  
  this.baseURL = config.baseURL || '';
  this.timeout = config.timeout || 10000;
  this.headers = config.headers || { 'content-type': 'application/json' };
  
  // 创建拦截器管理
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
  
  // 绑定便捷方法
  this.bindMethods();
}

/**
 * 绑定便捷方法
 */
RequestAdapter.prototype.bindMethods = function() {
  var methods = ['get', 'post', 'put', 'delete', 'head', 'options', 'patch'];
  var self = this;
  
  methods.forEach(function(method) {
    self[method] = function(url, data, config) {
      config = config || {};
      config.url = url;
      config.method = method.toUpperCase();
      
      if (data) {
        config.data = data;
      }
      
      return self.request(config);
    };
  });
};

/**
 * 执行请求
 * @param {Object} config 请求配置
 * @returns {Promise} 请求Promise
 */
RequestAdapter.prototype.request = function(config) {
  var self = this;
  
  // 创建一个新的promise链，以便能够注入拦截器
  var promise = Promise.resolve(config);
  
  // 请求拦截器链
  var requestInterceptorChain = [];
  
  // 构建请求拦截器链
  this.interceptors.request.forEach(function(interceptor) {
    requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });
  
  // 响应拦截器链
  var responseInterceptorChain = [];
  
  // 构建响应拦截器链
  this.interceptors.response.forEach(function(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });
  
  // 处理请求拦截器链
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    
    try {
      promise = promise.then(onFulfilled, onRejected);
    } catch (error) {
      promise = Promise.reject(error);
      break;
    }
  }
  
  // 执行请求
  promise = promise.then(function(config) {
    return self._performRequest(config);
  });
  
  // 处理响应拦截器链
  while (responseInterceptorChain.length) {
    var onFulfilled = responseInterceptorChain.shift();
    var onRejected = responseInterceptorChain.shift();
    
    try {
      promise = promise.then(onFulfilled, onRejected);
    } catch (error) {
      promise = Promise.reject(error);
      break;
    }
  }
  
  return promise;
};

/**
 * 执行实际请求
 * @param {Object} config 请求配置
 * @returns {Promise} 请求Promise
 * @private
 */
RequestAdapter.prototype._performRequest = function(config) {
  var self = this;
  
  // 合并配置
  var requestConfig = deepClone(config);
  
  // 处理URL
  var url = requestConfig.url || '';
  if (self.baseURL && !isAbsoluteURL(url)) {
    url = combineURLs(self.baseURL, url);
  }
  
  // 处理请求头
  var headers = merge({}, self.headers);
  headers = merge(headers, requestConfig.headers);
  
  // 创建请求Promise
  return new Promise(function(resolve, reject) {
    var requestTask;
    var timer;
    
    // 错误处理函数
    function handleError(error) {
      clearTimeout(timer);
      reject(error);
    }
    
    // 请求参数
    var requestOptions = {
      url: url,
      method: requestConfig.method || 'GET',
      data: requestConfig.data,
      header: headers,
      timeout: requestConfig.timeout || self.timeout,
      
      success: function(response) {
        clearTimeout(timer);
        
        // 检查HTTP错误状态码
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
        } else {
          reject({
            status: response.statusCode,
            statusText: response.errMsg,
            message: response.data && response.data.message || '请求失败',
            data: response.data,
            config: requestConfig,
            response: response
          });
        }
      },
      
      fail: function(error) {
        clearTimeout(timer);
        
        reject({
          errMsg: error.errMsg || '网络请求失败',
          config: requestConfig,
          request: requestTask
        });
      }
    };
    
    // 发送请求
    requestTask = wx.request(requestOptions);
    
    // 设置超时处理
    var timeout = requestConfig.timeout || self.timeout;
    timer = setTimeout(function() {
      try {
        requestTask.abort();
      } catch (e) {
        console.error('取消请求失败:', e);
      }
      
      reject(new Error('请求超时'));
    }, timeout);
  });
};

module.exports = RequestAdapter; 