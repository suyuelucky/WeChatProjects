/**
 * 错误监控和日志服务
 * 负责收集、记录和上报错误和日志信息
 */
var EventBus = require('../utils/eventBus.js');

/**
 * 错误服务构造函数
 * @param {Object} errorCollector 错误收集器实例
 * @constructor
 */
function ErrorService(errorCollector) {
  this.errorCollector = errorCollector || null;
  this.logs = [];
  this.errors = [];
  this.config = {
    maxLogCount: 1000,
    maxErrorCount: 100,
    logLevel: 'info', // debug, info, warn, error
    isReportingEnabled: true
  };
  
  // 记录全局未捕获异常
  this.setupGlobalErrorHandling();
  
  console.log('错误监控服务初始化完成');
  return this;
}

/**
 * 设置全局错误处理
 * @private
 */
ErrorService.prototype.setupGlobalErrorHandling = function() {
  // 重写console方法，拦截日志
  var originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  };
  
  var self = this;
  
  console.log = function() {
    self.debug.apply(self, arguments);
    originalConsole.log.apply(console, arguments);
  };
  
  console.info = function() {
    self.info.apply(self, arguments);
    originalConsole.info.apply(console, arguments);
  };
  
  console.warn = function() {
    self.warn.apply(self, arguments);
    originalConsole.warn.apply(console, arguments);
  };
  
  console.error = function() {
    self.error.apply(self, arguments);
    originalConsole.error.apply(console, arguments);
  };
  
  // 全局错误监听
  if (wx && typeof wx.onError === 'function') {
    wx.onError(function(error) {
      self.reportError('uncaught', error);
    });
  }
  
  // 页面未找到监听
  if (wx && typeof wx.onPageNotFound === 'function') {
    wx.onPageNotFound(function(res) {
      self.reportError('pageNotFound', res);
    });
  }
  
  // 内存警告监听
  if (wx && typeof wx.onMemoryWarning === 'function') {
    wx.onMemoryWarning(function(res) {
      self.warn('内存不足警告', res);
    });
  }
};

/**
 * 记录Debug级别日志
 * @param {string} message 日志消息
 */
ErrorService.prototype.debug = function(message) {
  var args = Array.prototype.slice.call(arguments, 1);
  if (this.config.logLevel === 'debug') {
    this.log('debug', message, args);
  }
};

/**
 * 记录Info级别日志
 * @param {string} message 日志消息
 */
ErrorService.prototype.info = function(message) {
  var args = Array.prototype.slice.call(arguments, 1);
  if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
    this.log('info', message, args);
  }
};

/**
 * 记录警告级别日志
 * @param {string} message 日志消息
 */
ErrorService.prototype.warn = function(message) {
  var args = Array.prototype.slice.call(arguments, 1);
  if (this.config.logLevel !== 'error') {
    this.log('warn', message, args);
  }
};

/**
 * 记录错误级别日志
 * @param {string} message 日志消息
 */
ErrorService.prototype.error = function(message) {
  var args = Array.prototype.slice.call(arguments, 1);
  this.log('error', message, args);
};

/**
 * 记录日志
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 * @param {Array} data 额外数据
 * @private
 */
ErrorService.prototype.log = function(level, message, data) {
  try {
    var now = new Date();
    var logEntry = {
      id: 'log_' + now.getTime() + '_' + Math.floor(Math.random() * 1000),
      timestamp: now.toISOString(),
      level: level,
      message: message,
      data: data || []
    };
    
    // 添加到日志队列
    this.logs.push(logEntry);
    
    // 控制日志数量
    if (this.logs.length > this.config.maxLogCount) {
      this.logs = this.logs.slice(-this.config.maxLogCount);
    }
    
    // 触发日志事件
    if (EventBus && typeof EventBus.emit === 'function') {
      EventBus.emit('log:added', logEntry);
    }
    
    // 如果是错误，单独处理
    if (level === 'error') {
      this.reportError('logged', message, data);
    }
    
    return logEntry;
  } catch (err) {
    console.error('记录日志出错:', err);
    return null;
  }
};

/**
 * 报告错误
 * @param {string} type 错误类型
 * @param {string|Error} error 错误对象或消息
 * @param {*} data 额外数据
 */
