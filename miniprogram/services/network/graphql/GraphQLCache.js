/**
 * GraphQLCache.js
 * 
 * GraphQL缓存管理器，用于缓存GraphQL查询结果
 * 
 * 创建时间: 2025-04-08 21:43:07
 * 创建者: Claude 3.7 Sonnet
 */

/**
 * 生成缓存键的字符串表示
 * @param {Object} cacheKey - 缓存键对象，包含query、variables和operationName
 * @return {string} 缓存键字符串
 * @private
 */
function _generateCacheKeyString(cacheKey) {
  if (!cacheKey || typeof cacheKey !== 'object') {
    return '';
  }
  
  try {
    return JSON.stringify({
      query: cacheKey.query || '',
      variables: cacheKey.variables || {},
      operationName: cacheKey.operationName || ''
    });
  } catch (e) {
    console.error('生成缓存键字符串失败:', e);
    return '';
  }
}

/**
 * 标准化GraphQL查询，移除空格、格式化变量等
 * @param {string} query - GraphQL查询字符串
 * @return {string} 标准化后的查询
 * @private
 */
function _normalizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  return query
    .replace(/\s+/g, ' ')   // 替换多个空白字符为单个空格
    .replace(/\s*:\s*/g, ':') // 移除冒号前后的空格
    .replace(/\s*\(\s*/g, '(') // 移除括号前后的空格
    .replace(/\s*\)\s*/g, ')') // 移除括号前后的空格
    .replace(/\s*{\s*/g, '{')  // 移除大括号前后的空格
    .replace(/\s*}\s*/g, '}')  // 移除大括号前后的空格
    .replace(/\s*,\s*/g, ',')  // 移除逗号前后的空格
    .trim();                   // 移除首尾空格
}

/**
 * 分析查询以提取字段选择
 * @param {string} query - GraphQL查询字符串
 * @return {Array<string>} 查询请求的字段列表
 * @private
 */
function _extractQueryFields(query) {
  if (!query || typeof query !== 'string') {
    return [];
  }
  
  // 简化实现：提取花括号内的字段
  var fieldMatch = query.match(/{([^{}]*)}(?![^{]*})/g);
  if (!fieldMatch) {
    return [];
  }
  
  var fieldsString = fieldMatch[0].replace(/{|}/g, '').trim();
  var fields = fieldsString.split(/\s+/);
  
  return fields.filter(function(field) {
    return field && !field.includes('(') && !field.includes('{');
  });
}

/**
 * 根据字段列表提取数据的子集
 * @param {Object} data - 完整数据对象
 * @param {Array<string>} fields - 字段列表
 * @return {Object} 提取的数据子集
 * @private
 */
function _extractDataSubset(data, fields) {
  if (!data || typeof data !== 'object' || !Array.isArray(fields)) {
    return data;
  }
  
  var result = {};
  
  Object.keys(data).forEach(function(key) {
    if (fields.includes(key) || key === '__typename') {
      result[key] = data[key];
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      // 递归处理嵌套对象，但保留所有嵌套字段
      result[key] = _extractDataSubset(data[key], fields);
    }
  });
  
  return result;
}

/**
 * GraphQLCache构造函数
 * @param {Object} config - 配置对象
 * @param {number} config.maxSize - 最大缓存条目数量，默认100
 * @param {number} config.ttl - 缓存生存时间(毫秒)，默认5分钟
 * @param {boolean} config.normalizeQueries - 是否标准化查询，默认true
 * @param {boolean} config.enablePersistence - 是否启用持久化，默认false
 * @constructor
 */
function GraphQLCache(config) {
  this.config = Object.assign({
    maxSize: 100,
    ttl: 300000, // 5分钟
    normalizeQueries: true,
    enablePersistence: false
  }, config || {});
  
  this.cache = new Map();
  this.keyMap = {}; // 用于查询标准化时的键映射
  this.lastAccessed = {}; // 用于LRU策略的最后访问时间
  
  this.stats = {
    hits: 0,
    misses: 0,
    size: 0
  };
  
  // 设置定期清理过期缓存的计时器
  this._setupExpirationTimer();
}

