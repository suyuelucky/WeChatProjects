/**
 * 日志记录工具类
 * 提供日志记录和错误上报功能
 */

// 是否启用详细日志
const VERBOSE_LOGGING = true;
// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 100
};
// 当前日志级别
let currentLogLevel = LOG_LEVELS.DEBUG;

// 日志缓存
const logCache = [];
// 最大缓存条数
const MAX_LOG_CACHE = 200;

/**
 * 设置日志级别
 * @param {number} level - 日志级别
 */
const setLogLevel = function(level) {
  if (LOG_LEVELS.hasOwnProperty(level)) {
    currentLogLevel = LOG_LEVELS[level];
  } else if (typeof level === 'number' && level >= 0) {
    currentLogLevel = level;
  }
};

/**
 * 记录日志
 * @param {string} message - 日志消息
 * @param {number} [level=1] - 日志级别
 */
const log = function(message, level = LOG_LEVELS.INFO) {
  if (level < currentLogLevel) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp: timestamp,
    message: message,
    level: level
  };
  
  // 添加到缓存
  logCache.push(logEntry);
  if (logCache.length > MAX_LOG_CACHE) {
    logCache.shift();
  }
  
  // 输出到控制台
  if (VERBOSE_LOGGING) {
    if (level === LOG_LEVELS.DEBUG) {
      console.debug(`[${timestamp}] ${message}`);
    } else if (level === LOG_LEVELS.INFO) {
      console.info(`[${timestamp}] ${message}`);
    } else if (level === LOG_LEVELS.WARN) {
      console.warn(`[${timestamp}] ${message}`);
    } else if (level === LOG_LEVELS.ERROR) {
      console.error(`[${timestamp}] ${message}`);
    }
  }
};

/**
 * 记录调试日志
 * @param {string} message - 日志消息
 */
const debug = function(message) {
  log(message, LOG_LEVELS.DEBUG);
};

/**
 * 记录信息日志
 * @param {string} message - 日志消息
 */
const info = function(message) {
  log(message, LOG_LEVELS.INFO);
};

/**
 * 记录警告日志
 * @param {string} message - 日志消息
 */
const warn = function(message) {
  log(message, LOG_LEVELS.WARN);
};

/**
 * 记录错误日志
 * @param {string} message - 日志消息
 */
const error = function(message) {
  log(message, LOG_LEVELS.ERROR);
};

/**
 * 上报错误
 * @param {string} category - 错误类别
 * @param {Error|string} err - 错误对象或错误消息
 */
const reportError = function(category, err) {
  const errorObj = err instanceof Error ? err : new Error(err);
  const errorMessage = errorObj.message || String(err);
  
  // 记录到本地日志
  error(`[${category}] ${errorMessage}`);
  
  // 尝试上报到后台
  try {
    if (typeof wx !== 'undefined' && wx.reportMonitor) {
      // 仅支持数值类型的错误上报，这里简单处理为特定错误码
      const errorCode = getErrorCode(category);
      wx.reportMonitor(errorCode, 1);
    }
    
    // 记录详细错误信息，如果存在
    if (errorObj.stack) {
      error(`Stack trace: ${errorObj.stack}`);
    }
  } catch (e) {
    error(`Error reporting failed: ${e.message}`);
  }
};

/**
 * 获取错误代码
 * @private
 * @param {string} category - 错误类别
 * @return {number} 错误代码
 */
const getErrorCode = function(category) {
  // 为不同类别的错误分配不同的错误码
  const errorCodes = {
    'camera': 1001,
    'storage': 1002,
    'network': 1003,
    'permission': 1004,
    'compression': 1005
  };
  
  // 模糊匹配，找到包含关键词的错误类别
  for (const key in errorCodes) {
    if (category.toLowerCase().includes(key)) {
      return errorCodes[key];
    }
  }
  
  // 默认错误码
  return 1000;
};

/**
 * 获取日志缓存
 * @return {Array} 日志缓存
 */
const getLogCache = function() {
  return [...logCache];
};

/**
 * 清空日志缓存
 */
const clearLogCache = function() {
  logCache.length = 0;
};

/**
 * 导出日志到文件
 * @return {Promise<string>} 日志文件路径
 */
const exportLogsToFile = function() {
  return new Promise((resolve, reject) => {
    try {
      const fs = wx.getFileSystemManager();
      const logFilePath = `${wx.env.USER_DATA_PATH}/app_logs_${Date.now()}.txt`;
      
      // 格式化日志内容
      const logContent = logCache.map(entry => 
        `[${entry.timestamp}][${getLogLevelName(entry.level)}] ${entry.message}`
      ).join('\n');
      
      // 写入文件
      fs.writeFile({
        filePath: logFilePath,
        data: logContent,
        encoding: 'utf8',
        success: () => {
          resolve(logFilePath);
        },
        fail: (error) => {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 获取日志级别名称
 * @private
 * @param {number} level - 日志级别
 * @return {string} 日志级别名称
 */
const getLogLevelName = function(level) {
  for (const key in LOG_LEVELS) {
    if (LOG_LEVELS[key] === level) {
      return key;
    }
  }
  return 'UNKNOWN';
};

module.exports = {
  log,
  debug,
  info,
  warn,
  error,
  reportError,
  setLogLevel,
  getLogCache,
  clearLogCache,
  exportLogsToFile,
  LOG_LEVELS
}; 