ErrorService.prototype.reportError = function(type, error, data) {
  try {
    var now = new Date();
    var errorMessage = '';
    var errorStack = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack;
    } else {
      errorMessage = String(error);
    }
    
    var errorEntry = {
      id: 'error_' + now.getTime() + '_' + Math.floor(Math.random() * 1000),
      timestamp: now.toISOString(),
      type: type,
      message: errorMessage,
      stack: errorStack,
      data: data || {}
    };
    
    // 添加到错误队列
    this.errors.push(errorEntry);
    
    // 控制错误数量
    if (this.errors.length > this.config.maxErrorCount) {
      this.errors = this.errors.slice(-this.config.maxErrorCount);
    }
    
    // 触发错误事件
    if (EventBus && typeof EventBus.emit === 'function') {
      EventBus.emit('error:reported', errorEntry);
    }
    
    // 使用错误收集器（如果可用）
    if (this.errorCollector && typeof this.errorCollector.reportError === 'function') {
      this.errorCollector.reportError(type, errorMessage, data);
    }
    
    // 自动上报错误（如果启用）
    if (this.config.isReportingEnabled) {
      this.scheduleErrorReport();
    }
    
    return errorEntry;
  } catch (err) {
    console.error('报告错误出错:', err);
    return null;
  }
};

/**
 * 计划错误上报
 * @private
 */
ErrorService.prototype.scheduleErrorReport = function() {
  var self = this;
  
  // 每10分钟上报一次错误，避免频繁请求
  if (!this._errorReportTimer) {
    this._errorReportTimer = setTimeout(function() {
      self.uploadErrors();
      self._errorReportTimer = null;
    }, 10 * 60 * 1000); // 10分钟
  }
};

/**
 * 上传错误到服务器
 * @returns {Promise}
 */
ErrorService.prototype.uploadErrors = function() {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    if (self.errors.length === 0) {
      resolve({ message: '没有错误需要上报' });
      return;
    }
    
    // 获取系统信息
    wx.getSystemInfo({
      success: function(systemInfo) {
        // 准备上传数据
        var uploadData = {
          errors: self.errors,
          systemInfo: {
            brand: systemInfo.brand,
            model: systemInfo.model,
            pixelRatio: systemInfo.pixelRatio,
            screenWidth: systemInfo.screenWidth,
            screenHeight: systemInfo.screenHeight,
            windowWidth: systemInfo.windowWidth,
            windowHeight: systemInfo.windowHeight,
            statusBarHeight: systemInfo.statusBarHeight,
            language: systemInfo.language,
            version: systemInfo.version,
            system: systemInfo.system,
            platform: systemInfo.platform,
            fontSizeSetting: systemInfo.fontSizeSetting,
            SDKVersion: systemInfo.SDKVersion,
            benchmarkLevel: systemInfo.benchmarkLevel,
            battery: systemInfo.battery,
            wifiSignal: systemInfo.wifiSignal
          },
          timestamp: new Date().toISOString(),
          app: getApp().globalData.appVersion || '未知'
        };
        
        // 上传到服务器
        wx.request({
          url: 'https://api.xiuhuazhen.com/errors/report',
          method: 'POST',
          data: uploadData,
          success: function(res) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              // 清空已上报的错误
              self.errors = [];
              resolve(res.data);
            } else {
              reject(new Error('上报错误失败: ' + res.statusCode));
            }
          },
          fail: function(err) {
            reject(err);
          }
        });
      },
      fail: function(err) {
        reject(err);
      }
    });
  });
};

/**
 * 获取所有日志
 * @returns {Array} 日志列表
 */
ErrorService.prototype.getLogs = function() {
  return this.logs.slice();
};

/**
 * 获取所有错误
 * @returns {Array} 错误列表
 */
ErrorService.prototype.getErrors = function() {
  return this.errors.slice();
};

/**
 * 清除所有日志
 */
ErrorService.prototype.clearLogs = function() {
  this.logs = [];
  return true;
};

/**
 * 清除所有错误
 */
ErrorService.prototype.clearErrors = function() {
  this.errors = [];
  return true;
};

/**
 * 设置日志级别
 * @param {string} level 日志级别 (debug, info, warn, error)
 */
ErrorService.prototype.setLogLevel = function(level) {
  if (['debug', 'info', 'warn', 'error'].indexOf(level) !== -1) {
    this.config.logLevel = level;
    return true;
  }
  return false;
};

/**
 * 启用错误自动上报
 */
ErrorService.prototype.enableReporting = function() {
  this.config.isReportingEnabled = true;
  return true;
};

/**
 * 禁用错误自动上报
 */
ErrorService.prototype.disableReporting = function() {
  this.config.isReportingEnabled = false;
  if (this._errorReportTimer) {
    clearTimeout(this._errorReportTimer);
    this._errorReportTimer = null;
  }
  return true;
};

module.exports = ErrorService; 