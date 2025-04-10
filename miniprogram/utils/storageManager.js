/**
 * 存储空间管理工具
 * 提供本地存储空间监控和自动清理策略
 * 遵循ES5标准，确保在微信小程序环境兼容
 */

// 避免循环依赖 - 延迟加载方式
var _storageUtils = null;
var _storage = null;
var _eventBus = null;

// 内部获取依赖函数
function getStorageUtils() {
  if (!_storageUtils) {
    try {
      _storageUtils = require('./storageUtils');
    } catch (err) {
      console.error('加载storageUtils失败:', err);
      _storageUtils = {
        storage: {
          info: function() {
            return new Promise(function(resolve) {
              wx.getStorageInfo({
                success: function(res) {
                  resolve({
                    currentSize: res.currentSize || 0,
                    limitSize: res.limitSize || 50 * 1024 * 1024,
                    keys: res.keys || []
                  });
                },
                fail: function(err) {
                  console.error('获取存储信息失败:', err);
                  resolve({
                    currentSize: 0,
                    limitSize: 50 * 1024 * 1024,
                    keys: []
                  });
                }
              });
            });
          },
          keys: function() {
            return new Promise(function(resolve) {
              wx.getStorageInfo({
                success: function(res) {
                  resolve(res.keys || []);
                },
                fail: function() {
                  resolve([]);
                }
              });
            });
          }
        },
        StorageItemType: {
          TEMP: 'temp',
          USER: 'user',
          SYSTEM: 'system',
          CACHE: 'cache'
        }
      };
    }
  }
  return _storageUtils;
}

function getStorage() {
  if (!_storage) {
    var utils = getStorageUtils();
    _storage = utils && utils.storage ? utils.storage : {
      info: function() {
        return new Promise(function(resolve) {
          wx.getStorageInfo({
            success: function(res) {
              resolve({
                currentSize: res.currentSize || 0,
                limitSize: res.limitSize || 50 * 1024 * 1024,
                keys: res.keys || []
              });
            },
            fail: function(err) {
              console.error('获取存储信息失败:', err);
              resolve({
                currentSize: 0,
                limitSize: 50 * 1024 * 1024,
                keys: []
              });
            }
          });
        });
      },
      keys: function() {
        return new Promise(function(resolve) {
          wx.getStorageInfo({
            success: function(res) {
              resolve(res.keys || []);
            },
            fail: function() {
              resolve([]);
            }
          });
        });
      }
    };
  }
  return _storage;
}

function getEventBus() {
  if (!_eventBus) {
    try {
      _eventBus = require('./eventBus');
    } catch (err) {
      console.error('加载eventBus失败:', err);
      _eventBus = {
        emit: function() {
          // 空函数，防止调用出错
        },
        on: function() {
          // 空函数，防止调用出错
        }
      };
    }
  }
  return _eventBus;
}

// 默认配置
var DEFAULT_CONFIG = {
  maxStorageSize: 50 * 1024 * 1024, // 默认最大存储空间50MB
  warningThreshold: 0.8, // 存储空间使用警告阈值（80%）
  criticalThreshold: 0.9, // 存储空间临界阈值（90%）
  autoClearEnabled: true, // 是否启用自动清理
  autoClearThreshold: 0.85, // 自动清理阈值（85%）
  cleanUpInterval: 24 * 60 * 60 * 1000, // 清理检查间隔（24小时）
  priorityCleanupKeys: [ // 优先清理的存储项（按优先级排序）
    'temp_',  // 临时文件
    'cache_', // 缓存文件
    'log_',   // 日志
    'draft_'  // 草稿
  ],
  preserveKeys: [  // 必须保留的存储项
    'user_info', 
    'auth_token', 
    'app_settings', 
    'client_id'
  ]
};

// 存储项类型
var StorageItemType = null;