/**
 * 设置定期清理过期缓存的计时器
 * @private
 */
GraphQLCache.prototype._setupExpirationTimer = function() {
  var self = this;
  
  // 每分钟检查一次过期缓存
  this._expirationTimer = setInterval(function() {
    self._cleanExpiredCache();
  }, 60000);
};

/**
 * 清理过期的缓存项
 * @private
 */
GraphQLCache.prototype._cleanExpiredCache = function() {
  var now = Date.now();
  var self = this;
  
  this.cache.forEach(function(value, key) {
    if (value.expireTime && value.expireTime < now) {
      self.delete({ _cacheKey: key });
    }
  });
};

/**
 * 获取缓存键的字符串表示
 * @param {Object} cacheKey - 缓存键对象
 * @return {string|null} 缓存键字符串或null(如果键无效)
 * @private
 */
GraphQLCache.prototype._getCacheKey = function(cacheKey) {
  if (!cacheKey) {
    return null;
  }
  
  // 如果已经是字符串键，直接返回
  if (cacheKey._cacheKey) {
    return cacheKey._cacheKey;
  }
  
  var query = cacheKey.query;
  var variables = cacheKey.variables || {};
  var operationName = cacheKey.operationName || '';
  
  if (!query) {
    return null;
  }
  
  // 标准化查询(如果启用了标准化)
  if (this.config.normalizeQueries) {
    query = _normalizeQuery(query);
  }
  
  // 生成缓存键字符串
  var keyString = JSON.stringify({
    query: query,
    variables: variables,
    operationName: operationName
  });
  
  return keyString;
};

/**
 * 添加键映射(用于标准化后的键查找)
 * @param {string} originalKey - 原始键
 * @param {string} normalizedKey - 标准化后的键
 * @private
 */
GraphQLCache.prototype._addKeyMapping = function(originalKey, normalizedKey) {
  if (!this.keyMap[originalKey]) {
    this.keyMap[originalKey] = normalizedKey;
  }
};

/**
 * 查找标准化的缓存键
 * @param {string} key - 原始缓存键
 * @return {string} 标准化的缓存键或原始键(如果找不到映射)
 * @private
 */
GraphQLCache.prototype._findNormalizedKey = function(key) {
  return this.keyMap[key] || key;
};

/**
 * 更新LRU访问时间
 * @param {string} key - 缓存键
 * @private
 */
GraphQLCache.prototype._updateAccessTime = function(key) {
  this.lastAccessed[key] = Date.now();
};

/**
 * 查找最久未使用的缓存项
 * @return {string|null} 最久未使用的缓存键或null(如果缓存为空)
 * @private
 */
GraphQLCache.prototype._findLeastRecentlyUsed = function() {
  var keys = Object.keys(this.lastAccessed);
  if (keys.length === 0) {
    return null;
  }
  
  var leastRecentKey = keys[0];
  var leastRecentTime = this.lastAccessed[leastRecentKey];
  
  for (var i = 1; i < keys.length; i++) {
    var key = keys[i];
    var time = this.lastAccessed[key];
    
    if (time < leastRecentTime) {
      leastRecentKey = key;
      leastRecentTime = time;
    }
  }
  
  return leastRecentKey;
};

/**
 * 当缓存达到最大大小时，执行清理
 * @private
 */
GraphQLCache.prototype._enforceMaxSize = function() {
  while (this.stats.size > this.config.maxSize) {
    var lruKey = this._findLeastRecentlyUsed();
    if (lruKey) {
      this.delete({ _cacheKey: lruKey });
    } else {
      break; // 没有可删除的项，防止无限循环
    }
  }
};

/**
 * 设置缓存项
 * @param {Object} cacheKey - 缓存键对象
 * @param {Object} value - 要缓存的值
 * @return {boolean} 是否成功设置
 */
