/**
 * 内存存储适配器
 * 
 * 提供基于内存的数据存储实现，用于临时存储和测试环境
 * 遵循ES5标准，确保与微信小程序兼容
 * 
 * 作者：AI助手
 * 创建日期：2025-04-07
 */

// 默认配置
var DEFAULT_CONFIG = {
  prefix: 'memory_',
  cloneValues: true,  // 是否克隆存储的值，避免引用问题
  logOperations: false, // 是否记录操作
  maxEntries: 1000 // 最大条目数
};

/**
 * 内存存储适配器构造函数
 * @param {Object} options 配置选项
 */
function MemoryStorageAdapter(options) {
  options = options || {};
  
  // 合并配置
  this.config = {};
  for (var key in DEFAULT_CONFIG) {
    this.config[key] = options.hasOwnProperty(key) ? options[key] : DEFAULT_CONFIG[key];
  }
  
  // 初始化存储
  this._storage = {};
  this._metadata = {};
  this._operationLog = [];
  this._totalSize = 0;
}

/**
 * 获取存储项
 * @param {string} key 键名
 * @returns {*} 存储的值，不存在返回null
 */
MemoryStorageAdapter.prototype.getItem = function(key) {
  this._logOperation('getItem', key);
  
  // 添加前缀
  var prefixedKey = this._addPrefix(key);
  
  // 获取值
  var value = this._storage[prefixedKey];
  
  // 更新访问时间
  if (value !== undefined) {
    this._updateMetadata(prefixedKey, 'lastAccess');
    return this.config.cloneValues ? JSON.parse(JSON.stringify(value)) : value;
  }
  
  return null;
};

/**
 * 设置存储项
 * @param {string} key 键名
 * @param {*} value 值
 * @param {Object} options 选项
 * @returns {boolean} 是否成功
 */
MemoryStorageAdapter.prototype.setItem = function(key, value, options) {
  this._logOperation('setItem', key, value, options);
  
  options = options || {};
  
  // 添加前缀
  var prefixedKey = this._addPrefix(key);
  
  // 检查是否超过最大条目数
  if (!this._storage[prefixedKey] && Object.keys(this._storage).length >= this.config.maxEntries) {
    this._cleanOne();
  }
  
  // 计算大小变化
  var oldSize = this._storage[prefixedKey] ? this._getItemSize(prefixedKey) : 0;
  var newValue = this.config.cloneValues ? JSON.parse(JSON.stringify(value)) : value;
  var newSize = JSON.stringify(newValue).length;
  
  // 更新存储
  this._storage[prefixedKey] = newValue;
  
  // 更新元数据
  this._metadata[prefixedKey] = this._metadata[prefixedKey] || {};
  this._metadata[prefixedKey].size = newSize;
  this._metadata[prefixedKey].createdAt = this._metadata[prefixedKey].createdAt || Date.now();
  this._updateMetadata(prefixedKey, 'lastModified');
  this._updateMetadata(prefixedKey, 'lastAccess');
  
  // 更新总大小
  this._totalSize = this._totalSize - oldSize + newSize;
  
  return true;
};

/**
 * 删除存储项
 * @param {string} key 键名
 * @returns {boolean} 是否成功
 */
MemoryStorageAdapter.prototype.removeItem = function(key) {
  this._logOperation('removeItem', key);
  
  // 添加前缀
  var prefixedKey = this._addPrefix(key);
  
  // 检查键是否存在
  if (this._storage[prefixedKey] === undefined) {
    return false;
  }
  
  // 更新总大小
  this._totalSize -= this._getItemSize(prefixedKey);
  
  // 删除值和元数据
  delete this._storage[prefixedKey];
  delete this._metadata[prefixedKey];
  
  return true;
};

/**
 * 清空存储
 * @returns {boolean} 是否成功
 */
MemoryStorageAdapter.prototype.clear = function() {
  this._logOperation('clear');
  
  // 清空存储和元数据
  this._storage = {};
  this._metadata = {};
  this._totalSize = 0;
  
  return true;
};

/**
 * 获取所有键
 * @returns {Array<string>} 键名数组
 */
MemoryStorageAdapter.prototype.keys = function() {
  var self = this;
  var rawKeys = Object.keys(this._storage);
  
  // 移除前缀
  return rawKeys.map(function(key) {
    return self._removePrefix(key);
  });
};

