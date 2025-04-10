/**
 * 存储管理器(StorageManager)
 * 统一管理不同的存储适配器并提供高级功能
 * 包括数据分级存储、配额监控和智能清理机制等
 * 遵循ES5标准，确保在微信小程序环境兼容
 * 
 * 作者：AI助手
 * 创建日期：2025-04-08
 * 最后更新：2025-04-10
 */

// 导入依赖
var storageAdapterFactory = require('./storageAdapterFactory');
var storageConfig = require('./storageConfig');
var cleanupStrategy = require('./cleanupStrategy');

// 默认配置
var DEFAULT_CONFIG = {
  // 默认存储适配器类型
  defaultStorageType: 'local',
  
  // 命名空间前缀
  namespacePrefix: 'ns_',
  
  // 存储限制(默认9MB)
  maxStorageSize: 9 * 1024 * 1024,
  
  // 警告阈值(使用率80%)
  warningThreshold: 0.8,
  
  // 临界阈值(使用率90%)
  criticalThreshold: 0.9,
  
  // 自动清理配置
  autoCleanup: true,
  autoCleanupInterval: 30 * 60 * 1000, // 30分钟
  
  // 过期检查配置
  expiryCheckEnabled: true,
  expiryCheckInterval: 60 * 60 * 1000, // 1小时
  
  // 事件通知
  eventNotificationsEnabled: true,
  
  // 清理策略
  cleanupStrategy: 'composite' // 可选：'lru', 'priority', 'expiry', 'composite'
};

/**
 * 存储管理器构造函数
 * @param {Object} options 配置选项
 */
function StorageManager(options) {
  // 合并配置
  this.config = {};
  
  for (var key in DEFAULT_CONFIG) {
    if (DEFAULT_CONFIG.hasOwnProperty(key)) {
      this.config[key] = DEFAULT_CONFIG[key];
    }
  }
  
  if (options) {
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        this.config[key] = options[key];
      }
    }
  }
  
  // 内部状态
  this._adapters = {};       // 适配器映射
  this._metadata = {};       // 元数据缓存
  this._keyMap = {};         // 键名映射
  this._namespaces = {};     // 命名空间对象
  this._timers = {};         // 定时器
  this._validators = {};     // 验证器
  this._eventHandlers = {};  // 事件处理器
  
  // 配额警告状态
  this._quotaWarning = false;
  
  // 初始化
  this._init();
}

/**
 * 初始化管理器
 * @private
 */
StorageManager.prototype._init = function() {
  // 获取默认适配器
  this._getAdapter(this.config.defaultStorageType);
  
  // 启动自动清理定时器
  if (this.config.autoCleanup) {
    this._startAutoCleanup();
  }
  
  // 启动过期检查定时器
  if (this.config.expiryCheckEnabled) {
    this._startExpiryCheck();
  }
  
  // 检查存储状态
  this._checkStorageStatus();
};

/**
 * 获取配置
 * @returns {Object} 当前配置
 */
StorageManager.prototype.getConfig = function() {
  return JSON.parse(JSON.stringify(this.config));
};

// ========================
// 适配器管理
// ========================

/**
 * 获取适配器
 * @param {string} type 适配器类型
 * @returns {Object} 存储适配器
 */
StorageManager.prototype.getAdapter = function(type) {
  type = type || this.config.defaultStorageType;
  return this._getAdapter(type);
};

/**
 * 内部获取适配器方法
 * @private
 * @param {string} type 适配器类型
 * @returns {Object} 存储适配器
 */
StorageManager.prototype._getAdapter = function(type) {
  // 检查是否已有缓存适配器
  if (this._adapters[type]) {
    return this._adapters[type];
  }
  
  // 从工厂获取适配器
  var factory = storageAdapterFactory.getStorageAdapterFactoryInstance();
  var adapter = factory.getAdapter(type);
  
  // 缓存适配器
  this._adapters[type] = adapter;
  
  return adapter;
};

/**
 * 注册自定义适配器
 * @param {string} type 适配器类型
 * @param {Object} adapter 适配器实例
 * @returns {boolean} 是否成功
 */
StorageManager.prototype.registerAdapter = function(type, adapter) {
  if (!type || !adapter) return false;
  
  // 验证适配器接口
  if (typeof adapter.getItem !== 'function' ||
      typeof adapter.setItem !== 'function' ||
      typeof adapter.removeItem !== 'function') {
    console.error('无效的适配器:', type);
    return false;
  }
  
  // 注册适配器
  this._adapters[type] = adapter;
  return true;
};

// ========================
// 基本存储操作
// ========================

/**
 * 获取存储项
 * @param {string} key 键名
 * @param {Object} options 选项
 * @returns {*} 存储的值，如果不存在则返回null
 */
StorageManager.prototype.getItem = function(key, options) {
  if (!key) return null;
  
  options = options || {};
  var adapter = this._getAdapter(options.adapter);
  
  // 获取实际存储键
  var storageKey = this._getStorageKey(key, options);
  
  // 获取数据
  var value = adapter.getItem(storageKey);
  
  // 如果找不到，可能是因为使用了原始键，尝试再次查找
  if (value === null && this._keyMap[key]) {
    storageKey = this._keyMap[key];
    value = adapter.getItem(storageKey);
  }
  
  // 更新访问时间元数据
  this._updateLastAccess(storageKey);
  
  // 检查过期
  if (value !== null && this._isExpired(storageKey)) {
    // 已过期，删除项目
    adapter.removeItem(storageKey);
    delete this._metadata[storageKey];
    return null;
  }
  
  // 处理滑动窗口过期策略
  this._updateSlidingExpiry(storageKey);
  
  return value;
};

/**
 * 设置存储项
 * @param {string} key 键名
 * @param {*} value 要存储的值
 * @param {Object} options 选项
 * @returns {boolean} 操作是否成功
 */
StorageManager.prototype.setItem = function(key, value, options) {
  if (!key) return false;
  
  options = options || {};
  var adapter = this._getAdapter(options.adapter);
  
  // 检查空间是否足够
  if (!this._ensureStorageSpace(value, options)) {
    return false;
  }
  
  // 运行数据验证
  if (options.validator && !this._validateData(value, options.validator)) {
    return false;
  }
  
  // 获取实际存储键
  var storageKey = this._getStorageKey(key, options);
  
  // 记录键映射
  this._keyMap[key] = storageKey;
  
  // 获取旧值(用于事件通知)
  var oldValue = adapter.getItem(storageKey);
  
  // 设置数据
  var success = adapter.setItem(storageKey, value);
  
  if (success) {
    // 更新元数据
    this._updateMetadata(storageKey, key, options);
    
    // 触发事件
    var eventType = oldValue === null ? 'itemAdded' : 'itemUpdated';
    this._triggerEvent(eventType, key, value, oldValue);
    
    // 检查存储状态
    this._checkStorageStatus();
  }
  
  return success;
};

/**
 * 删除存储项
 * @param {string} key 键名
 * @param {Object} options 选项
 * @returns {boolean} 操作是否成功
 */
StorageManager.prototype.removeItem = function(key, options) {
  if (!key) return false;
  
  options = options || {};
  var adapter = this._getAdapter(options.adapter);
  
  // 获取实际存储键
  var storageKey = this._getStorageKey(key, options);
  
  // 获取当前值(用于事件通知)
  var value = adapter.getItem(storageKey);
  
  // 如果找不到，尝试使用映射的键
  if (value === null && this._keyMap[key]) {
    storageKey = this._keyMap[key];
    value = adapter.getItem(storageKey);
  }
  
  // 删除不存在的项目视为成功
  if (value === null) return true;
  
  // 删除数据
  var success = adapter.removeItem(storageKey);
  
  if (success) {
    // 清理元数据和键映射
    delete this._metadata[storageKey];
    delete this._keyMap[key];
    
    // 触发事件
    this._triggerEvent('itemRemoved', key, value);
    
    // 检查存储状态
    this._checkStorageStatus();
  }
  
  return success;
};

