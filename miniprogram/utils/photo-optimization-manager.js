/**
 * 照片优化管理器
 * 统一协调各个模块的优化策略，提供全局优化控制
 */

// 导入依赖模块
const B1PhotoOptimizedLoader = require('./b1-photo-optimized-loader');
const PhotoBatchProcessor = require('./photo-batch-processor');
const EnhancedImageCacheManager = require('./enhanced-image-cache-manager');
const NetworkMonitor = require('./network-monitor');
const ImageLoadingStrategy = require('./image-loading-strategy');

/**
 * 照片优化管理器
 */
const PhotoOptimizationManager = {
  // 各个优化模块
  _modules: {
    loader: null,
    batchProcessor: null,
    cacheManager: null,
    networkMonitor: null,
    loadingStrategy: null
  },
  
  // 初始化状态
  _initialized: false,
  
  // 全局配置
  _config: {
    // 全局优化级别：0-关闭, 1-低, 2-中, 3-高
    optimizationLevel: 2,
    
    // 清理间隔（毫秒）
    cleanupInterval: 5 * 60 * 1000, // 5分钟
    
    // 是否自动应用内存优化
    autoMemoryOptimization: true,
    
    // 是否自动应用网络优化
    autoNetworkOptimization: true,
    
    // 内存优化阈值（MB）
    memoryOptimizationThreshold: 150,
    
    // 日志级别
    logLevel: 2
  },
  
  // 全局状态
  _state: {
    memoryPressure: 0, // 0-正常，1-轻微警告，2-中度警告，3-严重警告
    networkQuality: 'unknown', // unknown, poor, fair, good, excellent
    activePhotoCaptures: 0, // 活跃的照片采集组件数量
    lastCleanup: 0, // 上次清理时间
    availableStorage: 0, // 可用存储空间（MB）
  },
  
  // 清理定时器
  _cleanupTimer: null,
  
  /**
   * 初始化优化管理器
   * @param {Object} options 配置选项
   * @returns {Object} 当前实例
   */
  init(options = {}) {
    if (this._initialized) {
      this._log(2, '[PhotoOptimizationManager] 已经初始化，忽略重复调用');
      return this;
    }
    
    // 合并配置
    this._config = {
      ...this._config,
      ...options
    };
    
    // 初始化各个优化模块
    this._initModules();
    
    // 设置内存警告监听
    this._setupMemoryWarning();
    
    // 开始定期清理
    this._startPeriodicCleanup();
    
    // 检查存储空间
    this._checkStorageSpace();
    
    this._initialized = true;
    this._log(3, '[PhotoOptimizationManager] 初始化完成');
    
    return this;
  },
  
  /**
   * 初始化优化模块
   * @private
   */
  _initModules() {
    // 初始化缓存管理器
    this._modules.cacheManager = EnhancedImageCacheManager.init({
      logLevel: this._config.logLevel
    });
    
    // 初始化加载策略
    this._modules.loadingStrategy = ImageLoadingStrategy.init({
      logLevel: this._config.logLevel
    });
    
    // 初始化网络监控
    this._modules.networkMonitor = NetworkMonitor.init();
    this._modules.networkMonitor.onNetworkStatusChange(this._handleNetworkChange.bind(this));
    
    // 初始化照片加载器
    this._modules.loader = B1PhotoOptimizedLoader.init({
      logLevel: this._config.logLevel
    });
    
    // 初始化照片批处理器
    this._modules.batchProcessor = PhotoBatchProcessor.init({
      logLevel: this._config.logLevel
    });
    
    // 更新网络状态
    this._updateNetworkStatus();
  },
  
  /**
   * 记录日志
   * @param {Number} level 日志级别
   * @param {String} message 日志消息
   * @param {Object} data 附加数据
   * @private
   */
  _log(level, message, data) {
    if (level <= this._config.logLevel) {
      switch (level) {
        case 1:
          console.error(message, data || '');
          break;
        case 2:
          console.warn(message, data || '');
          break;
        case 3:
          console.log(message, data || '');
          break;
      }
    }
  },
  
  /**
   * 设置内存警告监听
   * @private
   */
  _setupMemoryWarning() {
    wx.onMemoryWarning(res => {
      this._log(2, `[PhotoOptimizationManager] 收到内存警告，级别: ${res.level}`);
      
      // 更新内存压力状态
      let pressureLevel = 0;
      switch (res.level) {
        case 10: // 轻微警告
          pressureLevel = 1;
          break;
        case 15: // 中度警告
          pressureLevel = 2;
          break;
        case 20: // 严重警告
          pressureLevel = 3;
          break;
      }
      
      this._state.memoryPressure = pressureLevel;
      
      // 根据内存压力级别应用不同的优化策略
      if (this._config.autoMemoryOptimization) {
        this._applyMemoryOptimizationStrategy(pressureLevel);
      }
    });
  },
  
  /**
   * 应用内存优化策略
   * @param {Number} pressureLevel 内存压力级别
   * @private
   */
  _applyMemoryOptimizationStrategy(pressureLevel) {
    switch (pressureLevel) {
      case 1: // 轻微警告
        // 清理未使用的缓存
        this._modules.loader.clearUnusedCache();
        this._log(3, '[PhotoOptimizationManager] 应用轻微内存优化策略');
        break;
        
      case 2: // 中度警告
        // 更积极地清理缓存
        this._modules.loader.clearCache(true);
        this._log(2, '[PhotoOptimizationManager] 应用中度内存优化策略');
        break;
        
      case 3: // 严重警告
        // 紧急清理
        this._modules.loader.emergencyCleanup();
        this._modules.loadingStrategy.releaseMemory();
        this._log(1, '[PhotoOptimizationManager] 应用严重内存优化策略');
        
        // 显示提示
        wx.showToast({
          title: '内存不足，已释放资源',
          icon: 'none'
        });
        break;
    }
  },
  
  /**
   * 开始定期清理
   * @private
   */
  _startPeriodicCleanup() {
    // 停止旧的定时器
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
    }
    
    // 设置新的定时器
    this._cleanupTimer = setInterval(() => {
      this._performPeriodicCleanup();
    }, this._config.cleanupInterval);
  },
  
  /**
   * 执行定期清理
   * @private
   */
  _performPeriodicCleanup() {
    const now = Date.now();
    this._state.lastCleanup = now;
    
    this._log(3, '[PhotoOptimizationManager] 执行定期清理');
    
    // 检查存储空间
    this._checkStorageSpace();
    
    // 如果存储空间不足，执行更积极的清理
    if (this._state.availableStorage < 100) { // 小于100MB时
      this._log(2, `[PhotoOptimizationManager] 存储空间不足: ${this._state.availableStorage}MB，执行积极清理`);
      this._modules.cacheManager.clearCache();
    } else {
      // 正常清理过期缓存
      this._modules.loader.clearUnusedCache();
    }
  },
  
  /**
   * 检查存储空间
   * @private
   */
  _checkStorageSpace() {
    wx.getStorageInfo({
      success: (res) => {
        // 计算剩余存储空间（MB）
        const limitSize = res.limitSize || 0; // 限制大小
        const currentSize = res.currentSize || 0; // 当前使用大小
        
        if (limitSize > 0) {
          const availableStorage = (limitSize - currentSize) / 1024; // 转换为MB
          this._state.availableStorage = availableStorage;
          
          if (availableStorage < 50) { // 小于50MB时发出警告
            this._log(1, `[PhotoOptimizationManager] 存储空间严重不足: ${availableStorage.toFixed(2)}MB`);
            
            // 紧急清理
            this._modules.cacheManager.clearCache();
            
            // 显示提示
            wx.showToast({
              title: '存储空间不足，已清理缓存',
              icon: 'none'
            });
          } else if (availableStorage < 100) { // 小于100MB时记录警告
            this._log(2, `[PhotoOptimizationManager] 存储空间不足: ${availableStorage.toFixed(2)}MB`);
          }
        }
      }
    });
  },
  
  /**
   * 处理网络变化
   * @param {Object} res 网络状态
   * @private
   */
  _handleNetworkChange(res) {
    // 更新网络质量评估
    let quality = 'unknown';
    
    switch (res.networkType) {
      case 'wifi':
        quality = 'excellent';
        break;
      case '4g':
        quality = 'good';
        break;
      case '3g':
        quality = 'fair';
        break;
      case '2g':
        quality = 'poor';
        break;
      case 'none':
        quality = 'none';
        break;
    }
    
    this._state.networkQuality = quality;
    
    // 如果启用了自动网络优化
    if (this._config.autoNetworkOptimization) {
      // 根据网络质量调整优化策略
      this._applyNetworkOptimizationStrategy(quality);
    }
    
    this._log(3, `[PhotoOptimizationManager] 网络状态变化: ${res.networkType}, 质量评估: ${quality}`);
  },
  
  /**
   * 应用网络优化策略
   * @param {String} quality 网络质量
   * @private
   */
  _applyNetworkOptimizationStrategy(quality) {
    // 根据网络质量调整加载策略
    switch (quality) {
      case 'none':
        // 无网络时，最大限度减少网络请求
        this._modules.loadingStrategy.setCurrentQuality('lowest');
        this._log(2, '[PhotoOptimizationManager] 应用离线网络优化策略');
        break;
        
      case 'poor':
        // 网络很差时，使用最低质量
        this._modules.loadingStrategy.setCurrentQuality('low');
        this._log(2, '[PhotoOptimizationManager] 应用低质量网络优化策略');
        break;
        
      case 'fair':
        // 一般网络，使用中等质量
        this._modules.loadingStrategy.setCurrentQuality('medium');
        this._log(3, '[PhotoOptimizationManager] 应用中等质量网络优化策略');
        break;
        
      case 'good':
      case 'excellent':
        // 好的网络，使用高质量
        this._modules.loadingStrategy.setCurrentQuality('high');
        this._log(3, '[PhotoOptimizationManager] 应用高质量网络优化策略');
        break;
    }
  },
  
  /**
   * 更新网络状态
   * @private
   */
  _updateNetworkStatus() {
    wx.getNetworkType({
      success: (res) => {
        this._handleNetworkChange(res);
      }
    });
  },
  
  /**
   * 获取照片加载器
   * @returns {Object} 照片加载器实例
   */
  getPhotoLoader() {
    if (!this._initialized) {
      this.init();
    }
    return this._modules.loader;
  },
  
  /**
   * 获取照片批处理器
   * @returns {Object} 照片批处理器实例
   */
  getPhotoBatchProcessor() {
    if (!this._initialized) {
      this.init();
    }
    return this._modules.batchProcessor;
  },
  
  /**
   * 获取缓存管理器
   * @returns {Object} 缓存管理器实例
   */
  getCacheManager() {
    if (!this._initialized) {
      this.init();
    }
    return this._modules.cacheManager;
  },
  
  /**
   * 获取加载策略
   * @returns {Object} 加载策略实例
   */
  getLoadingStrategy() {
    if (!this._initialized) {
      this.init();
    }
    return this._modules.loadingStrategy;
  },
  
  /**
   * 获取网络监控
   * @returns {Object} 网络监控实例
   */
  getNetworkMonitor() {
    if (!this._initialized) {
      this.init();
    }
    return this._modules.networkMonitor;
  },
  
  /**
   * 获取当前优化状态
   * @returns {Object} 当前优化状态
   */
  getOptimizationState() {
    return { ...this._state };
  },
  
  /**
   * 手动触发清理
   * @param {Boolean} aggressive 是否积极清理
   */
  triggerCleanup(aggressive = false) {
    this._log(3, `[PhotoOptimizationManager] 手动触发${aggressive ? '积极' : '普通'}清理`);
    
    if (aggressive) {
      // 积极清理
      this._modules.loader.clearCache(true);
      this._modules.cacheManager.clearCache();
    } else {
      // 普通清理
      this._modules.loader.clearUnusedCache();
    }
    
    this._state.lastCleanup = Date.now();
  },
  
  /**
   * 重置优化级别
   * @param {Number} level 优化级别：0-关闭, 1-低, 2-中, 3-高
   */
  setOptimizationLevel(level) {
    if (level < 0 || level > 3) {
      this._log(1, `[PhotoOptimizationManager] 无效的优化级别: ${level}`);
      return;
    }
    
    this._config.optimizationLevel = level;
    
    // 根据优化级别调整各个模块的配置
    switch (level) {
      case 0: // 关闭
        this._config.autoMemoryOptimization = false;
        this._config.autoNetworkOptimization = false;
        break;
        
      case 1: // 低
        this._config.autoMemoryOptimization = true;
        this._config.autoNetworkOptimization = true;
        this._config.memoryOptimizationThreshold = 200;
        break;
        
      case 2: // 中
        this._config.autoMemoryOptimization = true;
        this._config.autoNetworkOptimization = true;
        this._config.memoryOptimizationThreshold = 150;
        break;
        
      case 3: // 高
        this._config.autoMemoryOptimization = true;
        this._config.autoNetworkOptimization = true;
        this._config.memoryOptimizationThreshold = 100;
        break;
    }
    
    this._log(3, `[PhotoOptimizationManager] 设置优化级别: ${level}`);
  },
  
  /**
   * 注册照片采集组件
   * 当照片采集组件创建时调用，用于跟踪活跃组件数量
   */
  registerPhotoCapture() {
    this._state.activePhotoCaptures++;
    this._log(3, `[PhotoOptimizationManager] 注册照片采集组件，当前活跃组件数: ${this._state.activePhotoCaptures}`);
  },
  
  /**
   * 注销照片采集组件
   * 当照片采集组件销毁时调用
   */
  unregisterPhotoCapture() {
    if (this._state.activePhotoCaptures > 0) {
      this._state.activePhotoCaptures--;
    }
    this._log(3, `[PhotoOptimizationManager] 注销照片采集组件，当前活跃组件数: ${this._state.activePhotoCaptures}`);
    
    // 如果没有活跃的组件了，可以执行清理
    if (this._state.activePhotoCaptures === 0) {
      this.triggerCleanup();
    }
  },
  
  /**
   * 销毁优化管理器
   */
  destroy() {
    // 停止定时器
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
    
    // 销毁各个模块
    if (this._modules.loader) {
      this._modules.loader.destroy();
    }
    
    if (this._modules.batchProcessor) {
      this._modules.batchProcessor.destroy();
    }
    
    // 取消网络状态监听
    if (this._modules.networkMonitor) {
      this._modules.networkMonitor.offNetworkStatusChange(this._handleNetworkChange);
    }
    
    this._initialized = false;
    this._log(3, '[PhotoOptimizationManager] 已销毁');
  }
};

module.exports = PhotoOptimizationManager; 