// 存储空间状态
var StorageStatus = {
  NORMAL: 'normal',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

/**
 * 存储空间管理器
 * @param {Object} config - 配置参数
 */
function StorageManager(config) {
  this.config = {};
  
  // 合并配置
  for (var key in DEFAULT_CONFIG) {
    if (DEFAULT_CONFIG.hasOwnProperty(key)) {
      this.config[key] = DEFAULT_CONFIG[key];
    }
  }
  
  if (config) {
    for (var key in config) {
      if (config.hasOwnProperty(key)) {
        this.config[key] = config[key];
      }
    }
  }
  
  this.listeners = [];
  this.cleanupTimer = null;
  this.storageInfo = null;
  
  // 初始化
  this.init();
}

/**
 * 初始化存储管理器
 */
StorageManager.prototype.init = function() {
  var self = this;
  
  // 确保延迟加载完成
  try {
    var utils = getStorageUtils();
    StorageItemType = utils && utils.StorageItemType ? utils.StorageItemType : {
      TEMP: 'temp',
      USER: 'user',
      SYSTEM: 'system',
      CACHE: 'cache'
    };
  } catch (err) {
    console.error('初始化存储类型失败:', err);
    StorageItemType = {
      TEMP: 'temp',
      USER: 'user',
      SYSTEM: 'system',
      CACHE: 'cache'
    };
  }
  
  // 获取初始存储信息
  this.getStorageInfo().then(function(info) {
    self.storageInfo = info;
    
    // 如果启用了自动清理，开始定时任务
    if (self.config.autoClearEnabled) {
      self.startCleanupTimer();
    }
    
    // 如果空间使用超过警告阈值，触发警告
    if (info.status === StorageStatus.WARNING || info.status === StorageStatus.CRITICAL) {
      var eventBus = getEventBus();
      if (eventBus && typeof eventBus.emit === 'function') {
        eventBus.emit('storage:spaceWarning', info);
      }
    }
  });
  
  // 监听存储变化事件
  var eventBus = getEventBus();
  if (eventBus && typeof eventBus.on === 'function') {
    eventBus.on('storage:dataChanged', function(data) {
      // 更新存储信息
      self.updateStorageInfo();
    });
  }
};

/**
 * 获取存储信息
 * @returns {Promise<Object>} 存储信息
 */
StorageManager.prototype.getStorageInfo = function() {
  var self = this;
  
  return new Promise(function(resolve) {
    try {
      var storage = getStorage();
      if (storage && typeof storage.info === 'function') {
        storage.info().then(function(info) {
          // 计算使用比例和状态
          var usedSize = info.currentSize || 0;
          var limitSize = info.limitSize || self.config.maxStorageSize;
          var usedRatio = usedSize / limitSize;
          
          var status = StorageStatus.NORMAL;
          if (usedRatio >= self.config.criticalThreshold) {
            status = StorageStatus.CRITICAL;
          } else if (usedRatio >= self.config.warningThreshold) {
            status = StorageStatus.WARNING;
          }
          
          var result = {
            usedSize: usedSize,
            limitSize: limitSize,
            freeSize: limitSize - usedSize,
            percentUsed: Math.round(usedRatio * 100),
            keysCount: info.keys ? info.keys.length : 0,
            keys: info.keys || [],
            status: status,
            timestamp: Date.now()
          };
          
          self.storageInfo = result;
          resolve(result);
        }).catch(function(error) {
          console.error('获取存储信息失败:', error);
          // 使用备用方法获取存储信息
          self._getStorageInfoFallback(resolve);
        });
      } else {
        // 直接使用备用方法
        self._getStorageInfoFallback(resolve);
      }
    } catch (error) {
      console.error('获取存储信息异常:', error);
      // 使用备用方法获取存储信息
      self._getStorageInfoFallback(resolve);
    }
  });
};

/**
 * 备用方法获取存储信息
 * @private
 */
StorageManager.prototype._getStorageInfoFallback = function(resolve) {
  var self = this;
  
  try {
    wx.getStorageInfo({
      success: function(res) {
        var usedSize = res.currentSize || 0;
        var limitSize = res.limitSize || self.config.maxStorageSize;
        var usedRatio = usedSize / limitSize;
        
        var status = StorageStatus.NORMAL;
        if (usedRatio >= self.config.criticalThreshold) {
          status = StorageStatus.CRITICAL;
        } else if (usedRatio >= self.config.warningThreshold) {
          status = StorageStatus.WARNING;
        }
        
        var result = {
          usedSize: usedSize,
          limitSize: limitSize,
          freeSize: limitSize - usedSize,
          percentUsed: Math.round(usedRatio * 100),
          keysCount: res.keys ? res.keys.length : 0,
          keys: res.keys || [],
          status: status,
          timestamp: Date.now()
        };
        
        self.storageInfo = result;
        resolve(result);
      },
      fail: function(error) {
        console.error('备用方法获取存储信息失败:', error);
        // 返回默认值
        resolve({
          usedSize: 0,
          limitSize: self.config.maxStorageSize,
          freeSize: self.config.maxStorageSize,
          percentUsed: 0,
          keysCount: 0,
          keys: [],
          status: StorageStatus.NORMAL,
          timestamp: Date.now(),
          error: error
        });
      }
    });
  } catch (err) {
    console.error('执行备用存储方法异常:', err);
    // 返回默认值
    resolve({
      usedSize: 0,
      limitSize: self.config.maxStorageSize,
      freeSize: self.config.maxStorageSize,
      percentUsed: 0,
      keysCount: 0,
      keys: [],
      status: StorageStatus.NORMAL,
      timestamp: Date.now(),
      error: err
    });
  }
};

/**
 * 获取存储详细摘要
 * @returns {Promise<Object>} 存储摘要
 */
StorageManager.prototype.getStorageSummary = function() {
  var self = this;
  
  return new Promise(function(resolve) {
    self.getStorageInfo().then(function(storageInfo) {
      getStorage().keys().then(function(keys) {
        // 按类型分组统计
        var typeStats = {};
        var loadPromises = [];
        
        // 确保获取存储类型
        StorageItemType = getStorageUtils().StorageItemType;
        
        // 初始化类型统计
        for (var type in StorageItemType) {
          if (StorageItemType.hasOwnProperty(type)) {
            typeStats[StorageItemType[type]] = {
              count: 0,
              keys: []
            };
          }
        }
        
        // 遍历所有键，提取类型信息
        keys.forEach(function(key) {
          var itemType = self.getItemType(key);
          if (!typeStats[itemType]) {
            typeStats[itemType] = {
              count: 0,
              keys: []
            };
          }
          
          typeStats[itemType].count++;
          typeStats[itemType].keys.push(key);
        });
        
        // 复制存储信息并添加类型统计
        var summary = {
          info: storageInfo,
          typeStats: typeStats,
          timestamp: Date.now()
        };
        
        resolve(summary);
      }).catch(function(error) {
        console.error('获取存储键失败:', error);
        resolve({
          info: storageInfo,
          typeStats: {},
          timestamp: Date.now(),
          error: error
        });
      });
    });
  });
};

/**
 * 开始清理定时器
 */
StorageManager.prototype.startCleanupTimer = function() {
  var self = this;
  
  // 清除现有定时器
  if (this.cleanupTimer) {
    clearInterval(this.cleanupTimer);
  }
  
  // 设置新定时器
  this.cleanupTimer = setInterval(function() {
    self.checkAndCleanup();
  }, this.config.cleanUpInterval);
  
  // 立即检查一次
  this.checkAndCleanup();
};

/**
 * 停止清理定时器
 */
StorageManager.prototype.stopCleanupTimer = function() {
  if (this.cleanupTimer) {
    clearInterval(this.cleanupTimer);
    this.cleanupTimer = null;
  }
};

/**
 * 检查并执行清理
 */
StorageManager.prototype.checkAndCleanup = function() {
  var self = this;
  
  this.getStorageInfo().then(function(info) {
    // 如果使用率超过自动清理阈值，执行清理
    if (info.percentUsed >= self.config.autoClearThreshold * 100) {
      self.cleanupStorage().then(function(freedSpace) {
        if (freedSpace > 0) {
          // 更新存储信息
          self.updateStorageInfo();
          
          // 触发清理完成事件
          var eventBus = getEventBus();
          if (eventBus) {
            eventBus.emit('storage:storageCleanup', {
              freedSpace: freedSpace,
              timestamp: Date.now()
            });
          }
        }
      });
    }
  });
};

/**
 * 更新存储信息
 */
StorageManager.prototype.updateStorageInfo = function() {
  var self = this;
  
  this.getStorageInfo().then(function(info) {
    self.storageInfo = info;
    
    // 触发存储信息更新事件
    var eventBus = getEventBus();
    if (eventBus) {
      eventBus.emit('storage:infoUpdated', info);
      
      // 如果状态为警告或严重，触发相应事件
      if (info.status === StorageStatus.WARNING) {
        eventBus.emit('storage:spaceWarning', info);
      } else if (info.status === StorageStatus.CRITICAL) {
        eventBus.emit('storage:spaceCritical', info);
      }
    }
  });
};

/**
 * 执行存储空间清理
 * @returns {Promise<number>} 释放的空间大小
 */
StorageManager.prototype.cleanupStorage = function() {
  var self = this;
  
  return new Promise(function(resolve) {
    // 按优先级获取可清理的键
    self.getCleanableItems().then(function(cleanableItems) {
      if (!cleanableItems || cleanableItems.length === 0) {
        resolve(0);
        return;
      }
      
      // 执行清理
      var cleanPromises = [];
      var cleanedItems = [];
      
      cleanableItems.forEach(function(item) {
        cleanPromises.push(
          getStorage().remove(item.key).then(function() {
            cleanedItems.push(item);
            return item.size;
          }).catch(function() {
            return 0;
          })
        );
      });
      
      Promise.all(cleanPromises).then(function(results) {
        // 计算释放的总空间
        var totalFreed = results.reduce(function(sum, size) {
          return sum + size;
        }, 0);
        
        // 记录清理日志
        self.logCleanupAction(cleanedItems, totalFreed).then(function() {
          resolve(totalFreed);
        });
      }).catch(function(error) {
        console.error('清理存储空间失败:', error);
        resolve(0);
      });
    });
  });
};

/**
 * 获取可清理的存储项
 * @returns {Promise<Array>} 可清理的存储项
 */
StorageManager.prototype.getCleanableItems = function() {
  var self = this;
  
  return new Promise(function(resolve) {
    // 获取所有存储项
    getStorage().keys().then(function(keys) {
      var loadPromises = [];
      var storageItems = [];
      
      // 加载每个键的数据
      keys.forEach(function(key) {
        // 跳过必须保留的键
        if (self.isPreservedKey(key)) {
          return;
        }
        
        loadPromises.push(
          getStorage().get(key).then(function(data) {
            return {
              key: key,
              data: data,
              type: self.getItemType(key),
              size: JSON.stringify(data).length
            };
          }).catch(function() {
            return null;
          })
        );
      });
      
      Promise.all(loadPromises).then(function(items) {
        // 过滤无效项
        var validItems = items.filter(function(item) {
          return item !== null;
        });
        
        // 按清理优先级排序
        validItems.sort(function(a, b) {
          var typeA = a.type;
          var typeB = b.type;
          
          // 首先按照类型优先级排序
          if (typeA === StorageItemType.TEMP && typeB !== StorageItemType.TEMP) {
            return -1;
          }
          if (typeA === StorageItemType.CACHE && typeB !== StorageItemType.TEMP && typeB !== StorageItemType.CACHE) {
            return -1;
          }
          if (typeA !== typeB) {
            return 0;
          }
          
          // 同类型按大小降序排序
          return b.size - a.size;
        });
        
        resolve(validItems);
      }).catch(function(error) {
        console.error('获取可清理项失败:', error);
        resolve([]);
      });
    }).catch(function(error) {
      console.error('获取存储键失败:', error);
      resolve([]);
    });
  });
};

/**
 * 确定存储项的类型
 * @param {string} key 存储键
 * @returns {string} 存储项类型
 */
StorageManager.prototype.getItemType = function(key) {
  // 确保StorageItemType已加载
  StorageItemType = getStorageUtils().StorageItemType;
  
  if (key.indexOf('temp_') === 0 || key.indexOf('tmp_') === 0) {
    return StorageItemType.TEMP;
  }
  
  if (key.indexOf('cache_') === 0 || key.indexOf('_cache') !== -1) {
    return StorageItemType.CACHE;
  }
  
  if (key.indexOf('user_') === 0 || key.indexOf('profile_') === 0) {
    return StorageItemType.USER;
  }
  
  if (key.indexOf('sync_') === 0 || key.indexOf('_sync') !== -1 || key.indexOf('_queue') !== -1) {
    return StorageItemType.SYNC;
  }
  
  if (key.indexOf('sys_') === 0 || this.isPreservedKey(key)) {
    return StorageItemType.SYSTEM;
  }
  
  return StorageItemType.OTHER;
};

/**
 * 检查是否是保留键
 * @param {string} key 存储键
 * @returns {boolean} 是否保留
 */
StorageManager.prototype.isPreservedKey = function(key) {
  for (var i = 0; i < this.config.preserveKeys.length; i++) {
    var preserveKey = this.config.preserveKeys[i];
    if (key === preserveKey || key.indexOf(preserveKey + '_') === 0) {
      return true;
    }
  }
  return false;
};

/**
 * 记录清理日志
 * @param {Array} cleanedItems 被清理的项目
 * @param {number} freedSpace 释放的空间
 */
StorageManager.prototype.logCleanupAction = function(cleanedItems, freedSpace) {
  var timestamp = Date.now();
  var logKey = 'log_storage_cleanup_' + timestamp;
  
  var logItems = [];
  for (var i = 0; i < cleanedItems.length; i++) {
    var item = cleanedItems[i];
    logItems.push({
      key: item.key,
      size: item.size,
      type: item.type
    });
  }
  
  var log = {
    timestamp: timestamp,
    freedSpace: freedSpace,
    itemsCount: cleanedItems.length,
    items: logItems
  };
  
  return getStorage().set(logKey, log);
};

// 单例实例
var storageManagerInstance = null;

/**
 * 获取StorageManager实例(单例模式)
 * @param {Object} config 配置
 * @returns {StorageManager} 实例
 */
function getStorageManagerInstance(config) {
  if (!storageManagerInstance) {
    storageManagerInstance = new StorageManager(config);
  } else if (config) {
    console.warn('StorageManager已初始化，无法更改配置');
  }
  return storageManagerInstance;
}

// 导出
module.exports = {
  StorageManager: StorageManager,
  StorageStatus: StorageStatus,
  getStorageManagerInstance: getStorageManagerInstance
}; 