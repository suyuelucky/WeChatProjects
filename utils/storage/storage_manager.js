/**
 * 存储管理器
 * 负责管理小程序存储空间，包括存储监控、清理、压缩等功能
 */
class StorageManager {
  constructor(options = {}) {
    this.options = {
      warningThreshold: 0.8, // 存储空间警告阈值（80%）
      maxRetries: 3, // 最大重试次数
      ...options
    };
    
    // 存储监控定时器
    this.monitorTimer = null;
    
    // 存储监控间隔（毫秒）
    this.MONITOR_INTERVAL = 5000;
    
    // 重试配置
    this.RETRY_DELAY = 1000;
    
    // 初始化
    this.init();
  }

  /**
   * 初始化存储管理器
   */
  init() {
    this.startMonitoring();
  }

  /**
   * 开始监控存储空间
   */
  startMonitoring() {
    var self = this;
    this.monitorTimer = setInterval(function() {
      self.checkStorageUsage();
    }, this.MONITOR_INTERVAL);
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }

  /**
   * 检查存储使用情况
   */
  async checkStorageUsage() {
    var self = this;
    return this.getStorageUsageRate()
      .then(function(usageRate) {
        if (usageRate >= 100) {
          return self.handleCriticalStorage();
        } else if (usageRate >= self.options.warningThreshold * 100) {
          return self.handleWarningStorage();
        }
        return Promise.resolve();
      })
      .catch(function(error) {
        console.error('存储检查失败:', error);
        return Promise.reject(error);
      });
  }

  /**
   * 获取存储使用情况
   * @returns {Promise} 返回存储使用情况
   */
  async getStorageUsage() {
    const info = wx.getStorageInfoSync();
    return {
      currentSize: info.currentSize,
      limitSize: info.limitSize,
      keys: info.keys
    };
  }

  /**
   * 获取存储使用率
   * @returns {Promise} 返回存储使用率（百分比）
   */
  async getStorageUsageRate() {
    const { currentSize, limitSize } = await this.getStorageUsage();
    return (currentSize / limitSize) * 100;
  }

  /**
   * 处理存储空间警告
   */
  handleWarningStorage() {
    wx.showModal({
      title: '存储空间警告',
      content: '存储空间即将用尽，请及时清理',
      showCancel: true,
      cancelText: '稍后处理',
      confirmText: '立即清理',
      success: function(res) {
        if (res.confirm) {
          this.cleanStorage();
        }
      }.bind(this)
    });
  }

  /**
   * 处理存储空间严重不足
   */
  handleCriticalStorage() {
    return this.cleanStorage()
      .then(function() {
        wx.showToast({
          title: '已自动清理存储空间',
          icon: 'success'
        });
      })
      .catch(function(error) {
        wx.showToast({
          title: '清理失败',
          icon: 'error'
        });
        return Promise.reject(error);
      });
  }

  /**
   * 清理存储空间
   * 按照最后访问时间清理不常用数据
   */
  cleanStorage() {
    return this.getStorageUsage()
      .then(function(usage) {
        // 获取所有存储的key
        var keys = usage.keys;
        // 按照最后访问时间排序
        var sortedKeys = this.sortKeysByLastAccess(keys);
        // 清理最老的30%数据
        var cleanCount = Math.ceil(keys.length * 0.3);
        var keysToClean = sortedKeys.slice(0, cleanCount);
        
        return this.batchRemoveItems(keysToClean);
      }.bind(this));
  }

