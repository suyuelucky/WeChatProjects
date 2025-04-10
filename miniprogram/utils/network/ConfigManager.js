/**
 * ConfigManager
 * 配置管理器，提供网络请求的配置管理功能
 * 支持全局配置、请求组配置和单次请求配置的三层继承结构
 */

'use strict';

/**
 * 配置管理器构造函数
 * @param {Object} [globalConfig] 初始全局配置
 * @constructor
 */
function ConfigManager(globalConfig) {
  // 防止调用时忘记new
  if (!(this instanceof ConfigManager)) {
    return new ConfigManager(globalConfig);
  }

  // 初始化默认配置
  this._defaultConfig = {
    core: {
      baseURL: '',
      timeout: 30000,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      dataType: 'json',
      responseEncoding: 'utf8'
    },
    retry: {
      enableRetry: true,
      maxRetryTimes: 3,
      retryDelay: 1000,
      retryMode: 'exponential'
    },
    cache: {
      enableCache: false,
      cacheMaxAge: 300,
      cacheMode: 'memory'
    },
    interceptor: {
      enableGlobalInterceptors: true
    },
    security: {
      validateSSL: true,
      enableCSRF: false
    },
    performance: {
      enableCompression: false,
      maxConcurrentRequests: 5
    }
  };

  // 初始化全局配置(合并用户配置和默认配置)
  this._globalConfig = this._mergeConfig({}, this._defaultConfig);
  if (globalConfig) {
    this._validateConfig(globalConfig);
    this._globalConfig = this._mergeConfig(this._globalConfig, globalConfig);
  }

  // 初始化请求组配置存储
  this._requestGroups = {};

  // 初始化配置变更订阅
  this._subscriptions = [];
  this._nextSubscriptionId = 1;

  // 预设配置
  this._initConfigPresets();
}

/**
 * 初始化配置预设
 * @private
 */
ConfigManager.prototype._initConfigPresets = function() {
  // 定义标准预设
  this._configPresets = {
    // 默认预设，与_defaultConfig相同
    DEFAULT: this._defaultConfig,

    // 高性能预设
    HIGH_PERFORMANCE: {
      core: {
        timeout: 10000
      },
      retry: {
        enableRetry: false
      },
      cache: {
        enableCache: true,
        cacheMaxAge: 300,
        cacheMode: 'memory'
      },
      performance: {
        enableCompression: true,
        keepAlive: true,
        maxConcurrentRequests: 10
      }
    },

    // 高可靠预设
    HIGH_RELIABILITY: {
      core: {
        timeout: 60000
      },
      retry: {
        enableRetry: true,
        maxRetryTimes: 5,
        retryDelay: 2000
      },
      cache: {
        enableCache: true,
        cacheMode: 'hybrid',
        cacheMaxAge: 3600
      }
    },

    // 低功耗预设
    LOW_POWER: {
      core: {
        timeout: 45000
      },
      retry: {
        enableRetry: true,
        maxRetryTimes: 2
      },
      cache: {
        enableCache: true,
        cacheMaxAge: 7200
      },
      performance: {
        enableCompression: false,
        keepAlive: false,
        priorityLevel: 'low'
      }
    }
  };
};

/**
 * 深度克隆对象
 * @param {*} obj 需要克隆的对象
 * @returns {*} 克隆后的新对象
 * @private
 */
ConfigManager.prototype._deepClone = function(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  var copy;
  
  // 处理数组
  if (Array.isArray(obj)) {
    copy = [];
    for (var i = 0; i < obj.length; i++) {
      copy[i] = this._deepClone(obj[i]);
    }
    return copy;
  }
  
  // 处理对象
  copy = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = this._deepClone(obj[key]);
    }
  }
  
  return copy;
};

/**
 * 深度合并配置对象
 * @param {Object} target 目标对象
 * @param {Object} source 源对象
 * @returns {Object} 合并后的对象
 * @private
 */
