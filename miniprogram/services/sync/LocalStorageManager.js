/**
 * LocalStorageManager组件 - 管理本地数据存储，提供高效的读写和查询能力
 * 
 * 创建时间: 2025年4月9日 11:05:21 CST
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

/**
 * 本地存储管理器
 * 提供对微信小程序存储的封装，支持前缀、批量操作、过期控制等高级功能
 * 
 * @class LocalStorageManager
 */
function LocalStorageManager(options) {
  // 默认选项
  this.options = {
    prefix: '',  // 存储键前缀
    maxItems: 10000,  // 最大存储项数
    errorHandler: null  // 错误处理器
  };
  
  // 合并传入选项
  if (options) {
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        this.options[key] = options[key];
      }
    }
  }
  
  // 存储键前缀
  this.prefix = this.options.prefix || '';
}

/**
 * 生成带前缀的完整存储键
 * @param {string} key - 原始键名
 * @returns {string} 带前缀的完整键名
 * @private
 */
LocalStorageManager.prototype._getFullKey = function(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Storage key must be a non-empty string');
  }
  return this.prefix + key;
};

/**
 * 移除键前缀，返回原始键名
 * @param {string} fullKey - 带前缀的完整键名
 * @returns {string} 原始键名
 * @private
 */
LocalStorageManager.prototype._removePrefix = function(fullKey) {
  if (fullKey.indexOf(this.prefix) === 0) {
    return fullKey.substring(this.prefix.length);
  }
  return fullKey;
};

/**
 * 设置存储项，支持过期时间和版本控制
 * @param {string} key - 存储键
 * @param {*} value - 存储值
 * @param {Object} [options] - 设置选项
 * @param {number} [options.expires] - 过期时间戳
 * @param {number} [options.version] - 数据版本号
 * @returns {boolean} 设置是否成功
 */
LocalStorageManager.prototype.set = function(key, value, options) {
  var fullKey = this._getFullKey(key);
  options = options || {};
  
  // 准备存储数据
  var storageData = {
    value: value,
    timestamp: Date.now()
  };
  
  // 添加过期时间（如果有）
  if (options.expires) {
    storageData.expires = options.expires;
  }
  
  // 添加版本信息（如果有）
  if (options.version !== undefined) {
    storageData.version = options.version;
    
    // 版本管理：保存旧版本
    try {
      var currentData = this.get(key);
      if (currentData && currentData.__versions === undefined) {
        var currentVersion = this._getRawData(fullKey).version || 0;
        
        // 创建版本历史存储
        var versionsKey = fullKey + '_versions';
        var versions = wx.getStorageSync(versionsKey) || {};
        
        // 保存旧版本
        versions[currentVersion] = currentData;
        wx.setStorageSync(versionsKey, versions);
      }
    } catch (e) {
      console.warn('Error saving version history:', e);
    }
  }
  
  try {
    wx.setStorageSync(fullKey, storageData);
    return true;
  } catch (error) {
    // 处理存储配额超出
    if (error.errMsg && error.errMsg.indexOf('storage limit exceeded') !== -1) {
      this._handleStorageLimitExceeded();
      // 重试设置
      try {
        wx.setStorageSync(fullKey, storageData);
        return true;
      } catch (retryError) {
        this._handleError(retryError, {
          operation: 'set',
          key: key,
          value: value
        });
        return false;
      }
    } else {
      this._handleError(error, {
        operation: 'set',
        key: key,
        value: value
      });
      throw error;
    }
  }
};

/**
 * 获取存储项，支持默认值
 * @param {string} key - 存储键
 * @param {*} [defaultValue] - 如果键不存在时返回的默认值
 * @returns {*} 存储值或默认值
 */
LocalStorageManager.prototype.get = function(key, defaultValue) {
  try {
    var data = this._getRawData(this._getFullKey(key));
    
    // 如果数据不存在，返回默认值
    if (data === null) {
      return defaultValue !== undefined ? defaultValue : null;
    }
    
    // 检查数据是否过期
    if (data.expires && Date.now() > data.expires) {
      this.remove(key);
      return defaultValue !== undefined ? defaultValue : null;
    }
    
    return data.value;
  } catch (error) {
    this._handleError(error, {
      operation: 'get',
      key: key
    });
    return defaultValue !== undefined ? defaultValue : null;
  }
};

