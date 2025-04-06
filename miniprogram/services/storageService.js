/**
 * 存储服务模块
 * 提供统一的存储服务接口，整合本地存储与云端存储
 * 遵循ES5标准，确保在微信小程序环境兼容
 */

// 避免循环依赖 - 使用延迟加载方式
var _eventBus = null;
var _storageUtils = null;
var _storageManager = null;
var _offlineSync = null;

// 获取依赖的辅助函数
function getEventBus() {
  if (!_eventBus) {
    _eventBus = require('../utils/eventBus');
  }
  return _eventBus;
}

function getStorageUtils() {
  if (!_storageUtils) {
    _storageUtils = require('../utils/storageUtils');
  }
  return _storageUtils;
}

function getStorageManager() {
  if (!_storageManager) {
    _storageManager = require('../utils/storageManager').getStorageManagerInstance();
  }
  return _storageManager;
}

function getOfflineSync() {
  if (!_offlineSync) {
    _offlineSync = require('../utils/offlineStorageSync').getOfflineSyncInstance();
  }
  return _offlineSync;
}

// 存储类型
var StorageType = {
  LOCAL: 'local',  // 纯本地存储
  CLOUD: 'cloud',  // 云端存储
  MIXED: 'mixed'   // 混合存储（本地+云端）
};

// 数据集合类型
var CollectionType = {
  USER: 'user',        // 用户数据
  WORK: 'work',        // 工作数据
  SETTINGS: 'settings',// 设置
  MEDIA: 'media',      // 媒体
  SYSTEM: 'system',    // 系统
  TEMP: 'temp'         // 临时
};

/**
 * 初始化存储服务
 * @param {Object} container 服务容器
 * @return {Object} 存储服务实例
 */
function init(container) {
  var instance = new StorageService();
  instance.container = container;
  return instance;
}

/**
 * 存储服务
 */
function StorageService() {
  this.isInitialized = false;
  this.isOnline = true;
  this.currentUser = null;
  this.collections = {};
  
  // 初始化
  this.init();
}

/**
 * 初始化存储服务
 */
StorageService.prototype.init = function() {
  var self = this;
  
  // 监听网络状态变化
  this.listenToNetworkChanges();
  
  // 监听同步事件
  this.listenToSyncEvents();
  
  // 监听存储清理事件
  this.listenToStorageCleanupEvents();
  
  // 初始化网络状态
  this.checkNetworkStatus();
  
  self.isInitialized = true;
  
  // 触发初始化完成事件
  getEventBus().emit('storage:initialized', { timestamp: Date.now() });
};

/**
 * 检查网络状态
 */
StorageService.prototype.checkNetworkStatus = function() {
  var self = this;
  
  wx.getNetworkType({
    success: function(res) {
      self.isOnline = res.networkType !== 'none';
    }
  });
};

/**
 * 初始化数据集合
 */
StorageService.prototype.initCollections = function() {
  // 定义默认集合
  this.collections = {
    user: {
      type: CollectionType.USER,
      storageType: StorageType.MIXED, // 需要同步
      syncEnabled: true,
      encryption: true // 加密存储
    },
    work: {
      type: CollectionType.WORK,
      storageType: StorageType.MIXED, // 需要同步
      syncEnabled: true,
      encryption: true
    },
    settings: {
      type: CollectionType.SETTINGS,
      storageType: StorageType.LOCAL, // 本地
      syncEnabled: false,
      encryption: false
    },
    media: {
      type: CollectionType.MEDIA,
      storageType: StorageType.MIXED, // 需要同步
      syncEnabled: true,
      encryption: false
    },
    system: {
      type: CollectionType.SYSTEM,
      storageType: StorageType.LOCAL, // 本地
      syncEnabled: false,
      encryption: false
    },
    temp: {
      type: CollectionType.TEMP,
      storageType: StorageType.LOCAL, // 本地
      syncEnabled: false,
      encryption: false
    }
  };
};

/**
 * 监听网络状态变化
 */
