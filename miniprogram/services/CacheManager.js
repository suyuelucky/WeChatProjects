/**
 * CacheManager组件
 * A3-网络请求管理模块2.0 - A3.7
 * 
 * 创建日期: 2025-04-08
 * 作者: AI开发团队
 * 
 * 功能：缓存管理器，负责管理网络请求的缓存，支持过期策略和LRU淘汰机制
 */

'use strict';

/**
 * 缓存管理器
 * @param {Object} options 配置选项
 * @param {String} options.prefix 缓存键前缀，默认为'cache_'
 * @param {Number} options.defaultExpiration 默认过期时间(毫秒)，默认30分钟
 * @param {Number} options.cleanupInterval 清理间隔(毫秒)，默认5分钟
 * @param {Number} options.maxItems 最大缓存项数量，默认1000
 * @param {Number} options.maxSize 最大缓存总大小(字节)，默认10MB
 * @param {Number} options.maxItemSize 单个缓存项最大大小(字节)，默认1MB
 * @param {String} options.strategy 淘汰策略，默认'LRU'
 */
function CacheManager(options) {
  // 确保使用new调用
  if (!(this instanceof CacheManager)) {
    return new CacheManager(options);
  }

  options = options || {};

  // 配置项
  this.prefix = options.prefix || 'cache_';
  this.defaultExpiration = options.defaultExpiration || 1800000; // 默认30分钟
  this.cleanupInterval = options.cleanupInterval || 300000; // 默认5分钟
  this.maxItems = options.maxItems || 1000;
  this.maxSize = options.maxSize || 10 * 1024 * 1024; // 默认10MB
  this.maxItemSize = options.maxItemSize || 1 * 1024 * 1024; // 默认1MB
  this.strategy = options.strategy || 'LRU'; // 缓存淘汰策略，默认LRU

  // 内部状态
  this._keyList = []; // 用于LRU算法的键列表
  this._totalSize = 0; // 当前缓存总大小
  this._cleanupTimer = null; // 定期清理的定时器
  this._isInitialized = false; // 是否已初始化
  
  // 初始化
  this._init();
}

/**
 * 初始化
 * @private
 */
CacheManager.prototype._init = function() {
  var self = this;
  
  if (this._isInitialized) {
    return Promise.resolve();
  }
  
  return new Promise(function(resolve) {
    // 加载缓存键列表
    self._loadKeyList().then(function() {
      // 启动定期清理
      self._startCleanupTimer();
      
      self._isInitialized = true;
      resolve();
    });
  });
};

/**
 * 加载缓存键列表
 * @private
 * @returns {Promise} 加载完成的Promise
 */
CacheManager.prototype._loadKeyList = function() {
  var self = this;
  
  return new Promise(function(resolve) {
    // 获取存储信息
    wx.getStorageInfo({
      success: function(res) {
        // 筛选出属于本缓存管理器的键
        self._keyList = res.keys.filter(function(key) {
          return key.indexOf(self.prefix) === 0;
        }).map(function(key) {
          // 去掉前缀
          return key.substring(self.prefix.length);
        });
        
        // 初始计算缓存大小
        self._calculateTotalSize().then(resolve);
      },
      fail: function() {
        // 如果获取失败，初始化为空列表
        self._keyList = [];
        resolve();
      }
    });
  });
};

/**
 * 计算当前缓存总大小
 * @private
 * @returns {Promise} 计算完成的Promise
 */
CacheManager.prototype._calculateTotalSize = function() {
  var self = this;
  self._totalSize = 0;
  
  if (self._keyList.length === 0) {
    return Promise.resolve(0);
  }
  
  // 对每个键获取数据并计算大小
  var promises = self._keyList.map(function(key) {
    return new Promise(function(resolve) {
      wx.getStorage({
        key: self.prefix + key,
        success: function(res) {
          var size = JSON.stringify(res.data).length;
          resolve(size);
        },
        fail: function() {
          resolve(0);
        }
      });
    });
  });
  
  return Promise.all(promises).then(function(sizes) {
    self._totalSize = sizes.reduce(function(total, size) {
      return total + size;
    }, 0);
    
    return self._totalSize;
  });
};

/**
 * 启动定期清理定时器
 * @private
 */
CacheManager.prototype._startCleanupTimer = function() {
  var self = this;
  
  // 清除旧定时器
  if (this._cleanupTimer) {
    clearInterval(this._cleanupTimer);
  }
  
  // 创建新的定期清理定时器
  this._cleanupTimer = setInterval(function() {
    self._cleanup();
  }, this.cleanupInterval);
};

/**
 * 清理过期的缓存项
 * @private
 * @returns {Promise} 清理完成的Promise
 */
