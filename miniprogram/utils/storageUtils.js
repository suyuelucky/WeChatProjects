/**
 * 小程序本地存储工具
 * 提供本地数据存储和离线同步功能
 * 
 * 遵循ES5标准，确保在微信小程序环境兼容
 */

// 存储项类型
var StorageItemType = {
  CACHE: 'cache',    // 缓存数据，可随时清理
  TEMP: 'temp',      // 临时数据，优先清理
  USER_DATA: 'user', // 用户数据，非必要不清理
  SYNC: 'sync',      // 同步相关数据，非必要不清理
  SYSTEM: 'system',  // 系统数据，不应清理
  OTHER: 'other'     // 其他数据
};

// 存储错误类型
var StorageErrorType = {
  READ_ERROR: 'read_error',       // 读取错误
  WRITE_ERROR: 'write_error',     // 写入错误
  DELETE_ERROR: 'delete_error',   // 删除错误
  QUOTA_ERROR: 'quota_error',     // 配额错误
  KEY_NOT_FOUND: 'key_not_found', // 键不存在
  PARSE_ERROR: 'parse_error',     // 解析错误
  UNKNOWN_ERROR: 'unknown_error'  // 未知错误
};

// 避免循环依赖 - 延迟加载
var _eventBus = null;
function getEventBus() {
  if (!_eventBus) {
    _eventBus = require('./eventBus');
  }
  return _eventBus;
}

/**
 * 基础存储API
 */
