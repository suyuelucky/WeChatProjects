/**
 * 测试日志工具
 * 提供统一的日志记录机制，便于测试脚本输出和调试
 */

var chalk;
try {
  chalk = require('chalk');
} catch (e) {
  // 提供降级处理，在没有chalk的环境中也能正常运行
  chalk = {
    green: function(text) { return text; },
    red: function(text) { return text; },
    yellow: function(text) { return text; },
    blue: function(text) { return text; },
    gray: function(text) { return text; },
    bold: {
      green: function(text) { return text; },
      red: function(text) { return text; },
      yellow: function(text) { return text; },
      blue: function(text) { return text; }
    }
  };
}

/**
 * 日志级别
 */
var LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

/**
 * 日志工具
 */
var logger = {
  /**
   * 当前日志级别
   */
  level: LogLevel.INFO,
  
  /**
   * 设置日志级别
   * @param {number} level 日志级别
   */
  setLevel: function(level) {
    if (level >= LogLevel.ERROR && level <= LogLevel.TRACE) {
      this.level = level;
    }
  },
  
  /**
   * 获取当前时间字符串
   * @returns {string} 格式化的时间字符串
   */
  _getTimeString: function() {
    var now = new Date();
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');
    var milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    return hours + ':' + minutes + ':' + seconds + '.' + milliseconds;
  },
  
  /**
   * 记录错误日志
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   */
  error: function(message, data) {
    if (this.level >= LogLevel.ERROR) {
      var timeStr = this._getTimeString();
      console.error(chalk.bold.red('[ERROR]') + ' ' + chalk.gray(timeStr) + ' ' + message);
      if (data !== undefined) {
        console.error(data);
      }
    }
  },
  
  /**
   * 记录警告日志
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   */
  warn: function(message, data) {
    if (this.level >= LogLevel.WARN) {
      var timeStr = this._getTimeString();
      console.warn(chalk.bold.yellow('[WARN]') + ' ' + chalk.gray(timeStr) + ' ' + message);
      if (data !== undefined) {
        console.warn(data);
      }
    }
  },
  
  /**
   * 记录信息日志
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   */
  info: function(message, data) {
    if (this.level >= LogLevel.INFO) {
      var timeStr = this._getTimeString();
      console.log(chalk.bold.blue('[INFO]') + ' ' + chalk.gray(timeStr) + ' ' + message);
      if (data !== undefined) {
        console.log(data);
      }
    }
  },
  
  /**
   * 记录调试日志
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   */
  debug: function(message, data) {
    if (this.level >= LogLevel.DEBUG) {
      var timeStr = this._getTimeString();
      console.log(chalk.blue('[DEBUG]') + ' ' + chalk.gray(timeStr) + ' ' + message);
      if (data !== undefined) {
        console.log(data);
      }
    }
  },
  
  /**
   * 记录追踪日志
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   */
  trace: function(message, data) {
    if (this.level >= LogLevel.TRACE) {
      var timeStr = this._getTimeString();
      console.log(chalk.gray('[TRACE] ' + timeStr + ' ' + message));
      if (data !== undefined) {
        console.log(data);
      }
    }
  },
  
  /**
   * 记录成功日志
   * @param {string} message 日志消息
   */
  success: function(message) {
    if (this.level >= LogLevel.INFO) {
      var timeStr = this._getTimeString();
      console.log(chalk.bold.green('[SUCCESS]') + ' ' + chalk.gray(timeStr) + ' ' + message);
    }
  },
  
  /**
   * 记录测试结果日志
   * @param {boolean} passed 是否通过
   * @param {string} testName 测试名称
   * @param {string} message 测试消息
   */
  test: function(passed, testName, message) {
    if (this.level >= LogLevel.INFO) {
      var timeStr = this._getTimeString();
      var status = passed ? 
        chalk.bold.green('✓ PASS') : 
        chalk.bold.red('✗ FAIL');
      
      console.log(status + ' ' + chalk.gray(timeStr) + ' ' + testName + (message ? ': ' + message : ''));
    }
  }
};

module.exports = logger; 