CacheManager.prototype._cleanup = function() {
  var self = this;
  var now = Date.now();
  var expiredKeys = [];
  
  // 检查每个键是否过期
  var checkPromises = this._keyList.map(function(key) {
    return new Promise(function(resolve) {
      wx.getStorage({
        key: self.prefix + key,
        success: function(res) {
          var item = res.data;
          if (item && item.timestamp && item.expiration) {
            if (now - item.timestamp > item.expiration) {
              expiredKeys.push(key);
            }
          }
          resolve();
        },
        fail: function() {
          // 获取失败，可能键已不存在
          expiredKeys.push(key);
          resolve();
        }
      });
    });
  });
  
  return Promise.all(checkPromises).then(function() {
    // 删除所有过期键
    var removePromises = expiredKeys.map(function(key) {
      return new Promise(function(resolve) {
        wx.removeStorage({
          key: self.prefix + key,
          complete: function() {
            // 从键列表中移除
            var index = self._keyList.indexOf(key);
            if (index !== -1) {
              self._keyList.splice(index, 1);
            }
            resolve();
          }
        });
      });
    });
    
    return Promise.all(removePromises).then(function() {
      // 重新计算缓存大小
      if (expiredKeys.length > 0) {
        return self._calculateTotalSize();
      }
      return self._totalSize;
    });
  });
};

/**
 * 更新LRU列表，将指定键移到最近使用
 * @param {String} key 缓存键
 * @private
 */
CacheManager.prototype._updateLRU = function(key) {
  var index = this._keyList.indexOf(key);
  if (index !== -1) {
    // 从当前位置移除
    this._keyList.splice(index, 1);
  }
  // 添加到列表最后(最近使用)
  this._keyList.push(key);
};

/**
 * 让出空间以容纳新项目
 * @param {Number} requiredSize 需要的空间大小
 * @private
 * @returns {Promise} 操作完成的Promise
 */
CacheManager.prototype._makeRoom = function(requiredSize) {
  var self = this;
  
  // 如果不需要清理，直接返回
  if (this._keyList.length < this.maxItems && 
      this._totalSize + requiredSize <= this.maxSize) {
    return Promise.resolve();
  }
  
  // 按照LRU策略，从最早使用的项目开始移除
  var keysToRemove = [];
  var sizeFreed = 0;
  
  // 获取所有缓存项大小
  var promises = [];
  var keySizes = {};
  
  for (var i = 0; i < this._keyList.length; i++) {
    // 创建闭包保存当前索引
    (function(key) {
      var promise = new Promise(function(resolve) {
        wx.getStorage({
          key: self.prefix + key,
          success: function(res) {
            var size = JSON.stringify(res.data).length;
            keySizes[key] = size;
            resolve();
          },
          fail: function() {
            keySizes[key] = 0;
            keysToRemove.push(key); // 获取失败的键直接加入移除列表
            resolve();
          }
        });
      });
      promises.push(promise);
    })(this._keyList[i]);
  }
  
  return Promise.all(promises).then(function() {
    // 按LRU策略选择要移除的键
    for (var i = 0; i < self._keyList.length; i++) {
      var key = self._keyList[i];
      
      // 如果已在移除列表，跳过
      if (keysToRemove.indexOf(key) !== -1) {
        continue;
      }
      
      // 计算移除后是否满足条件
      var freeAfterRemove = self._keyList.length - keysToRemove.length - 1;
      var sizeAfterRemove = sizeFreed + keySizes[key];
      
      if (freeAfterRemove <= self.maxItems - 1 && 
          sizeAfterRemove >= requiredSize) {
        break;
      }
      
      keysToRemove.push(key);
      sizeFreed += keySizes[key] || 0;
    }
    
    // 移除选中的键
    var removePromises = keysToRemove.map(function(key) {
      return new Promise(function(resolve) {
        wx.removeStorage({
          key: self.prefix + key,
          complete: function() {
            var index = self._keyList.indexOf(key);
            if (index !== -1) {
              self._keyList.splice(index, 1);
            }
            resolve();
          }
        });
      });
    });
    
    return Promise.all(removePromises).then(function() {
      // 更新总大小
      return self._calculateTotalSize();
    });
  });
};

/**
 * 设置缓存项
 * @param {String} key 缓存键
 * @param {*} data 要存储的数据
 * @param {Object} [options] 选项
 * @param {Number} [options.expiration] 过期时间(毫秒)，不指定使用默认值
 * @returns {Promise} 操作完成的Promise
 */