  /**
   * 按最后访问时间排序key
   */
  sortKeysByLastAccess(keys) {
    var keyWithTime = keys.map(function(key) {
      var accessTime = 0;
      try {
        var data = wx.getStorageSync(key + '_meta');
        accessTime = data ? data.lastAccess : 0;
      } catch (e) {
        console.error('读取访问时间失败:', e);
      }
      return {
        key: key,
        lastAccess: accessTime
      };
    });
    
    return keyWithTime
      .sort(function(a, b) {
        return a.lastAccess - b.lastAccess;
      })
function StorageManager() {
  // 存储限制阈值（百分比）
  this.WARNING_THRESHOLD = 80;
  this.CRITICAL_THRESHOLD = 90;
  
  // 存储监控定时器
  this.monitorTimer = null;
  
  // 存储监控间隔（毫秒）
  this.MONITOR_INTERVAL = 5000;
  
  // 重试配置
  this.MAX_RETRIES = 3;
  this.RETRY_DELAY = 1000;
  
  // 初始化
  this.init();
}

/**
 * 初始化存储管理器
 */
StorageManager.prototype.init = function() {
  this.startMonitoring();
};

/**
 * 开始监控存储空间
 */
StorageManager.prototype.startMonitoring = function() {
  var self = this;
  this.monitorTimer = setInterval(function() {
    self.checkStorageUsage();
  }, this.MONITOR_INTERVAL);
};

/**
 * 停止监控
 */
StorageManager.prototype.stopMonitoring = function() {
  if (this.monitorTimer) {
    clearInterval(this.monitorTimer);
    this.monitorTimer = null;
  }
};

/**
 * 检查存储使用情况
 */
StorageManager.prototype.checkStorageUsage = function() {
  var self = this;
  return this.getStorageUsageRate()
    .then(function(usageRate) {
      if (usageRate >= self.CRITICAL_THRESHOLD) {
        return self.handleCriticalStorage();
      } else if (usageRate >= self.WARNING_THRESHOLD) {
        return self.handleWarningStorage();
      }
      return Promise.resolve();
    })
    .catch(function(error) {
      console.error('存储检查失败:', error);
      return Promise.reject(error);
    });
};

/**
 * 获取存储使用情况
 * @returns {Promise} 返回存储使用情况
 */
StorageManager.prototype.getStorageUsage = function() {
  try {
    var info = wx.getStorageInfoSync();
    return Promise.resolve({
      currentSize: info.currentSize,
      limitSize: info.limitSize,
      keys: info.keys
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * 获取存储使用率
 * @returns {Promise} 返回存储使用率（百分比）
 */
StorageManager.prototype.getStorageUsageRate = function() {
  return this.getStorageUsage()
    .then(function(usage) {
      return (usage.currentSize / usage.limitSize) * 100;
    });
};

/**
 * 处理存储空间警告
 */
StorageManager.prototype.handleWarningStorage = function() {
  wx.showModal({
    title: '存储空间警告',
    content: '存储空间即将用尽，请及时清理',
    showCancel: true,
    cancelText: '稍后处理',
    confirmText: '立即清理',
    success: function(res) {
      if (res.confirm) {
        this.cleanStorage();
      }
    }.bind(this)
  });
};

/**
 * 处理存储空间严重不足
 */
StorageManager.prototype.handleCriticalStorage = function() {
  return this.cleanStorage()
    .then(function() {
      wx.showToast({
        title: '已自动清理存储空间',
        icon: 'success'
      });
    })
    .catch(function(error) {
      wx.showToast({
        title: '清理失败',
        icon: 'error'
      });
      return Promise.reject(error);
    });
};

/**
 * 清理存储空间
 * 按照最后访问时间清理不常用数据
 */
StorageManager.prototype.cleanStorage = function() {
  return this.getStorageUsage()
    .then(function(usage) {
      // 获取所有存储的key
      var keys = usage.keys;
      // 按照最后访问时间排序
      var sortedKeys = this.sortKeysByLastAccess(keys);
      // 清理最老的30%数据
      var cleanCount = Math.ceil(keys.length * 0.3);
      var keysToClean = sortedKeys.slice(0, cleanCount);
      
      return this.batchRemoveItems(keysToClean);
    }.bind(this));
};

/**
 * 按最后访问时间排序key
 */
StorageManager.prototype.sortKeysByLastAccess = function(keys) {
  var keyWithTime = keys.map(function(key) {
    var accessTime = 0;
    try {
      var data = wx.getStorageSync(key + '_meta');
      accessTime = data ? data.lastAccess : 0;
    } catch (e) {
      console.error('读取访问时间失败:', e);
    }
    return {
      key: key,
      lastAccess: accessTime
    };
  });
  
  return keyWithTime
    .sort(function(a, b) {
      return a.lastAccess - b.lastAccess;
    })
    .map(function(item) {
      return item.key;
    });
};

/**
 * 批量删除存储项
 */
StorageManager.prototype.batchRemoveItems = function(keys) {
  var promises = keys.map(function(key) {
    return this.removeItem(key);
  }.bind(this));
  
  return Promise.all(promises);
};

/**
 * 设置存储项
 * @param {string} key 键
 * @param {*} value 值
 * @param {number} retryCount 重试次数
 */
StorageManager.prototype.setItem = function(key, value, retryCount) {
  var self = this;
  retryCount = retryCount || 0;
  
  return this.getStorageUsageRate()
    .then(function(usageRate) {
      if (usageRate >= 100) {
        throw new Error('存储空间已满');
      }
      
      try {
        // 存储数据
        wx.setStorageSync(key, value);
        // 更新访问时间
        wx.setStorageSync(key + '_meta', {
          lastAccess: Date.now()
        });
        return Promise.resolve();
      } catch (error) {
        if (retryCount < self.MAX_RETRIES) {
          return new Promise(function(resolve) {
            setTimeout(function() {
              resolve(self.setItem(key, value, retryCount + 1));
            }, self.RETRY_DELAY);
          });
        }
        return Promise.reject(error);
      }
    });
};

/**
 * 获取存储项
 * @param {string} key 键
 */
StorageManager.prototype.getItem = function(key) {
  try {
    var value = wx.getStorageSync(key);
    // 更新访问时间
    wx.setStorageSync(key + '_meta', {
      lastAccess: Date.now()
    });
    return Promise.resolve(value);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * 删除存储项
 * @param {string} key 键
 */
StorageManager.prototype.removeItem = function(key) {
  try {
    wx.removeStorageSync(key);
    wx.removeStorageSync(key + '_meta');
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * 销毁存储管理器
 */
StorageManager.prototype.destroy = function() {
  this.stopMonitoring();
};

module.exports = StorageManager; 