ConfigManager.prototype._mergeConfig = function(target, source) {
  if (!source) {
    return target;
  }
  
  if (typeof source !== 'object') {
    return source;
  }
  
  if (typeof target !== 'object') {
    target = {};
  }
  
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      var sourceValue = source[key];
      var targetValue = target[key];
      
      // 处理数组(直接替换)
      if (Array.isArray(sourceValue)) {
        target[key] = this._deepClone(sourceValue);
        continue;
      }
      
      // 处理函数(直接替换)
      if (typeof sourceValue === 'function') {
        target[key] = sourceValue;
        continue;
      }
      
      // 处理对象(递归合并)
      if (sourceValue && typeof sourceValue === 'object') {
        target[key] = this._mergeConfig(
          Object.prototype.toString.call(targetValue) === '[object Object]' ? targetValue : {},
          sourceValue
        );
        continue;
      }
      
      // 处理基本类型(直接替换)
      if (sourceValue !== undefined) {
        target[key] = sourceValue;
      }
    }
  }
  
  return target;
};

/**
 * 验证配置对象
 * @param {Object} config 配置对象
 * @throws {Error} 配置无效时抛出错误
 * @private
 */
ConfigManager.prototype._validateConfig = function(config) {
  if (config === null || typeof config !== 'object') {
    throw new Error('配置必须是对象类型');
  }
  
  // 验证核心配置
  if (config.core) {
    if (config.core.timeout !== undefined && (typeof config.core.timeout !== 'number' || config.core.timeout < 0)) {
      throw new Error('无效的timeout值: ' + config.core.timeout);
    }
    
    if (config.core.method !== undefined && typeof config.core.method !== 'string') {
      throw new Error('无效的method值: ' + config.core.method);
    }
  }
  
  // 验证重试配置
  if (config.retry) {
    if (config.retry.maxRetryTimes !== undefined && (typeof config.retry.maxRetryTimes !== 'number' || config.retry.maxRetryTimes < 0)) {
      throw new Error('无效的maxRetryTimes值: ' + config.retry.maxRetryTimes);
    }
  }
  
  // 其他配置验证可根据需要添加
};

/**
 * 获取全局配置
 * @returns {Object} 全局配置的深拷贝
 */
ConfigManager.prototype.getGlobalConfig = function() {
  return this._deepClone(this._globalConfig);
};

/**
 * 更新全局配置
 * @param {Object} configUpdates 配置更新
 * @returns {Object} 更新后的全局配置
 */
ConfigManager.prototype.updateGlobalConfig = function(configUpdates) {
  if (configUpdates === null || typeof configUpdates !== 'object') {
    throw new Error('配置更新必须是对象类型');
  }
  
  // 验证更新配置
  this._validateConfig(configUpdates);
  
  // 合并配置
  this._globalConfig = this._mergeConfig(this._globalConfig, configUpdates);
  
  // 触发配置变更通知
  this._notifyConfigChanges(configUpdates);
  
  return this.getGlobalConfig();
};

/**
 * 重置全局配置为默认值
 * @param {Array<string>} [configPaths] 需要重置的配置路径
 * @returns {Object} 重置后的全局配置
 */
ConfigManager.prototype.resetGlobalConfig = function(configPaths) {
  if (configPaths && Array.isArray(configPaths)) {
    // 重置指定路径
    for (var i = 0; i < configPaths.length; i++) {
      var path = configPaths[i];
      var defaultValue = this._getValueByPath(this._defaultConfig, path);
      this._setValueByPath(this._globalConfig, path, this._deepClone(defaultValue));
    }
  } else {
    // 重置全部配置
    this._globalConfig = this._deepClone(this._defaultConfig);
  }
  
  return this.getGlobalConfig();
};

/**
 * 创建请求组
 * @param {string} groupId 请求组ID
 * @param {Object} [groupConfig] 请求组配置
 * @returns {Object} 请求组对象
 */
ConfigManager.prototype.createRequestGroup = function(groupId, groupConfig) {
  if (!groupId || typeof groupId !== 'string') {
    throw new Error('请求组ID必须是非空字符串');
  }
  
  if (this._requestGroups[groupId]) {
    throw new Error('请求组 "' + groupId + '" 已存在');
  }
  
  var config = this._deepClone(this._defaultConfig);
  
  if (groupConfig) {
    this._validateConfig(groupConfig);
    config = this._mergeConfig(config, groupConfig);
  }
  
  this._requestGroups[groupId] = config;
  
  return {
    id: groupId,
    config: this._deepClone(config)
  };
};

/**
 * 获取请求组配置
 * @param {string} groupId 请求组ID
 * @returns {Object} 请求组配置
 */