/**
 * 获取原始存储数据（包括元数据）
 * @param {string} fullKey - 完整存储键
 * @returns {Object|null} 原始存储数据对象
 * @private
 */
LocalStorageManager.prototype._getRawData = function(fullKey) {
  return wx.getStorageSync(fullKey) || null;
};

/**
 * 获取特定版本的数据
 * @param {string} key - 存储键
 * @param {number} version - 版本号
 * @returns {*} 指定版本的数据，如果不存在则返回null
 */
LocalStorageManager.prototype.getVersion = function(key, version) {
  try {
    var fullKey = this._getFullKey(key);
    var versionsKey = fullKey + '_versions';
    var versions = wx.getStorageSync(versionsKey) || {};
    
    // 如果请求的是当前版本
    var currentData = this._getRawData(fullKey);
    if (currentData && currentData.version === version) {
      return currentData.value;
    }
    
    // 返回历史版本
    return versions[version] || null;
  } catch (error) {
    this._handleError(error, {
      operation: 'getVersion',
      key: key,
      version: version
    });
    return null;
  }
};

/**
 * 移除存储项
 * @param {string} key - 存储键
 * @returns {boolean} 是否成功
 */
LocalStorageManager.prototype.remove = function(key) {
  try {
    wx.removeStorageSync(this._getFullKey(key));
    return true;
  } catch (error) {
    this._handleError(error, {
      operation: 'remove',
      key: key
    });
    return false;
  }
};

/**
 * 检查键是否存在
 * @param {string} key - 存储键
 * @returns {boolean} 键是否存在
 */
LocalStorageManager.prototype.has = function(key) {
  try {
    var data = this._getRawData(this._getFullKey(key));
    
    // 检查数据是否存在
    if (data === null) {
      return false;
    }
    
    // 检查数据是否过期
    if (data.expires && Date.now() > data.expires) {
      this.remove(key);
      return false;
    }
    
    return true;
  } catch (error) {
    this._handleError(error, {
      operation: 'has',
      key: key
    });
    return false;
  }
};

/**
 * 获取所有键名（不含前缀）
 * @returns {Array<string>} 键名数组
 */
LocalStorageManager.prototype.keys = function() {
  try {
    var allKeys = wx.getStorageInfoSync().keys || [];
    var result = [];
    var prefixLength = this.prefix.length;
    
    // 过滤出属于当前前缀的键，并移除前缀
    for (var i = 0; i < allKeys.length; i++) {
      var key = allKeys[i];
      if (key.indexOf(this.prefix) === 0 && !key.endsWith('_versions')) {
        result.push(key.substring(prefixLength));
      }
    }
    
    return result;
  } catch (error) {
    this._handleError(error, {
      operation: 'keys'
    });
    return [];
  }
};

/**
 * 按前缀获取键名
 * @param {string} keyPrefix - 键前缀
 * @returns {Array<string>} 匹配的键名数组
 */
LocalStorageManager.prototype.getKeysByPrefix = function(keyPrefix) {
  var allKeys = this.keys();
  var result = [];
  
  for (var i = 0; i < allKeys.length; i++) {
    var key = allKeys[i];
    if (key.indexOf(keyPrefix) === 0) {
      result.push(key);
    }
  }
  
  return result;
};

/**
 * 批量设置多个存储项
 * @param {Object} dataMap - 键值对映射
 * @param {Object} [options] - 设置选项
 * @returns {boolean} 是否全部成功
 */
LocalStorageManager.prototype.setBatch = function(dataMap, options) {
  var success = true;
  
  for (var key in dataMap) {
    if (dataMap.hasOwnProperty(key)) {
      var result = this.set(key, dataMap[key], options);
      if (!result) {
        success = false;
      }
    }
  }
  
  return success;
};

