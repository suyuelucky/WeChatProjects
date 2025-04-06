/**
 * 存储数据类型管理模块
 * 负责管理不同类型的存储数据，提供统一的访问接口
 * 遵循ES5标准，确保在微信小程序环境兼容
 */

var storageUtils = require('./storageUtils');
var storage = storageUtils.storage;
var StorageItemType = storageUtils.StorageItemType;

/**
 * 数据类型前缀定义
 */
var KeyPrefix = {
  // 核心业务数据
  CORE: 'core_',         // 核心业务数据
  USER_DATA: 'user_',    // 用户相关数据
  WORK_DATA: 'work_',    // 工作数据
  MEDIA: 'media_',       // 媒体数据
  
  // 临时与缓存数据
  CACHE: 'cache_',       // 缓存数据
  TEMP: 'temp_',         // 临时数据
  DRAFT: 'draft_',       // 草稿数据
  
  // 系统数据
  SYS: 'sys_',           // 系统数据
  SYNC: 'sync_',         // 同步相关数据
  LOG: 'log_',           // 日志数据
  PREF: 'pref_'          // 偏好设置
};

/**
 * 生成特定类型的完整存储键
 * @param {string} type - 键类型(KeyPrefix中的值)
 * @param {string} key - 原始键名
 * @returns {string} - 完整键名
 */
function buildKey(type, key) {
  return type + key;
}

/**
 * 数据管理器
 */
var dataManager = {
  /**
   * 保存核心业务数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} data - 数据
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  saveCore: function(key, data, options) {
    options = options || {};
    options.type = StorageItemType.USER_DATA;
    return storage.set(buildKey(KeyPrefix.CORE, key), data, options);
  },
  
  /**
   * 获取核心业务数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  getCore: function(key, defaultValue) {
    return storage.get(buildKey(KeyPrefix.CORE, key), defaultValue);
  },
  
  /**
   * 保存用户数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} data - 数据
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  saveUser: function(key, data, options) {
    options = options || {};
    options.type = StorageItemType.USER_DATA;
    return storage.set(buildKey(KeyPrefix.USER_DATA, key), data, options);
  },
  
  /**
   * 获取用户数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  getUser: function(key, defaultValue) {
    return storage.get(buildKey(KeyPrefix.USER_DATA, key), defaultValue);
  },
  
  /**
   * 保存工作数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} data - 数据
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  saveWork: function(key, data, options) {
    options = options || {};
    options.type = StorageItemType.USER_DATA;
    return storage.set(buildKey(KeyPrefix.WORK_DATA, key), data, options);
  },
  
  /**
   * 获取工作数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  getWork: function(key, defaultValue) {
    return storage.get(buildKey(KeyPrefix.WORK_DATA, key), defaultValue);
  },
  
  /**
   * 保存媒体数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} data - 数据
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  saveMedia: function(key, data, options) {
    options = options || {};
    options.type = StorageItemType.USER_DATA;
    return storage.set(buildKey(KeyPrefix.MEDIA, key), data, options);
  },
  
  /**
   * 获取媒体数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  getMedia: function(key, defaultValue) {
    return storage.get(buildKey(KeyPrefix.MEDIA, key), defaultValue);
  },
  
  /**
   * 保存缓存数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} data - 数据
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  saveCache: function(key, data, options) {
    options = options || {};
    options.type = StorageItemType.CACHE;
    // 默认缓存过期时间为24小时
    if (!options.expires) {
      options.expires = 24 * 60 * 60 * 1000;
    }
    return storage.set(buildKey(KeyPrefix.CACHE, key), data, options);
  },
  
  /**
   * 获取缓存数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  getCache: function(key, defaultValue) {
    return storage.get(buildKey(KeyPrefix.CACHE, key), defaultValue);
  },
  
  /**
   * 保存临时数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} data - 数据
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  saveTemp: function(key, data, options) {
    options = options || {};
    options.type = StorageItemType.TEMP;
    // 默认临时数据过期时间为1小时
    if (!options.expires) {
      options.expires = 1 * 60 * 60 * 1000;
    }
    return storage.set(buildKey(KeyPrefix.TEMP, key), data, options);
  },
  
  /**
   * 获取临时数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  getTemp: function(key, defaultValue) {
    return storage.get(buildKey(KeyPrefix.TEMP, key), defaultValue);
  },
  
  /**
   * 保存草稿数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} data - 数据
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  saveDraft: function(key, data, options) {
    options = options || {};
    options.type = StorageItemType.USER_DATA;
    return storage.set(buildKey(KeyPrefix.DRAFT, key), data, options);
  },
  
  /**
   * 获取草稿数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  getDraft: function(key, defaultValue) {
    return storage.get(buildKey(KeyPrefix.DRAFT, key), defaultValue);
  },
  
  /**
   * 保存系统数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} data - 数据
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  saveSystem: function(key, data, options) {
    options = options || {};
    options.type = StorageItemType.SYSTEM;
    return storage.set(buildKey(KeyPrefix.SYS, key), data, options);
  },
  
  /**
   * 获取系统数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  getSystem: function(key, defaultValue) {
    return storage.get(buildKey(KeyPrefix.SYS, key), defaultValue);
  },
  
  /**
   * 保存用户偏好设置
   * @param {string} key - 键名(不含前缀)
   * @param {any} data - 数据
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  savePreference: function(key, data, options) {
    options = options || {};
    options.type = StorageItemType.SYSTEM;
    return storage.set(buildKey(KeyPrefix.PREF, key), data, options);
  },
  
  /**
   * 获取用户偏好设置
   * @param {string} key - 键名(不含前缀)
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  getPreference: function(key, defaultValue) {
    return storage.get(buildKey(KeyPrefix.PREF, key), defaultValue);
  },
  
  /**
   * 保存日志数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} data - 数据
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  saveLog: function(key, data, options) {
    options = options || {};
    options.type = StorageItemType.TEMP;
    return storage.set(buildKey(KeyPrefix.LOG, key), data, options);
  },
  
  /**
   * 获取日志数据
   * @param {string} key - 键名(不含前缀)
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  getLog: function(key, defaultValue) {
    return storage.get(buildKey(KeyPrefix.LOG, key), defaultValue);
  },
  
  /**
   * 根据前缀删除一组数据
   * @param {string} prefix - 键前缀
   * @returns {Promise<boolean>}
   */
  removeByPrefix: function(prefix) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      storage.keys().then(function(keys) {
        var promises = [];
        
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf(prefix) === 0) {
            promises.push(storage.remove(keys[i]));
          }
        }
        
        if (promises.length === 0) {
          resolve(true);
          return;
        }
        
        Promise.all(promises).then(function() {
          resolve(true);
        }).catch(reject);
      }).catch(reject);
    });
  },
  
  /**
   * 清除所有缓存数据
   * @returns {Promise<boolean>}
   */
  clearCache: function() {
    return this.removeByPrefix(KeyPrefix.CACHE);
  },
  
  /**
   * 清除所有临时数据
   * @returns {Promise<boolean>}
   */
  clearTemp: function() {
    return this.removeByPrefix(KeyPrefix.TEMP);
  },
  
  /**
   * 清除所有草稿数据
   * @returns {Promise<boolean>}
   */
  clearDrafts: function() {
    return this.removeByPrefix(KeyPrefix.DRAFT);
  },
  
  /**
   * 清除所有日志数据
   * @returns {Promise<boolean>}
   */
  clearLogs: function() {
    return this.removeByPrefix(KeyPrefix.LOG);
  }
};

// 导出模块
module.exports = {
  dataManager: dataManager,
  KeyPrefix: KeyPrefix
}; 