ConfigManager.prototype.getGroupConfig = function(groupId) {
  if (!groupId || typeof groupId !== 'string') {
    throw new Error('请求组ID必须是非空字符串');
  }
  
  var groupConfig = this._requestGroups[groupId];
  
  if (!groupConfig) {
    throw new Error('请求组 "' + groupId + '" 不存在');
  }
  
  return this._deepClone(groupConfig);
};

/**
 * 更新请求组配置
 * @param {string} groupId 请求组ID
 * @param {Object} configUpdates 配置更新
 * @returns {Object} 更新后的请求组配置
 */
ConfigManager.prototype.updateGroupConfig = function(groupId, configUpdates) {
  if (!groupId || typeof groupId !== 'string') {
    throw new Error('请求组ID必须是非空字符串');
  }
  
  var groupConfig = this._requestGroups[groupId];
  
  if (!groupConfig) {
    throw new Error('请求组 "' + groupId + '" 不存在');
  }
  
  if (configUpdates === null || typeof configUpdates !== 'object') {
    throw new Error('配置更新必须是对象类型');
  }
  
  // 验证更新配置
  this._validateConfig(configUpdates);
  
  // 合并配置
  this._requestGroups[groupId] = this._mergeConfig(groupConfig, configUpdates);
  
  return this.getGroupConfig(groupId);
};

/**
 * 删除请求组
 * @param {string} groupId 请求组ID
 * @returns {boolean} 是否删除成功
 */
ConfigManager.prototype.deleteRequestGroup = function(groupId) {
  if (!groupId || typeof groupId !== 'string') {
    throw new Error('请求组ID必须是非空字符串');
  }
  
  if (!this._requestGroups[groupId]) {
    return false;
  }
  
  delete this._requestGroups[groupId];
  return true;
};

/**
 * 列出所有请求组
 * @returns {Array<string>} 请求组ID列表
 */
ConfigManager.prototype.listRequestGroups = function() {
  return Object.keys(this._requestGroups);
};

/**
 * 创建请求配置
 * @param {Object} requestConfig 请求配置
 * @param {string} [groupId] 所属请求组ID
 * @returns {Object} 完整的请求配置(已合并三层配置)
 */
ConfigManager.prototype.createRequestConfig = function(requestConfig, groupId) {
  if (!requestConfig || typeof requestConfig !== 'object') {
    requestConfig = {};
  }
  
  // 验证请求配置
  this._validateConfig(requestConfig);
  
  // 创建空配置对象
  var config = {};
  
  // 1. 合并全局配置
  config = this._mergeConfig(config, this._globalConfig);
  
  // 2. 如果指定了请求组，合并请求组配置
  if (groupId) {
    var groupConfig = this._requestGroups[groupId];
    if (groupConfig) {
      config = this._mergeConfig(config, groupConfig);
    }
  }
  
  // 3. 合并请求配置
  config = this._mergeConfig(config, requestConfig);
  
  return config;
};

/**
 * 验证请求配置有效性
 * @param {Object} config 请求配置
 * @returns {Object} 验证结果对象，包含valid(是否有效)和errors(错误列表)
 */
ConfigManager.prototype.validateRequestConfig = function(config) {
  var result = {
    valid: true,
    errors: []
  };
  
  if (!config || typeof config !== 'object') {
    result.valid = false;
    result.errors.push('配置必须是对象类型');
    return result;
  }
  
  // 验证核心配置
  if (config.core) {
    // 验证URL (如果存在)
    if (config.core.url !== undefined) {
      if (typeof config.core.url !== 'string' || config.core.url.trim() === '') {
        result.valid = false;
        result.errors.push('无效的URL: ' + config.core.url);
      }
    }
    
    // 验证method (如果存在)
    if (config.core.method !== undefined) {
      var validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];
      if (typeof config.core.method !== 'string' || validMethods.indexOf(config.core.method.toUpperCase()) === -1) {
        result.valid = false;
        result.errors.push('无效的HTTP方法: ' + config.core.method);
      }
    }
    
    // 验证timeout (如果存在)
    if (config.core.timeout !== undefined) {
      if (typeof config.core.timeout !== 'number' || config.core.timeout < 0) {
        result.valid = false;
        result.errors.push('无效的超时设置: ' + config.core.timeout);
      }
    }
  }
  
  // 验证重试配置
  if (config.retry) {
    if (config.retry.maxRetryTimes !== undefined) {
      if (typeof config.retry.maxRetryTimes !== 'number' || config.retry.maxRetryTimes < 0) {
        result.valid = false;
        result.errors.push('无效的最大重试次数: ' + config.retry.maxRetryTimes);
      }
    }
  }
  
  // 验证缓存配置
  if (config.cache) {
    if (config.cache.cacheMaxAge !== undefined) {
      if (typeof config.cache.cacheMaxAge !== 'number' || config.cache.cacheMaxAge < 0) {
        result.valid = false;
        result.errors.push('无效的缓存有效期: ' + config.cache.cacheMaxAge);
      }
    }
  }
  
  return result;
};

