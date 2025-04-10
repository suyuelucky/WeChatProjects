/**
 * 存储管理器
 * 提供微信小程序存储能力的增强版封装，含错误处理和自动清理功能
 */

// 导入错误收集器
var ErrorCollector = require('./error-collector.js');

/**
 * 存储管理器构造函数
 * @constructor
 */
function StorageManager(options) {
  // 确保使用new调用
  if (!(this instanceof StorageManager)) {
    return new StorageManager(options);
  }
  
  // 配置选项
  options = options || {};
  this.maxStorageSize = options.maxStorageSize || 50 * 1024 * 1024; // 默认50MB
  this.warningThreshold = options.warningThreshold || 0.8;
  this.criticalThreshold = options.criticalThreshold || 0.9;
  this.autoCleanup = options.autoCleanup !== undefined ? options.autoCleanup : true;
  
  // 已知系统存储类型
  this.STORAGE_TYPES = {
    TEMP: 'temp',
    USER: 'user',
    SYSTEM: 'system',
    CACHE: 'cache'
  };
  
  // 存储类别映射到对应清理方法
  this.CLEANUP_STRATEGIES = {};
  this.CLEANUP_STRATEGIES[this.STORAGE_TYPES.TEMP] = this._cleanupTempStorage.bind(this);
  this.CLEANUP_STRATEGIES[this.STORAGE_TYPES.CACHE] = this._cleanupCacheStorage.bind(this);
  this.CLEANUP_STRATEGIES[this.STORAGE_TYPES.USER] = this._cleanupUserStorage.bind(this);
  this.CLEANUP_STRATEGIES[this.STORAGE_TYPES.SYSTEM] = null; // 系统存储不直接清理
  
  // 初始化时记录
  try {
    if (ErrorCollector && typeof ErrorCollector.reportWarning === 'function') {
      ErrorCollector.reportWarning('storage-manager', '存储管理器已初始化');
    }
  } catch (err) {
    console.warn('错误收集器不可用，无法记录存储管理器初始化');
  }
  
  return this;
}

/**
 * 存储项目
 * @param {String} key 键
 * @param {*} data 数据
 * @param {String} storageType 存储类型（默认user）
 * @returns {Boolean} 是否成功
 */
StorageManager.prototype.set = function(key, data, storageType) {
  storageType = storageType || this.STORAGE_TYPES.USER;
  
  try {
    // 对于不同类型的存储使用不同的前缀
    var prefixMap = {};
    prefixMap[this.STORAGE_TYPES.TEMP] = 'tmp_';
    prefixMap[this.STORAGE_TYPES.USER] = 'usr_';
    prefixMap[this.STORAGE_TYPES.SYSTEM] = 'sys_';
    prefixMap[this.STORAGE_TYPES.CACHE] = 'cache_';
    
    var prefix = prefixMap[storageType] || '';
    var prefixedKey = prefix + key;
    
    // 对于对象类型，进行JSON序列化
    var dataToStore = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // 存储数据
    wx.setStorageSync(prefixedKey, dataToStore);
    
    // 将存储类型元数据也记录下来以便后续清理
    var metaKey = '__meta_' + prefixedKey;
    wx.setStorageSync(metaKey, {
      type: storageType,
      timestamp: Date.now(),
      size: typeof dataToStore === 'string' ? dataToStore.length : 0
    });
    
    return true;
  } catch (err) {
    if (ErrorCollector && typeof ErrorCollector.reportError === 'function') {
      ErrorCollector.reportError('storage-set', '存储数据失败', { 
        key: key, 
        storageType: storageType,
        error: err
      });
    }
    console.error('存储数据失败:', err);
    return false;
  }
};

/**
 * 获取存储项目
 * @param {String} key 键
 * @param {String} storageType 存储类型（默认user）
 * @param {*} defaultValue 默认值（当项目不存在时返回）
 * @returns {*} 存储的数据
 */
