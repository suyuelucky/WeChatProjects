/**
 * 微信API模拟器
 * 提供动态修改微信API行为的功能，用于测试不同场景
 */

var logger = require('./logger');

// 保存原始API
var originalWxApis = {};

/**
 * 模拟微信API
 * @param {string} apiName 要模拟的API名称
 * @param {boolean} success 是否成功
 * @param {object} errorData 错误数据
 * @param {object} successData 成功数据
 */
function mockWxApi(apiName, success, errorData, successData) {
  // 保存原始API
  if (!originalWxApis[apiName] && wx[apiName]) {
    originalWxApis[apiName] = wx[apiName];
  }
  
  logger.debug('模拟微信API: ' + apiName, { success, errorData, successData });
  
  // 替换API
  wx[apiName] = function(options) {
    logger.trace('调用模拟API: ' + apiName, options);
    
    // 创建结果处理程序
    var handleResult = function() {
      if (success) {
        if (typeof options.success === 'function') {
          options.success(successData || {});
        }
      } else {
        if (typeof options.fail === 'function') {
          options.fail(errorData || { errMsg: apiName + ':fail' });
        }
      }
      
      if (typeof options.complete === 'function') {
        options.complete({});
      }
    };
    
    // 针对不同API提供特殊处理
    if (apiName === 'uploadFile') {
      // 模拟上传任务对象
      setTimeout(handleResult, 10);
      
      return {
        onProgressUpdate: function(callback) {
          if (success) {
            setTimeout(function() {
              callback({ progress: 30 });
            }, 10);
            setTimeout(function() {
              callback({ progress: 60 });
            }, 20);
            setTimeout(function() {
              callback({ progress: 100 });
            }, 30);
          }
        },
        offProgressUpdate: function() {},
        abort: function() {}
      };
    } else {
      // 普通API直接处理
      setTimeout(handleResult, 10);
    }
  };
}

/**
 * 恢复微信API
 * @param {string} apiName 要恢复的API名称
 */
function restoreWxApi(apiName) {
  if (originalWxApis[apiName]) {
    wx[apiName] = originalWxApis[apiName];
    logger.debug('恢复微信API: ' + apiName);
  }
}

/**
 * 恢复所有微信API
 */
function restoreAllWxApis() {
  Object.keys(originalWxApis).forEach(function(apiName) {
    restoreWxApi(apiName);
  });
  logger.debug('恢复所有微信API');
}

/**
 * 模拟微信存储
 */
var mockStorage = {
  data: {},
  
  /**
   * 设置存储数据
   * @param {string} key 键名
   * @param {*} value 值
   */
  set: function(key, value) {
    this.data[key] = value;
    logger.trace('模拟存储设置: ' + key, value);
  },
  
  /**
   * 获取存储数据
   * @param {string} key 键名
   * @returns {*} 值
   */
  get: function(key) {
    logger.trace('模拟存储获取: ' + key, this.data[key]);
    return this.data[key];
  },
  
  /**
   * 移除存储数据
   * @param {string} key 键名
   */
  remove: function(key) {
    delete this.data[key];
    logger.trace('模拟存储移除: ' + key);
  },
  
  /**
   * 清空存储
   */
  clear: function() {
    this.data = {};
    logger.trace('模拟存储清空');
  }
};

/**
 * 应用模拟存储
 */
function applyMockStorage() {
  mockWxApi('getStorageSync', true, null, function(key) {
    return mockStorage.get(key);
  });
  
  mockWxApi('setStorageSync', true, null, function(key, data) {
    mockStorage.set(key, data);
  });
  
  mockWxApi('getStorage', true, null, function(options) {
    return { data: mockStorage.get(options.key) };
  });
  
  mockWxApi('setStorage', true, null, function(options) {
    mockStorage.set(options.key, options.data);
  });
  
  mockWxApi('removeStorage', true, null, function(options) {
    mockStorage.remove(options.key);
  });
  
  mockWxApi('clearStorage', true, null, function() {
    mockStorage.clear();
  });
  
  logger.debug('应用模拟存储');
}

module.exports = {
  mockWxApi: mockWxApi,
  restoreWxApi: restoreWxApi,
  restoreAllWxApis: restoreAllWxApis,
  mockStorage: mockStorage,
  applyMockStorage: applyMockStorage
}; 