/**
 * 清空存储
 * @param {Object} options 选项
 * @returns {boolean} 操作是否成功
 */
StorageManager.prototype.clear = function(options) {
  options = options || {};
  
  // 如果指定了类型，只清理该类型的数据
  if (options.type) {
    return this.cleanupByType(options.type);
  }
  
  // 如果指定了命名空间，只清理该命名空间
  if (options.namespace) {
    var namespace = this._namespaces[options.namespace];
    return namespace ? namespace.clear() : false;
  }
  
  var adapter = this._getAdapter(options.adapter);
  
  // 获取当前所有键
  var keys = this.keys();
  
  // 依次删除键(而不是直接调用adapter.clear()，确保元数据同步)
  var success = true;
  
  for (var i = 0; i < keys.length; i++) {
    if (!this.removeItem(keys[i], options)) {
      success = false;
    }
  }
  
  // 重置内部状态
  this._metadata = {};
  this._keyMap = {};
  this._quotaWarning = false;
  
  // 触发事件
  this._triggerEvent('storageCleared');
  
  return success;
};

/**
 * 获取所有键名
 * @param {Object} options 选项
 * @returns {Array<string>} 键名数组
 */
StorageManager.prototype.keys = function(options) {
  options = options || {};
  var adapter = this._getAdapter(options.adapter);
  
  // 获取所有键
  var storageKeys = adapter.keys();
  var result = [];
  
  // 过滤和映射键
  for (var i = 0; i < storageKeys.length; i++) {
    var storageKey = storageKeys[i];
    
    // 如果有类型过滤
    if (options.type && !this._isKeyOfType(storageKey, options.type)) {
      continue;
    }
    
    // 如果有范围过滤
    if (options.scope && !this._isKeyOfScope(storageKey, options.scope)) {
      continue;
    }
    
    // 获取原始键名(如果没有，使用存储键)
    var originalKey = this._getOriginalKey(storageKey);
    if (originalKey) {
      result.push(originalKey);
    }
  }
  
  return result;
};

/**
 * 获取存储信息
 * @param {Object} options 选项
 * @returns {Object} 存储信息
 */
StorageManager.prototype.getStorageInfo = function(options) {
  options = options || {};
  var adapter = this._getAdapter(options.adapter);
  
  // 获取基础存储信息
  var info = adapter.getStorageInfo ? adapter.getStorageInfo() : {
    keys: adapter.keys(),
    currentSize: 0,
    limitSize: this.config.maxStorageSize
  };
  
  // 过滤命名空间键(如果有指定命名空间)
  if (options.namespace) {
    var prefix = this.config.namespacePrefix + options.namespace + '_';
    var filteredKeys = [];
    
    for (var i = 0; i < info.keys.length; i++) {
      if (info.keys[i].indexOf(prefix) === 0) {
        filteredKeys.push(info.keys[i]);
      }
    }
    
    info.keys = filteredKeys;
  }
  
  return info;
};

// ========================
// 键名规范化
// ========================

/**
 * 获取存储键
 * @private
 * @param {string} key 原始键名
 * @param {Object} options 选项
 * @returns {string} 存储键
 */
StorageManager.prototype._getStorageKey = function(key, options) {
  options = options || {};
  
  // 获取类型前缀
  var typePrefix = '';
  if (options.type) {
    var prefixes = storageConfig.StorageConfig.keyPrefixes;
    typePrefix = prefixes[options.type] || '';
  }
  
  // 获取命名空间前缀
  var namespacePrefix = '';
  if (options.namespace) {
    namespacePrefix = this.config.namespacePrefix + options.namespace + '_';
  }
  
  // 组合最终键名
  return namespacePrefix + typePrefix + key;
};

/**
 * 从存储键获取原始键名
 * @private
 * @param {string} storageKey 存储键
 * @returns {string} 原始键名
 */
StorageManager.prototype._getOriginalKey = function(storageKey) {
  // 检查是否在键映射中有直接对应
  for (var originalKey in this._keyMap) {
    if (this._keyMap[originalKey] === storageKey) {
      return originalKey;
    }
  }
  
  // 尝试去除前缀
  var prefixes = storageConfig.StorageConfig.keyPrefixes;
  
  for (var type in prefixes) {
    var prefix = prefixes[type];
    if (storageKey.indexOf(prefix) === 0) {
      return storageKey.substring(prefix.length);
    }
  }
  
  // 尝试去除命名空间前缀
  var namespacePrefix = this.config.namespacePrefix;
  if (storageKey.indexOf(namespacePrefix) === 0) {
    var parts = storageKey.substring(namespacePrefix.length).split('_');
    // 第一部分是命名空间，剩余部分是键名
    if (parts.length >= 2) {
      return parts.slice(1).join('_');
    }
  }
  
  // 未找到对应关系，返回原始存储键
  return storageKey;
};

/**
 * 检查键是否属于指定类型
 * @private
 * @param {string} storageKey 存储键
 * @param {string} type 类型
 * @returns {boolean} 是否属于指定类型
 */
StorageManager.prototype._isKeyOfType = function(storageKey, type) {
  var prefix = storageConfig.StorageConfig.keyPrefixes[type];
  if (!prefix) return false;
  
  // 处理命名空间情况
  if (storageKey.indexOf(this.config.namespacePrefix) === 0) {
    // 跳过命名空间部分
    var parts = storageKey.split('_');
    if (parts.length >= 3) {
      return parts[2] === prefix.slice(0, -1); // 去掉前缀的下划线
    }
    return false;
  }
  
  return storageKey.indexOf(prefix) === 0;
};

/**
 * 检查键是否属于指定存储范围
 * @private
 * @param {string} storageKey 存储键
 * @param {string} scope 存储范围
 * @returns {boolean} 是否属于指定范围
 */
StorageManager.prototype._isKeyOfScope = function(storageKey, scope) {
  // 获取键的元数据
  var metadata = this._metadata[storageKey];
  if (!metadata) return false;
  
  return metadata.scope === scope;
};

// ========================
// 分级存储功能
// ========================

/**
 * 按类型获取存储项
 * @param {string} type 数据类型
 * @param {Object} options 选项
 * @returns {Array} 项目数组
 */
StorageManager.prototype.getItemsByType = function(type, options) {
  if (!type) return [];
  
  options = options || {};
  options.type = type;
  
  var keys = this.keys(options);
  var result = [];
  
  for (var i = 0; i < keys.length; i++) {
    var item = this.getItem(keys[i], options);
    if (item !== null) {
      result.push(item);
    }
  }
  
  return result;
};

/**
 * 按范围获取存储项
 * @param {string} scope 存储范围
 * @param {Object} options 选项
 * @returns {Array} 项目数组
 */
StorageManager.prototype.getItemsByScope = function(scope, options) {
  if (!scope) return [];
  
  options = options || {};
  options.scope = scope;
  
  var keys = this.keys(options);
  var result = [];
  
  for (var i = 0; i < keys.length; i++) {
    var item = this.getItem(keys[i], options);
    if (item !== null) {
      result.push(item);
    }
  }
  
  return result;
};