StorageManager.prototype.get = function(key, storageType, defaultValue) {
  storageType = storageType || this.STORAGE_TYPES.USER;
  defaultValue = defaultValue !== undefined ? defaultValue : null;
  
  try {
    // 对于不同类型的存储使用不同的前缀
    var prefixMap = {};
    prefixMap[this.STORAGE_TYPES.TEMP] = 'tmp_';
    prefixMap[this.STORAGE_TYPES.USER] = 'usr_';
    prefixMap[this.STORAGE_TYPES.SYSTEM] = 'sys_';
    prefixMap[this.STORAGE_TYPES.CACHE] = 'cache_';
    
    var prefix = prefixMap[storageType] || '';
    var prefixedKey = prefix + key;
    
    // 检查项目是否存在
    if (!wx.getStorageSync(prefixedKey)) {
      return defaultValue;
    }
    
    // 获取数据
    var data = wx.getStorageSync(prefixedKey);
    
    // 尝试解析JSON（如果是JSON字符串）
    if (typeof data === 'string' && (data.charAt(0) === '{' || data.charAt(0) === '[')) {
      try {
        return JSON.parse(data);
      } catch (e) {
        // 不是有效的JSON，返回原始字符串
        return data;
      }
    }
    
    return data;
  } catch (err) {
    if (ErrorCollector && typeof ErrorCollector.reportError === 'function') {
      ErrorCollector.reportError('storage-get', '获取数据失败', { 
        key: key, 
        storageType: storageType,
        error: err
      });
    }
    console.error('获取数据失败:', err);
    return defaultValue;
  }
};

/**
 * 移除存储项目
 * @param {String} key 键
 * @param {String} storageType 存储类型（默认user）
 * @returns {Boolean} 是否成功
 */
StorageManager.prototype.remove = function(key, storageType) {
  storageType = storageType || this.STORAGE_TYPES.USER;
  
  try {
    // 对于不同类型的存储使用不同的前缀
    var prefixMap = {};
    prefixMap[this.STORAGE_TYPES.TEMP] = 'tmp_';
    prefixMap[this.STORAGE_TYPES.USER] = 'usr_';
    prefixMap[this.STORAGE_TYPES.SYSTEM] = 'sys_';
    prefixMap[this.STORAGE_TYPES.CACHE] = 'cache_';
    
    var prefix = prefixMap[storageType] || '';
    var prefixedKey = prefix + key;
    
    // 删除数据
    wx.removeStorageSync(prefixedKey);
    
    // 同时删除元数据
    var metaKey = '__meta_' + prefixedKey;
    if (wx.getStorageSync(metaKey)) {
      wx.removeStorageSync(metaKey);
    }
    
    return true;
  } catch (err) {
    if (ErrorCollector && typeof ErrorCollector.reportError === 'function') {
      ErrorCollector.reportError('storage-remove', '删除数据失败', { 
        key: key, 
        storageType: storageType,
        error: err
      });
    }
    console.error('删除数据失败:', err);
    return false;
  }
};

/**
 * 清理指定类型的存储项目
 * @param {String} storageType 存储类型
 * @param {Number} maxAge 最大过期时间(毫秒)
 * @param {Number} targetFreePercent 目标释放百分比(0-100)
 * @returns {Boolean} 是否成功
 */
StorageManager.prototype.cleanup = function(storageType, maxAge, targetFreePercent) {
  maxAge = maxAge || 7 * 24 * 60 * 60 * 1000; // 默认7天
  targetFreePercent = targetFreePercent || 30; // 默认释放30%
  
  try {
    // 检查并使用对应的清理策略
    var cleanupStrategy = this.CLEANUP_STRATEGIES[storageType];
    
    if (!cleanupStrategy) {
      if (ErrorCollector && typeof ErrorCollector.reportWarning === 'function') {
        ErrorCollector.reportWarning('storage-cleanup', '没有对应的清理策略', { storageType: storageType });
      }
      console.warn('没有找到针对 ' + storageType + ' 的清理策略');
      return false;
    }
    
    // 执行清理
    var result = cleanupStrategy(maxAge, targetFreePercent);
    
    if (result) {
      if (ErrorCollector && typeof ErrorCollector.reportWarning === 'function') {
        ErrorCollector.reportWarning('storage-cleanup', '存储清理成功', { 
          storageType: storageType,
          result: result
        });
      }
    }
    
    return true;
  } catch (err) {
    if (ErrorCollector && typeof ErrorCollector.reportError === 'function') {
      ErrorCollector.reportError('storage-cleanup', '存储清理失败', { 
        storageType: storageType,
        error: err
      });
    }
    console.error('存储清理失败:', err);
    return false;
  }
};

