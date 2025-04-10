/**
 * 自适应加载策略管理器
 * 创建日期: 2025-04-09 15:35:21
 * 创建者: Claude AI 3.7 Sonnet
 * 
 * 根据网络环境自动调整图片加载参数，优化用户体验
 */

class AdaptiveLoadingStrategy {
  /**
   * 创建自适应加载策略实例
   * @param {Object} options - 配置选项
   * @param {Function} options.logger - 日志记录函数
   * @param {String} options.logLevel - 日志级别 (debug|info|warn|error)
   * @param {Object} options.networkStrategies - 各网络类型对应的策略配置
   */
  constructor(options = {}) {
    this.options = {
      logger: () => {}, // 默认空日志记录器
      logLevel: 'info',
      ...options
    };

    // 记录创建时间
    this.createTime = new Date();
    
    // 当前网络状态
    this.currentNetwork = {
      type: 'unknown',
      isConnected: true
    };
    
    // 默认加载策略配置
    this.defaultStrategies = {
      // WiFi环境 - 高质量，主动预加载
      wifi: {
        quality: { quality: 1.0, maxWidth: 0, maxHeight: 0 },
        preload: { enablePreload: true, preloadDepth: 3, maxConcurrent: 5 },
        retry: { maxRetries: 1, retryInterval: 500 },
        timeout: 15000
      },
      // 5G环境 - 高质量，适度预加载
      '5g': {
        quality: { quality: 0.95, maxWidth: 0, maxHeight: 0 },
        preload: { enablePreload: true, preloadDepth: 2, maxConcurrent: 4 },
        retry: { maxRetries: 1, retryInterval: 1000 },
        timeout: 12000
      },
      // 4G环境 - 较高质量，有限预加载
      '4g': {
        quality: { quality: 0.85, maxWidth: 1200, maxHeight: 1200 },
        preload: { enablePreload: true, preloadDepth: 1, maxConcurrent: 3 },
        retry: { maxRetries: 2, retryInterval: 1500 },
        timeout: 10000
      },
      // 3G环境 - 中等质量，禁用预加载
      '3g': {
        quality: { quality: 0.7, maxWidth: 800, maxHeight: 800 },
        preload: { enablePreload: false, preloadDepth: 0, maxConcurrent: 2 },
        retry: { maxRetries: 3, retryInterval: 2000 },
        timeout: 8000
      },
      // 2G环境 - 低质量，严格控制并发
      '2g': {
        quality: { quality: 0.5, maxWidth: 400, maxHeight: 400 },
        preload: { enablePreload: false, preloadDepth: 0, maxConcurrent: 1 },
        retry: { maxRetries: 3, retryInterval: 3000 },
        timeout: 5000
      },
      // 未知网络 - 中等配置，保守策略
      unknown: {
        quality: { quality: 0.8, maxWidth: 1000, maxHeight: 1000 },
        preload: { enablePreload: true, preloadDepth: 1, maxConcurrent: 2 },
        retry: { maxRetries: 2, retryInterval: 2000 },
        timeout: 8000
      },
      // 无网络 - 只使用缓存，不加载新内容
      none: {
        quality: { quality: 0.5, maxWidth: 400, maxHeight: 400 },
        preload: { enablePreload: false, preloadDepth: 0, maxConcurrent: 1 },
        retry: { maxRetries: 0, retryInterval: 5000 },
        timeout: 3000,
        cacheOnly: true
      }
    };
    
    // 合并用户自定义策略
    this.networkStrategies = {
      ...this.defaultStrategies,
      ...(options.networkStrategies || {})
    };
    
    // 初始活跃策略
    this.activeStrategy = this.networkStrategies.unknown;
    
    // 网络状态监听器引用
    this.networkStatusListener = null;
    
    // 策略变更回调函数列表
    this.strategyChangeCallbacks = [];
    
    // 网络变化延迟处理器
    this.networkChangeTimer = null;
    
    // 延迟耗时记录
    this.latencyHistory = [];
    
    // 网络质量评分(0-100)
    this.networkQualityScore = 50;
    
    this._log('debug', '自适应加载策略管理器已初始化');
  }
  