/**
 * 批量设置存储项
 * @param {Object} items 键值对象
 * @param {Object} options 选项
 * @returns {boolean} 是否全部成功
 */
StorageManager.prototype.setItems = function(items, options) {
  if (!items || typeof items !== 'object') return false;
  
  var keys = Object.keys(items);
  var success = true;
  
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = items[key];
    
    if (!this.setItem(key, value, options)) {
      success = false;
    }
  }
  
  return success;
};

/**
 * 批量获取存储项
 * @param {Array<string>} keys 键名数组
 * @param {Object} options 选项
 * @returns {Object} 键值对象
 */
StorageManager.prototype.getItems = function(keys, options) {
  if (!Array.isArray(keys)) return {};
  
  var result = {};
  
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = this.getItem(key, options);
    
    if (value !== null) {
      result[key] = value;
    }
  }
  
  return result;
};

/**
 * 批量删除存储项
 * @param {Array<string>} keys 键名数组
 * @param {Object} options 选项
 * @returns {boolean} 是否全部成功
 */
StorageManager.prototype.removeItems = function(keys, options) {
  if (!Array.isArray(keys)) return false;
  
  var success = true;
  
  for (var i = 0; i < keys.length; i++) {
    if (!this.removeItem(keys[i], options)) {
      success = false;
    }
  }
  
  return success;
};

// ========================
// 元数据管理
// ========================

/**
 * 更新项目元数据
 * @private
 * @param {string} storageKey 存储键
 * @param {string} originalKey 原始键
 * @param {Object} options 选项
 */
StorageManager.prototype._updateMetadata = function(storageKey, originalKey, options) {
  options = options || {};
  
  // 创建或获取现有元数据
  var metadata = this._metadata[storageKey] || {};
  var now = Date.now();
  
  // 更新基本信息
  metadata.key = originalKey;
  metadata.storageKey = storageKey;
  metadata.type = options.type || 'unknown';
  metadata.scope = options.scope || 'local';
  metadata.lastModified = now;
  metadata.lastAccess = now;
  
  // 首次创建时设置创建时间
  if (!metadata.createdAt) {
    metadata.createdAt = now;
  }
  
  // 受保护状态
  if (options.protected !== undefined) {
    metadata.protected = !!options.protected;
  }
  
  // 处理过期设置
  if (options.expiry) {
    metadata.expiry = this._processExpiryOptions(options.expiry, now);
  }
  
  // 存储元数据
  this._metadata[storageKey] = metadata;
};

/**
 * 更新最后访问时间
 * @private
 * @param {string} storageKey 存储键
 */
StorageManager.prototype._updateLastAccess = function(storageKey) {
  if (this._metadata[storageKey]) {
    this._metadata[storageKey].lastAccess = Date.now();
  }
};

/**
 * 处理过期选项
 * @private
 * @param {Object} expiry 过期选项
 * @param {number} now 当前时间
 * @returns {Object} 处理后的过期设置
 */
StorageManager.prototype._processExpiryOptions = function(expiry, now) {
  var result = {
    strategy: expiry.strategy || 'never',
    expiryTime: null
  };
  
  // 根据策略计算过期时间
  switch (result.strategy) {
    case 'absolute':
      // 绝对时间
      result.expiryTime = expiry.time;
      break;
      
    case 'relative':
      // 相对时间(从现在开始计算)
      result.expiryTime = now + expiry.duration;
      break;
      
    case 'sliding':
      // 滑动窗口(从最后访问开始计算)
      result.expiryTime = now + expiry.duration;
      result.slidingDuration = expiry.duration;
      break;
      
    case 'never':
    default:
      // 永不过期
      result.expiryTime = null;
      break;
  }
  
  return result;
};

/**
 * 更新滑动过期时间
 * @private
 * @param {string} storageKey 存储键
 */
StorageManager.prototype._updateSlidingExpiry = function(storageKey) {
  var metadata = this._metadata[storageKey];
  if (!metadata || !metadata.expiry || metadata.expiry.strategy !== 'sliding') {
    return;
  }
  
  // 更新滑动窗口过期时间
  metadata.expiry.expiryTime = Date.now() + metadata.expiry.slidingDuration;
};

/**
 * 检查项目是否已过期
 * @private
 * @param {string} storageKey 存储键
 * @returns {boolean} 是否已过期
 */
StorageManager.prototype._isExpired = function(storageKey) {
  var metadata = this._metadata[storageKey];
  if (!metadata || !metadata.expiry || !metadata.expiry.expiryTime) {
    return false;
  }
  
  return Date.now() > metadata.expiry.expiryTime;
};

/**
 * 检查所有项目过期状态
 * @private
 */
