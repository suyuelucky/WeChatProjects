/**
 * 错误收集工具
 * 用于捕获和记录运行时错误、异常状态和功能不可用情况
 */

var STORAGE_KEY = 'error_collector_logs';
var MAX_LOGS = 100;

var ErrorCollector = {
  /**
   * 初始化状态
   */
  initialized: false,
  
  /**
   * 初始化错误收集器
   */
  init: function() {
    // 防止重复初始化
    if (this.initialized) {
      return this;
    }
    
    try {
      // 全局错误监听
      var self = this;
      wx.onError(function(err) {
        self.reportError('global', err);
      });
      
      // 网络状态变化监听
      wx.onNetworkStatusChange(function(res) {
        if (!res.isConnected) {
          self.reportWarning('network', '网络连接断开');
        }
      });
      
      // 内存警告监听
      wx.onMemoryWarning(function(res) {
        self.reportWarning('memory', '内存不足警告', { level: res.level });
      });
      
      // 标记为已初始化
      this.initialized = true;
      
      console.log('[ErrorCollector] 初始化完成');
    } catch (err) {
      console.error('[ErrorCollector] 初始化失败:', err);
      // 即使初始化失败，依然可以使用基本功能
    }
    
    return this;
  },
  
  /**
   * 报告错误
   * @param {string} category 错误类别
   * @param {Error|string} error 错误对象或信息
   * @param {Object} extra 额外信息
   */
  reportError: function(category, error, extra) {
    extra = extra || {};
    
    try {
      // 格式化错误信息
      var message = '';
      var stack = '';
      
      if (error instanceof Error) {
        message = error.message;
        stack = error.stack || '';
      } else if (typeof error === 'string') {
        message = error;
      } else {
        try {
          message = JSON.stringify(error);
        } catch (e) {
          message = '[无法序列化的错误对象]';
        }
      }
      
      // 获取设备信息
      var systemInfo = {};
      try {
        systemInfo = wx.getSystemInfoSync();
      } catch (e) {
        // 如果无法获取系统信息，使用空对象
      }
      
      // 构建错误日志
      var errorLog = {
        type: 'error',
        category: category,
        message: message,
        stack: stack,
        timestamp: Date.now(),
        device: {
          brand: systemInfo.brand || 'unknown',
          model: systemInfo.model || 'unknown',
          system: systemInfo.system || 'unknown',
          platform: systemInfo.platform || 'unknown',
          SDKVersion: systemInfo.SDKVersion || 'unknown'
        },
        extra: extra
      };
      
      // 保存错误日志
      this._saveLog(errorLog);
      
      // 打印错误到控制台
      console.error('[ErrorCollector] [' + category + '] ' + message, extra);
      
      // 返回错误ID（时间戳）
      return errorLog.timestamp;
    } catch (e) {
      // 确保错误收集器自身的错误不会影响应用
      console.error('[ErrorCollector] 报告错误时发生异常:', e);
      return null;
    }
  },
  
  /**
   * 报告警告
   * @param {string} category 警告类别
   * @param {string} message 警告信息
   * @param {Object} extra 额外信息
   */
  reportWarning: function(category, message, extra) {
    extra = extra || {};
    
    try {
      // 构建警告日志
      var warningLog = {
        type: 'warning',
        category: category,
        message: message,
        timestamp: Date.now(),
        extra: extra
      };
      
      // 保存警告日志
      this._saveLog(warningLog);
      
      // 打印警告到控制台
      console.warn('[ErrorCollector] [' + category + '] ' + message, extra);
      
      return warningLog.timestamp;
    } catch (e) {
      console.error('[ErrorCollector] 报告警告时发生异常:', e);
      return null;
    }
  },
  
  /**
   * 报告功能不可用状态
   * @param {string} feature 功能名称
   * @param {string} reason 不可用原因
   * @param {Object} details 详细信息
   */
  reportFeatureUnavailable: function(feature, reason, details) {
    details = details || {};
    
    try {
      // 构建功能不可用日志
      var unavailableLog = {
        type: 'feature_unavailable',
        feature: feature,
        reason: reason,
        timestamp: Date.now(),
        details: details
      };
      
      // 保存日志
      this._saveLog(unavailableLog);
      
      // 打印信息到控制台
      console.warn('[ErrorCollector] 功能不可用: ' + feature + ' - ' + reason, details);
      
      return unavailableLog.timestamp;
    } catch (e) {
      console.error('[ErrorCollector] 报告功能不可用时发生异常:', e);
      return null;
    }
  },
  
  /**
   * 内部方法：保存日志到存储
   * @private
   */
  _saveLog: function(logEntry) {
    try {
      // 获取现有日志
      var logs = [];
      try {
        var logsStr = wx.getStorageSync(STORAGE_KEY);
        if (logsStr) {
          logs = JSON.parse(logsStr);
        }
      } catch (e) {
        // 如果无法解析现有日志，使用空数组
      }
      
      // 添加新日志
      logs.push(logEntry);
      
      // 如果超出最大数量，移除最旧的
      if (logs.length > MAX_LOGS) {
        logs = logs.slice(-MAX_LOGS);
      }
      
      // 保存回存储
      wx.setStorageSync(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      // 如果保存失败，至少确保记录到控制台
      console.error('[ErrorCollector] 保存日志失败:', e);
    }
  },
  
  /**
   * 获取所有日志
   * @returns {Array} 日志列表
   */
  getLogs: function() {
    try {
      var logsStr = wx.getStorageSync(STORAGE_KEY) || '[]';
      return JSON.parse(logsStr);
    } catch (e) {
      console.error('[ErrorCollector] 获取日志失败:', e);
      return [];
    }
  },
  
  /**
   * 清除所有日志
   */
  clearLogs: function() {
    try {
      wx.setStorageSync(STORAGE_KEY, '[]');
      console.log('[ErrorCollector] 日志已清除');
      return true;
    } catch (e) {
      console.error('[ErrorCollector] 清除日志失败:', e);
      return false;
    }
  },
  
  /**
   * 上传日志到服务器
   * @param {string} url 上传地址
   * @returns {Promise<Object>} 上传结果
   */
  uploadLogs: function(url) {
    var self = this;
    return new Promise(function(resolve, reject) {
      try {
        var logs = self.getLogs();
        
        if (logs.length === 0) {
          resolve({ message: '没有需要上传的日志' });
          return;
        }
        
        // 上传日志到服务器
        wx.request({
          url: url,
          method: 'POST',
          data: { logs: logs },
          success: function(res) {
            // 上传成功后清除本地日志
            if (res.statusCode >= 200 && res.statusCode < 300) {
              self.clearLogs();
              resolve(res.data);
            } else {
              reject(new Error('上传日志失败: ' + res.statusCode));
            }
          },
          fail: function(err) {
            reject(err);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  },
  
  /**
   * 创建错误处理包装函数
   * @param {Function} fn 原始函数
   * @param {string} category 错误类别
   * @returns {Function} 包装后的函数
   */
  wrapWithErrorHandler: function(fn, category) {
    category = category || 'function';
    var self = this;
    
    return function() {
      try {
        var args = Array.prototype.slice.call(arguments);
        var result = fn.apply(this, args);
        
        // 如果是Promise，添加错误处理
        if (result && typeof result.then === 'function') {
          return result.catch(function(err) {
            self.reportError(category, err, { args: JSON.stringify(args) });
            throw err; // 重新抛出错误
          });
        }
        
        return result;
      } catch (err) {
        self.reportError(category, err, { args: JSON.stringify(args) });
        throw err; // 重新抛出错误
      }
    };
  }
};

// 尝试立即初始化
try {
  ErrorCollector.init();
} catch (err) {
  console.warn('[ErrorCollector] 自动初始化失败，需要手动调用init方法');
}

// 导出实例
module.exports = ErrorCollector; 