/**
 * 优化存储适配器
 * 为现有存储适配器添加性能优化功能
 * 包括数据分片、内存回收和数据结构优化
 * 
 * 作者：AI助手
 * 创建日期：2025-04-08
 */

/**
 * 优化存储适配器构造函数
 * @param {Object} baseAdapter 基础存储适配器
 * @param {Object} options 配置选项
 */
function OptimizedStorageAdapter(baseAdapter, options) {
  if (!baseAdapter) {
    throw new Error('必须提供基础存储适配器');
  }
  
  this.baseAdapter = baseAdapter;
  
  // 默认配置
  this.options = Object.assign({
    // 分片配置
    chunkSize: 64 * 1024, // 64KB
    maxChunks: 100,       // 最大分片数
    
    // 内存回收配置
    gcThreshold: 0.8,     // 内存使用率达到80%时触发回收
    gcInterval: 5 * 60 * 1000, // 5分钟检查一次
    maxInactiveTime: 30 * 60 * 1000, // 30分钟未访问的数据可被回收
    
    // 缓存配置
    cacheSize: 100,       // 最大缓存条目数
    cacheTimeout: 5 * 60 * 1000, // 缓存5分钟后过期
    
    // 压缩配置
    compressionThreshold: 1024, // 1KB以上的数据进行压缩
    
    // 监控配置
    enableMonitoring: true,
    monitoringInterval: 60 * 1000 // 1分钟监控一次
  }, options || {});
  
  // 初始化内部状态
  this._init();
}

/**
 * 初始化适配器
 * @private
 */
OptimizedStorageAdapter.prototype._init = function() {
  // 初始化缓存
  this._cache = new LRUCache(this.options.cacheSize);
  
  // 初始化分片映射表
  this._chunkMap = {};
  
  // 初始化访问时间记录
  this._accessTimes = {};
  
  // 初始化监控数据
  this._metrics = {
    reads: 0,
    writes: 0,
    hits: 0,
    misses: 0,
    gcRuns: 0,
    compressionRatio: 0
  };
  
  // 启动GC定时器
  if (this.options.gcInterval > 0) {
    this._startGC();
  }
  
  // 启动监控
  if (this.options.enableMonitoring) {
    this._startMonitoring();
  }
};

/**
 * LRU缓存实现
 * @private
 */
function LRUCache(capacity) {
  this.capacity = capacity;
  this.cache = {};
  this.keys = [];
  
  this.get = function(key) {
    if (this.cache[key]) {
      // 更新访问顺序
      var index = this.keys.indexOf(key);
      this.keys.splice(index, 1);
      this.keys.push(key);
      return this.cache[key];
    }
    return null;
  };
  
  this.put = function(key, value) {
    if (this.keys.length >= this.capacity) {
      // 移除最久未使用的项
      var oldestKey = this.keys.shift();
      delete this.cache[oldestKey];
    }
    
    this.cache[key] = value;
    this.keys.push(key);
  };
  
  this.remove = function(key) {
    if (this.cache[key]) {
      delete this.cache[key];
      var index = this.keys.indexOf(key);
      this.keys.splice(index, 1);
    }
  };
}

/**
 * 启动垃圾回收
 * @private
 */
OptimizedStorageAdapter.prototype._startGC = function() {
  var self = this;
  
  function runGC() {
    var info = self.baseAdapter.getStorageInfo();
    var usageRatio = info.currentSize / info.limitSize;
    
    // 检查是否需要进行垃圾回收
    if (usageRatio >= self.options.gcThreshold) {
      self._collectGarbage();
    }
  }
  
  // 定期执行GC
  setInterval(runGC, this.options.gcInterval);
};

/**
 * 执行垃圾回收
 * @private
 */
OptimizedStorageAdapter.prototype._collectGarbage = function() {
  var now = Date.now();
  var keys = this.baseAdapter.keys();
  var collected = 0;
  
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var lastAccess = this._accessTimes[key] || 0;
    
    // 检查数据是否长时间未访问
    if (now - lastAccess > this.options.maxInactiveTime) {
      // 从缓存中移除
      this._cache.remove(key);
      
      // 如果是分片数据，清理所有分片
      if (this._chunkMap[key]) {
        this._removeChunks(key);
      } else {
        this.baseAdapter.removeItem(key);
      }
      
      delete this._accessTimes[key];
      collected++;
    }
  }
  
  this._metrics.gcRuns++;
  return collected;
};

/**
 * 数据分片处理
 * @private
 */
OptimizedStorageAdapter.prototype._splitIntoChunks = function(key, value) {
  var data = JSON.stringify(value);
  
  // 检查是否需要压缩
  if (data.length > this.options.compressionThreshold) {
    data = this._compress(data);
  }
  
  // 计算需要的分片数
  var chunks = [];
  var chunkSize = this.options.chunkSize;
  var totalChunks = Math.ceil(data.length / chunkSize);
  
  // 检查是否超过最大分片数
  if (totalChunks > this.options.maxChunks) {
    throw new Error('数据过大，超过最大分片限制');
  }
  
  // 分片存储
  for (var i = 0; i < totalChunks; i++) {
    var chunk = data.substr(i * chunkSize, chunkSize);
    var chunkKey = key + '_chunk_' + i;
    chunks.push(chunkKey);
    this.baseAdapter.setItem(chunkKey, chunk);
  }
  
  // 记录分片映射
  this._chunkMap[key] = {
    chunks: chunks,
    compressed: data.length > this.options.compressionThreshold,
    timestamp: Date.now()
  };
  
  return true;
};

/**
 * 合并数据分片
 * @private
 */