/**
 * 应用配置预设
 * @param {string} presetName 预设名称
 * @returns {Object} 应用预设后的配置
 */
ConfigManager.prototype.applyConfigPreset = function(presetName) {
  if (!presetName || typeof presetName !== 'string') {
    throw new Error('预设名称必须是非空字符串');
  }
  
  var preset = this._configPresets[presetName];
  
  if (!preset) {
    throw new Error('预设 "' + presetName + '" 不存在');
  }
  
  // 创建新配置并合并预设
  var config = this._deepClone(this._defaultConfig);
  config = this._mergeConfig(config, preset);
  
  return config;
};

/**
 * 通过路径获取配置值
 * @param {string} path 配置路径(如'core.timeout'或'retry.maxRetryTimes')
 * @param {string} [groupId] 请求组ID，不提供则获取全局配置
 * @param {*} [defaultValue] 默认值(当配置项不存在时返回)
 * @returns {*} 配置值
 */
ConfigManager.prototype.getConfigValue = function(path, groupId, defaultValue) {
  if (!path || typeof path !== 'string') {
    return defaultValue;
  }
  
  var config = groupId ? this.getGroupConfig(groupId) : this.getGlobalConfig();
  
  var value = this._getValueByPath(config, path);
  
  return value === undefined ? defaultValue : value;
};

/**
 * 设置配置值
 * @param {string} path 配置路径
 * @param {*} value 配置值
 * @param {string} [groupId] 请求组ID，不提供则设置全局配置
 * @returns {boolean} 是否设置成功
 */
ConfigManager.prototype.setConfigValue = function(path, value, groupId) {
  if (!path || typeof path !== 'string') {
    return false;
  }

  var target;
  var targetConfig;
  
  if (groupId) {
    if (!this._requestGroups[groupId]) {
      return false;
    }
    target = this._requestGroups;
    targetConfig = groupId;
  } else {
    target = this;
    targetConfig = '_globalConfig';
  }
  
  var oldValue = this._getValueByPath(target[targetConfig], path);
  var result = this._setValueByPath(target[targetConfig], path, value);
  
  if (result && oldValue !== value) {
    this._notifyConfigChanges({
      path: path,
      oldValue: oldValue,
      newValue: value,
      groupId: groupId
    });
  }
  
  return result;
};

/**
 * 根据路径获取对象中的值
 * @param {Object} obj 目标对象
 * @param {string} path 路径(如"core.timeout")
 * @returns {*} 路径对应的值
 * @private
 */
ConfigManager.prototype._getValueByPath = function(obj, path) {
  if (!obj || !path) {
    return undefined;
  }
  
  var parts = path.split('.');
  var current = obj;
  
  for (var i = 0; i < parts.length; i++) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    
    current = current[parts[i]];
    
    if (current === undefined) {
      return undefined;
    }
  }
  
  return current;
};

/**
 * 根据路径设置对象中的值
 * @param {Object} obj 目标对象
 * @param {string} path 路径(如"core.timeout")
 * @param {*} value 要设置的值
 * @returns {boolean} 是否设置成功
 * @private
 */
ConfigManager.prototype._setValueByPath = function(obj, path, value) {
  if (!obj || !path) {
    return false;
  }
  
  var parts = path.split('.');
  var current = obj;
  
  for (var i = 0; i < parts.length - 1; i++) {
    var part = parts[i];
    
    if (current[part] === undefined) {
      current[part] = {};
    } else if (typeof current[part] !== 'object') {
      // 路径中包含非对象属性，无法继续
      return false;
    }
    
    current = current[part];
  }
  
  var lastPart = parts[parts.length - 1];
  current[lastPart] = value;
  
  return true;
};