  /**
   * 初始化网络监听
   * @return {Promise} 初始化完成的Promise
   */
  init() {
    return new Promise((resolve) => {
      // 获取当前网络状态
      if (typeof wx !== 'undefined') {
        wx.getNetworkType({
          success: (res) => {
            this._handleNetworkChange({
              isConnected: res.networkType !== 'none',
              networkType: res.networkType
            });
            
            // 监听网络状态变化
            this._setupNetworkListener();
            this._log('info', `初始网络状态: ${res.networkType}`);
            resolve();
          },
          fail: () => {
            this._log('warn', '获取网络状态失败，使用默认策略');
            resolve();
          }
        });
      } else {
        this._log('warn', '无法获取网络状态 (wx对象不存在)，使用默认策略');
        resolve();
      }
    });
  }
  
  /**
   * 设置网络状态变化监听
   * @private
   */
  _setupNetworkListener() {
    if (typeof wx === 'undefined') return;
    
    // 移除旧的监听器
    if (this.networkStatusListener) {
      try {
        wx.offNetworkStatusChange(this.networkStatusListener);
      } catch (e) {
        this._log('debug', '移除网络监听器失败', e);
      }
    }
    
    // 创建新的监听器
    this.networkStatusListener = (res) => {
      this._handleNetworkChange(res);
    };
    
    // 添加监听器
    wx.onNetworkStatusChange(this.networkStatusListener);
  }
  
  /**
   * 处理网络变化事件
   * @param {Object} net - 网络状态信息
   * @param {Boolean} net.isConnected - 是否已连接
   * @param {String} net.networkType - 网络类型
   * @private
   */
  _handleNetworkChange(net) {
    // 清除之前的延迟处理
    if (this.networkChangeTimer) {
      clearTimeout(this.networkChangeTimer);
    }
    
    const oldType = this.currentNetwork.type;
    const newType = net.networkType || 'unknown';
    
    // 更新当前网络状态
    this.currentNetwork = {
      type: newType,
      isConnected: !!net.isConnected
    };
    
    this._log('info', `网络环境变化: ${oldType} -> ${newType}`, { 
      isConnected: net.isConnected 
    });
    
    // 防止频繁切换，延迟300ms再更新策略
    this.networkChangeTimer = setTimeout(() => {
      this._updateActiveStrategy();
    }, 300);
  }
  
  /**
   * 更新活跃策略
   * @private
   */
  _updateActiveStrategy() {
    const networkType = this.currentNetwork.type;
    const isConnected = this.currentNetwork.isConnected;
    
    // 如果未连接，强制使用"none"策略
    const strategyKey = !isConnected ? 'none' : 
                       (this.networkStrategies[networkType] ? networkType : 'unknown');
    
    const newStrategy = this.networkStrategies[strategyKey];
    const oldStrategy = this.activeStrategy;
    
    // 更新活跃策略
    this.activeStrategy = newStrategy;
    
    this._log('info', `已应用自适应策略调整: ${strategyKey}`, { 
      quality: newStrategy.quality.quality,
      maxConcurrent: newStrategy.preload.maxConcurrent,
      retry: newStrategy.retry.maxRetries,
      cacheOnly: !!newStrategy.cacheOnly
    });
    
    // 触发策略变更事件
    this._triggerStrategyChange(oldStrategy, newStrategy);
  }
  
  /**
   * 触发策略变更事件
   * @param {Object} oldStrategy - 旧策略
   * @param {Object} newStrategy - 新策略
   * @private
   */
  _triggerStrategyChange(oldStrategy, newStrategy) {
    this.strategyChangeCallbacks.forEach(callback => {
      try {
        callback(newStrategy, oldStrategy, this.currentNetwork);
      } catch (e) {
        this._log('error', '执行策略变更回调失败', e);
      }
    });
  }
  