/**
 * 批量获取多个存储项
 * @param {Array<string>} keys - 键名数组
 * @returns {Object} 键值对映射
 */
LocalStorageManager.prototype.getBatch = function(keys) {
  var result = {};
  
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    result[key] = this.get(key);
  }
  
  return result;
};

/**
 * 批量移除多个存储项
 * @param {Array<string>} keys - 键名数组
 * @returns {boolean} 是否全部成功
 */
LocalStorageManager.prototype.removeBatch = function(keys) {
  var success = true;
  
  for (var i = 0; i < keys.length; i++) {
    var result = this.remove(keys[i]);
    if (!result) {
      success = false;
    }
  }
  
  return success;
};

/**
 * 按前缀移除多个存储项
 * @param {string} keyPrefix - 键前缀
 * @returns {boolean} 是否全部成功
 */
LocalStorageManager.prototype.removeByPrefix = function(keyPrefix) {
  var keys = this.getKeysByPrefix(keyPrefix);
  return this.removeBatch(keys);
};

/**
 * 清除所有存储项
 * @returns {boolean} 是否成功
 */
LocalStorageManager.prototype.clear = function() {
  try {
    // 如果有前缀，只清除带前缀的项
    if (this.prefix) {
      var keys = this.keys();
      return this.removeBatch(keys);
    } else {
      // 清除所有存储
      wx.clearStorageSync();
      return true;
    }
  } catch (error) {
    this._handleError(error, {
      operation: 'clear'
    });
    return false;
  }
};

/**
 * 处理存储限制超出问题
 * @private
 */
LocalStorageManager.prototype._handleStorageLimitExceeded = function() {
  try {
    // 获取所有键
    var allKeys = this.keys();
    if (allKeys.length === 0) {
      return;
    }
    
    // 按前缀分组所有键
    var keyGroups = {};
    for (var i = 0; i < allKeys.length; i++) {
      var key = allKeys[i];
      var groupKey = key.split('_')[0] || 'default';
      
      if (!keyGroups[groupKey]) {
        keyGroups[groupKey] = [];
      }
      keyGroups[groupKey].push(key);
    }
    
    // 从每个组中移除一半的键
    for (var group in keyGroups) {
      if (keyGroups.hasOwnProperty(group)) {
        var groupKeys = keyGroups[group];
        // 按时间戳对键进行排序（如果可能）
        var sortedKeys = this._sortKeysByTimestamp(groupKeys);
        
        // 移除一半最旧的键
        var removeCount = Math.ceil(sortedKeys.length / 2);
        for (var j = 0; j < removeCount; j++) {
          this.remove(sortedKeys[j]);
        }
      }
    }
  } catch (error) {
    console.error('Error handling storage limit exceeded:', error);
  }
};

/**
 * 根据时间戳对键进行排序
 * @param {Array<string>} keys - 键名数组
 * @returns {Array<string>} 排序后的键名数组
 * @private
 */
LocalStorageManager.prototype._sortKeysByTimestamp = function(keys) {
  var self = this;
  var keyWithTimestamp = [];
  
  // 获取每个键的时间戳
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var data = this._getRawData(this._getFullKey(key));
    var timestamp = data && data.timestamp ? data.timestamp : 0;
    
    keyWithTimestamp.push({
      key: key,
      timestamp: timestamp
    });
  }
  
  // 按时间戳排序（升序，最旧的在前面）
  keyWithTimestamp.sort(function(a, b) {
    return a.timestamp - b.timestamp;
  });
  
  // 返回排序后的键
  return keyWithTimestamp.map(function(item) {
    return item.key;
  });
};

/**
 * 处理错误
 * @param {Error} error - 错误对象
 * @param {Object} context - 错误上下文
 * @private
 */
LocalStorageManager.prototype._handleError = function(error, context) {
  console.error('LocalStorageManager error:', error, 'Context:', context);
  
  // 调用自定义错误处理程序（如果有）
  if (typeof this.options.errorHandler === 'function') {
    this.options.errorHandler(error, context);
  }
};

module.exports = LocalStorageManager; 