GraphQLCache.prototype.set = function(cacheKey, value) {
  try {
    var key = this._getCacheKey(cacheKey);
    if (!key || !value) {
      return false;
    }
    
    // 计算过期时间
    var expireTime = this.config.ttl > 0 ? Date.now() + this.config.ttl : null;
    
    // 缓存值
    this.cache.set(key, {
      value: value,
      expireTime: expireTime,
      timestamp: Date.now()
    });
    
    // 添加键映射(用于标准化查询)
    var originalKey = _generateCacheKeyString(cacheKey);
    if (originalKey && originalKey !== key) {
      this._addKeyMapping(originalKey, key);
    }
    
    // 更新访问时间(用于LRU策略)
    this._updateAccessTime(key);
    
    // 更新统计
    if (!this.cache.has(key)) {
      this.stats.size++;
    }
    
    // 检查是否超过最大大小
    if (this.stats.size > this.config.maxSize) {
      this._enforceMaxSize();
    }
    
    return true;
  } catch (e) {
    console.error('GraphQLCache设置缓存项失败:', e);
    return false;
  }
};

/**
 * 获取缓存项
 * @param {Object} cacheKey - 缓存键对象
 * @return {Object|null} 缓存的值或null(如果不存在或已过期)
 */
GraphQLCache.prototype.get = function(cacheKey) {
  try {
    var key = this._getCacheKey(cacheKey);
    if (!key) {
      this.stats.misses++;
      return null;
    }
    
    // 查找标准化的键(如果适用)
    var normalizedKey = this._findNormalizedKey(key);
    
    // 获取缓存项
    var cached = this.cache.get(normalizedKey);
    
    if (!cached) {
      // 尝试查找子集匹配
      var subsetMatch = this._findSubsetMatch(cacheKey);
      if (subsetMatch) {
        this.stats.hits++;
        this._updateAccessTime(normalizedKey);
        return subsetMatch;
      }
      
      this.stats.misses++;
      return null;
    }
    
    // 检查是否过期
    if (cached.expireTime && cached.expireTime < Date.now()) {
      this.delete({ _cacheKey: normalizedKey });
      this.stats.misses++;
      return null;
    }
    
    // 更新访问时间
    this._updateAccessTime(normalizedKey);
    this.stats.hits++;
    
    return cached.value;
  } catch (e) {
    console.error('GraphQLCache获取缓存项失败:', e);
    this.stats.misses++;
    return null;
  }
};

/**
 * 查找可能的子集匹配
 * @param {Object} cacheKey - 缓存键对象
 * @return {Object|null} 匹配的子集数据或null(如果没有匹配)
 * @private
 */
GraphQLCache.prototype._findSubsetMatch = function(cacheKey) {
  if (!cacheKey || !cacheKey.query) {
    return null;
  }
  
  // 提取请求的字段
  var requestedFields = _extractQueryFields(cacheKey.query);
  if (requestedFields.length === 0) {
    return null;
  }
  
  // 检查每个缓存项，查找可能的超集
  var self = this;
  var match = null;
  
  // 使用变量和操作名作为初步过滤
  var variablesStr = JSON.stringify(cacheKey.variables || {});
  var operationName = cacheKey.operationName || '';
  
  this.cache.forEach(function(cached, key) {
    if (match) return; // 已找到匹配，跳过后续项
    
    try {
      // 解析键以获取查询和变量
      var keyObj = JSON.parse(key);
      
      // 检查变量和操作名是否匹配
      if (operationName && keyObj.operationName !== operationName) {
        return; // 操作名不匹配
      }
      
      var keyVarsStr = JSON.stringify(keyObj.variables || {});
      if (keyVarsStr !== variablesStr) {
        return; // 变量不匹配
      }
      
      // 提取缓存项的字段
      var cachedFields = _extractQueryFields(keyObj.query);
      
      // 检查是否所有请求的字段都在缓存项中
      var isSubset = requestedFields.every(function(field) {
        return cachedFields.includes(field);
      });
      
      if (isSubset) {
        // 找到匹配，提取所需字段
        var result = self._extractSubsetData(cached.value, requestedFields);
        if (result) {
          match = result;
        }
      }
    } catch (e) {
      // 解析错误，跳过此项
    }
  });
  
  return match;
};