StorageService.prototype.listenToNetworkChanges = function() {
  var self = this;
  
  wx.onNetworkStatusChange(function(res) {
    var isConnected = res.isConnected;
    var networkType = res.networkType;
    
    var previous = self.isOnline;
    self.isOnline = isConnected;
    
    // 触发网络状态变化事件
    getEventBus().emit('storage:networkChanged', {
      isConnected: isConnected,
      networkType: networkType,
      previousState: previous
    });
    
    // 如果网络恢复，尝试同步
    if (!previous && isConnected) {
      self.syncData();
    }
  });
};

/**
 * 监听同步事件
 */
StorageService.prototype.listenToSyncEvents = function() {
  var self = this;
  
  // 同步完成事件
  getEventBus().on('offlineSync:syncCompleted', function(data) {
    getEventBus().emit('storage:syncCompleted', data);
    
    // 更新存储使用信息
    self.updateStorageUsageInfo();
  });
  
  // 同步错误事件
  getEventBus().on('offlineSync:syncError', function(data) {
    getEventBus().emit('storage:syncError', data);
  });
};

/**
 * 监听存储清理事件
 */
StorageService.prototype.listenToStorageCleanupEvents = function() {
  var self = this;
  
  // 存储自动清理事件
  getEventBus().on('storage:storageCleanup', function(data) {
    // 更新存储使用信息
    self.updateStorageUsageInfo();
  });
};

/**
 * 设置当前用户
 * @param {Object} user 用户信息
 */
StorageService.prototype.setCurrentUser = function(user) {
  if (!user || !user.id) {
    console.error('设置当前用户失败: 无效的用户信息');
    return;
  }
  
  this.currentUser = user;
  
  // 存储用户信息
  getStorageUtils().dataManager.saveUser('current_user', user);
  
  // 触发用户变更事件
  getEventBus().emit('storage:userChanged', { user: user });
};

/**
 * 获取当前用户
 * @returns {Promise<Object>} 用户信息
 */
StorageService.prototype.getCurrentUser = function() {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    if (self.currentUser) {
      resolve(self.currentUser);
      return;
    }
    
    getStorageUtils().dataManager.getUser('current_user').then(function(user) {
      self.currentUser = user;
      resolve(user);
    }).catch(function() {
      resolve(null);
    });
  });
};

/**
 * 保存数据
 * @param {string} collection 集合名称
 * @param {string} key 键名
 * @param {any} data 数据
 * @param {Object} options 选项
 * @returns {Promise<boolean>} 操作结果
 */
StorageService.prototype.saveData = function(collection, key, data, options) {
  var self = this;
  options = options || {};
  
  return new Promise(function(resolve, reject) {
    if (!self.isInitialized) {
      reject(new Error('存储服务尚未初始化'));
      return;
    }
    
    // 验证集合
    var collectionConfig = self.collections[collection];
    if (!collectionConfig) {
      reject(new Error('未知的集合: ' + collection));
      return;
    }
    
    // 构建完整键名
    var fullKey = self.buildKey(collection, key);
    
    // 准备元数据
    var metadata = {
      collection: collection,
      key: key,
      updatedAt: Date.now(),
      userId: self.currentUser ? self.currentUser.id : null,
      clientId: options.clientId || self.getClientId()
    };
    
    // 包装数据
    var wrappedData = {
      data: data,
      metadata: metadata
    };
    
    // 根据存储类型确定存储策略
    switch (collectionConfig.storageType) {
      case StorageType.LOCAL:
        // 纯本地存储
        self.saveToLocalStorage(collection, fullKey, wrappedData, options).then(function() {
          resolve(true);
        }).catch(reject);
        break;
        
      case StorageType.CLOUD:
        // 纯云端存储
        if (self.isOnline) {
          self.saveToCloudStorage(collection, fullKey, wrappedData, options).then(function() {
            resolve(true);
          }).catch(reject);
        } else {
          // 离线时添加到同步队列
          self.addToSyncQueue(collection, 'update', { key: fullKey, data: wrappedData }, options).then(function() {
            resolve(true);
          }).catch(reject);
        }
        break;
        
      case StorageType.MIXED:
      default:
        // 混合存储: 本地+云端
        self.saveToLocalStorage(collection, fullKey, wrappedData, options).then(function() {
          if (self.isOnline && collectionConfig.syncEnabled) {
            // 在线时也保存到云端
            self.saveToCloudStorage(collection, fullKey, wrappedData, options).catch(function(error) {
              console.warn('云端存储保存失败，将添加到同步队列:', error);
              return self.addToSyncQueue(collection, 'update', { key: fullKey, data: wrappedData }, options);
            }).finally(function() {
              resolve(true);
            });
          } else if (collectionConfig.syncEnabled) {
            // 离线时添加到同步队列
            self.addToSyncQueue(collection, 'update', { key: fullKey, data: wrappedData }, options).finally(function() {
              resolve(true);
            });
          } else {
            resolve(true);
          }
        }).catch(reject);
        break;
    }
  });
};