/**
 * 获取存储配额信息
 * @returns {Object} 存储配额信息
 */
StorageManager.prototype.getQuotaInfo = function() {
  try {
    var storageInfo = wx.getStorageInfoSync();
    return {
      currentSize: storageInfo.currentSize,
      limitSize: storageInfo.limitSize,
      keys: storageInfo.keys,
      usagePercent: (storageInfo.currentSize / storageInfo.limitSize) * 100,
      freeSpace: storageInfo.limitSize - storageInfo.currentSize
    };
  } catch (err) {
    if (ErrorCollector && typeof ErrorCollector.reportError === 'function') {
      ErrorCollector.reportError('storage-quota', '获取存储配额信息失败', { error: err });
    }
    console.error('获取存储配额信息失败:', err);
    return {
      currentSize: 0,
      limitSize: 0,
      keys: [],
      usagePercent: 0,
      freeSpace: 0
    };
  }
};

/**
 * 清理临时存储
 * @private
 */
StorageManager.prototype._cleanupTempStorage = function(maxAge, targetFreePercent) {
  try {
    // 获取存储信息
    var info = wx.getStorageInfoSync();
    var keys = info.keys || [];
    
    // 过滤出临时存储项
    var tempKeys = [];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('tmp_') === 0 || keys[i].indexOf('__temp') !== -1) {
        tempKeys.push(keys[i]);
      }
    }
    
    // 按时间戳排序（如果有元数据）
    var sortedKeys = this._sortKeysByAge(tempKeys);
    
    // 删除过期或多余的临时项
    var deleted = 0;
    for (var i = 0; i < sortedKeys.length; i++) {
      wx.removeStorageSync(sortedKeys[i]);
      deleted++;
      
      // 同时删除对应的元数据
      var metaKey = '__meta_' + sortedKeys[i];
      if (keys.indexOf(metaKey) !== -1) {
        wx.removeStorageSync(metaKey);
      }
    }
    
    return { cleaned: deleted, type: this.STORAGE_TYPES.TEMP };
  } catch (err) {
    console.error('清理临时存储失败:', err);
    return { cleaned: 0, error: err };
  }
};

/**
 * 清理缓存存储
 * @private
 */
StorageManager.prototype._cleanupCacheStorage = function(maxAge, targetFreePercent) {
  try {
    // 获取存储信息
    var info = wx.getStorageInfoSync();
    var keys = info.keys || [];
    
    // 过滤出缓存存储项
    var cacheKeys = [];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('cache_') === 0) {
        cacheKeys.push(keys[i]);
      }
    }
    
    // 按时间戳排序（如果有元数据）
    var sortedKeys = this._sortKeysByAge(cacheKeys);
    
    // 删除过期或多余的缓存项
    var deleted = 0;
    for (var i = 0; i < sortedKeys.length; i++) {
      wx.removeStorageSync(sortedKeys[i]);
      deleted++;
      
      // 同时删除对应的元数据
      var metaKey = '__meta_' + sortedKeys[i];
      if (keys.indexOf(metaKey) !== -1) {
        wx.removeStorageSync(metaKey);
      }
    }
    
    return { cleaned: deleted, type: this.STORAGE_TYPES.CACHE };
  } catch (err) {
    console.error('清理缓存存储失败:', err);
    return { cleaned: 0, error: err };
  }
};

/**
 * 清理用户存储
 * @private
 */