/**
 * 订阅配置变更
 * @param {string} path 配置路径，支持通配符
 * @param {Function} callback 变更回调函数
 * @param {Object} [options] 订阅选项
 * @returns {string} 订阅ID
 */
ConfigManager.prototype.subscribeToConfigChanges = function(path, callback, options) {
  if (!path || typeof path !== 'string') {
    throw new Error('订阅路径必须是字符串');
  }
  
  if (!callback || typeof callback !== 'function') {
    throw new Error('回调必须是函数');
  }
  
  options = options || {};
  
  var subscriptionId = 'sub_' + this._nextSubscriptionId++;
  
  this._subscriptions.push({
    id: subscriptionId,
    path: path,
    callback: callback,
    options: options
  });
  
  return subscriptionId;
};

/**
 * 取消配置变更订阅
 * @param {string} subscriptionId 订阅ID
 * @returns {boolean} 是否取消成功
 */
ConfigManager.prototype.unsubscribeFromConfigChanges = function(subscriptionId) {
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return false;
  }
  
  var idx = -1;
  
  for (var i = 0; i < this._subscriptions.length; i++) {
    if (this._subscriptions[i].id === subscriptionId) {
      idx = i;
      break;
    }
  }
  
  if (idx === -1) {
    return false;
  }
  
  this._subscriptions.splice(idx, 1);
  return true;
};

/**
 * 通知配置变更
 * @param {Object} changes 配置变更信息
 * @private
 */
ConfigManager.prototype._notifyConfigChanges = function(changes) {
  if (!changes || !changes.path) {
    return;
  }
  
  for (var i = 0; i < this._subscriptions.length; i++) {
    var subscription = this._subscriptions[i];
    
    // 路径匹配判断
    if (this._pathMatches(changes.path, subscription.path)) {
      try {
        // 调用回调，传入新值和变更详情
        subscription.callback(changes.newValue, changes);
      } catch (err) {
        console.error('配置变更回调执行出错:', err);
      }
    }
  }
};

/**
 * 判断路径是否匹配(支持简单通配符)
 * @param {string} targetPath 目标路径
 * @param {string} patternPath 模式路径(支持*)
 * @returns {boolean} 是否匹配
 * @private
 */
ConfigManager.prototype._pathMatches = function(targetPath, patternPath) {
  // 完全相同的路径直接匹配
  if (targetPath === patternPath) {
    return true;
  }
  
  // 处理通配符情况
  if (patternPath === '*') {
    // 星号匹配所有路径
    return true;
  }
  
  if (patternPath.endsWith('.*')) {
    // 以.*结尾的模式，匹配指定对象下的所有属性
    var prefix = patternPath.substring(0, patternPath.length - 2);
    return targetPath === prefix || targetPath.startsWith(prefix + '.');
  }
  
  // 其他模式匹配规则可根据需要添加
  
  return false;
};

/**
 * 持久化配置
 * @param {string} [storageKey] 存储键名
 * @param {Array<string>} [includePaths] 需要持久化的配置路径
 * @param {Array<string>} [excludePaths] 不需要持久化的配置路径
 * @returns {boolean} 是否持久化成功
 */
ConfigManager.prototype.persistConfig = function(storageKey, includePaths, excludePaths) {
  storageKey = storageKey || 'ConfigManager_Global';
  
  try {
    var configToSave = this._deepClone(this._globalConfig);
    
    // 处理包含路径
    if (includePaths && Array.isArray(includePaths) && includePaths.length > 0) {
      var tempConfig = {};
      
      for (var i = 0; i < includePaths.length; i++) {
        var path = includePaths[i];
        var value = this._getValueByPath(configToSave, path);
        
        if (value !== undefined) {
          this._setValueByPath(tempConfig, path, value);
        }
      }
      
      configToSave = tempConfig;
    }
    
    // 处理排除路径
    if (excludePaths && Array.isArray(excludePaths) && excludePaths.length > 0) {
      for (var j = 0; j < excludePaths.length; j++) {
        var excludePath = excludePaths[j];
        var pathParts = excludePath.split('.');
        
        // 删除对应路径的值
        var current = configToSave;
        var lastObj = null;
        var lastKey = null;
        
        for (var k = 0; k < pathParts.length; k++) {
          var part = pathParts[k];
          
          if (k === pathParts.length - 1) {
            lastObj = current;
            lastKey = part;
          } else {
            if (!current[part] || typeof current[part] !== 'object') {
              break;
            }
            current = current[part];
          }
        }
        
        if (lastObj && lastKey && lastObj.hasOwnProperty(lastKey)) {
          delete lastObj[lastKey];
        }
      }
    }
    
    // 保存到本地存储
    wx.setStorageSync(storageKey, configToSave);
    
    return true;
  } catch (err) {
    console.error('持久化配置失败:', err);
    return false;
  }
};

