/**
 * 错误监控和日志服务
 * 负责收集、记录和上报错误和日志信息
 */
var EventBus = require('../utils/eventBus.js');

var ErrorService = {
  /**
   * 初始化服务
   * @return {object} 当前实例
   */
  init: function(container) {
    this.container = container;
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
  },

  /**
   * 设置全局错误处理
   * @private
   */
  setupGlobalErrorHandling: function() {
    // 重写console方法，拦截日志
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error
    };
    
    console.log = (...args) => {
      this.debug(...args);
      originalConsole.log.apply(console, args);
    };
    
    console.info = (...args) => {
      this.info(...args);
      originalConsole.info.apply(console, args);
    };
    
    console.warn = (...args) => {
      this.warn(...args);
      originalConsole.warn.apply(console, args);
    };
    
    console.error = (...args) => {
      this.error(...args);
      originalConsole.error.apply(console, args);
    };
    
    // 全局错误监听
    wx.onError((error) => {
      this.reportError('uncaught', error);
    });
    
    // 页面未找到监听
    wx.onPageNotFound((res) => {
      this.reportError('pageNotFound', res);
    });
    
    // 内存警告监听
    wx.onMemoryWarning((res) => {
      this.warn('内存不足警告', res);
    });
  },

  /**
   * 记录Debug级别日志
   * @param {string} message 日志消息
   * @param {*} data 额外数据
   */
  debug: function(message, ...data) {
    if (['debug'].includes(this.config.logLevel)) {
      this.log('debug', message, data);
    }
  },

  /**
   * 记录Info级别日志
   * @param {string} message 日志消息
   * @param {*} data 额外数据
   */
  info: function(message, ...data) {
    if (['debug', 'info'].includes(this.config.logLevel)) {
      this.log('info', message, data);
    }
  },

  /**
   * 记录警告级别日志
   * @param {string} message 日志消息
   * @param {*} data 额外数据
   */
  warn: function(message, ...data) {
    if (['debug', 'info', 'warn'].includes(this.config.logLevel)) {
      this.log('warn', message, data);
    }
  },

  /**
   * 记录错误级别日志
   * @param {string} message 日志消息
   * @param {*} data 额外数据
   */
  error: function(message, ...data) {
    this.log('error', message, data);
  },

  /**
   * 记录日志
   * @param {string} level 日志级别
   * @param {string} message 日志消息
   * @param {Array} data 额外数据
   * @private
   */
  log: function(level, message, data) {
    const now = new Date();
    const logEntry = {
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
    EventBus.emit('log:added', logEntry);
    
    // 如果是错误，单独处理
    if (level === 'error') {
      this.reportError('logged', message, data);
    }
    
    return logEntry;
  },

  /**
   * 报告错误
   * @param {string} type 错误类型
   * @param {string|Error} error 错误对象或消息
   * @param {*} data 额外数据
   * @private
   */
  reportError: function(type, error, data) {
    const now = new Date();
    let errorMessage = '';
    let errorStack = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack;
    } else {
      errorMessage = String(error);
    }
    
    const errorEntry = {
      id: 'error_' + now.getTime() + '_' + Math.floor(Math.random() * 1000),
      timestamp: now.toISOString(),
      type: type,
      message: errorMessage,
      stack: errorStack,
      data: data || []
    };
    
    // 添加到错误队列
    this.errors.push(errorEntry);
    
    // 控制错误数量
    if (this.errors.length > this.config.maxErrorCount) {
      this.errors = this.errors.slice(-this.config.maxErrorCount);
    }
    
    // 触发错误事件
    EventBus.emit('error:reported', errorEntry);
    
    // 上报错误
    if (this.config.isReportingEnabled) {
      this.uploadError(errorEntry);
    }
    
    return errorEntry;
  },

  /**
   * 上传错误到服务器
   * @param {object} error 错误对象
   * @private
   */
  uploadError: function(error) {
    // TODO: 实现错误上报功能，例如通过云函数上报到服务器
    // 此处为模拟实现
    setTimeout(() => {
      console.info('错误已上报:', error.id);
    }, 100);
  },

  /**
   * 获取所有日志
   * @param {object} options 查询选项
   * @return {Array} 日志列表
   */
  getLogs: function(options = {}) {
    let logs = [...this.logs];
    
    // 按级别筛选
    if (options.level) {
      logs = logs.filter(log => log.level === options.level);
    }
    
    // 按时间范围筛选
    if (options.startTime) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(options.startTime));
    }
    
    if (options.endTime) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(options.endTime));
    }
    
    // 按消息内容搜索
    if (options.search) {
      const search = options.search.toLowerCase();
      logs = logs.filter(log => log.message.toLowerCase().includes(search));
    }
    
    // 按时间排序
    logs.sort((a, b) => options.order === 'asc' 
      ? new Date(a.timestamp) - new Date(b.timestamp)
      : new Date(b.timestamp) - new Date(a.timestamp));
    
    return logs;
  },

  /**
   * 获取所有错误
   * @param {object} options 查询选项
   * @return {Array} 错误列表
   */
  getErrors: function(options = {}) {
    let errors = [...this.errors];
    
    // 按类型筛选
    if (options.type) {
      errors = errors.filter(error => error.type === options.type);
    }
    
    // 按时间范围筛选
    if (options.startTime) {
      errors = errors.filter(error => new Date(error.timestamp) >= new Date(options.startTime));
    }
    
    if (options.endTime) {
      errors = errors.filter(error => new Date(error.timestamp) <= new Date(options.endTime));
    }
    
    // 按消息内容搜索
    if (options.search) {
      const search = options.search.toLowerCase();
      errors = errors.filter(error => error.message.toLowerCase().includes(search));
    }
    
    // 按时间排序
    errors.sort((a, b) => options.order === 'asc' 
      ? new Date(a.timestamp) - new Date(b.timestamp)
      : new Date(b.timestamp) - new Date(a.timestamp));
    
    return errors;
  },

  /**
   * 清除日志
   * @return {boolean} 是否成功
   */
  clearLogs: function() {
    this.logs = [];
    return true;
  },

  /**
   * 清除错误
   * @return {boolean} 是否成功
   */
  clearErrors: function() {
    this.errors = [];
    return true;
  },

  /**
   * 更新配置
   * @param {object} config 配置对象
   * @return {object} 当前配置
   */
  updateConfig: function(config) {
    this.config = {
      ...this.config,
      ...config
    };
    
    return this.config;
  },

  /**
   * 获取当前配置
   * @return {object} 当前配置
   */
  getConfig: function() {
    return { ...this.config };
  }
};

module.exports = ErrorService; 