StorageManager.prototype._cleanupUserStorage = function(maxAge, targetFreePercent) {
  try {
    // 获取存储信息
    var info = wx.getStorageInfoSync();
    var keys = info.keys || [];
    
    // 过滤出用户存储项
    var userKeys = [];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('usr_') === 0) {
        userKeys.push(keys[i]);
      }
    }
    
    // 仅在存储空间紧张时才清理用户数据
    if (info.currentSize / info.limitSize < this.criticalThreshold) {
      return { cleaned: 0, type: this.STORAGE_TYPES.USER, message: '存储空间充足，不清理用户数据' };
    }
    
    // 按时间戳排序（如果有元数据）
    var sortedKeys = this._sortKeysByAge(userKeys);
    
    // 仅删除最旧的几项，保留最新数据
    var deleted = 0;
    var maxToDelete = Math.ceil(sortedKeys.length * 0.2); // 最多删除20%的用户数据
    
    for (var i = 0; i < Math.min(maxToDelete, sortedKeys.length); i++) {
      wx.removeStorageSync(sortedKeys[i]);
      deleted++;
      
      // 同时删除对应的元数据
      var metaKey = '__meta_' + sortedKeys[i];
      if (keys.indexOf(metaKey) !== -1) {
        wx.removeStorageSync(metaKey);
      }
    }
    
    return { cleaned: deleted, type: this.STORAGE_TYPES.USER };
  } catch (err) {
    console.error('清理用户存储失败:', err);
    return { cleaned: 0, error: err };
  }
};

/**
 * 按存储时间排序键
 * @private
 */
StorageManager.prototype._sortKeysByAge = function(keys) {
  var keyAges = [];
  
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var metaKey = '__meta_' + key;
    var timestamp = Date.now();
    
    try {
      var meta = wx.getStorageSync(metaKey);
      if (meta && meta.timestamp) {
        timestamp = meta.timestamp;
      }
    } catch (e) {
      // 如果无法获取元数据，使用当前时间
    }
    
    keyAges.push({
      key: key,
      timestamp: timestamp
    });
  }
  
  // 按时间戳排序，最旧的优先
  keyAges.sort(function(a, b) {
    return a.timestamp - b.timestamp;
  });
  
  // 返回排序后的键
  var result = [];
  for (var i = 0; i < keyAges.length; i++) {
    result.push(keyAges[i].key);
  }
  return result;
};

/**
 * 获取存储状态报告
 * @returns {Object} 存储状态报告
 */
StorageManager.prototype.getStorageReport = function() {
  try {
    // 获取存储信息
    const storageInfo = wx.getStorageInfoSync();
    
    if (!storageInfo) {
      return {
        timestamp: Date.now(),
        error: true,
        message: '无法获取存储信息',
        needsCleanup: false,
        isCritical: false,
        storage: {
          usagePercent: 0
        }
      };
    }
    
    // 获取所有键并分类
    const keys = storageInfo.keys || [];
    const tempKeys = keys.filter(key => key.startsWith('tmp_') || key.includes('_temp_'));
    const userKeys = keys.filter(key => key.startsWith('usr_'));
    const systemKeys = keys.filter(key => key.startsWith('sys_'));
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    const otherKeys = keys.filter(key => 
      !key.startsWith('tmp_') && 
      !key.includes('_temp_') && 
      !key.startsWith('usr_') && 
      !key.startsWith('sys_') && 
      !key.startsWith('cache_')
    );
    
    // 计算使用率 (避免除以0)
    const limitSize = storageInfo.limitSize || 50 * 1024 * 1024; // 默认50MB
    const currentSize = storageInfo.currentSize || 0;
    const usagePercent = (currentSize / limitSize) * 100;
    
    // 构建报告
    const report = {
      timestamp: Date.now(),
      totalKeys: keys.length,
      categories: {
        temp: tempKeys.length,
        user: userKeys.length,
        system: systemKeys.length,
        cache: cacheKeys.length,
        other: otherKeys.length
      },
      storage: {
        currentSize: currentSize,
        limitSize: limitSize,
        usagePercent: parseFloat(usagePercent.toFixed(2))
      },
      isCritical: usagePercent > 80,
      needsCleanup: usagePercent > 70
    };
    
    return report;
  } catch (err) {
    if (ErrorCollector && typeof ErrorCollector.reportError === 'function') {
      ErrorCollector.reportError('storage-report', '获取存储报告失败', { error: err });
    }
    console.error('获取存储报告失败:', err);
    
    // 返回基本报告
    return {
      timestamp: Date.now(),
      error: true,
      message: err.message || '获取存储报告失败',
      needsCleanup: false,
      isCritical: false,
      storage: {
        usagePercent: 0
      }
    };
  }
};

// 导出构造函数
module.exports = StorageManager; 