CacheManager.prototype.set = function(key, data, options) {
  var self = this;
  options = options || {};
  
  // 处理无效的过期时间
  var expiration = options.expiration;
  if (expiration === undefined || expiration === null || isNaN(expiration) || expiration <= 0) {
    expiration = this.defaultExpiration;
  }
  
  // 准备存储数据
  var storageData = {
    data: data,
    timestamp: Date.now(),
    expiration: expiration
  };
  
  // 检查数据大小
  var dataSize = JSON.stringify(storageData).length;
  
  if (dataSize > this.maxItemSize) {
    return Promise.reject(new Error('数据大小超过限制'));
  }
  
  // 确保有足够空间
  return this._makeRoom(dataSize).then(function() {
    return new Promise(function(resolve, reject) {
      wx.setStorage({
        key: self.prefix + key,
        data: storageData,
        success: function() {
          // 更新LRU列表
          self._updateLRU(key);
          // 更新总大小
          self._totalSize += dataSize;
          resolve();
        },
        fail: function(err) {
          reject(err || new Error('存储失败'));
        }
      });
    });
  });
};

/**
 * 获取缓存项
 * @param {String} key 缓存键
 * @returns {Promise} 返回一个Promise，解析为缓存的数据，或在数据不存在或已过期时拒绝
 */
CacheManager.prototype.get = function(key) {
  var self = this;
  return new Promise(function(resolve, reject) {
    wx.getStorage({
      key: self.prefix + key,
      success: function(res) {
        var storageData = res.data;
        
        // 验证数据格式
        if (!storageData || typeof storageData !== 'object') {
          reject(new Error('缓存数据格式无效'));
          return;
        }
        
        // 检查是否过期
        if (storageData.timestamp && storageData.expiration) {
          var now = Date.now();
          if (now - storageData.timestamp > storageData.expiration) {
            // 过期了，删除并拒绝
            self.remove(key).then(function() {
              reject(new Error('缓存已过期'));
            }).catch(function() {
              reject(new Error('缓存已过期'));
            });
            return;
          }
        }
        
        // 更新LRU列表
        self._updateLRU(key);
        
        // 返回数据
        resolve(storageData.data);
      },
      fail: function(err) {
        reject(err || new Error('缓存不存在'));
      }
    });
  });
};

/**
 * 获取缓存项，如果不存在或已过期则调用回调函数获取并缓存
 * @param {String} key 缓存键
 * @param {Function} fetchFn 获取数据的函数，应返回Promise
 * @param {Object} [options] 选项
 * @param {Boolean} [options.forceRefresh=false] 是否强制刷新，忽略现有缓存
 * @param {Number} [options.expiration] 过期时间，不指定使用默认值
 * @returns {Promise} 返回一个Promise，解析为数据
 */
CacheManager.prototype.getOrFetch = function(key, fetchFn, options) {
  var self = this;
  options = options || {};
  
  if (options.forceRefresh) {
    // 强制刷新，直接获取新数据
    return fetchFn().then(function(data) {
      return self.set(key, data, options).then(function() {
        return data;
      });
    });
  }
  
  // 尝试从缓存获取
  return this.get(key).catch(function() {
    // 缓存不存在或已过期，获取新数据
    return fetchFn().then(function(data) {
      return self.set(key, data, options).then(function() {
        return data;
      });
    });
  });
};

/**
 * 移除缓存项
 * @param {String} key 缓存键
 * @returns {Promise} 操作完成的Promise
 */
CacheManager.prototype.remove = function(key) {
  var self = this;
  return new Promise(function(resolve, reject) {
    wx.removeStorage({
      key: self.prefix + key,
      success: function() {
        // 从LRU列表移除
        var index = self._keyList.indexOf(key);
        if (index !== -1) {
          self._keyList.splice(index, 1);
        }
        
        // 更新缓存大小
        self._calculateTotalSize().then(function() {
          resolve();
        });
      },
      fail: function() {
        // 即使移除失败也当作成功
        resolve();
      }
    });
  });
};

/**
 * 清除所有缓存
 * @returns {Promise} 操作完成的Promise
 */
CacheManager.prototype.clear = function() {
  var self = this;
  
  if (this._keyList.length === 0) {
    return Promise.resolve();
  }
  
  var promises = this._keyList.map(function(key) {
    return self.remove(key);
  });
  
  return Promise.all(promises).then(function() {
    self._keyList = [];
    self._totalSize = 0;
    return Promise.resolve();
  });
};

/**
 * 获取缓存信息
 * @returns {Promise} 返回一个Promise，解析为缓存信息对象
 */
CacheManager.prototype.getInfo = function() {
  var self = this;
  return this._calculateTotalSize().then(function(totalSize) {
    return {
      count: self._keyList.length,
      totalSize: totalSize,
      maxItems: self.maxItems,
      maxSize: self.maxSize,
      keys: self._keyList.slice() // 返回副本避免外部修改
    };
  });
};

/**
 * 销毁缓存管理器，清理资源
 */
CacheManager.prototype.destroy = function() {
  if (this._cleanupTimer) {
    clearInterval(this._cleanupTimer);
    this._cleanupTimer = null;
  }
  
  this._keyList = [];
  this._totalSize = 0;
  this._isInitialized = false;
};

// 导出CacheManager
module.exports = CacheManager; 