var storage = {
  /**
   * 设置存储数据
   * @param {string} key - 键名
   * @param {any} data - 存储的数据
   * @param {Object} options - 附加选项
   * @param {string} options.type - 存储类型
   * @param {number} options.expires - 过期时间(毫秒)
   * @returns {Promise} - 返回Promise
   */
  set: function(key, data, options) {
    options = options || {};
    
    return new Promise(function(resolve, reject) {
      if (!key) {
        reject({
          type: StorageErrorType.WRITE_ERROR,
          message: '存储键名不能为空',
          key: key
        });
        return;
      }
      
      var storageData = {
        data: data,
        timestamp: Date.now(),
        type: options.type || StorageItemType.OTHER
      };
      
      // 设置过期时间
      if (options.expires && typeof options.expires === 'number') {
        storageData.expires = Date.now() + options.expires;
      }
      
      try {
        wx.setStorage({
          key: key,
          data: storageData,
          success: function() {
            // 触发存储变更事件
            var eventBus = getEventBus();
            if (eventBus) {
              eventBus.emit('storage:dataChanged', {
                type: 'set',
                key: key,
                timestamp: Date.now()
              });
            }
            resolve(true);
          },
          fail: function(error) {
            console.error('存储数据失败:', error, key);
            reject({
              type: StorageErrorType.WRITE_ERROR,
              message: '存储数据失败',
              error: error,
              key: key
            });
          }
        });
      } catch (error) {
        console.error('存储数据异常:', error, key);
        reject({
          type: StorageErrorType.UNKNOWN_ERROR,
          message: '存储数据异常',
          error: error,
          key: key
        });
      }
    });
  },
  
  /**
   * 设置存储数据(同步版本)
   * @param {string} key - 键名
   * @param {any} data - 存储的数据
   * @param {Object} options - 附加选项
   * @returns {boolean} - 是否成功
   */
  setSync: function(key, data, options) {
    options = options || {};
    
    if (!key) {
      console.error('存储键名不能为空');
      return false;
    }
    
    var storageData = {
      data: data,
      timestamp: Date.now(),
      type: options.type || StorageItemType.OTHER
    };
    
    // 设置过期时间
    if (options.expires && typeof options.expires === 'number') {
      storageData.expires = Date.now() + options.expires;
    }
    
    try {
      wx.setStorageSync(key, storageData);
      return true;
    } catch (error) {
      console.error('同步存储数据失败:', error, key);
      return false;
    }
  },
  
  /**
   * 获取存储数据
   * @param {string} key - 键名
   * @param {any} defaultValue - 默认值(若数据不存在)
   * @returns {Promise} - 返回Promise
   */
  get: function(key, defaultValue) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      if (!key) {
        reject({
          type: StorageErrorType.READ_ERROR,
          message: '存储键名不能为空',
          key: key
        });
        return;
      }
      
      wx.getStorage({
        key: key,
        success: function(res) {
          var storageData = res.data;
          
          // 检查是否有效的存储格式
          if (!storageData || typeof storageData !== 'object') {
            // 对于非标准格式，直接返回原始数据
            resolve(res.data);
            return;
          }
          
          // 检查是否过期
          if (storageData.expires && Date.now() > storageData.expires) {
            // 数据已过期，删除并返回默认值
            self.remove(key).then(function() {
              resolve(defaultValue);
            }).catch(function() {
              resolve(defaultValue);
            });
            return;
          }
          
          // 返回存储的实际数据
          resolve(storageData.data);
        },
        fail: function(error) {
          // 对于"找不到"的错误，返回默认值
          if (error && error.errMsg && error.errMsg.indexOf('not exist') >= 0) {
            resolve(defaultValue);
            return;
          }
          
          console.error('获取数据失败:', error, key);
          reject({
            type: StorageErrorType.READ_ERROR,
            message: '获取数据失败',
            error: error,
            key: key
          });
        }
      });
    });
  },
  
  /**
   * 获取存储数据(同步版本)
   * @param {string} key - 键名
   * @param {any} defaultValue - 默认值(若数据不存在)
   * @returns {any} - 存储的数据或默认值
   */
  getSync: function(key, defaultValue) {
    if (!key) {
      console.error('存储键名不能为空');
      return defaultValue;
    }
    
    try {
      var storageData = wx.getStorageSync(key);
      
      // 检查是否有效的存储格式
      if (!storageData || typeof storageData !== 'object') {
        // 对于非标准格式，直接返回原始数据
        return storageData;
      }
      
      // 检查是否过期
      if (storageData.expires && Date.now() > storageData.expires) {
        // 数据已过期，删除并返回默认值
        try {
          wx.removeStorageSync(key);
        } catch (e) {
          // 忽略删除错误
        }
        return defaultValue;
      }
      
      // 返回存储的实际数据
      return storageData.data;
    } catch (error) {
      console.error('同步获取数据失败:', error, key);
      return defaultValue;
    }
  },
  
  /**
   * 删除存储数据
   * @param {string} key - 键名
   * @returns {Promise} - 返回Promise
   */
  remove: function(key) {
    return new Promise(function(resolve, reject) {
      if (!key) {
        reject({
          type: StorageErrorType.DELETE_ERROR,
          message: '存储键名不能为空',
          key: key
        });
        return;
      }
      
      wx.removeStorage({
        key: key,
        success: function() {
          // 触发存储变更事件
          var eventBus = getEventBus();
          if (eventBus) {
            eventBus.emit('storage:dataChanged', {
              type: 'remove',
              key: key,
              timestamp: Date.now()
            });
          }
          resolve(true);
        },
        fail: function(error) {
          console.error('删除数据失败:', error, key);
          reject({
            type: StorageErrorType.DELETE_ERROR,
            message: '删除数据失败',
            error: error,
            key: key
          });
        }
      });
    });
  },
  
  /**
   * 删除存储数据(同步版本)
   * @param {string} key - 键名
   * @returns {boolean} - 是否成功
   */
  removeSync: function(key) {
    if (!key) {
      console.error('存储键名不能为空');
      return false;
    }
    
    try {
      wx.removeStorageSync(key);
      return true;
    } catch (error) {
      console.error('同步删除数据失败:', error, key);
      return false;
    }
  },
  
  /**
   * 清空所有存储数据
   * @returns {Promise} - 返回Promise
   */
  clear: function() {
    return new Promise(function(resolve, reject) {
      wx.clearStorage({
        success: function() {
          // 触发存储变更事件
          var eventBus = getEventBus();
          if (eventBus) {
            eventBus.emit('storage:dataChanged', {
              type: 'clear',
              timestamp: Date.now()
            });
          }
          resolve(true);
        },
        fail: function(error) {
          console.error('清空存储失败:', error);
          reject({
            type: StorageErrorType.DELETE_ERROR,
            message: '清空存储失败',
            error: error
          });
        }
      });
    });
  },
  
  /**
   * 清空所有存储数据(同步版本)
   * @returns {boolean} - 是否成功
   */
  clearSync: function() {
    try {
      wx.clearStorageSync();
      return true;
    } catch (error) {
      console.error('同步清空存储失败:', error);
      return false;
    }
  },
  
  /**
   * 获取所有存储数据的键名列表
   * @returns {Promise<Array>} - 键名列表
   */
  keys: function() {
    return new Promise(function(resolve, reject) {
      wx.getStorageInfo({
        success: function(res) {
          resolve(res.keys || []);
        },
        fail: function(error) {
          console.error('获取存储键列表失败:', error);
          reject({
            type: StorageErrorType.READ_ERROR,
            message: '获取存储键列表失败',
            error: error
          });
        }
      });
    });
  },
  
  /**
   * 获取所有存储数据的键名列表(同步版本)
   * @returns {Array} - 键名列表
   */
  keysSync: function() {
    try {
      var info = wx.getStorageInfoSync();
      return info.keys || [];
    } catch (error) {
      console.error('同步获取存储键列表失败:', error);
      return [];
    }
  },
  
  /**
   * 获取存储信息
   * @returns {Promise<Object>} - 存储信息
   */
  info: function() {
    return new Promise(function(resolve, reject) {
      wx.getStorageInfo({
        success: function(res) {
          resolve({
            keys: res.keys || [],
            currentSize: res.currentSize || 0,
            limitSize: res.limitSize || 0
          });
        },
        fail: function(error) {
          console.error('获取存储信息失败:', error);
          reject({
            type: StorageErrorType.READ_ERROR,
            message: '获取存储信息失败',
            error: error
          });
        }
      });
    });
  },
  
  /**
   * 获取存储信息(同步版本)
   * @returns {Object} - 存储信息
   */
  infoSync: function() {
    try {
      var info = wx.getStorageInfoSync();
      return {
        keys: info.keys || [],
        currentSize: info.currentSize || 0,
        limitSize: info.limitSize || 0,
        keysCount: (info.keys || []).length,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('同步获取存储信息失败:', error);
      return {
        keys: [],
        currentSize: 0,
        limitSize: 0,
        keysCount: 0,
        timestamp: Date.now()
      };
    }
  }
};