/**
 * 从完整结果中提取数据子集
 * @param {Object} fullResult - 完整的缓存结果
 * @param {Array<string>} requestedFields - 请求的字段
 * @return {Object|null} 提取的数据子集或null(如果提取失败)
 * @private
 */
GraphQLCache.prototype._extractSubsetData = function(fullResult, requestedFields) {
  if (!fullResult || !fullResult.data || !requestedFields || requestedFields.length === 0) {
    return null;
  }
  
  try {
    // 创建结果的深拷贝，以免修改缓存
    var result = JSON.parse(JSON.stringify(fullResult));
    
    // 遍历数据中的每个顶级字段
    Object.keys(result.data).forEach(function(key) {
      if (typeof result.data[key] === 'object' && result.data[key] !== null) {
        // 对于对象字段，应用字段过滤
        result.data[key] = _extractDataSubset(result.data[key], requestedFields);
      }
    });
    
    return result;
  } catch (e) {
    console.error('提取数据子集失败:', e);
    return null;
  }
};

/**
 * 检查缓存项是否存在
 * @param {Object} cacheKey - 缓存键对象
 * @return {boolean} 缓存项是否存在且未过期
 */
GraphQLCache.prototype.has = function(cacheKey) {
  try {
    var key = this._getCacheKey(cacheKey);
    if (!key) {
      return false;
    }
    
    // 查找标准化的键(如果适用)
    var normalizedKey = this._findNormalizedKey(key);
    
    // 获取缓存项
    var cached = this.cache.get(normalizedKey);
    
    if (!cached) {
      return false;
    }
    
    // 检查是否过期
    if (cached.expireTime && cached.expireTime < Date.now()) {
      this.delete({ _cacheKey: normalizedKey });
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('GraphQLCache检查缓存项失败:', e);
    return false;
  }
};

/**
 * 删除缓存项
 * @param {Object} cacheKey - 缓存键对象
 * @return {boolean} 是否成功删除
 */
GraphQLCache.prototype.delete = function(cacheKey) {
  try {
    var key = this._getCacheKey(cacheKey);
    if (!key) {
      return false;
    }
    
    // 查找标准化的键(如果适用)
    var normalizedKey = this._findNormalizedKey(key);
    
    // 删除缓存项
    var result = this.cache.delete(normalizedKey);
    
    if (result) {
      // 清理相关数据
      delete this.lastAccessed[normalizedKey];
      
      // 寻找并清理键映射
      Object.keys(this.keyMap).forEach(function(k) {
        if (this.keyMap[k] === normalizedKey) {
          delete this.keyMap[k];
        }
      }, this);
      
      // 更新统计
      this.stats.size--;
    }
    
    return result;
  } catch (e) {
    console.error('GraphQLCache删除缓存项失败:', e);
    return false;
  }
};

/**
 * 清除所有缓存
 */
GraphQLCache.prototype.clearAll = function() {
  this.cache.clear();
  this.keyMap = {};
  this.lastAccessed = {};
  
  // 重置统计
  this.stats.size = 0;
};

/**
 * 获取当前缓存配置
 * @return {Object} 缓存配置
 */
GraphQLCache.prototype.getConfig = function() {
  return Object.assign({}, this.config);
};

/**
 * 获取缓存统计信息
 * @return {Object} 缓存统计
 */
GraphQLCache.prototype.getStatistics = function() {
  return {
    hits: this.stats.hits,
    misses: this.stats.misses,
    size: this.stats.size,
    hitRate: this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0
  };
};

/**
 * 析构函数，清理定时器
 */
GraphQLCache.prototype.destroy = function() {
  if (this._expirationTimer) {
    clearInterval(this._expirationTimer);
    this._expirationTimer = null;
  }
  
  this.clearAll();
};

module.exports = GraphQLCache; 