/**
 * 获取数据
 * @param {string} collection 集合名称
 * @param {string} key 键名
 * @param {any} defaultValue 默认值
 * @param {Object} options 选项
 * @returns {Promise<any>} 数据
 */
StorageService.prototype.getData = function(collection, key, defaultValue, options) {
  var self = this;
  options = options || {};
  
  return new Promise(function(resolve, reject) {
    if (!self.isInitialized) {
      reject(new Error('存储服务尚未初始化'));
      return;
    }
    
    // 验证集合
    var collectionConfig = self.collections[collection];
    if (!collectionConfig) {
      reject(new Error('未知的集合: ' + collection));
      return;
    }
    
    // 构建完整键名
    var fullKey = self.buildKey(collection, key);
    
    // 根据存储类型确定读取策略
    switch (collectionConfig.storageType) {
      case StorageType.LOCAL:
        // 纯本地存储
        self.getFromLocalStorage(collection, fullKey, defaultValue).then(function(result) {
          resolve(result ? result.data : defaultValue);
        }).catch(function() {
          resolve(defaultValue);
        });
        break;
        
      case StorageType.CLOUD:
        // 纯云端存储
        if (self.isOnline) {
          self.getFromCloudStorage(collection, fullKey).then(function(result) {
            resolve(result ? result.data : defaultValue);
          }).catch(function() {
            resolve(defaultValue);
          });
        } else {
          // 离线时尝试从本地缓存获取
          self.getFromLocalStorage(collection, fullKey, defaultValue).then(function(result) {
            resolve(result ? result.data : defaultValue);
          }).catch(function() {
            resolve(defaultValue);
          });
        }
        break;
        
      case StorageType.MIXED:
      default:
        // 混合存储: 优先本地，如果没有且在线则从云端获取
        self.getFromLocalStorage(collection, fullKey, null).then(function(result) {
          if (result) {
            resolve(result.data);
          } else if (self.isOnline && collectionConfig.syncEnabled) {
            // 从云端获取
            self.getFromCloudStorage(collection, fullKey).then(function(cloudResult) {
              if (cloudResult) {
                // 同时更新本地存储
                self.saveToLocalStorage(collection, fullKey, cloudResult, options);
                resolve(cloudResult.data);
              } else {
                resolve(defaultValue);
              }
            }).catch(function() {
              resolve(defaultValue);
            });
          } else {
            resolve(defaultValue);
          }
        }).catch(function() {
          resolve(defaultValue);
        });
        break;
    }
  });
};

/**
 * 删除数据
 * @param {string} collection 集合名称
 * @param {string} key 键名
 * @param {Object} options 选项
 * @returns {Promise<boolean>} 操作结果
 */