/**
 * 同步队列相关操作
 */
var syncQueue = {
  QUEUE_KEY: 'sync_queue',
  
  /**
   * 添加同步任务到队列
   * @param {Object} task - 包含操作类型、数据和时间戳的任务
   * @returns {Promise<boolean>}
   */
  add: function(task) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      self.getAll().then(function(queue) {
        queue = queue || [];
        
        queue.push({
          key: task.key,
          data: task.data,
          action: task.action || 'update',
          timestamp: Date.now(),
          id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
        });
        
        storage.set(self.QUEUE_KEY, queue, { type: StorageItemType.SYNC })
          .then(resolve)
          .catch(reject);
      }).catch(function(error) {
        console.error('获取同步队列失败:', error);
        reject(error);
      });
    });
  },
  
  /**
   * 获取所有待同步任务
   * @returns {Promise<Array>}
   */
  getAll: function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      storage.get(self.QUEUE_KEY, [])
        .then(resolve)
        .catch(function(error) {
          console.error('获取同步队列失败:', error);
          resolve([]); // 出错时返回空数组
        });
    });
  },
  
  /**
   * 删除已完成的同步任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<boolean>}
   */
  remove: function(taskId) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      self.getAll().then(function(queue) {
        var updatedQueue = [];
        var found = false;
        
        for (var i = 0; i < queue.length; i++) {
          if (queue[i].id !== taskId) {
            updatedQueue.push(queue[i]);
          } else {
            found = true;
          }
        }
        
        if (!found) {
          resolve(false);
          return;
        }
        
        storage.set(self.QUEUE_KEY, updatedQueue, { type: StorageItemType.SYNC })
          .then(function() { resolve(true); })
          .catch(reject);
      }).catch(reject);
    });
  },
  
  /**
   * 处理同步队列（网络恢复时调用）
   * @param {Function} processFn - 处理单个任务的函数
   * @returns {Promise<Array>} - 返回处理结果
   */
  process: function(processFn) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      self.getAll().then(function(queue) {
        if (!queue || queue.length === 0) {
          resolve([]);
          return;
        }
        
        var promises = [];
        var results = [];
        
        // 处理每个任务
        for (var i = 0; i < queue.length; i++) {
          (function(task) {
            var promise = new Promise(function(resolveTask) {
              Promise.resolve(processFn(task)).then(function(result) {
                self.remove(task.id).then(function() {
                  results.push({ success: true, task: task, result: result });
                  resolveTask();
                }).catch(function(error) {
                  console.error('删除已处理任务失败:', error, task);
                  results.push({ success: true, task: task, result: result, warning: '任务已处理但未能从队列删除' });
                  resolveTask();
                });
              }).catch(function(error) {
                console.error('处理同步任务失败:', error, task);
                results.push({ success: false, task: task, error: error });
                resolveTask();
              });
            });
            
            promises.push(promise);
          })(queue[i]);
        }
        
        // 等待所有任务处理完成
        Promise.all(promises).then(function() {
          resolve(results);
        }).catch(reject);
      }).catch(reject);
    });
  },
  
  /**
   * 保存离线数据并加入同步队列
   * @param {string} key - 存储键名
   * @param {Object} data - 数据
   * @param {string} action - 操作类型（create, update, delete）
   * @returns {Promise<boolean>}
   */
  saveForSync: function(key, data, action) {
    var self = this;
    action = action || 'update';
    
    return new Promise(function(resolve, reject) {
      // 先保存到本地
      storage.set(key + '_offline', {
        data: data,
        updatedAt: Date.now()
      }, { type: StorageItemType.SYNC }).then(function() {
        // 添加到同步队列
        return self.add({
          key: key,
          data: data,
          action: action
        });
      }).then(resolve).catch(reject);
    });
  }
};

// 导出接口
module.exports = {
  storage: storage,
  syncQueue: syncQueue,
  StorageItemType: StorageItemType,
  StorageErrorType: StorageErrorType,
  
  // 兼容旧API
  setStorage: function(key, data) {
    return storage.set(key, data);
  },
  getStorage: function(key) {
    return storage.get(key);
  },
  removeStorage: function(key) {
    return storage.remove(key);
  },
  clearStorage: function() {
    return storage.clear();
  }
}; 