  /**
   * 添加策略变更监听器
   * @param {Function} callback - 当策略变更时调用的回调函数
   * @return {Function} 用于移除监听器的函数
   */
  onStrategyChange(callback) {
    if (typeof callback !== 'function') {
      this._log('warn', '添加的策略变更监听器不是函数');
      return () => {};
    }
    
    this.strategyChangeCallbacks.push(callback);
    
    // 立即触发一次回调，将当前活跃策略通知给监听器
    setTimeout(() => {
      try {
        callback(this.activeStrategy, null, this.currentNetwork);
      } catch (e) {
        this._log('error', '执行初始策略回调失败', e);
      }
    }, 0);
    
    // 返回用于移除监听器的函数
    return () => {
      const index = this.strategyChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.strategyChangeCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * 获取当前活跃策略
   * @return {Object} 当前活跃策略
   */
  getActiveStrategy() {
    return { ...this.activeStrategy };
  }
  
  /**
   * 获取当前网络状态
   * @return {Object} 当前网络状态
   */
  getCurrentNetwork() {
    return { ...this.currentNetwork };
  }
  
  /**
   * 记录网络延迟数据
   * @param {Number} latency - 延迟时间(毫秒)
   */
  recordLatency(latency) {
    if (typeof latency !== 'number' || latency < 0) return;
    
    // 记录延迟数据（最多保留20条）
    this.latencyHistory.push({
      latency,
      timestamp: Date.now(),
      networkType: this.currentNetwork.type
    });
    
    if (this.latencyHistory.length > 20) {
      this.latencyHistory.shift();
    }
    
    // 更新网络质量评分
    this._updateNetworkQualityScore();
  }
  
  /**
   * 更新网络质量评分
   * @private
   */
  _updateNetworkQualityScore() {
    if (this.latencyHistory.length === 0) return;
    
    // 只使用最近10条记录
    const recentHistory = this.latencyHistory.slice(-10);
    
    // 计算平均延迟
    const avgLatency = recentHistory.reduce((sum, record) => sum + record.latency, 0) / recentHistory.length;
    
    // 计算网络质量评分 (0-100)
    // 延迟低于100ms为满分，高于3000ms为0分
    const maxGoodLatency = 100;  // 理想延迟值
    const minBadLatency = 3000;  // 最差延迟值
    
    let score = 0;
    if (avgLatency <= maxGoodLatency) {
      score = 100;
    } else if (avgLatency >= minBadLatency) {
      score = 0;
    } else {
      score = 100 - ((avgLatency - maxGoodLatency) / (minBadLatency - maxGoodLatency) * 100);
    }
    
    this.networkQualityScore = Math.round(score);
    
    this._log('debug', `网络质量评分: ${this.networkQualityScore}`, { 
      avgLatency, 
      samples: recentHistory.length 
    });
  }
  
  /**
   * 获取网络质量评分
   * @return {Number} 网络质量评分(0-100)
   */
  getNetworkQualityScore() {
    return this.networkQualityScore;
  }
  
  /**
   * 获取推荐的图片加载配置
   * @param {Object} options - 自定义配置选项
   * @return {Object} 经过网络环境优化后的加载配置
   */
  getLoadingOptions(options = {}) {
    const strategy = this.activeStrategy;
    
    // 默认配置
    const defaultOptions = {
      // 基本选项
      useCache: true,
      timeout: strategy.timeout || 10000,
      
      // 质量控制
      quality: strategy.quality.quality,
      maxWidth: strategy.quality.maxWidth || 0,
      maxHeight: strategy.quality.maxHeight || 0,
      
      // 预加载配置
      enablePreload: strategy.preload.enablePreload,
      preloadDepth: strategy.preload.preloadDepth || 0,
      maxConcurrent: strategy.preload.maxConcurrent || 2,
      
      // 重试配置
      maxRetries: strategy.retry.maxRetries || 1,
      retryInterval: strategy.retry.retryInterval || 1000,
      
      // 是否仅使用缓存
      cacheOnly: !!strategy.cacheOnly
    };
    
    // 合并自定义选项
    return {
      ...defaultOptions,
      ...options,
      // 强制执行缓存配置（无网络时强制使用缓存）
      ...(strategy.cacheOnly ? { cacheOnly: true } : {})
    };
  }
  
  /**
   * 记录日志
   * @param {String} level - 日志级别
   * @param {String} message - 日志消息
   * @param {Object} data - 附加数据
   * @private
   */
  _log(level, message, data = {}) {
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = logLevels[this.options.logLevel] || 1;
    
    if (logLevels[level] >= configLevel) {
      try {
        this.options.logger(level, `[AdaptiveLoading] ${message}`, data);
      } catch (e) {
        console.error('日志记录失败:', e);
      }
    }
  }
  
  /**
   * 销毁实例，清理资源
   */
  destroy() {
    // 移除网络状态监听器
    if (typeof wx !== 'undefined' && this.networkStatusListener) {
      try {
        wx.offNetworkStatusChange(this.networkStatusListener);
        this.networkStatusListener = null;
      } catch (e) {
        this._log('warn', '移除网络监听器失败', e);
      }
    }
    
    // 清除定时器
    if (this.networkChangeTimer) {
      clearTimeout(this.networkChangeTimer);
      this.networkChangeTimer = null;
    }
    
    // 清除回调列表
    this.strategyChangeCallbacks = [];
    
    this._log('debug', '自适应加载策略管理器已销毁');
  }
}

module.exports = AdaptiveLoadingStrategy; 