StorageService.prototype.removeData = function(collection, key, options) {
  var self = this;
  options = options || {};
  
  return new Promise(function(resolve, reject) {
    if (!self.isInitialized) {
      reject(new Error('存储服务尚未初始化'));
      return;
    }
    
    // 验证集合
    var collectionConfig = self.collections[collection];
    if (!collectionConfig) {
      reject(new Error('未知的集合: ' + collection));
      return;
    }
    
    // 构建完整键名
    var fullKey = self.buildKey(collection, key);
    
    // 根据存储类型确定删除策略
    switch (collectionConfig.storageType) {
      case StorageType.LOCAL:
        // 纯本地存储
        self.removeFromLocalStorage(collection, fullKey).then(function() {
          resolve(true);
        }).catch(reject);
        break;
        
      case StorageType.CLOUD:
        // 纯云端存储
        if (self.isOnline) {
          self.removeFromCloudStorage(collection, fullKey).then(function() {
            resolve(true);
          }).catch(reject);
        } else {
          // 离线时添加到同步队列
          self.addToSyncQueue(collection, 'delete', { key: fullKey }, options).then(function() {
            resolve(true);
          }).catch(reject);
        }
        break;
        
      case StorageType.MIXED:
      default:
        // 混合存储: 本地+云端
        self.removeFromLocalStorage(collection, fullKey).then(function() {
          if (self.isOnline && collectionConfig.syncEnabled) {
            // 在线时也从云端删除
            self.removeFromCloudStorage(collection, fullKey).catch(function(error) {
              console.warn('云端存储删除失败，将添加到同步队列:', error);
              return self.addToSyncQueue(collection, 'delete', { key: fullKey }, options);
            }).finally(function() {
              resolve(true);
            });
          } else if (collectionConfig.syncEnabled) {
            // 离线时添加到同步队列
            self.addToSyncQueue(collection, 'delete', { key: fullKey }, options).finally(function() {
              resolve(true);
            });
          } else {
            resolve(true);
          }
        }).catch(reject);
        break;
    }
  });
};

/**
 * 清除集合数据
 * @param {string} collection 集合名称
 * @param {Object} options 选项
 * @returns {Promise<boolean>} 操作结果
 */
StorageService.prototype.clearCollection = function(collection, options) {
  var self = this;
  options = options || {};
  
  return new Promise(function(resolve, reject) {
    if (!self.isInitialized) {
      reject(new Error('存储服务尚未初始化'));
      return;
    }
    
    // 验证集合
    var collectionConfig = self.collections[collection];
    if (!collectionConfig) {
      reject(new Error('未知的集合: ' + collection));
      return;
    }
    
    // 根据集合类型确定前缀
    var prefix = self.getCollectionPrefix(collection);
    
    // 从本地存储中删除
    getStorageUtils().dataManager.removeByPrefix(prefix).then(function() {
      // 如果是云端存储且在线，也从云端删除
      if ((collectionConfig.storageType === StorageType.CLOUD || 
          collectionConfig.storageType === StorageType.MIXED) && 
          self.isOnline && 
          collectionConfig.syncEnabled) {
        
        self.clearCloudCollection(collection).catch(function(error) {
          console.warn('清除云端集合失败:', error);
        }).finally(function() {
          resolve(true);
        });
      } else {
        resolve(true);
      }
    }).catch(reject);
  });
};

/**
 * 保存到本地存储
 * @param {string} collection 集合名称
 * @param {string} key 键名
 * @param {any} data 数据
 * @param {Object} options 选项
 * @returns {Promise<boolean>} 操作结果
 */