/**
 * 获取存储信息
 * @returns {Object} 存储信息
 */
MemoryStorageAdapter.prototype.getStorageInfo = function() {
  var keys = this.keys();
  
  return {
    keys: keys,
    currentSize: this._totalSize,
    limitSize: Number.MAX_SAFE_INTEGER,
    entriesCount: keys.length
  };
};

/**
 * 清理最近最少使用的项
 * @param {number} bytesToFree 要释放的字节数
 * @returns {number} 实际释放的字节数
 */
MemoryStorageAdapter.prototype.cleanLeastRecentlyUsed = function(bytesToFree) {
  bytesToFree = bytesToFree || 1024; // 默认清理1KB
  
  var self = this;
  var freedBytes = 0;
  var prefixedKeys = Object.keys(this._storage);
  
  // 按最后访问时间排序
  prefixedKeys.sort(function(a, b) {
    var timeA = self._metadata[a] ? self._metadata[a].lastAccess || 0 : 0;
    var timeB = self._metadata[b] ? self._metadata[b].lastAccess || 0 : 0;
    return timeA - timeB;
  });
  
  // 清理项直到释放足够空间
  for (var i = 0; i < prefixedKeys.length && freedBytes < bytesToFree; i++) {
    var key = prefixedKeys[i];
    var size = this._getItemSize(key);
    
    delete this._storage[key];
    delete this._metadata[key];
    
    freedBytes += size;
    this._totalSize -= size;
  }
  
  this._logOperation('cleanLeastRecentlyUsed', bytesToFree, freedBytes);
  return freedBytes;
};

/**
 * 获取操作日志
 * @returns {Array} 操作日志
 */
MemoryStorageAdapter.prototype.getOperationsLog = function() {
  return this._operationLog.slice();
};

/**
 * 清空操作日志
 */
MemoryStorageAdapter.prototype.clearOperationsLog = function() {
  this._operationLog = [];
};

// 私有辅助方法

/**
 * 清理一个最少使用的项
 * @private
 */
MemoryStorageAdapter.prototype._cleanOne = function() {
  this.cleanLeastRecentlyUsed(0);
};

/**
 * 获取项目大小
 * @private
 * @param {string} prefixedKey 带前缀的键名
 * @returns {number} 项目大小（字节）
 */
MemoryStorageAdapter.prototype._getItemSize = function(prefixedKey) {
  if (this._metadata[prefixedKey] && this._metadata[prefixedKey].size) {
    return this._metadata[prefixedKey].size;
  }
  
  // 计算大小
  var value = this._storage[prefixedKey];
  var size = value ? JSON.stringify(value).length : 0;
  
  // 更新元数据
  if (this._metadata[prefixedKey]) {
    this._metadata[prefixedKey].size = size;
  }
  
  return size;
};

/**
 * 更新元数据时间戳
 * @private
 * @param {string} prefixedKey 带前缀的键名
 * @param {string} field 要更新的字段
 */
MemoryStorageAdapter.prototype._updateMetadata = function(prefixedKey, field) {
  this._metadata[prefixedKey] = this._metadata[prefixedKey] || {};
  this._metadata[prefixedKey][field] = Date.now();
};

/**
 * 添加键前缀
 * @private
 * @param {string} key 原始键名
 * @returns {string} 带前缀的键名
 */
MemoryStorageAdapter.prototype._addPrefix = function(key) {
  return this.config.prefix + key;
};

/**
 * 移除键前缀
 * @private
 * @param {string} prefixedKey 带前缀的键名
 * @returns {string} 原始键名
 */
MemoryStorageAdapter.prototype._removePrefix = function(prefixedKey) {
  return prefixedKey.slice(this.config.prefix.length);
};

/**
 * 记录操作
 * @private
 */
MemoryStorageAdapter.prototype._logOperation = function(type, key, value, options) {
  if (!this.config.logOperations) return;
  
  this._operationLog.push({
    type: type,
    key: key,
    timestamp: Date.now(),
    options: options
  });
  
  // 限制日志大小
  if (this._operationLog.length > 100) {
    this._operationLog.shift();
  }
};

// 导出构造函数
module.exports = MemoryStorageAdapter; 