StorageManager.prototype._checkExpiry = function() {
  var keys = Object.keys(this._metadata);
  var adapter = this._getAdapter();
  var expiredCount = 0;
  
  for (var i = 0; i < keys.length; i++) {
    var storageKey = keys[i];
    
    if (this._isExpired(storageKey)) {
      // 已过期，删除
      adapter.removeItem(storageKey);
      delete this._metadata[storageKey];
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    console.log('已清理' + expiredCount + '个过期项目');
  }
  
  return expiredCount;
};

/**
 * 启动过期检查定时器
 * @private
 */
StorageManager.prototype._startExpiryCheck = function() {
  var self = this;
  
  // 清除现有定时器
  if (this._timers.expiryCheck) {
    clearInterval(this._timers.expiryCheck);
  }
  
  // 创建新定时器
  this._timers.expiryCheck = setInterval(function() {
    self._checkExpiry();
  }, this.config.expiryCheckInterval);
};

/**
 * 设置模拟当前时间(用于测试)
 * @private
 * @param {number} time 时间戳
 */
StorageManager.prototype._setCurrentTime = function(time) {
  this._mockTime = time;
  
  // 保存原始Date.now
  if (!this._originalDateNow) {
    this._originalDateNow = Date.now;
    
    // 替换Date.now
    var self = this;
    Date.now = function() {
      return self._mockTime;
    };
  }
};

// ========================
// 增强的配额监控功能
// ========================

/**
 * 获取存储配额信息
 * @param {Object} options 选项
 * @returns {Object} 配额信息对象
 */
StorageManager.prototype.getQuotaInfo = function(options) {
  options = options || {};
  var adapter = this._getAdapter(options.adapter);
  var quotaInfo = {
    maxSize: this.config.maxStorageSize,
    currentSize: 0,
    usage: 0,
    available: 0,
    usagePercentage: 0,
    isWarning: false,
    isCritical: false,
    detailedUsage: {
      core: 0,
      user: 0,
      work: 0,
      cache: 0,
      temp: 0,
      other: 0
    }
  };
  
  try {
    // 获取存储信息
    var storageInfo = adapter.getStorageInfo();
    quotaInfo.currentSize = storageInfo.currentSize || 0;
    
    // 计算使用率
    quotaInfo.usage = quotaInfo.currentSize;
    quotaInfo.available = quotaInfo.maxSize - quotaInfo.currentSize;
    quotaInfo.usagePercentage = (quotaInfo.currentSize / quotaInfo.maxSize) * 100;
    
    // 检查警告和临界状态
    var warningThreshold = this.config.warningThreshold * quotaInfo.maxSize;
    var criticalThreshold = this.config.criticalThreshold * quotaInfo.maxSize;
    
    quotaInfo.isWarning = quotaInfo.currentSize >= warningThreshold;
    quotaInfo.isCritical = quotaInfo.currentSize >= criticalThreshold;
    
    // 统计不同类型数据的使用情况
    var allKeys = adapter.getAllKeys();
    var self = this;
    
    allKeys.forEach(function(storageKey) {
      var metadata = self._getItemMetadata(storageKey);
      if (!metadata || !metadata.size) return;
      
      var size = metadata.size;
      var dataType = metadata.dataType;
      
      // 根据数据类型统计
      switch(dataType) {
        case StorageManager.DATA_TYPES.CORE:
          quotaInfo.detailedUsage.core += size;
          break;
        case StorageManager.DATA_TYPES.USER:
          quotaInfo.detailedUsage.user += size;
          break;
        case StorageManager.DATA_TYPES.WORK:
          quotaInfo.detailedUsage.work += size;
          break;
        case StorageManager.DATA_TYPES.CACHE:
          quotaInfo.detailedUsage.cache += size;
          break;
        case StorageManager.DATA_TYPES.TEMP:
          quotaInfo.detailedUsage.temp += size;
          break;
        default:
          quotaInfo.detailedUsage.other += size;
      }
    });
    
    return quotaInfo;
  } catch (e) {
    console.error('获取配额信息失败:', e);
    return quotaInfo;
  }
};

/**
 * 启用配额警告处理器
 * @param {function} warningHandler 当存储使用超过警告阈值时调用的处理函数
 * @param {function} criticalHandler 当存储使用超过临界阈值时调用的处理函数
 * @returns {boolean} 是否成功启用
 */
StorageManager.prototype.enableQuotaWarnings = function(warningHandler, criticalHandler) {
  if (typeof warningHandler !== 'function' || typeof criticalHandler !== 'function') {
    return false;
  }
  
  this._quotaWarningHandler = warningHandler;
  this._quotaCriticalHandler = criticalHandler;
  
  // 立即检查当前状态
  this._checkStorageStatus();
  return true;
};

/**
 * 设置自动清理触发阈值
 * @param {number} threshold 触发阈值，0-1之间的数字，表示存储使用百分比
 * @returns {boolean} 是否设置成功
 */
StorageManager.prototype.setAutoCleanupThreshold = function(threshold) {
  if (typeof threshold !== 'number' || threshold <= 0 || threshold > 1) {
    return false;
  }
  
  this.config.autoCleanupThreshold = threshold;
  return true;
};

/**
 * 增强的检查存储状态方法
 * @private
 */
StorageManager.prototype._checkStorageStatus = function() {
  try {
    var quotaInfo = this.getQuotaInfo();
    
    // 触发警告
    if (quotaInfo.isWarning && !this._quotaWarning && this._quotaWarningHandler) {
      this._quotaWarning = true;
      this._quotaWarningHandler(quotaInfo);
      
      // 触发事件
      this._triggerEvent('quotaWarning', quotaInfo);
    }
    
    // 如果低于警告阈值，重置警告状态
    if (!quotaInfo.isWarning && this._quotaWarning) {
      this._quotaWarning = false;
    }
    
    // 触发临界警告
    if (quotaInfo.isCritical && this._quotaCriticalHandler) {
      this._quotaCriticalHandler(quotaInfo);
      
      // 触发事件
      this._triggerEvent('quotaCritical', quotaInfo);
      
      // 如果启用了自动清理，启动清理流程
      if (this.config.autoCleanup) {
        this._startEmergencyCleanup();
      }
    }
    
    return quotaInfo;
  } catch (e) {
    console.error('检查存储状态失败:', e);
    return null;
  }
};

/**
 * 启动紧急清理流程
 * @private
 */
StorageManager.prototype._startEmergencyCleanup = function() {
  console.log('启动紧急清理流程');
  
  // 清理策略顺序：过期数据 > 临时数据 > 缓存数据 > 低优先级数据
  
  // 1. 清理过期数据
  this.clearExpiredItems();
  
  // 检查清理后的存储状态
  var quotaInfo = this.getQuotaInfo();
  if (!quotaInfo.isCritical) return;
  
  // 2. 清理临时数据
  this._cleanupByType(StorageManager.DATA_TYPES.TEMP);
  
  // 检查清理后的存储状态
  quotaInfo = this.getQuotaInfo();
  if (!quotaInfo.isCritical) return;
  
  // 3. 清理缓存数据
  this._cleanupByType(StorageManager.DATA_TYPES.CACHE);
  
  // 检查清理后的存储状态
  quotaInfo = this.getQuotaInfo();
  if (!quotaInfo.isCritical) return;
  
  // 4. 清理低优先级数据
  this._cleanupByPriority(StorageManager.PRIORITIES.LOW);
  
  // 记录紧急清理事件
  this._triggerEvent('emergencyCleanup', quotaInfo);
};

/**
 * 按数据类型清理数据
 * @private
 * @param {string} dataType 数据类型
 */
StorageManager.prototype._cleanupByType = function(dataType) {
  var keys = this.getKeysByType(dataType);
  var self = this;
  
  keys.forEach(function(key) {
    self.removeItem(key);
  });
};

/**
 * 按优先级清理数据
 * @private
 * @param {number} priorityThreshold 优先级阈值，低于此值的数据将被清理
 */
StorageManager.prototype._cleanupByPriority = function(priorityThreshold) {
  var keys = this.getKeysByPriority(priorityThreshold, '<=');
  var self = this;
  
  keys.forEach(function(key) {
    self.removeItem(key);
  });
};

// ========================
// 配额与监控功能
// ========================

/**
 * 设置存储配额
 * @param {number} quotaSize 配额大小(字节)
 * @returns {boolean} 是否成功
 */
StorageManager.prototype.setStorageQuota = function(quotaSize) {
  if (typeof quotaSize !== 'number' || quotaSize <= 0) {
    return false;
  }
  
  // 更新配置
  this.config.maxStorageSize = quotaSize;
  
  // 检查存储状态
  this._checkStorageStatus();
  
  return true;
};

/**
 * 检查存储状态
 * @private
 * @returns {Object} 存储状态
 */
StorageManager.prototype._checkStorageStatus = function() {
  var info = this.getStorageInfo();
  var usageRatio = info.currentSize / info.limitSize;
  var oldWarning = this._quotaWarning;
  
  // 更新警告状态
  if (usageRatio >= this.config.criticalThreshold) {
    // 临界状态
    this._quotaWarning = true;
    
    // 触发临界事件
    if (!oldWarning) {
      this._triggerEvent('storageCritical', {
        currentSize: info.currentSize,
        limitSize: info.limitSize,
        usageRatio: usageRatio
      });
      
      // 执行回调
      if (typeof this.onStorageCritical === 'function') {
        this.onStorageCritical(info);
      }
      
      // 尝试自动清理
      if (this.config.autoCleanup) {
        this.autoCleanup();
      }
    }
  } else if (usageRatio >= this.config.warningThreshold) {
    // 警告状态
    this._quotaWarning = true;
    
    // 触发警告事件
    if (!oldWarning) {
      this._triggerEvent('storageWarning', {
        currentSize: info.currentSize,
        limitSize: info.limitSize,
        usageRatio: usageRatio
      });
      
      // 执行回调
      if (typeof this.onStorageWarning === 'function') {
        this.onStorageWarning(info);
      }
    }
  } else {
    // 正常状态
    this._quotaWarning = false;
    
    // 如果之前有警告，触发恢复事件
    if (oldWarning) {
      this._triggerEvent('storageNormal', {
        currentSize: info.currentSize,
        limitSize: info.limitSize,
        usageRatio: usageRatio
      });
    }
  }
  
  return {
    usageRatio: usageRatio,
    warning: this._quotaWarning,
    critical: usageRatio >= this.config.criticalThreshold
  };
};

/**
 * 确保有足够存储空间
 * @private
 * @param {*} value 要存储的值
 * @param {Object} options 选项
 * @returns {boolean} 是否有足够空间
 */
StorageManager.prototype._ensureStorageSpace = function(value, options) {
  var adapter = this._getAdapter(options.adapter);
  var info = adapter.getStorageInfo ? adapter.getStorageInfo() : {
    currentSize: 0,
    limitSize: this.config.maxStorageSize
  };
  
  // 估算数据大小
  var dataSize = 0;
  try {
    dataSize = JSON.stringify(value).length;
  } catch (e) {
    console.error('无法估算数据大小:', e);
    return false;
  }
  
  // 检查是否有足够空间
  var availableSpace = info.limitSize - info.currentSize;
  
  if (dataSize > availableSpace) {
    // 空间不足，尝试清理
    if (options.autoCleanup !== false) {
      var bytesToFree = dataSize - availableSpace + 1024; // 多释放1KB空间
      var freedBytes = this.cleanupLRU(bytesToFree);
      
      // 再次检查空间
      return freedBytes >= bytesToFree;
    }
    
    return false;
  }
  
  return true;
};

/**
 * 检查是否有配额警告
 * @returns {boolean} 是否有警告
 */
StorageManager.prototype.hasQuotaWarning = function() {
  return this._quotaWarning;
};

/**
 * 获取存储统计分析
 * @returns {Object} 存储分析数据
 */
StorageManager.prototype.getStorageAnalytics = function() {
  var info = this.getStorageInfo();
  var totalItems = info.keys.length;
  var usagePercentage = (info.currentSize / info.limitSize * 100).toFixed(2);
  
  // 统计各类型数据
  var typeCounts = {};
  var typeSizes = {};
  var types = Object.keys(storageConfig.StorageItemType);
  
  // 初始化计数器
  for (var i = 0; i < types.length; i++) {
    var type = types[i].toLowerCase();
    typeCounts[type] = 0;
    typeSizes[type] = 0;
  }
  
  // 统计各类型数据
  var adapter = this._getAdapter();
  
  for (var key in this._metadata) {
    var metadata = this._metadata[key];
    var type = metadata.type.toLowerCase();
    
    if (typeCounts[type] !== undefined) {
      // 增加计数
      typeCounts[type]++;
      
      // 获取数据大小
      var value = adapter.getItem(key);
      if (value !== null) {
        try {
          var size = JSON.stringify(value).length;
          typeSizes[type] += size;
        } catch (e) {
          // 忽略错误
        }
      }
    }
  }
  
  // 计算百分比
  var typePercentages = {};
  for (var type in typeSizes) {
    typePercentages[type] = (typeSizes[type] / info.currentSize * 100).toFixed(2);
  }
  
  return {
    totalItems: totalItems,
    currentSize: info.currentSize,
    limitSize: info.limitSize,
    usagePercentage: parseFloat(usagePercentage),
    typeDistribution: typeCounts,
    typeSizes: typeSizes,
    typePercentages: typePercentages
  };
};

/**
 * 为测试设置存储使用率
 * @private
 * @param {number} ratio 使用率(0-1)
 */
StorageManager.prototype._setStorageUsage = function(ratio) {
  if (ratio < 0 || ratio > 1) {
    return false;
  }
  
  // 修改内部存储信息方法(仅用于测试)
  var self = this;
  var adapter = this._getAdapter();
  var originalGetStorageInfo = adapter.getStorageInfo;
  
  adapter.getStorageInfo = function() {
    var info = originalGetStorageInfo ? originalGetStorageInfo.call(adapter) : {
      keys: adapter.keys(),
      currentSize: 0,
      limitSize: self.config.maxStorageSize
    };
    
    // 修改当前大小以达到指定使用率
    info.currentSize = Math.floor(info.limitSize * ratio);
    return info;
  };
  
  // 检查存储状态
  this._checkStorageStatus();
  
  return true;
};

// ========================
// 增强的智能清理机制
// ========================

/**
 * 清理策略枚举
 */
StorageManager.CLEANUP_STRATEGIES = {
  LRU: 'lru',       // 最久未使用
  LFU: 'lfu',       // 最少使用
  FIFO: 'fifo',     // 先进先出
  TTL: 'ttl',       // 基于过期时间
  SIZE: 'size',     // 基于大小
  PRIORITY: 'priority' // 基于优先级
};

/**
 * 设置默认清理策略
 * @param {string} strategy 清理策略，使用StorageManager.CLEANUP_STRATEGIES中的值
 * @returns {boolean} 是否成功
 */
StorageManager.prototype.setCleanupStrategy = function(strategy) {
  var validStrategies = Object.values(StorageManager.CLEANUP_STRATEGIES);
  if (validStrategies.indexOf(strategy) === -1) {
    return false;
  }
  
  this.config.cleanupStrategy = strategy;
  return true;
};

/**
 * 按照指定策略清理存储
 * @param {string} strategy 清理策略
 * @param {number} targetSize 目标大小，单位字节，若不指定则根据配置决定
 * @param {Object} options 选项
 * @returns {Object} 清理结果信息
 */
StorageManager.prototype.cleanupByStrategy = function(strategy, targetSize, options) {
  options = options || {};
  
  // 验证策略
  var validStrategies = Object.values(StorageManager.CLEANUP_STRATEGIES);
  if (validStrategies.indexOf(strategy) === -1) {
    strategy = this.config.cleanupStrategy || StorageManager.CLEANUP_STRATEGIES.LRU;
  }
  
  // 确定目标大小
  if (typeof targetSize !== 'number' || targetSize <= 0) {
    var quotaInfo = this.getQuotaInfo();
    var safeThreshold = this.config.warningThreshold - 0.1; // 警告阈值减去10%
    if (safeThreshold < 0.3) safeThreshold = 0.3; // 最低30%
    
    targetSize = Math.floor(quotaInfo.maxSize * safeThreshold);
  }
  
  // 如果当前大小已经低于目标，不需要清理
  var currentSize = this.getQuotaInfo().currentSize;
  if (currentSize <= targetSize) {
    return {
      success: true,
      strategy: strategy,
      targetSize: targetSize,
      currentSize: currentSize,
      itemsRemoved: 0,
      bytesRemoved: 0
    };
  }
  
  // 执行清理
  var result = {
    success: false,
    strategy: strategy,
    targetSize: targetSize,
    currentSize: currentSize,
    itemsRemoved: 0,
    bytesRemoved: 0
  };
  
  switch (strategy) {
    case StorageManager.CLEANUP_STRATEGIES.LRU:
      result = this._cleanupByLRU(targetSize);
      break;
    case StorageManager.CLEANUP_STRATEGIES.LFU:
      result = this._cleanupByLFU(targetSize);
      break;
    case StorageManager.CLEANUP_STRATEGIES.FIFO:
      result = this._cleanupByFIFO(targetSize);
      break;
    case StorageManager.CLEANUP_STRATEGIES.TTL:
      result = this._cleanupByTTL(targetSize);
      break;
    case StorageManager.CLEANUP_STRATEGIES.SIZE:
      result = this._cleanupBySize(targetSize);
      break;
    case StorageManager.CLEANUP_STRATEGIES.PRIORITY:
      result = this._cleanupByPriorityStrategy(targetSize);
      break;
    default:
      result = this._cleanupByLRU(targetSize); // 默认使用LRU
  }
  
  // 触发清理完成事件
  this._triggerEvent('cleanupComplete', result);
  
  return result;
};

/**
 * 最久未使用(LRU)策略清理
 * @private
 * @param {number} targetSize 目标大小
 * @returns {Object} 清理结果
 */
StorageManager.prototype._cleanupByLRU = function(targetSize) {
  var adapter = this._getAdapter();
  var allKeys = adapter.getAllKeys();
  var self = this;
  var result = {
    success: false,
    strategy: StorageManager.CLEANUP_STRATEGIES.LRU,
    targetSize: targetSize,
    currentSize: this.getQuotaInfo().currentSize,
    itemsRemoved: 0,
    bytesRemoved: 0
  };
  
  // 获取所有项的元数据，并按最后访问时间排序
  var items = [];
  
  allKeys.forEach(function(key) {
    var metadata = self._getItemMetadata(key);
    if (!metadata) return;
    
    // 跳过核心数据
    if (metadata.dataType === StorageManager.DATA_TYPES.CORE) return;
    
    items.push({
      key: key,
      lastAccess: metadata.lastAccess || 0,
      size: metadata.size || 0,
      priority: metadata.priority || 0
    });
  });
  
  // 按最后访问时间排序（最早的在前）
  items.sort(function(a, b) {
    return a.lastAccess - b.lastAccess;
  });
  
  // 逐个删除，直到达到目标大小
  var currentSize = result.currentSize;
  var i = 0;
  
  while (currentSize > targetSize && i < items.length) {
    var item = items[i];
    
    // 删除项
    adapter.removeItem(item.key);
    
    // 更新结果
    result.itemsRemoved++;
    result.bytesRemoved += item.size;
    currentSize -= item.size;
    
    // 删除元数据
    self._removeItemMetadata(item.key);
    
    i++;
  }
  
  // 更新成功状态
  result.success = currentSize <= targetSize;
  result.currentSize = currentSize;
  
  return result;
};

/**
 * 最少使用(LFU)策略清理
 * @private
 * @param {number} targetSize 目标大小
 * @returns {Object} 清理结果
 */
StorageManager.prototype._cleanupByLFU = function(targetSize) {
  var adapter = this._getAdapter();
  var allKeys = adapter.getAllKeys();
  var self = this;
  var result = {
    success: false,
    strategy: StorageManager.CLEANUP_STRATEGIES.LFU,
    targetSize: targetSize,
    currentSize: this.getQuotaInfo().currentSize,
    itemsRemoved: 0,
    bytesRemoved: 0
  };
  
  // 获取所有项的元数据，并按访问次数排序
  var items = [];
  
  allKeys.forEach(function(key) {
    var metadata = self._getItemMetadata(key);
    if (!metadata) return;
    
    // 跳过核心数据
    if (metadata.dataType === StorageManager.DATA_TYPES.CORE) return;
    
    items.push({
      key: key,
      accessCount: metadata.accessCount || 0,
      size: metadata.size || 0,
      priority: metadata.priority || 0
    });
  });
  
  // 按访问次数排序（最少的在前）
  items.sort(function(a, b) {
    return a.accessCount - b.accessCount;
  });
  
  // 逐个删除，直到达到目标大小
  var currentSize = result.currentSize;
  var i = 0;
  
  while (currentSize > targetSize && i < items.length) {
    var item = items[i];
    
    // 删除项
    adapter.removeItem(item.key);
    
    // 更新结果
    result.itemsRemoved++;
    result.bytesRemoved += item.size;
    currentSize -= item.size;
    
    // 删除元数据
    self._removeItemMetadata(item.key);
    
    i++;
  }
  
  // 更新成功状态
  result.success = currentSize <= targetSize;
  result.currentSize = currentSize;
  
  return result;
};

/**
 * 先进先出(FIFO)策略清理
 * @private
 * @param {number} targetSize 目标大小
 * @returns {Object} 清理结果
 */
StorageManager.prototype._cleanupByFIFO = function(targetSize) {
  var adapter = this._getAdapter();
  var allKeys = adapter.getAllKeys();
  var self = this;
  var result = {
    success: false,
    strategy: StorageManager.CLEANUP_STRATEGIES.FIFO,
    targetSize: targetSize,
    currentSize: this.getQuotaInfo().currentSize,
    itemsRemoved: 0,
    bytesRemoved: 0
  };
  
  // 获取所有项的元数据，并按创建时间排序
  var items = [];
  
  allKeys.forEach(function(key) {
    var metadata = self._getItemMetadata(key);
    if (!metadata) return;
    
    // 跳过核心数据
    if (metadata.dataType === StorageManager.DATA_TYPES.CORE) return;
    
    items.push({
      key: key,
      created: metadata.created || 0,
      size: metadata.size || 0,
      priority: metadata.priority || 0
    });
  });
  
  // 按创建时间排序（最早的在前）
  items.sort(function(a, b) {
    return a.created - b.created;
  });
  
  // 逐个删除，直到达到目标大小
  var currentSize = result.currentSize;
  var i = 0;
  
  while (currentSize > targetSize && i < items.length) {
    var item = items[i];
    
    // 删除项
    adapter.removeItem(item.key);
    
    // 更新结果
    result.itemsRemoved++;
    result.bytesRemoved += item.size;
    currentSize -= item.size;
    
    // 删除元数据
    self._removeItemMetadata(item.key);
    
    i++;
  }
  
  // 更新成功状态
  result.success = currentSize <= targetSize;
  result.currentSize = currentSize;
  
  return result;
};

/**
 * 按优先级策略清理
 * @private
 * @param {number} targetSize 目标大小
 * @returns {Object} 清理结果
 */
StorageManager.prototype._cleanupByPriorityStrategy = function(targetSize) {
  var adapter = this._getAdapter();
  var allKeys = adapter.getAllKeys();
  var self = this;
  var result = {
    success: false,
    strategy: StorageManager.CLEANUP_STRATEGIES.PRIORITY,
    targetSize: targetSize,
    currentSize: this.getQuotaInfo().currentSize,
    itemsRemoved: 0,
    bytesRemoved: 0
  };
  
  // 获取所有项的元数据，并按优先级排序
  var items = [];
  
  allKeys.forEach(function(key) {
    var metadata = self._getItemMetadata(key);
    if (!metadata) return;
    
    // 跳过核心数据
    if (metadata.dataType === StorageManager.DATA_TYPES.CORE) return;
    
    items.push({
      key: key,
      priority: metadata.priority || 0,
      size: metadata.size || 0
    });
  });
  
  // 按优先级排序（最低的在前）
  items.sort(function(a, b) {
    return a.priority - b.priority;
  });
  
  // 逐个删除，直到达到目标大小
  var currentSize = result.currentSize;
  var i = 0;
  
  while (currentSize > targetSize && i < items.length) {
    var item = items[i];
    
    // 删除项
    adapter.removeItem(item.key);
    
    // 更新结果
    result.itemsRemoved++;
    result.bytesRemoved += item.size;
    currentSize -= item.size;
    
    // 删除元数据
    self._removeItemMetadata(item.key);
    
    i++;
  }
  
  // 更新成功状态
  result.success = currentSize <= targetSize;
  result.currentSize = currentSize;
  
  return result;
};

// ========================
// 事件通知系统
// ========================

/**
 * 添加事件监听器
 * @param {string} event 事件名称
 * @param {Function} handler 处理函数
 * @returns {boolean} 是否成功
 */
StorageManager.prototype.on = function(event, handler) {
  if (!event || typeof handler !== 'function') {
    return false;
  }
  
  // 创建事件处理器数组
  if (!this._eventHandlers[event]) {
    this._eventHandlers[event] = [];
  }
  
  // 添加处理器
  this._eventHandlers[event].push(handler);
  return true;
};

/**
 * 移除事件监听器
 * @param {string} event 事件名称
 * @param {Function} handler 处理函数(可选，不提供则移除所有)
 * @returns {boolean} 是否成功
 */
StorageManager.prototype.off = function(event, handler) {
  if (!event || !this._eventHandlers[event]) {
    return false;
  }
  
  if (!handler) {
    // 移除所有处理器
    delete this._eventHandlers[event];
    return true;
  }
  
  // 查找并移除特定处理器
  var handlers = this._eventHandlers[event];
  for (var i = 0; i < handlers.length; i++) {
    if (handlers[i] === handler) {
      handlers.splice(i, 1);
      return true;
    }
  }
  
  return false;
};

/**
 * 触发事件
 * @private
 * @param {string} event 事件名称
 * @param {...*} args 事件参数
 */
StorageManager.prototype._triggerEvent = function(event) {
  if (!this.config.eventNotificationsEnabled || !event || !this._eventHandlers[event]) {
    return;
  }
  
  // 获取参数
  var args = Array.prototype.slice.call(arguments, 1);
  
  // 调用所有处理器
  var handlers = this._eventHandlers[event];
  for (var i = 0; i < handlers.length; i++) {
    try {
      handlers[i].apply(this, args);
    } catch (e) {
      console.error('事件处理器异常:', e);
    }
  }
};

/**
 * 设置事件通知
 * @param {boolean} enabled 是否启用
 */
StorageManager.prototype.setEventNotifications = function(enabled) {
  this.config.eventNotificationsEnabled = !!enabled;
};

// ========================
// 命名空间功能
// ========================

/**
 * 创建命名空间
 * @param {string} namespace 命名空间名称
 * @returns {Object} 命名空间对象
 */
StorageManager.prototype.createNamespace = function(namespace) {
  if (!namespace) {
    return null;
  }
  
  // 检查是否已存在
  if (this._namespaces[namespace]) {
    return this._namespaces[namespace];
  }
  
  var self = this;
  
  // 创建命名空间对象
  var namespaceObj = {
    _namespace: namespace,
    
    // 基本操作
    getItem: function(key, options) {
      options = options || {};
      options.namespace = namespace;
      return self.getItem(key, options);
    },
    
    setItem: function(key, value, options) {
      options = options || {};
      options.namespace = namespace;
      return self.setItem(key, value, options);
    },
    
    removeItem: function(key, options) {
      options = options || {};
      options.namespace = namespace;
      return self.removeItem(key, options);
    },
    
    clear: function(options) {
      options = options || {};
      options.namespace = namespace;
      return self.clear(options);
    },
    
    keys: function(options) {
      options = options || {};
      options.namespace = namespace;
      return self.keys(options);
    },
    
    getStorageInfo: function(options) {
      options = options || {};
      options.namespace = namespace;
      return self.getStorageInfo(options);
    },
    
    // 高级操作
    getItemsByType: function(type, options) {
      options = options || {};
      options.namespace = namespace;
      return self.getItemsByType(type, options);
    },
    
    getItemsByScope: function(scope, options) {
      options = options || {};
      options.namespace = namespace;
      return self.getItemsByScope(scope, options);
    },
    
    // 批量操作
    setItems: function(items, options) {
      options = options || {};
      options.namespace = namespace;
      return self.setItems(items, options);
    },
    
    getItems: function(keys, options) {
      options = options || {};
      options.namespace = namespace;
      return self.getItems(keys, options);
    },
    
    removeItems: function(keys, options) {
      options = options || {};
      options.namespace = namespace;
      return self.removeItems(keys, options);
    },
    
    // 清理操作
    cleanupByType: function(type, options) {
      options = options || {};
      options.namespace = namespace;
      return self.cleanupByType(type, options);
    },
    
    cleanupByAge: function(age, options) {
      options = options || {};
      options.namespace = namespace;
      return self.cleanupByAge(age, options);
    },
    
    // 事件操作
    on: function(event, handler) {
      // 命名空间事件名称
      var namespacedEvent = namespace + ':' + event;
      return self.on(namespacedEvent, handler);
    },
    
    off: function(event, handler) {
      var namespacedEvent = namespace + ':' + event;
      return self.off(namespacedEvent, handler);
    }
  };
  
  // 缓存命名空间
  this._namespaces[namespace] = namespaceObj;
  
  return namespaceObj;
};

/**
 * 获取命名空间
 * @param {string} namespace 命名空间名称
 * @returns {Object} 命名空间对象
 */
StorageManager.prototype.getNamespace = function(namespace) {
  return this._namespaces[namespace] || null;
};

/**
 * 移除命名空间
 * @param {string} namespace 命名空间名称
 * @returns {boolean} 是否成功
 */
StorageManager.prototype.removeNamespace = function(namespace) {
  if (!namespace || !this._namespaces[namespace]) {
    return false;
  }
  
  // 清理命名空间数据
  this.clear({ namespace: namespace });
  
  // 移除命名空间
  delete this._namespaces[namespace];
  
  return true;
};

/**
 * 获取所有命名空间
 * @returns {Array<string>} 命名空间名称数组
 */
StorageManager.prototype.getNamespaces = function() {
  return Object.keys(this._namespaces);
};

// ========================
// 测试与调试功能
// ========================

/**
 * 触发自动清理(用于测试)
 * @private
 */
StorageManager.prototype._triggerAutoCleanup = function() {
  return this.autoCleanup();
};

/**
 * 创建存储管理器实例
 * @param {Object} options 配置选项
 * @returns {StorageManager} 存储管理器实例
 */
function createStorageManager(options) {
  return new StorageManager(options);
}

// 测试辅助函数
// 仅在非生产环境使用
var _testHelpers = {
  /**
   * 获取所有存储管理器元数据
   * @returns {Object} 元数据
   */
  getMetadata: function(manager) {
    return JSON.parse(JSON.stringify(manager._metadata));
  },
  
  /**
   * 设置模拟元数据
   * @param {Object} manager 管理器实例
   * @param {Object} metadata 元数据
   */
  setMetadata: function(manager, metadata) {
    manager._metadata = JSON.parse(JSON.stringify(metadata));
  }
};

// 导出模块
module.exports = {
  StorageManager: StorageManager,
  createStorageManager: createStorageManager,
  _testHelpers: process.env.NODE_ENV !== 'production' ? _testHelpers : undefined
};

// ========================
// 数据分级存储功能
// ========================

/**
 * 存储项数据类型枚举
 */
StorageManager.DATA_TYPES = {
  CORE: 'core',     // 核心数据（最高优先级）
  USER: 'user',     // 用户数据（高优先级）
  WORK: 'work',     // 工作数据（中等优先级）
  CACHE: 'cache',   // 缓存数据（低优先级）
  TEMP: 'temp'      // 临时数据（最低优先级）
};

/**
 * 数据优先级枚举
 */
StorageManager.PRIORITIES = {
  CRITICAL: 100,    // 关键数据
  HIGH: 75,         // 高优先级
  NORMAL: 50,       // 普通优先级
  LOW: 25,          // 低优先级
  LOWEST: 0         // 最低优先级
};

/**
 * 使用数据类型设置存储项
 * @param {string} key 键名
 * @param {*} value 值
 * @param {string} dataType 数据类型，使用StorageManager.DATA_TYPES中的值
 * @param {Object} options 其他选项
 * @returns {boolean} 是否成功
 */
StorageManager.prototype.setItemWithType = function(key, value, dataType, options) {
  if (!key || value === undefined) return false;
  
  // 验证数据类型
  var validTypes = Object.values(StorageManager.DATA_TYPES);
  if (validTypes.indexOf(dataType) === -1) {
    dataType = StorageManager.DATA_TYPES.NORMAL;
  }
  
  // 确定优先级
  var priority;
  switch(dataType) {
    case StorageManager.DATA_TYPES.CORE:
      priority = StorageManager.PRIORITIES.CRITICAL;
      break;
    case StorageManager.DATA_TYPES.USER:
      priority = StorageManager.PRIORITIES.HIGH;
      break;
    case StorageManager.DATA_TYPES.WORK:
      priority = StorageManager.PRIORITIES.NORMAL;
      break;
    case StorageManager.DATA_TYPES.CACHE:
      priority = StorageManager.PRIORITIES.LOW;
      break;
    case StorageManager.DATA_TYPES.TEMP:
      priority = StorageManager.PRIORITIES.LOWEST;
      break;
    default:
      priority = StorageManager.PRIORITIES.NORMAL;
  }
  
  // 构建元数据
  options = options || {};
  options.metadata = options.metadata || {};
  options.metadata.dataType = dataType;
  options.metadata.priority = priority;
  
  // 保存数据
  return this.setItem(key, value, options);
};

/**
 * 按优先级设置存储项
 * @param {string} key 键名
 * @param {*} value 值
 * @param {number} priority 优先级，使用StorageManager.PRIORITIES中的值
 * @param {Object} options 其他选项
 * @returns {boolean} 是否成功
 */
StorageManager.prototype.setItemWithPriority = function(key, value, priority, options) {
  if (!key || value === undefined) return false;
  
  // 验证优先级
  var validPriorities = Object.values(StorageManager.PRIORITIES);
  if (validPriorities.indexOf(priority) === -1) {
    priority = StorageManager.PRIORITIES.NORMAL;
  }
  
  // 构建元数据
  options = options || {};
  options.metadata = options.metadata || {};
  options.metadata.priority = priority;
  
  // 保存数据
  return this.setItem(key, value, options);
};

/**
 * 按数据类型获取所有键
 * @param {string} dataType 数据类型
 * @param {Object} options 选项
 * @returns {Array} 键名数组
 */
StorageManager.prototype.getKeysByType = function(dataType, options) {
  options = options || {};
  var adapter = this._getAdapter(options.adapter);
  var allKeys = [];
  
  try {
    // 获取所有键
    allKeys = adapter.getAllKeys();
    
    // 过滤键
    var result = [];
    var self = this;
    
    allKeys.forEach(function(storageKey) {
      // 获取元数据
      var metadata = self._getItemMetadata(storageKey);
      if (metadata && metadata.dataType === dataType) {
        // 从存储键中提取原始键名
        var originalKey = self._getOriginalKeyFromStorageKey(storageKey);
        if (originalKey) {
          result.push(originalKey);
        }
      }
    });
    
    return result;
  } catch (e) {
    console.error('获取键列表失败:', e);
    return [];
  }
};

/**
 * 按优先级获取所有键
 * @param {number} priority 优先级
 * @param {string} comparison 比较符 ('=', '>', '<', '>=', '<=')
 * @param {Object} options 选项
 * @returns {Array} 键名数组
 */
StorageManager.prototype.getKeysByPriority = function(priority, comparison, options) {
  options = options || {};
  var adapter = this._getAdapter(options.adapter);
  var allKeys = [];
  
  comparison = comparison || '=';
  var validComparisons = ['=', '>', '<', '>=', '<='];
  if (validComparisons.indexOf(comparison) === -1) {
    comparison = '=';
  }
  
  try {
    // 获取所有键
    allKeys = adapter.getAllKeys();
    
    // 过滤键
    var result = [];
    var self = this;
    
    allKeys.forEach(function(storageKey) {
      // 获取元数据
      var metadata = self._getItemMetadata(storageKey);
      if (!metadata || typeof metadata.priority !== 'number') return;
      
      // 根据比较符过滤
      var match = false;
      switch(comparison) {
        case '=':
          match = metadata.priority === priority;
          break;
        case '>':
          match = metadata.priority > priority;
          break;
        case '<':
          match = metadata.priority < priority;
          break;
        case '>=':
          match = metadata.priority >= priority;
          break;
        case '<=':
          match = metadata.priority <= priority;
          break;
      }
      
      if (match) {
        // 从存储键中提取原始键名
        var originalKey = self._getOriginalKeyFromStorageKey(storageKey);
        if (originalKey) {
          result.push(originalKey);
        }
      }
    });
    
    return result;
  } catch (e) {
    console.error('获取键列表失败:', e);
    return [];
  }
};

/**
 * 从存储键中提取原始键名
 * @private
 * @param {string} storageKey 存储键
 * @returns {string} 原始键名
 */
StorageManager.prototype._getOriginalKeyFromStorageKey = function(storageKey) {
  // 检查键映射
  for (var key in this._keyMap) {
    if (this._keyMap[key] === storageKey) {
      return key;
    }
  }
  
  // 尝试从存储键解析
  var parts = storageKey.split('.');
  if (parts.length > 1) {
    // 移除命名空间部分
    parts.shift();
    return parts.join('.');
  }
  
  return storageKey;
};

/**
 * 清理存储空间
 * @param {string} namespaceId 命名空间ID
 * @param {number} targetSize 目标清理字节数
 * @returns {Promise<number>} 已清理的字节数
 */
StorageManager.prototype._cleanupStorage = function(namespaceId, targetSize) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    try {
      // 获取命名空间元数据
      var metadata = self._getNamespaceMetadata(namespaceId);
      if (!metadata) {
        console.warn('[StorageManager] 无法清理命名空间:', namespaceId, '- 元数据不存在');
        resolve(0);
        return;
      }
      
      // 选择清理策略
      var strategyName = self.config.cleanupStrategy;
      var strategy = cleanupStrategy[strategyName] || cleanupStrategy.composite;
      
      // 获取要清理的键列表
      var keysToRemove = strategy(metadata, targetSize);
      
      if (!keysToRemove || keysToRemove.length === 0) {
        console.log('[StorageManager] 没有可清理的键:', namespaceId);
        resolve(0);
        return;
      }
      
      console.log('[StorageManager] 清理策略', strategyName, '将清理', keysToRemove.length, '个键');
      
      var totalFreed = 0;
      var adapter = self._getAdapter();
      
      // 删除选中的键
      keysToRemove.forEach(function(key) {
        try {
          var item = metadata[key];
          if (item && item.metadata) {
            var size = item.metadata.size || 0;
            
            // 从适配器中删除
            adapter.removeItem(key);
            
            // 从元数据中删除
            delete metadata[key];
            
            totalFreed += size;
            
            // 触发事件
            self._triggerEvent('itemRemoved', {
              key: key,
              size: size,
              reason: 'cleanup'
            });
          }
        } catch (err) {
          console.error('[StorageManager] 清理时删除键失败:', key, err);
        }
      });
      
      // 保存更新后的元数据
      self._saveNamespaceMetadata(namespaceId, metadata);
      
      // 触发清理完成事件
      self._triggerEvent('cleanupComplete', {
        namespace: namespaceId,
        freedBytes: totalFreed,
        keysRemoved: keysToRemove.length
      });
      
      resolve(totalFreed);
    } catch (err) {
      console.error('[StorageManager] 清理存储失败:', err);
      reject(err);
    }
  });
}; 