StorageService.prototype.saveToLocalStorage = function(collection, key, data, options) {
  var self = this;
  options = options || {};
  
  return new Promise(function(resolve, reject) {
    // 根据集合类型选择存储方法
    switch (collection) {
      case 'user':
        getStorageUtils().dataManager.saveUser(key, data, options).then(resolve).catch(reject);
        break;
      case 'work':
        getStorageUtils().dataManager.saveWork(key, data, options).then(resolve).catch(reject);
        break;
      case 'media':
        getStorageUtils().dataManager.saveMedia(key, data, options).then(resolve).catch(reject);
        break;
      case 'settings':
        getStorageUtils().dataManager.savePreference(key, data, options).then(resolve).catch(reject);
        break;
      case 'system':
        getStorageUtils().dataManager.saveSystem(key, data, options).then(resolve).catch(reject);
        break;
      case 'temp':
        getStorageUtils().dataManager.saveTemp(key, data, options).then(resolve).catch(reject);
        break;
      default:
        // 默认使用普通存储
        getStorageUtils().dataManager.saveCore(key, data, options).then(resolve).catch(reject);
        break;
    }
    
    // 触发数据变更事件
    getEventBus().emit('storage:dataChanged', {
      type: 'save',
      collection: collection,
      key: key,
      timestamp: Date.now(),
      userId: self.currentUser ? self.currentUser.id : null
    });
  });
};

/**
 * 从本地存储读取
 * @param {string} collection 集合名称
 * @param {string} key 键名
 * @param {any} defaultValue 默认值
 * @returns {Promise<any>} 数据
 */
StorageService.prototype.getFromLocalStorage = function(collection, key, defaultValue) {
  // 根据集合类型选择读取方法
  switch (collection) {
    case 'user':
      return getStorageUtils().dataManager.getUser(key, defaultValue);
    case 'work':
      return getStorageUtils().dataManager.getWork(key, defaultValue);
    case 'media':
      return getStorageUtils().dataManager.getMedia(key, defaultValue);
    case 'settings':
      return getStorageUtils().dataManager.getPreference(key, defaultValue);
    case 'system':
      return getStorageUtils().dataManager.getSystem(key, defaultValue);
    case 'temp':
      return getStorageUtils().dataManager.getTemp(key, defaultValue);
    default:
      // 默认使用普通存储
      return getStorageUtils().dataManager.getCore(key, defaultValue);
  }
};

/**
 * 从本地存储中删除
 * @param {string} collection 集合名称
 * @param {string} key 键名
 * @returns {Promise<boolean>} 操作结果
 */
StorageService.prototype.removeFromLocalStorage = function(collection, key) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    getStorageUtils().storage.remove(key).then(function(result) {
      // 触发数据变更事件
      getEventBus().emit('storage:dataChanged', {
        type: 'remove',
        collection: collection,
        key: key,
        timestamp: Date.now(),
        userId: self.currentUser ? self.currentUser.id : null
      });
      
      resolve(result);
    }).catch(reject);
  });
};

/**
 * 保存到云端存储
 * @param {string} collection 集合名称
 * @param {string} key 键名
 * @param {any} data 数据
 * @param {Object} options 选项
 * @returns {Promise<boolean>} 操作结果
 */
StorageService.prototype.saveToCloudStorage = function(collection, key, data, options) {
  // 云端存储待实现
  // 目前返回成功，实际项目中需要根据云服务实现相应逻辑
  return Promise.resolve(true);
};

/**
 * 从云端存储读取
 * @param {string} collection 集合名称
 * @param {string} key 键名
 * @returns {Promise<any>} 数据
 */
StorageService.prototype.getFromCloudStorage = function(collection, key) {
  // 云端存储待实现
  // 目前返回null，实际项目中需要根据云服务实现相应逻辑
  return Promise.resolve(null);
};

/**
 * 从云端存储中删除
 * @param {string} collection 集合名称
 * @param {string} key 键名
 * @returns {Promise<boolean>} 操作结果
 */
StorageService.prototype.removeFromCloudStorage = function(collection, key) {
  // 云端存储待实现
  // 目前返回成功，实际项目中需要根据云服务实现相应逻辑
  return Promise.resolve(true);
};

/**
 * 清除云端集合
 * @param {string} collection 集合名称
 * @returns {Promise<boolean>} 操作结果
 */
StorageService.prototype.clearCloudCollection = function(collection) {
  // 云端存储待实现
  // 目前返回成功，实际项目中需要根据云服务实现相应逻辑
  return Promise.resolve(true);
};

/**
 * 添加到同步队列
 * @param {string} collection 集合名称
 * @param {string} operationType 操作类型
 * @param {Object} data 数据
 * @param {Object} options 选项
 * @returns {Promise<string>} 操作ID
 */
