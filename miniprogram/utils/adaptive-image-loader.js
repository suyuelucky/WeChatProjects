/**
 * 自适应图片加载器
 * 根据网络和设备情况自动调整图片加载质量和策略
 */

// 导入图片加载策略和网络监视器
const ImageLoadingStrategy = require('./image-loading-strategy');
const NetworkMonitor = require('./network-monitor');
const ImageCacheManager = require('./enhanced-image-cache-manager');

// 自适应图片加载器
const AdaptiveImageLoader = {
  // 缓存队列，存储已加载的图片信息
  _imageCache: {},
  
  // 加载队列，按优先级存储待加载的任务
  _loadingQueue: [],
  
  // 当前正在执行的加载任务数
  _activeLoads: 0,
  
  // 最大并发加载任务数
  _maxConcurrent: 3,
  
  // 是否已初始化
  _isInitialized: false,
  
  /**
   * 初始化图片加载器
   * @param {Object} options 配置选项
   * @returns {Object} 当前实例
   */
  init(options = {}) {
    if (this._isInitialized) {
      return this;
    }
    
    // 合并配置
    if (options.maxConcurrent) {
      this._maxConcurrent = options.maxConcurrent;
    }
    
    // 确保依赖的模块已初始化
    ImageLoadingStrategy.init();
    ImageCacheManager.init();
    
    // 检查网络监控状态，如果未初始化则初始化
    if (!NetworkMonitor._isInitialized) {
      NetworkMonitor.init();
    }
    
    // 设置网络状态变化监听，动态调整加载策略
    this._setupNetworkMonitor();
    
    // 设置内存警告监听
    this._setupMemoryWarning();
    
    this._isInitialized = true;
    console.log('[AdaptiveImageLoader] 自适应图片加载器初始化完成');
    
    return this;
  },
  
  /**
   * 设置网络状态监听
   * @private
   */
  _setupNetworkMonitor() {
    NetworkMonitor.onNetworkChange(networkState => {
      console.log('[AdaptiveImageLoader] 网络状态变化:', networkState);
      
      // 网络状态变化时，调整加载策略
      this._adjustLoadingStrategy(networkState);
    });
  },
  
  /**
   * 设置内存警告监听
   * @private
   */
  _setupMemoryWarning() {
    this._memoryWarningHandler = (res) => {
      console.warn(`[AdaptiveImageLoader] 收到内存警告，级别: ${res.level}`);
      
      // 内存警告时，采取措施
      this._handleMemoryWarning(res.level);
    };
    
    // 注册内存警告监听
    wx.onMemoryWarning(this._memoryWarningHandler);
  },
  
  /**
   * 处理内存警告
   * @param {Number} level 警告级别
   * @private
   */
  _handleMemoryWarning(level) {
    // 根据警告级别采取不同措施
    if (level >= 10) {
      // 严重内存不足，清空加载队列和缓存
      this._cancelAllLoads();
      this._clearCache();
      
      // 释放非可见图片资源
      this.releaseInvisibleImages();
    } else if (level >= 5) {
      // 中等内存压力，降低加载质量，限制并发
      this._maxConcurrent = 1;
      this._prioritizeCriticalLoads();
    } else {
      // 轻度警告，清理部分缓存
      this._clearUnusedCache();
    }
  },
  
  /**
   * 根据网络状态调整加载策略
   * @param {Object} networkState 网络状态
   * @private
   */
  _adjustLoadingStrategy(networkState) {
    // 网络断开时暂停所有非关键加载
    if (!networkState.connected) {
      this._pauseNonCriticalLoads();
      return;
    }
    
    // 根据网络类型调整并发数和加载质量
    switch(networkState.networkType) {
      case 'wifi':
        this._maxConcurrent = 4;
        break;
      case '4g':
        this._maxConcurrent = 3;
        break;
      case '3g':
        this._maxConcurrent = 2;
        break;
      case '2g':
      default:
        this._maxConcurrent = 1;
        break;
    }
    
    // 继续加载队列中的任务
    this._processQueue();
  },
  
  /**
   * 加载图片
   * @param {String} src 图片路径
   * @param {Object} options 加载选项
   * @param {String} options.mode 加载模式 ('thumbnail', 'preview', 'full')
   * @param {Object} options.imageInfo 图片信息 {width, height, size}
   * @param {Boolean} options.isVisible 当前是否可见
   * @param {Number} options.priority 优先级 (1-5，5最高)
   * @returns {Promise<Object>} 加载结果，包含图片信息和实际加载路径
   */
  loadImage(src, options = {}) {
    if (!src) {
      return Promise.reject(new Error('图片路径不能为空'));
    }
    
    // 使用默认值
    const opt = {
      mode: options.mode || 'preview',
      imageInfo: options.imageInfo || {},
      isVisible: options.isVisible !== false,
      priority: options.priority || 3
    };
    
    // 生成加载ID
    const loadId = `${src}_${opt.mode}_${Date.now()}`;
    
    // 检查是否已在缓存中
    const cacheKey = `${src}_${opt.mode}`;
    if (this._imageCache[cacheKey]) {
      return Promise.resolve(this._imageCache[cacheKey]);
    }
    
    // 创建加载任务
    return new Promise((resolve, reject) => {
      // 添加到加载队列
      this._loadingQueue.push({
        id: loadId,
        src: src,
        options: opt,
        resolve: resolve,
        reject: reject,
        created: Date.now()
      });
      
      // 按优先级排序加载队列
      this._sortQueue();
      
      // 处理加载队列
      this._processQueue();
    });
  },
  
  /**
   * 优先加载关键图片
   * @param {String} src 图片路径
   * @param {Object} options 加载选项
   * @returns {Promise<Object>} 加载结果
   */
  loadCriticalImage(src, options = {}) {
    // 提高优先级，立即加载
    const criticalOptions = {
      ...options,
      priority: 5,
      isVisible: true
    };
    
    return this.loadImage(src, criticalOptions);
  },
  
  /**
   * 预加载图片
   * @param {String} src 图片路径
   * @param {Object} options 加载选项
   * @returns {Promise<Object>} 加载结果
   */
  preloadImage(src, options = {}) {
    // 降低优先级，后台预加载
    const preloadOptions = {
      ...options,
      priority: Math.min(options.priority || 1, 2),
      isVisible: false
    };
    
    return this.loadImage(src, preloadOptions);
  },
  
  /**
   * 处理加载队列
   * @private
   */
  _processQueue() {
    // 如果队列为空或已达到最大并发数，直接返回
    if (this._loadingQueue.length === 0 || this._activeLoads >= this._maxConcurrent) {
      return;
    }
    
    // 获取队首任务
    const task = this._loadingQueue.shift();
    this._activeLoads++;
    
    // 获取当前最佳加载策略
    const strategy = ImageLoadingStrategy.getStrategy(
      task.options.mode,
      task.options.imageInfo
    );
    
    // 根据策略构建实际加载参数
    const realSrc = this._buildLoadSrc(task.src, strategy);
    
    // 开始加载图片
    this._actualLoadImage(realSrc, strategy)
      .then(result => {
        // 缓存结果
        const cacheKey = `${task.src}_${task.options.mode}`;
        this._imageCache[cacheKey] = result;
        
        // 完成当前任务
        task.resolve(result);
      })
      .catch(error => {
        console.error('[AdaptiveImageLoader] 加载图片失败:', task.src, error);
        
        // 如果是加载级别问题，尝试降级处理
        if (strategy.quality !== 'low') {
          // 降级后重试
          const fallbackStrategy = { ...strategy, quality: 'low' };
          const fallbackSrc = this._buildLoadSrc(task.src, fallbackStrategy);
          
          // 再次尝试加载
          this._actualLoadImage(fallbackSrc, fallbackStrategy)
            .then(result => {
              const cacheKey = `${task.src}_${task.options.mode}`;
              this._imageCache[cacheKey] = result;
              task.resolve(result);
            })
            .catch(err => {
              task.reject(err);
            })
            .finally(() => {
              this._activeLoads--;
              this._processQueue();
            });
          
          return;
        }
        
        // 无法降级或其他错误
        task.reject(error);
        this._activeLoads--;
        this._processQueue();
      })
      .finally(() => {
        if (strategy.quality !== 'low') {
          this._activeLoads--;
          this._processQueue();
        }
      });
  },
  
  /**
   * 实际加载图片
   * @param {String} src 图片路径
   * @param {Object} strategy 加载策略
   * @returns {Promise<Object>} 加载结果
   * @private
   */
  _actualLoadImage(src, strategy) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: src,
        success: (res) => {
          resolve({
            src: res.path,
            width: res.width,
            height: res.height,
            type: res.type,
            orientation: res.orientation,
            strategy: strategy
          });
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },
  
  /**
   * 构建实际加载路径
   * @param {String} originalSrc 原始路径
   * @param {Object} strategy 加载策略
   * @returns {String} 处理后的加载路径
   * @private
   */
  _buildLoadSrc(originalSrc, strategy) {
    // 如果是本地路径，直接返回
    if (originalSrc.indexOf('wxfile://') === 0 || 
        originalSrc.indexOf('http://tmp/') === 0 ||
        originalSrc.indexOf('wxLocalResource://') === 0) {
      return originalSrc;
    }
    
    // 如果是网络图片，添加参数
    if (originalSrc.indexOf('http') === 0) {
      // 处理查询参数
      const hasQuery = originalSrc.indexOf('?') !== -1;
      const separator = hasQuery ? '&' : '?';
      
      // 构建查询参数
      const params = [];
      
      // 添加宽高
      if (strategy.width) {
        params.push(`w=${strategy.width}`);
      }
      if (strategy.height) {
        params.push(`h=${strategy.height}`);
      }
      
      // 添加质量
      if (strategy.quality) {
        params.push(`q=${strategy.quality === 'high' ? 90 : strategy.quality === 'medium' ? 75 : 50}`);
      }
      
      // 添加格式
      if (strategy.useWebp) {
        params.push('fmt=webp');
      }
      
      // 拼接URL
      if (params.length > 0) {
        return `${originalSrc}${separator}${params.join('&')}`;
      }
    }
    
    return originalSrc;
  },
  
  /**
   * 对加载队列排序
   * @private
   */
  _sortQueue() {
    this._loadingQueue.sort((a, b) => {
      // 首先按优先级排序（高优先级在前）
      const priorityDiff = b.options.priority - a.options.priority;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // 其次按可见性排序（可见项在前）
      if (a.options.isVisible !== b.options.isVisible) {
        return a.options.isVisible ? -1 : 1;
      }
      
      // 最后按创建时间排序（先创建的在前）
      return a.created - b.created;
    });
  },
  
  /**
   * 优先处理关键加载任务
   * @private
   */
  _prioritizeCriticalLoads() {
    // 只保留优先级最高的和可见的任务
    this._loadingQueue = this._loadingQueue.filter(task => 
      task.options.priority >= 4 || task.options.isVisible
    );
    
    // 重新排序
    this._sortQueue();
  },
  
  /**
   * 暂停非关键加载任务
   * @private
   */
  _pauseNonCriticalLoads() {
    // 只保留优先级最高的任务
    this._loadingQueue = this._loadingQueue.filter(task => 
      task.options.priority >= 5
    );
  },
  
  /**
   * 取消所有加载任务
   * @private
   */
  _cancelAllLoads() {
    // 遍历队列，拒绝所有任务
    this._loadingQueue.forEach(task => {
      task.reject(new Error('加载已取消，内存不足'));
    });
    
    // 清空队列
    this._loadingQueue = [];
    this._activeLoads = 0;
  },
  
  /**
   * 清空图片缓存
   * @private
   */
  _clearCache() {
    this._imageCache = {};
    // 通知缓存管理器清理
    ImageCacheManager.clearCache();
  },
  
  /**
   * 清理未使用的缓存
   * @private
   */
  _clearUnusedCache() {
    // 清理超过5分钟未使用的缓存
    const now = Date.now();
    const TIMEOUT = 5 * 60 * 1000; // 5分钟
    
    Object.keys(this._imageCache).forEach(key => {
      const item = this._imageCache[key];
      if (item.lastUsed && (now - item.lastUsed > TIMEOUT)) {
        delete this._imageCache[key];
      }
    });
  },
  
  /**
   * 释放不可见图片资源
   */
  releaseInvisibleImages() {
    // 这个方法在小程序环境中无法直接释放图片内存
    // 但我们可以清除缓存引用以帮助垃圾回收
    this._clearUnusedCache();
    
    // 尝试主动触发GC
    ImageLoadingStrategy.releaseMemory();
  }
};

module.exports = AdaptiveImageLoader; 