OptimizedStorageAdapter.prototype._mergeChunks = function(key) {
  var mapping = this._chunkMap[key];
  if (!mapping) return null;
  
  var chunks = mapping.chunks;
  var data = '';
  
  // 合并所有分片
  for (var i = 0; i < chunks.length; i++) {
    var chunk = this.baseAdapter.getItem(chunks[i]);
    if (chunk === null) {
      console.error('分片丢失:', chunks[i]);
      return null;
    }
    data += chunk;
  }
  
  // 如果数据被压缩过，进行解压
  if (mapping.compressed) {
    data = this._decompress(data);
  }
  
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('解析合并数据失败:', e);
    return null;
  }
};

/**
 * 移除数据分片
 * @private
 */
OptimizedStorageAdapter.prototype._removeChunks = function(key) {
  var mapping = this._chunkMap[key];
  if (!mapping) return false;
  
  // 删除所有分片
  var chunks = mapping.chunks;
  for (var i = 0; i < chunks.length; i++) {
    this.baseAdapter.removeItem(chunks[i]);
  }
  
  // 删除分片映射
  delete this._chunkMap[key];
  return true;
};

/**
 * 压缩数据
 * @private
 */
OptimizedStorageAdapter.prototype._compress = function(data) {
  // TODO: 实现实际的压缩算法
  // 这里使用一个简单的模拟实现
  return data;
};

/**
 * 解压数据
 * @private
 */
OptimizedStorageAdapter.prototype._decompress = function(data) {
  // TODO: 实现实际的解压算法
  // 这里使用一个简单的模拟实现
  return data;
};

/**
 * 启动性能监控
 * @private
 */
OptimizedStorageAdapter.prototype._startMonitoring = function() {
  var self = this;
  
  function updateMetrics() {
    var info = self.baseAdapter.getStorageInfo();
    var totalSize = info.currentSize;
    var compressedSize = 0;
    
    // 计算压缩率
    Object.keys(self._chunkMap).forEach(function(key) {
      if (self._chunkMap[key].compressed) {
        var originalSize = 0;
        self._chunkMap[key].chunks.forEach(function(chunkKey) {
          var chunk = self.baseAdapter.getItem(chunkKey);
          if (chunk) {
            originalSize += chunk.length;
          }
        });
        compressedSize += originalSize;
      }
    });
    
    if (compressedSize > 0) {
      self._metrics.compressionRatio = (totalSize / compressedSize).toFixed(2);
    }
    
    // 输出监控数据
    console.log('Storage Metrics:', JSON.stringify(self._metrics, null, 2));
  }
  
  // 定期更新监控数据
  setInterval(updateMetrics, this.options.monitoringInterval);
};

/**
 * 获取存储项
 * @param {string} key 存储键
 * @returns {*} 存储的数据
 */
OptimizedStorageAdapter.prototype.getItem = function(key) {
  this._metrics.reads++;
  
  // 更新访问时间
  this._accessTimes[key] = Date.now();
  
  // 检查缓存
  var cached = this._cache.get(key);
  if (cached) {
    this._metrics.hits++;
    return cached;
  }
  
  this._metrics.misses++;
  
  // 检查是否是分片数据
  if (this._chunkMap[key]) {
    var value = this._mergeChunks(key);
    if (value !== null) {
      this._cache.put(key, value);
    }
    return value;
  }
  
  // 从基础适配器获取
  var value = this.baseAdapter.getItem(key);
  if (value !== null) {
    this._cache.put(key, value);
  }
  
  return value;
};

/**
 * 设置存储项
 * @param {string} key 存储键
 * @param {*} value 要存储的数据
 * @returns {boolean} 操作是否成功
 */
OptimizedStorageAdapter.prototype.setItem = function(key, value) {
  this._metrics.writes++;
  
  // 更新访问时间
  this._accessTimes[key] = Date.now();
  
  // 更新缓存
  this._cache.put(key, value);
  
  // 检查数据大小是否需要分片
  var size = JSON.stringify(value).length;
  if (size > this.options.chunkSize) {
    return this._splitIntoChunks(key, value);
  }
  
  // 直接存储
  return this.baseAdapter.setItem(key, value);
};

/**
 * 移除存储项
 * @param {string} key 存储键
 * @returns {boolean} 操作是否成功
 */
OptimizedStorageAdapter.prototype.removeItem = function(key) {
  // 从缓存中移除
  this._cache.remove(key);
  
  // 删除访问时间记录
  delete this._accessTimes[key];
  
  // 如果是分片数据，清理所有分片
  if (this._chunkMap[key]) {
    return this._removeChunks(key);
  }
  
  // 从基础适配器中移除
  return this.baseAdapter.removeItem(key);
};

/**
 * 清空存储
 * @returns {boolean} 操作是否成功
 */
OptimizedStorageAdapter.prototype.clear = function() {
  // 清空缓存
  this._cache = new LRUCache(this.options.cacheSize);
  
  // 清空访问时间记录
  this._accessTimes = {};
  
  // 清空分片映射
  this._chunkMap = {};
  
  // 清空基础适配器
  return this.baseAdapter.clear();
};

/**
 * 获取所有键
 * @returns {Array<string>} 键数组
 */
OptimizedStorageAdapter.prototype.keys = function() {
  return this.baseAdapter.keys().filter(function(key) {
    // 过滤掉分片键
    return key.indexOf('_chunk_') === -1;
  });
};

/**
 * 获取存储信息
 * @returns {Object} 存储信息
 */
OptimizedStorageAdapter.prototype.getStorageInfo = function() {
  var baseInfo = this.baseAdapter.getStorageInfo();
  
  return {
    keys: this.keys(),
    currentSize: baseInfo.currentSize,
    limitSize: baseInfo.limitSize,
    metrics: this._metrics
  };
};

module.exports = OptimizedStorageAdapter; 