StorageService.prototype.addToSyncQueue = function(collection, operationType, data, options) {
  options = options || {};
  var syncPriority = options.priority || getOfflineSync().SyncPriority.NORMAL;
  
  return getOfflineSync().addToSyncQueue(collection, operationType, data, {
    priority: syncPriority,
    clientId: options.clientId || this.getClientId()
  });
};

/**
 * 同步数据
 * @returns {Promise<boolean>} 同步结果
 */
StorageService.prototype.syncData = function() {
  return getOfflineSync().startSync();
};

/**
 * 获取存储使用信息
 * @returns {Promise<Object>} 存储使用信息
 */
StorageService.prototype.getStorageUsageInfo = function() {
  return getStorageManager().getStorageSummary();
};

/**
 * 更新存储使用信息
 */
StorageService.prototype.updateStorageUsageInfo = function() {
  var self = this;
  
  getStorageManager().getStorageSummary().then(function(summary) {
    getEventBus().emit('storage:usageUpdated', summary);
    
    // 检查是否接近限制
    if (summary.status === getStorageManager().StorageStatus.WARNING) {
      getEventBus().emit('storage:spaceWarning', summary);
    } else if (summary.status === getStorageManager().StorageStatus.CRITICAL) {
      getEventBus().emit('storage:spaceCritical', summary);
    }
  });
};

/**
 * 构建完整键名
 * @param {string} collection 集合名称
 * @param {string} key 键名
 * @returns {string} 完整键名
 */
StorageService.prototype.buildKey = function(collection, key) {
  var prefix = this.getCollectionPrefix(collection);
  return prefix + key;
};

/**
 * 获取集合前缀
 * @param {string} collection 集合名称
 * @returns {string} 前缀
 */
StorageService.prototype.getCollectionPrefix = function(collection) {
  switch (collection) {
    case 'user':
      return 'user_';
    case 'work':
      return 'work_';
    case 'settings':
      return 'pref_';
    case 'media':
      return 'media_';
    case 'system':
      return 'sys_';
    case 'temp':
      return 'temp_';
    case 'traces':
      return 'trace_';
    default:
      return 'core_';
  }
};

/**
 * 获取或生成客户端ID
 * @returns {string} 客户端ID
 */
StorageService.prototype.getClientId = function() {
  var clientId = wx.getStorageSync('client_id');
  if (!clientId) {
    clientId = 'client_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    wx.setStorageSync('client_id', clientId);
  }
  return clientId;
};

/**
 * 注册集合
 * @param {string} collection 集合名称
 * @param {Object} config 配置
 */
StorageService.prototype.registerCollection = function(collection, config) {
  if (!collection || typeof collection !== 'string') {
    console.error('注册集合失败: 无效的集合名称');
    return;
  }
  
  // 合并配置
  this.collections[collection] = Object.assign({
    type: CollectionType.USER,
    storageType: StorageType.MIXED,
    syncEnabled: true,
    encryption: false
  }, config || {});
};

/**
 * 注册数据同步处理器
 * @param {string} collection 集合名称
 * @param {Object} handler 处理器
 */
StorageService.prototype.registerSyncHandler = function(collection, handler) {
  getOfflineSync().registerHandler(collection, handler);
};

/**
 * 检查是否可以清理指定集合
 * @param {string} collection 集合名称
 * @returns {boolean} 是否可清理
 */
StorageService.prototype.canCleanCollection = function(collection) {
  var config = this.collections[collection];
  if (!config) return false;
  
  return config.storageType === StorageType.LOCAL || !config.syncEnabled;
};

/**
 * 创建单例实例
 */
var storageServiceInstance = null;

function getStorageServiceInstance() {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}

// 导出StorageService模块
module.exports = {
  StorageType: StorageType,
  CollectionType: CollectionType,
  StorageService: StorageService,
  init: init,
  getStorageServiceInstance: getStorageServiceInstance
}; 