/**
 * 加载持久化配置
 * @param {string} [storageKey] 存储键名
 * @param {boolean} [merge=true] 是否与当前配置合并
 * @returns {Object} 加载的配置
 */
ConfigManager.prototype.loadPersistedConfig = function(storageKey, merge) {
  storageKey = storageKey || 'ConfigManager_Global';
  
  if (merge === undefined) {
    merge = true;
  }
  
  try {
    var persistedConfig = wx.getStorageSync(storageKey);
    
    if (!persistedConfig) {
      return this._deepClone(this._globalConfig);
    }
    
    if (merge) {
      // 合并到当前配置
      this._globalConfig = this._mergeConfig(this._globalConfig, persistedConfig);
      return this.getGlobalConfig();
    } else {
      // 直接返回持久化配置
      return this._deepClone(persistedConfig);
    }
  } catch (err) {
    console.error('加载持久化配置失败:', err);
    return this._deepClone(this._globalConfig);
  }
};

/**
 * 保存配置版本
 * @param {string} versionName 版本名称
 * @param {Object} [metadata] 版本元数据
 * @returns {string} 版本ID
 */
ConfigManager.prototype.saveConfigVersion = function(versionName, metadata) {
  if (!versionName || typeof versionName !== 'string') {
    throw new Error('版本名称必须是非空字符串');
  }
  
  try {
    // 获取版本列表
    var versionList = wx.getStorageSync('ConfigManager_Versions') || [];
    
    // 创建版本ID
    var versionId = 'v_' + Date.now();
    
    // 创建版本信息
    var versionInfo = {
      id: versionId,
      name: versionName,
      timestamp: Date.now(),
      config: this._deepClone(this._globalConfig),
      metadata: metadata || {}
    };
    
    // 添加到版本列表
    versionList.push({
      id: versionId,
      name: versionName,
      timestamp: versionInfo.timestamp
    });
    
    // 保存版本列表
    wx.setStorageSync('ConfigManager_Versions', versionList);
    
    // 保存版本配置
    wx.setStorageSync('ConfigManager_Version_' + versionId, versionInfo);
    
    return versionId;
  } catch (err) {
    console.error('保存配置版本失败:', err);
    throw err;
  }
};

/**
 * 加载配置版本
 * @param {string} versionId 版本ID
 * @param {boolean} [apply=true] 是否应用该版本配置
 * @returns {Object} 版本配置
 */
ConfigManager.prototype.loadConfigVersion = function(versionId, apply) {
  if (!versionId || typeof versionId !== 'string') {
    throw new Error('版本ID必须是非空字符串');
  }
  
  if (apply === undefined) {
    apply = true;
  }
  
  try {
    // 获取版本信息
    var versionInfo = wx.getStorageSync('ConfigManager_Version_' + versionId);
    
    if (!versionInfo || !versionInfo.config) {
      throw new Error('版本不存在或无效');
    }
    
    if (apply) {
      // 应用版本配置
      this._globalConfig = this._deepClone(versionInfo.config);
      
      // 触发变更通知
      this._notifyConfigChanges({
        path: '*',
        oldValue: null,
        newValue: null,
        versionId: versionId
      });
    }
    
    return this._deepClone(versionInfo.config);
  } catch (err) {
    console.error('加载配置版本失败:', err);
    throw err;
  }
};

/**
 * 列出配置版本
 * @returns {Array<Object>} 版本列表
 */
ConfigManager.prototype.listConfigVersions = function() {
  try {
    return wx.getStorageSync('ConfigManager_Versions') || [];
  } catch (err) {
    console.error('获取配置版本列表失败:', err);
    return [];
  }
};

module.exports = ConfigManager; 