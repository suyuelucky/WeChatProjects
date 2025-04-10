/**
 * 配置管理模块
 * 提供统一的配置管理、环境切换和API URL配置功能
 * 
 * 创建时间: 2025-04-09 11:20:36
 * 创建者: Claude AI 3.7 Sonnet
 * 修改时间: 2025-04-09 11:28:45
 */

/**
 * 配置管理器
 */
var ConfigManager = {
  // 当前环境
  _currentEnv: 'development',
  
  // 有效环境列表
  _validEnvs: ['development', 'testing', 'production'],
  
  // 默认配置
  _defaultConfig: {
    // API基础URL
    apiBase: {
      development: 'https://dev-api.example.com',
      testing: 'https://test-api.example.com',
      production: 'https://api.example.com'
    },
    
    // API路径
    apiPath: {
      photoUpload: '/api/photos/upload',
      photoList: '/api/photos/list',
      photoDelete: '/api/photos/delete'
    },
    
    // 照片默认质量
    defaultPhotoQuality: 0.8,
    
    // 默认最大照片数
    maxPhotos: 9,
    
    // 自动清理临时文件的间隔(毫秒)
    cleanupInterval: 5 * 60 * 1000, // 5分钟
    
    // 日志级别: 1=错误, 2=警告, 3=信息
    logLevel: 2
  },
  
  // 当前配置
  _config: null,
  
  // 存储键名
  _storageKey: 'B1_PHOTO_CONFIG',
  
  /**
   * 初始化配置管理器
   * @param {Object} options 初始化选项
   * @returns {Object} 当前实例
   */
  init: function(options) {
    // 重置为默认配置
    this.resetToDefault();
    
    // 合并自定义选项
    if (options && typeof options === 'object') {
      this.updateConfig(options);
    }
    
    // 尝试从存储加载配置
    this.loadConfigFromStorage();
    
    return this;
  },
  
  /**
   * 重置为默认配置
   */
  resetToDefault: function() {
    this._config = JSON.parse(JSON.stringify(this._defaultConfig));
  },
  
  /**
   * 获取当前配置
   * @returns {Object} 当前配置
   */
  getConfig: function() {
    if (!this._config) {
      this.resetToDefault();
    }
    return this._config;
  },
  
  /**
   * 更新配置
   * @param {Object} newConfig 新配置
   */
  updateConfig: function(newConfig) {
    if (!newConfig || typeof newConfig !== 'object') {
      return;
    }
    
    if (!this._config) {
      this.resetToDefault();
    }
    
    // 合并配置
    for (var key in newConfig) {
      if (newConfig.hasOwnProperty(key)) {
        this._config[key] = newConfig[key];
      }
    }
  },
  
  /**
   * 设置环境
   * @param {string} env 环境名称
   * @returns {boolean} 是否设置成功
   */
  setEnv: function(env) {
    if (this._validEnvs.indexOf(env) !== -1) {
      this._currentEnv = env;
      return true;
    }
    console.warn('[ConfigManager] 无效的环境名称: ' + env);
    return false;
  },
  
  /**
   * 获取当前环境
   * @returns {string} 当前环境名称
   */
  getCurrentEnv: function() {
    return this._currentEnv;
  },
  
  /**
   * 获取API URL
   * @param {string} apiName API名称
   * @returns {string} 完整的API URL
   */
  getApiUrl: function(apiName) {
    if (!this._config) {
      this.resetToDefault();
    }
    
    var baseUrl = '';
    var apiPath = '';
    
    // 获取基础URL
    if (this._config.apiBase && this._config.apiBase[this._currentEnv]) {
      baseUrl = this._config.apiBase[this._currentEnv];
    } else {
      // 默认开发环境
      baseUrl = this._defaultConfig.apiBase.development;
    }
    
    // 获取API路径
    if (this._config.apiPath && this._config.apiPath[apiName]) {
      apiPath = this._config.apiPath[apiName];
    }
    
    return baseUrl + apiPath;
  },
  
  /**
   * 保存配置到存储
   * @returns {boolean} 是否保存成功
   */
  saveConfigToStorage: function() {
    try {
      var storageData = {
        config: this._config,
        env: this._currentEnv,
        timestamp: Date.now()
      };
      
      wx.setStorageSync(this._storageKey, storageData);
      return true;
    } catch (e) {
      console.error('[ConfigManager] 保存配置失败:', e);
      return false;
    }
  },
  
  /**
   * 从存储加载配置
   * @returns {boolean} 是否加载成功
   */
  loadConfigFromStorage: function() {
    try {
      var storageData = wx.getStorageSync(this._storageKey);
      if (storageData && storageData.config) {
        // 加载配置
        this._config = storageData.config;
        
        // 加载环境设置
        if (storageData.env && this._validEnvs.indexOf(storageData.env) !== -1) {
          this._currentEnv = storageData.env;
        }
        
        return true;
      }
    } catch (e) {
      console.error('[ConfigManager] 加载配置失败:', e);
    }
    
    return false;
  },
  
  /**
   * 清除存储的配置
   * @returns {boolean} 是否清除成功
   */
  clearStoredConfig: function() {
    try {
      wx.removeStorageSync(this._storageKey);
      return true;
    } catch (e) {
      console.error('[ConfigManager] 清除配置失败:', e);
      return false;
    }
  },
  
  /**
   * 记录日志
   * @param {number} level 日志级别
   * @param {string} message 日志消息
   * @param {Object} data 附加数据
   */
  log: function(level, message, data) {
    if (!this._config) {
      this.resetToDefault();
    }
    
    if (level <= this._config.logLevel) {
      switch (level) {
        case 1:
          console.error('[ConfigManager]', message, data || '');
          break;
        case 2:
          console.warn('[ConfigManager]', message, data || '');
          break;
        case 3:
          console.log('[ConfigManager]', message, data || '');
          break;
      }
    }
  }
};

// 导出模块
module.exports = ConfigManager; 