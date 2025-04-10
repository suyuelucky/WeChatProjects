/**
 * 安全存储管理器
 * 集成加密管理与数据存储，提供统一的安全存储接口
 * 
 * 创建时间: 2025-04-09 12:23:45 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 服务类
 */

// 导入依赖项
var EncryptionManager = require('../security/EncryptionManager');

/**
 * 安全存储管理器
 * 负责管理数据的安全存储、检索、同步和清理
 */
var StorageManager = {
  // 默认配置
  config: {
    // 存储前缀，用于区分不同应用的存储
    prefix: 'app_',
    
    // 是否默认加密存储数据
    encryptByDefault: true,
    
    // 存储分级（0: 临时, 1: 标准, 2: 敏感, 3: 高敏感）
    securityLevels: {
      TEMPORARY: 0, // 临时数据，可以不加密，可能随时被清理
      STANDARD: 1,   // 标准数据，基本加密
      SENSITIVE: 2,  // 敏感数据，强加密，带验证
      HIGHLY_SENSITIVE: 3 // 高敏感数据，最强加密，完整性检查，访问控制
    },
    
    // 默认安全级别
    defaultSecurityLevel: 1,
    
    // 自动同步设置
    sync: {
      enabled: false,
      interval: 5 * 60 * 1000, // 5分钟
      strategy: 'onchange'  // 'onchange', 'interval', 'manual'
    },
    
    // 缓存设置
    cache: {
      enabled: true,
      maxItems: 100,
      expirationTime: 10 * 60 * 1000 // 10分钟
    }
  },
  
  // 内部状态
  _state: {
    initialized: false,
    cache: {},
    syncQueue: [],
    lastSyncTime: 0
  },
  
  /**
   * 初始化存储管理器
   * @param {Object} options 配置选项
   * @returns {Boolean} 初始化是否成功
   */
  init: function(options) {
    try {
      // 合并配置
      if (options) {
        for (var key in options) {
          if (options.hasOwnProperty(key)) {
            if (typeof options[key] === 'object' && this.config[key] !== null && typeof this.config[key] === 'object') {
              // 深度合并对象
              for (var subKey in options[key]) {
                if (options[key].hasOwnProperty(subKey)) {
                  this.config[key][subKey] = options[key][subKey];
                }
              }
            } else {
              this.config[key] = options[key];
            }
          }
        }
      }
      
      // 确保加密管理器已初始化
      if (!EncryptionManager._state || !EncryptionManager._state.initialized) {
        EncryptionManager.init();
      }
      
      // 如果启用了缓存，初始化缓存
      if (this.config.cache.enabled) {
        this._initCache();
      }
      
      // 如果启用了自动同步，设置同步定时器
      if (this.config.sync.enabled && this.config.sync.strategy === 'interval') {
        this._setupSyncInterval();
      }
      
      this._state.initialized = true;
      return true;
    } catch (error) {
      console.error('StorageManager初始化失败:', error);
      return false;
    }
  },
  
  /**
   * 初始化缓存
   * @private
   */
  _initCache: function() {
    this._state.cache = {};
    
    // 尝试从存储中加载最常用的项到缓存
    try {
      var cacheMetadata = wx.getStorageSync(this.config.prefix + '_cache_metadata');
      if (cacheMetadata && cacheMetadata.frequentKeys) {
        for (var i = 0; i < Math.min(cacheMetadata.frequentKeys.length, 10); i++) {
          var key = cacheMetadata.frequentKeys[i];
          this._loadToCache(key);
        }
      }
    } catch (error) {
      console.warn('初始化缓存失败，将使用空缓存:', error);
    }
  },
  
  /**
   * 将指定键的数据加载到缓存
   * @private
   * @param {String} key 存储键
   */
  _loadToCache: function(key) {
    try {
      var fullKey = this._getFullStorageKey(key);
      var rawData = wx.getStorageSync(fullKey);
      
      if (rawData) {
        this._state.cache[key] = {
          data: rawData,
          timestamp: Date.now(),
          accessCount: 0
        };
      }
    } catch (error) {
      console.warn('加载数据到缓存失败:', key, error);
    }
  },
  
  /**
   * 设置自动同步间隔
   * @private
   */
  _setupSyncInterval: function() {
    var self = this;
    
    // 清除可能存在的旧定时器
    if (this._state.syncIntervalId) {
      clearInterval(this._state.syncIntervalId);
    }
    
    // 设置新的同步定时器
    this._state.syncIntervalId = setInterval(function() {
      self.syncData();
    }, this.config.sync.interval);
  },
  
  /**
   * 获取完整存储键名
   * @private
   * @param {String} key 原始键名
   * @param {Object} options 选项
   * @returns {String} 完整存储键名
   */
  _getFullStorageKey: function(key, options) {
    options = options || {};
    
    // 检查键是否有效
    if (!key || typeof key !== 'string') {
      throw new Error('无效的存储键名');
    }
    
    // 构建完整键名
    var prefix = options.prefix || this.config.prefix;
    var securityLevel = options.securityLevel !== undefined ? 
                        options.securityLevel : 
                        this.config.defaultSecurityLevel;
    
    return prefix + 's' + securityLevel + '_' + key;
  },
  
  /**
   * 将数据安全存储到指定键
   * @param {String} key 存储键
   * @param {*} data 要存储的数据
   * @param {Object} options 存储选项
   * @returns {Boolean} 存储是否成功
   */
  secureSet: function(key, data, options) {
    if (!this._state.initialized) {
      this.init();
    }
    
    options = options || {};
    
    try {
      // 获取完整存储键
      var fullKey = this._getFullStorageKey(key, options);
      
      // 准备用于存储的数据包装
      var dataPackage = {
        content: data,
        metadata: {
          created: Date.now(),
          updated: Date.now(),
          securityLevel: options.securityLevel || this.config.defaultSecurityLevel,
          type: typeof data,
          schema: options.schema,
          version: options.version || '1.0',
          tags: options.tags || []
        }
      };
      
      // 序列化数据
      var serializedData = JSON.stringify(dataPackage);
      
      // 确定是否需要加密
      var shouldEncrypt = options.encrypt !== undefined ? 
                          options.encrypt : 
                          this.config.encryptByDefault;
      
      // 如果数据敏感度高，强制加密
      var securityLevel = options.securityLevel || this.config.defaultSecurityLevel;
      if (securityLevel >= this.config.securityLevels.SENSITIVE) {
        shouldEncrypt = true;
      }
      
      // 加密数据（如果需要）
      var dataToStore = serializedData;
      if (shouldEncrypt) {
        dataToStore = EncryptionManager.encrypt(serializedData, {
          securityLevel: securityLevel
        });
      }
      
      // 存储数据
      wx.setStorageSync(fullKey, dataToStore);
      
      // 更新缓存（如果启用）
      if (this.config.cache.enabled) {
        this._updateCache(key, dataToStore);
      }
      
      // 添加到同步队列（如果启用同步且策略为onchange）
      if (this.config.sync.enabled && this.config.sync.strategy === 'onchange') {
        this._addToSyncQueue(key, options);
      }
      
      return true;
    } catch (error) {
      console.error('安全存储数据失败:', key, error);
      return false;
    }
  },
  
  /**
   * 更新缓存中的数据
   * @private
   * @param {String} key 存储键
   * @param {*} data 数据
   */
  _updateCache: function(key, data) {
    // 检查缓存大小，如果已满则清理最不常用的项
    if (this.config.cache.enabled) {
      var cacheSize = Object.keys(this._state.cache).length;
      if (cacheSize >= this.config.cache.maxItems) {
        this._cleanCache();
      }
      
      // 更新缓存
      this._state.cache[key] = {
        data: data,
        timestamp: Date.now(),
        accessCount: 0
      };
    }
  },
  
  /**
   * 清理缓存中最不常用的项
   * @private
   */
  _cleanCache: function() {
    var keys = Object.keys(this._state.cache);
    var cacheEntries = [];
    
    // 收集所有缓存条目信息
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var entry = this._state.cache[key];
      cacheEntries.push({
        key: key,
        accessCount: entry.accessCount,
        timestamp: entry.timestamp
      });
    }
    
    // 按使用频率和最后访问时间排序
    cacheEntries.sort(function(a, b) {
      // 首先按访问次数排序
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount;
      }
      // 其次按最后访问时间排序
      return a.timestamp - b.timestamp;
    });
    
    // 移除最不常用的项（删除前25%）
    var removeCount = Math.max(1, Math.floor(keys.length * 0.25));
    for (var j = 0; j < removeCount; j++) {
      delete this._state.cache[cacheEntries[j].key];
    }
  },
  
  /**
   * 添加数据到同步队列
   * @private
   * @param {String} key 存储键
   * @param {Object} options 选项
   */
  _addToSyncQueue: function(key, options) {
    // 检查是否已在队列中
    for (var i = 0; i < this._state.syncQueue.length; i++) {
      if (this._state.syncQueue[i].key === key) {
        // 更新现有项
        this._state.syncQueue[i].timestamp = Date.now();
        this._state.syncQueue[i].options = options;
        return;
      }
    }
    
    // 添加新项到队列
    this._state.syncQueue.push({
      key: key,
      timestamp: Date.now(),
      options: options
    });
  },
  
  /**
   * 安全检索数据
   * @param {String} key 存储键
   * @param {Object} options 检索选项
   * @returns {*} 检索到的数据
   */
  secureGet: function(key, options) {
    if (!this._state.initialized) {
      this.init();
    }
    
    options = options || {};
    
    try {
      // 检查缓存（如果启用）
      if (this.config.cache.enabled && this._state.cache[key]) {
        var cachedItem = this._state.cache[key];
        
        // 如果缓存未过期，直接从缓存中获取数据
        if (Date.now() - cachedItem.timestamp < this.config.cache.expirationTime) {
          // 更新访问计数
          cachedItem.accessCount++;
          
          // 解析并返回数据
          return this._processRetrievedData(cachedItem.data, options);
        }
      }
      
      // 获取完整存储键
      var fullKey = this._getFullStorageKey(key, options);
      
      // 从存储中检索数据
      var rawData = wx.getStorageSync(fullKey);
      
      // 如果没有数据，返回null
      if (!rawData) {
        return null;
      }
      
      // 更新缓存（如果启用）
      if (this.config.cache.enabled) {
        this._updateCache(key, rawData);
        this._state.cache[key].accessCount++;
      }
      
      // 处理检索到的数据
      return this._processRetrievedData(rawData, options);
    } catch (error) {
      console.error('安全检索数据失败:', key, error);
      return null;
    }
  },
  
  /**
   * 处理检索到的数据
   * @private
   * @param {String} rawData 原始数据
   * @param {Object} options 选项
   * @returns {*} 处理后的数据
   */
  _processRetrievedData: function(rawData, options) {
    options = options || {};
    
    try {
      // 检查数据是否已加密
      var isEncrypted = typeof rawData === 'string' && 
                       (rawData.indexOf('{\"iv\":\"') === 0 || 
                        rawData.indexOf('{\"ciphertext\":\"') === 0);
      
      // 解密数据（如果已加密）
      var dataStr = isEncrypted ? 
                    EncryptionManager.decrypt(rawData, {
                      securityLevel: options.securityLevel
                    }) : 
                    rawData;
      
      // 解析数据包
      var dataPackage = JSON.parse(dataStr);
      
      // 提取内容
      var content = dataPackage.content;
      
      // 如果需要验证数据完整性
      if (options.verifyIntegrity && dataPackage.metadata && dataPackage.metadata.hash) {
        var computedHash = EncryptionManager.hashData(JSON.stringify(content));
        if (computedHash !== dataPackage.metadata.hash) {
          throw new Error('数据完整性验证失败');
        }
      }
      
      // 根据选项返回内容或整个数据包
      return options.includeMetadata ? dataPackage : content;
    } catch (error) {
      console.error('处理检索数据失败:', error);
      return null;
    }
  },
  
  /**
   * 删除指定键的数据
   * @param {String} key 存储键
   * @param {Object} options 删除选项
   * @returns {Boolean} 删除是否成功
   */
  remove: function(key, options) {
    if (!this._state.initialized) {
      this.init();
    }
    
    options = options || {};
    
    try {
      // 获取完整存储键
      var fullKey = this._getFullStorageKey(key, options);
      
      // 从存储中删除数据
      wx.removeStorageSync(fullKey);
      
      // 从缓存中删除数据（如果存在）
      if (this.config.cache.enabled && this._state.cache[key]) {
        delete this._state.cache[key];
      }
      
      // 记录删除事件（如果需要）
      if (options.logDeletion) {
        var deletionLog = wx.getStorageSync(this.config.prefix + '_deletion_log') || [];
        deletionLog.push({
          key: key,
          timestamp: Date.now(),
          reason: options.deletionReason || 'user_request'
        });
        wx.setStorageSync(this.config.prefix + '_deletion_log', deletionLog);
      }
      
      return true;
    } catch (error) {
      console.error('删除数据失败:', key, error);
      return false;
    }
  },
  
  /**
   * 清除所有数据或指定前缀的数据
   * @param {Object} options 清除选项
   * @returns {Boolean} 清除是否成功
   */
  clear: function(options) {
    if (!this._state.initialized) {
      this.init();
    }
    
    options = options || {};
    
    try {
      var prefixToMatch = options.prefix || this.config.prefix;
      var securityLevel = options.securityLevel;
      var tagsToMatch = options.tags;
      
      // 如果是清除所有数据（谨慎使用）
      if (options.all === true) {
        // 清除所有存储数据
        wx.clearStorageSync();
        
        // 重置缓存
        if (this.config.cache.enabled) {
          this._state.cache = {};
        }
        
        return true;
      }
      
      // 如果是按条件清除
      // 获取所有存储键
      var keys = wx.getStorageInfoSync().keys;
      var removedCount = 0;
      
      // 遍历所有键，删除匹配条件的数据
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        
        // 检查前缀匹配
        if (prefixToMatch && key.indexOf(prefixToMatch) !== 0) {
          continue;
        }
        
        // 检查安全级别匹配（如果指定）
        if (securityLevel !== undefined) {
          var keySecLevel = this._extractSecurityLevelFromKey(key);
          if (keySecLevel !== securityLevel) {
            continue;
          }
        }
        
        // 如果需要匹配标签，则需要获取并解析数据
        if (tagsToMatch && tagsToMatch.length > 0) {
          try {
            var rawData = wx.getStorageSync(key);
            var data = this._processRetrievedData(rawData, { includeMetadata: true });
            
            // 检查标签匹配
            if (!data || !data.metadata || !data.metadata.tags) {
              continue;
            }
            
            var matchesTags = tagsToMatch.every(function(tag) {
              return data.metadata.tags.indexOf(tag) !== -1;
            });
            
            if (!matchesTags) {
              continue;
            }
          } catch (e) {
            // 如果解析失败，跳过此项
            continue;
          }
        }
        
        // 删除匹配的数据
        wx.removeStorageSync(key);
        removedCount++;
        
        // 从缓存中删除相应的项
        if (this.config.cache.enabled) {
          var cacheKey = this._extractOriginalKeyFromFullKey(key);
          if (cacheKey && this._state.cache[cacheKey]) {
            delete this._state.cache[cacheKey];
          }
        }
      }
      
      // 如果指定了日志记录
      if (options.logClearOperation) {
        var clearLog = wx.getStorageSync(this.config.prefix + '_clear_log') || [];
        clearLog.push({
          timestamp: Date.now(),
          options: {
            prefix: prefixToMatch,
            securityLevel: securityLevel,
            tags: tagsToMatch
          },
          removedCount: removedCount,
          reason: options.clearReason || 'user_request'
        });
        wx.setStorageSync(this.config.prefix + '_clear_log', clearLog);
      }
      
      return true;
    } catch (error) {
      console.error('清除数据失败:', error);
      return false;
    }
  },
  
  /**
   * 从完整存储键中提取安全级别
   * @private
   * @param {String} fullKey 完整存储键
   * @returns {Number} 安全级别或undefined
   */
  _extractSecurityLevelFromKey: function(fullKey) {
    if (!fullKey || typeof fullKey !== 'string') {
      return undefined;
    }
    
    var matches = fullKey.match(/^[^_]+s(\d)_/);
    if (matches && matches.length > 1) {
      return parseInt(matches[1], 10);
    }
    
    return undefined;
  },
  
  /**
   * 从完整存储键中提取原始键名
   * @private
   * @param {String} fullKey 完整存储键
   * @returns {String} 原始键名或null
   */
  _extractOriginalKeyFromFullKey: function(fullKey) {
    if (!fullKey || typeof fullKey !== 'string') {
      return null;
    }
    
    var matches = fullKey.match(/^[^_]+s\d_(.+)$/);
    if (matches && matches.length > 1) {
      return matches[1];
    }
    
    return null;
  },
  
  /**
   * 同步数据到远程服务器
   * @param {Object} options 同步选项
   * @returns {Promise} 同步操作的Promise
   */
  syncData: function(options) {
    var self = this;
    options = options || {};
    
    return new Promise(function(resolve, reject) {
      try {
        // 如果同步未启用，直接返回
        if (!self.config.sync.enabled && !options.force) {
          reject(new Error('同步功能未启用'));
          return;
        }
        
        // 获取同步队列中的项
        var itemsToSync = options.items || self._state.syncQueue;
        if (itemsToSync.length === 0) {
          resolve({ status: 'success', message: '没有需要同步的数据', items: 0 });
          return;
        }
        
        // 准备同步数据
        var syncData = {
          deviceId: options.deviceId || self._getDeviceId(),
          timestamp: Date.now(),
          items: []
        };
        
        // 收集需要同步的数据
        for (var i = 0; i < itemsToSync.length; i++) {
          var syncItem = itemsToSync[i];
          var key = syncItem.key;
          var itemOptions = syncItem.options || {};
          
          // 获取数据
          var data = self.secureGet(key, { includeMetadata: true });
          if (data) {
            syncData.items.push({
              key: key,
              data: data,
              timestamp: syncItem.timestamp || Date.now()
            });
          }
        }
        
        // 如果没有有效数据，直接返回
        if (syncData.items.length === 0) {
          resolve({ status: 'success', message: '没有有效数据需要同步', items: 0 });
          return;
        }
        
        // 执行同步操作（这里需要根据实际情况实现）
        // 模拟同步操作
        setTimeout(function() {
          // 成功后清空同步队列
          self._state.syncQueue = [];
          self._state.lastSyncTime = Date.now();
          
          // 更新同步状态
          wx.setStorageSync(self.config.prefix + '_sync_status', {
            lastSync: self._state.lastSyncTime,
            itemCount: syncData.items.length,
            result: 'success'
          });
          
          resolve({
            status: 'success',
            message: '同步完成',
            items: syncData.items.length,
            timestamp: self._state.lastSyncTime
          });
        }, 1000);
      } catch (error) {
        console.error('同步数据失败:', error);
        reject(error);
      }
    });
  },
  
  /**
   * 获取设备唯一标识
   * @private
   * @returns {String} 设备ID
   */
  _getDeviceId: function() {
    try {
      // 尝试从存储中获取设备ID
      var deviceId = wx.getStorageSync('device_id');
      
      // 如果没有，则生成一个新的并存储
      if (!deviceId) {
        var systemInfo = wx.getSystemInfoSync();
        deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        
        // 添加一些系统信息作为额外标识
        if (systemInfo) {
          deviceId += '_' + (systemInfo.brand || '') + (systemInfo.model || '');
        }
        
        wx.setStorageSync('device_id', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.warn('获取设备ID失败:', error);
      return 'unknown_device_' + Math.random().toString(36).substring(2, 15);
    }
  },
  
  /**
   * 获取存储使用情况
   * @returns {Object} 存储使用信息
   */
  getStorageInfo: function() {
    try {
      var storageInfo = wx.getStorageInfoSync();
      
      // 计算自定义前缀的存储项
      var customItems = 0;
      var customSize = 0;
      var securityLevelCounts = {
        0: 0, 1: 0, 2: 0, 3: 0
      };
      
      for (var i = 0; i < storageInfo.keys.length; i++) {
        var key = storageInfo.keys[i];
        if (key.indexOf(this.config.prefix) === 0) {
          customItems++;
          
          // 尝试获取安全级别
          var secLevel = this._extractSecurityLevelFromKey(key);
          if (secLevel !== undefined && securityLevelCounts[secLevel] !== undefined) {
            securityLevelCounts[secLevel]++;
          }
          
          // 尝试获取大小
          try {
            var itemData = wx.getStorageSync(key);
            customSize += (itemData ? JSON.stringify(itemData).length : 0);
          } catch (e) {
            // 忽略错误
          }
        }
      }
      
      return {
        totalSize: storageInfo.currentSize,
        limitSize: storageInfo.limitSize,
        totalItems: storageInfo.keys.length,
        customItems: customItems,
        customSize: customSize,
        securityLevelCounts: securityLevelCounts,
        cacheItems: this.config.cache.enabled ? Object.keys(this._state.cache).length : 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  },
  
  /**
   * 查询符合条件的存储项
   * @param {Object} query 查询条件
   * @param {Object} options 查询选项
   * @returns {Array} 匹配的存储项
   */
  query: function(query, options) {
    if (!this._state.initialized) {
      this.init();
    }
    
    query = query || {};
    options = options || {};
    
    try {
      var results = [];
      var keys = wx.getStorageInfoSync().keys;
      var prefixToMatch = query.prefix || this.config.prefix;
      
      // 遍历所有键，查找匹配条件的数据
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        
        // 检查前缀匹配
        if (prefixToMatch && key.indexOf(prefixToMatch) !== 0) {
          continue;
        }
        
        // 检查安全级别匹配（如果指定）
        if (query.securityLevel !== undefined) {
          var keySecLevel = this._extractSecurityLevelFromKey(key);
          if (keySecLevel !== query.securityLevel) {
            continue;
          }
        }
        
        // 检查键名匹配（如果指定）
        if (query.keyPattern) {
          var originalKey = this._extractOriginalKeyFromFullKey(key);
          if (!originalKey || !new RegExp(query.keyPattern).test(originalKey)) {
            continue;
          }
        }
        
        // 获取数据内容（如果需要内容匹配）
        var needsContentCheck = query.contentMatch || query.metadataMatch || query.tags;
        if (needsContentCheck) {
          try {
            var rawData = wx.getStorageSync(key);
            var data = this._processRetrievedData(rawData, { includeMetadata: true });
            
            // 如果无法解析数据，跳过
            if (!data) {
              continue;
            }
            
            // 检查标签匹配
            if (query.tags && query.tags.length > 0) {
              if (!data.metadata || !data.metadata.tags) {
                continue;
              }
              
              var matchesTags = query.tags.every(function(tag) {
                return data.metadata.tags.indexOf(tag) !== -1;
              });
              
              if (!matchesTags) {
                continue;
              }
            }
            
            // 检查元数据匹配
            if (query.metadataMatch && data.metadata) {
              var metadataMatches = true;
              
              for (var metaKey in query.metadataMatch) {
                if (query.metadataMatch.hasOwnProperty(metaKey)) {
                  if (data.metadata[metaKey] !== query.metadataMatch[metaKey]) {
                    metadataMatches = false;
                    break;
                  }
                }
              }
              
              if (!metadataMatches) {
                continue;
              }
            }
            
            // 检查内容匹配
            if (query.contentMatch) {
              var contentMatches = true;
              var content = data.content;
              
              // 如果内容不是对象，无法进行属性匹配
              if (typeof content !== 'object' || content === null) {
                continue;
              }
              
              for (var contentKey in query.contentMatch) {
                if (query.contentMatch.hasOwnProperty(contentKey)) {
                  if (content[contentKey] !== query.contentMatch[contentKey]) {
                    contentMatches = false;
                    break;
                  }
                }
              }
              
              if (!contentMatches) {
                continue;
              }
            }
            
            // 如果需要包含内容，添加到结果
            if (options.includeContent) {
              results.push({
                key: this._extractOriginalKeyFromFullKey(key),
                data: options.includeMetadata ? data : data.content,
                securityLevel: keySecLevel
              });
            } else {
              results.push({
                key: this._extractOriginalKeyFromFullKey(key),
                securityLevel: keySecLevel,
                metadata: data.metadata
              });
            }
          } catch (e) {
            // 如果解析失败，跳过此项
            continue;
          }
        } else {
          // 不需要内容匹配，只添加键信息
          results.push({
            key: this._extractOriginalKeyFromFullKey(key),
            securityLevel: keySecLevel
          });
        }
      }
      
      // 如果需要排序
      if (options.sortBy) {
        var sortField = options.sortBy;
        var sortDirection = options.sortDirection === 'desc' ? -1 : 1;
        
        results.sort(function(a, b) {
          // 特殊处理元数据字段
          if (sortField.indexOf('metadata.') === 0) {
            var metaField = sortField.substring(9);
            var aValue = a.metadata && a.metadata[metaField];
            var bValue = b.metadata && b.metadata[metaField];
            
            if (aValue < bValue) return -1 * sortDirection;
            if (aValue > bValue) return 1 * sortDirection;
            return 0;
          }
          
          // 常规字段排序
          if (a[sortField] < b[sortField]) return -1 * sortDirection;
          if (a[sortField] > b[sortField]) return 1 * sortDirection;
          return 0;
        });
      }
      
      // 分页处理
      if (options.limit !== undefined && options.limit > 0) {
        var offset = options.offset || 0;
        results = results.slice(offset, offset + options.limit);
      }
      
      return results;
    } catch (error) {
      console.error('查询存储数据失败:', error);
      return [];
    }
  }
};

module.exports = StorageManager; 