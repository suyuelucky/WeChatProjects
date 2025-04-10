/**
 * 优化的图片加载器
 * 解决B1模块图片加载性能问题，实现智能缓存和预加载
 * 
 * 创建时间: 2025-04-09 19:45:00
 * 创建者: Claude AI 3.7 Sonnet
 * 编辑时间: 2025-04-09 20:05:32
 * 编辑时间: 2025-04-09 20:10:45
 * 编辑时间: 2025-04-09 22:05:18 - 内存管理优化
 * 编辑时间: 2025-04-09 22:15:43 - 性能优化和测试记录
 * 编辑时间: 2025-04-09 22:35:55 - 安全漏洞修复
 * 编辑时间: 2025-04-09 22:45:20 - 网络适应性增强
 * 编辑时间: 2025-04-09 20:27:55
 * 编辑时间: 2025-04-10 03:10:25 - 增强网络自适应能力
 * 编辑者: Claude AI 3.7 Sonnet
 */

const AdaptiveLoadingStrategy = require('./adaptive-loading-strategy');

/**
 * 优化的图片加载器
 */
const OptimizedImageLoader = {
  // 缓存管理
  _cache: {
    images: {},
    thumbnails: {},
    previewQueue: [],
    preloadQueue: [],
    totalSize: 0,
    maxSize: 50 * 1024 * 1024 // 默认最大缓存50MB
  },
  
  // 配置选项
  _config: {
    maxCacheSize: 50 * 1024 * 1024, // 默认50MB缓存上限
    thumbnailSize: 200, // 缩略图尺寸
    previewSize: 800, // 预览图尺寸
    concurrentLoads: 5, // 最大并发加载数
    timeout: 15000, // 超时时间(ms)
    retryCount: 3, // 重试次数
    retryDelay: 1000, // 重试延迟(ms)
    cacheExpiration: 7 * 24 * 60 * 60 * 1000, // 缓存过期时间（7天）
    logLevel: 'info', // 日志级别：debug, info, warn, error
    weakNetworkTimeoutMultiplier: 2, // 弱网环境超时时间倍数
    
    // 弱网环境优化配置
    weakNetworkMaxWidth: 800, // 弱网下图片最大宽度
    weakNetworkMaxHeight: 800, // 弱网下图片最大高度
    weakNetworkQuality: 75, // 弱网下图片质量(1-100)
    weakNetworkMaxRetries: 5, // 弱网下最大重试次数
    weakNetworkPrioritizeCache: true, // 弱网下优先使用缓存
    weakNetworkRetryInterval: 2000, // 弱网下重试间隔(ms)
    maxRetryDelay: 30000, // 最大重试延迟(ms)
    
    // 内存管理相关
    memoryPressureLimit: 200, // 内存压力阈值(MB)
    autoCleanMemoryTrigger: 150, // 自动清理内存的触发阈值(MB)
    adaptiveLoadingEnabled: true, // 是否启用自适应加载
    
    // 性能日志记录
    enablePerformanceLogging: true, // 是否记录性能日志
    maxPerformanceLogs: 100 // 最大性能日志数量
  },
  
  // 加载状态
  _loading: {
    tasks: [],
    currentTasks: 0
  },
  
  // 网络状态
  _networkStatus: {
    isConnected: true,
    type: 'wifi',
    lastCheckTime: 0,
    signalStrength: 'strong', // strong, medium, weak
    downloadSpeed: 0, // 估算下载速度 (KB/s)
    failureRate: 0, // 估算失败率 (0-1)
    reconnectCount: 0, // 网络重连次数
    lastReconnectTime: 0 // 上次重连时间
  },
  
  // 断点续传任务
  _resumableDownloads: {},
  
  // 网络性能数据
  _networkPerformance: {
    samples: 0,
    avgResponseTime: 0,
    minResponseTime: 0,
    maxResponseTime: 0,
    successCount: 0,
    failureCount: 0,
    failureRate: 0,
    lastUpdate: 0
  },
  
  // 网络波动检测数据
  _networkFluctuation: {
    enabled: true,
    samples: [],  // 存储最近的网络样本数据
    maxSamples: 20, // 最多保存的样本数
    fluctuationScore: 0, // 波动评分 (0-100)
    lastCheckTime: 0,
    instabilityDetected: false, // 是否检测到网络不稳定
    consecutiveSlowResponses: 0 // 连续慢响应次数
  },
  
  /**
   * 初始化加载器
   * @param {Object} options 配置选项
   * @returns {Object} 当前实例
   */
  init: function(options) {
    // 合并配置
    if (options) {
      for (var key in options) {
        if (options.hasOwnProperty(key) && this._config.hasOwnProperty(key)) {
          this._config[key] = options[key];
        }
      }
    }
    
    // 缓存预热
    this._warmupCache();
    
    // 设置内存警告监听
    this._setupMemoryListener();
    
    // 开始网络状态监控
    this._setupNetworkMonitor();
    
    // 网络自适应配置
    this.adaptiveLoadingEnabled = options.adaptiveLoadingEnabled !== false;
    this.adaptiveStrategy = null;
    
    if (this.adaptiveLoadingEnabled) {
      this.adaptiveStrategy = new AdaptiveLoadingStrategy({
        logger: this._log.bind(this),
        logLevel: options.logLevel,
        networkStrategies: options.networkStrategies
      });
      
      // 添加策略变更回调
      this._adaptiveStrategyUnsubscribe = this.adaptiveStrategy.onStrategyChange(
        this._onAdaptiveStrategyChange.bind(this)
      );
    }
    
    this._log('优化的图片加载器初始化完成');
    
    return this;
  },
  
  /**
   * 预热缓存
   * @private
   */
  _warmupCache: function() {
    var that = this;
    
    // 从本地存储恢复缓存索引（如果有）
    wx.getStorage({
      key: 'optimized_image_cache_index',
      success: function(res) {
        if (res.data && typeof res.data === 'object') {
          // 恢复缓存索引
          that._log('从存储恢复缓存索引', res.data);
          
          // 验证缓存项是否仍然存在
          that._validateCacheItems(res.data);
        }
      },
      fail: function() {
        that._log('无缓存索引，创建新缓存');
      }
    });
  },
  
  /**
   * 验证缓存项是否存在
   * @param {Object} cacheIndex 缓存索引
   * @private
   */
  _validateCacheItems: function(cacheIndex) {
    var that = this;
    var fsm = wx.getFileSystemManager();
    var validImages = {};
    var validThumbnails = {};
    var totalSize = 0;
    
    // 验证图片缓存
    if (cacheIndex.images) {
      Object.keys(cacheIndex.images).forEach(function(key) {
        var cacheItem = cacheIndex.images[key];
        
        // 检查文件是否存在
        try {
          var stats = fsm.statSync(cacheItem.path);
          
          if (stats && stats.size > 0) {
            // 文件有效，保留在缓存中
            validImages[key] = cacheItem;
            totalSize += stats.size;
            
            // 更新实际大小
            cacheItem.size = stats.size;
            that._log('验证缓存图片: ' + key, cacheItem);
          } else {
            that._log('缓存图片无效: ' + key, null, true);
          }
        } catch (e) {
          that._log('缓存图片不存在: ' + key, e.message);
        }
      });
    }
    
    // 验证缩略图缓存
    if (cacheIndex.thumbnails) {
      Object.keys(cacheIndex.thumbnails).forEach(function(key) {
        var cacheItem = cacheIndex.thumbnails[key];
        
        // 检查文件是否存在
        try {
          var stats = fsm.statSync(cacheItem.path);
          
          if (stats && stats.size > 0) {
            // 文件有效，保留在缓存中
            validThumbnails[key] = cacheItem;
            totalSize += stats.size;
            
            // 更新实际大小
            cacheItem.size = stats.size;
            that._log('验证缓存缩略图: ' + key, cacheItem);
          } else {
            that._log('缓存缩略图无效: ' + key, null, true);
          }
        } catch (e) {
          that._log('缓存缩略图不存在: ' + key, e.message);
        }
      });
    }
    
    // 更新缓存状态
    this._cache.images = validImages;
    this._cache.thumbnails = validThumbnails;
    this._cache.totalSize = totalSize;
    
    this._log('缓存验证完成，有效缓存大小: ' + (totalSize / (1024 * 1024)).toFixed(2) + 'MB');
    
    // 如果缓存超过最大大小，清理一些
    if (totalSize > this._cache.maxSize) {
      this.clearCache(false);
    }
  },
  
  /**
   * 设置内存警告监听
   * @private
   */
  _setupMemoryListener: function() {
    var that = this;
    
    if (typeof wx !== 'undefined' && wx.onMemoryWarning) {
      wx.onMemoryWarning(function(res) {
        var level = res.level || 0;
        that._log('收到内存警告，级别: ' + level, true);
        
        // 根据警告级别执行缓存清理
        if (level >= 10) {
          that.clearCache(level >= 15);
        }
      });
    }
  },
  
  /**
   * 验证URL安全性
   * @param {String} url 需要验证的URL
   * @returns {Boolean} 是否安全
   * @private
   */
  _validateUrlSafety: function(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    // 检查是否是有效的URL格式
    try {
      // 限制协议为http和https
      const urlPattern = /^https?:\/\/[a-zA-Z0-9-_.]+\.[a-zA-Z0-9-_]+/i;
      if (!urlPattern.test(url)) {
        this._log(`不安全的URL协议: ${url}`, null, true);
        return false;
      }
      
      // 检查是否包含潜在的XSS攻击代码
      const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /on\w+=/i,
        /<img/i,
        /<svg/i,
        /<iframe/i
      ];
      
      for (const pattern of xssPatterns) {
        if (pattern.test(url)) {
          this._log(`检测到潜在的XSS攻击: ${url}`, null, true);
          return false;
        }
      }
      
      // 检查是否包含路径遍历尝试
      const pathTraversalPatterns = [
        /\.\.\//,      // ../
        /\.\.%2f/i,    // ..%2f
        /\.\.\\\/,     // ..\
        /\.\.%5c/i,    // ..%5c
        /\.\.%255c/i   // ..%255c
      ];
      
      for (const pattern of pathTraversalPatterns) {
        if (pattern.test(url)) {
          this._log(`检测到路径遍历尝试: ${url}`, null, true);
          return false;
        }
      }
      
      // 检查文件扩展名是否为图片格式
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const fileExtPattern = /\.([a-zA-Z0-9]+)(?:\?|#|$)/i;
      const extMatch = url.match(fileExtPattern);
      
      if (extMatch) {
        const extension = `.${extMatch[1].toLowerCase()}`;
        const isAllowedExt = allowedExtensions.includes(extension);
        
        if (!isAllowedExt) {
          this._log(`不允许的文件扩展名: ${extension}`, null, true);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      this._log(`URL安全验证出错: ${error.message}`, null, true);
      return false;
    }
  },
  
  /**
   * 生成安全的缓存键
   * @param {String} url 图片URL
   * @param {String} type 类型标识
   * @returns {String} 缓存键
   * @private
   */
  _generateCacheKey: function(url, type) {
    if (!url) return '';
    
    // 提取URL的唯一部分作为键，移除所有非字母数字字符
    var key = url.replace(/[^a-zA-Z0-9]/g, '_');
    
    // 限制键的长度，避免过长
    if (key.length > 100) {
      key = key.substring(0, 100);
    }
    
    // 添加安全校验和（简单的哈希值）
    let checksum = 0;
    for (let i = 0; i < url.length; i++) {
      checksum = ((checksum << 5) - checksum) + url.charCodeAt(i);
      checksum = checksum & checksum; // 转换为32位整数
    }
    
    // 添加类型标识和校验和
    key = (type || 'img') + '_' + Math.abs(checksum) + '_' + key;
    
    return key;
  },
  
  /**
   * 获取安全的缓存路径
   * @param {String} key 缓存键
   * @param {String} ext 扩展名
   * @returns {String} 缓存路径
   * @private
   */
  _getCachePath: function(key, ext) {
    // 安全检查 - 确保key不包含目录遍历
    if (!key || key.includes('..') || key.includes('/') || key.includes('\\')) {
      this._log('不安全的缓存键', key, true);
      // 生成一个安全的随机键
      key = 'safe_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    }
    
    // 检查扩展名安全性
    const safeExt = (ext && /^\.[a-zA-Z0-9]+$/.test(ext)) ? ext : '.jpg';
    
    // 获取临时目录
    var tmpDir = wx.env.USER_DATA_PATH + '/image_cache/';
    
    // 确保目录存在
    try {
      wx.getFileSystemManager().accessSync(tmpDir);
    } catch (e) {
      // 目录不存在，创建
      try {
        wx.getFileSystemManager().mkdirSync(tmpDir, true);
      } catch (err) {
        this._log('创建缓存目录失败', err, true);
      }
    }
    
    return tmpDir + key + safeExt;
  },
  
  /**
   * 加载图片
   * @param {String} url 图片URL
   * @param {Object} options 加载选项
   * @returns {Promise} 加载结果Promise
   */
  loadImage: function(url, options) {
    var that = this;
    options = options || {};
    
    // 记录开始时间（性能测试用）
    var startTime = Date.now();
    
    return new Promise(function(resolve, reject) {
      if (!url) {
        reject(new Error('无效的图片URL'));
        return;
      }
      
      // 安全检查URL
      if (!that._validateUrlSafety(url)) {
        that._log('URL安全检查未通过，拒绝加载', url, true);
        reject(new Error('URL安全检查未通过，拒绝加载'));
        return;
      }
      
      var cacheKey = that._generateCacheKey(url, options.type || 'img');
      var isThumbnail = options.thumbnail === true;
      var isPreview = options.preview === true;
      
      // 检查图片是否在缓存中
      var cacheTarget = isThumbnail ? that._cache.thumbnails : that._cache.images;
      var cacheItem = cacheTarget[cacheKey];
      
      if (cacheItem && cacheItem.path) {
        try {
          // 验证缓存文件存在
          wx.getFileSystemManager().accessSync(cacheItem.path);
          
          // 更新缓存项使用时间和计数
          cacheItem.lastUsed = Date.now();
          cacheItem.accessCount = (cacheItem.accessCount || 0) + 1;
          
          // 记录缓存命中
          that._recordPerformance(url, 'cache_hit', Date.now() - startTime);
          
          that._log('从缓存中获取图片: ' + url, cacheItem);
          
          // 返回缓存图片路径
          resolve({
            path: cacheItem.path,
            width: cacheItem.width,
            height: cacheItem.height,
            size: cacheItem.size,
            fromCache: true,
            loadTime: Date.now() - startTime
          });
          
          return;
        } catch (e) {
          // 缓存文件不存在或损坏，删除缓存项
          that._log('缓存损坏，重新加载: ' + url, e.message);
          delete cacheTarget[cacheKey];
          
          // 记录缓存失效
          that._recordPerformance(url, 'cache_invalid', 0);
        }
      } else {
        // 记录缓存未命中
        that._recordPerformance(url, 'cache_miss', 0);
      }
      
      // 创建下载任务
      var task = {
        url: url,
        cacheKey: cacheKey,
        isThumbnail: isThumbnail,
        isPreview: isPreview,
        options: options,
        resolve: function(result) {
          // 添加加载时间到结果
          result.loadTime = Date.now() - startTime;
          
          // 记录性能
          that._recordPerformance(url, 'load_complete', result.loadTime);
          
          // 调用原始resolve
          resolve(result);
        },
        reject: function(error) {
          // 记录失败
          that._recordPerformance(url, 'load_failed', Date.now() - startTime);
          
          // 调用原始reject
          reject(error);
        },
        retryCount: 0,
        timeout: options.timeout || that._config.timeout,
        timeoutTimer: null,
        startTime: startTime // 记录任务开始时间
      };
      
      // 如果当前正在执行的任务少于最大并发数，立即执行
      if (that._loading.currentTasks < that._config.concurrentLoads) {
        that._executeLoadTask(task);
      } else {
        // 否则添加到队列中
        that._loading.tasks.push(task);
        that._log('添加加载任务到队列: ' + url);
        
        // 记录排队
        that._recordPerformance(url, 'queued', 0);
      }
    });
  },
  
  /**
   * 执行加载任务
   * @param {Object} task 加载任务
   * @private
   */
  _executeLoadTask: function(task) {
    var that = this;
    var targetSize = task.isThumbnail ? this._config.thumbnailSize : 
                    (task.isPreview ? this._config.previewSize : 0);
    
    this._loading.currentTasks++;
    this._log('开始加载图片: ' + task.url + (targetSize ? ', 目标尺寸: ' + targetSize : ''));
    
    // 应用弱网环境优化
    task = this._enhancedWeakNetworkAdaptation(task);
    
    // 根据网络状态调整超时时间
    var adjustedTimeout = task.timeout;
    if (this._networkStatus.signalStrength === 'weak') {
      adjustedTimeout *= this._config.weakNetworkTimeoutMultiplier;
      this._log('弱网环境，超时时间调整为: ' + adjustedTimeout + 'ms');
    }
    
    // 获取自适应配置
    var adaptiveConfig = this.adaptiveLoadingEnabled && this.adaptiveStrategy ? 
                        this.adaptiveStrategy.getLoadingOptions(task.options) : {};
    
    // 应用自适应配置
    if (adaptiveConfig.timeout) {
      adjustedTimeout = Math.max(adjustedTimeout, adaptiveConfig.timeout);
    }
    
    // 如果网络断开或者是只缓存模式，尝试从缓存获取
    if (!this._networkStatus.isConnected || 
        (adaptiveConfig.cacheOnly && this.adaptiveLoadingEnabled)) {
      var cacheKey = task.cacheKey;
      var cacheTarget = task.isThumbnail ? this._cache.thumbnails : this._cache.images;
      var cacheItem = cacheTarget[cacheKey];
      
      if (cacheItem && cacheItem.path) {
        try {
          // 验证缓存文件
          wx.getFileSystemManager().accessSync(cacheItem.path);
          
          // 更新缓存项
          cacheItem.lastUsed = Date.now();
          cacheItem.accessCount = (cacheItem.accessCount || 0) + 1;
          
          // 从缓存返回
          this._log('断网模式：从缓存获取图片: ' + task.url);
          
          this._loading.currentTasks--;
          
          // 加载下一个任务
          this._loadNextTask();
          
          // 返回缓存结果
          task.resolve({
            path: cacheItem.path,
            width: cacheItem.width,
            height: cacheItem.height,
            size: cacheItem.size,
            fromCache: true,
            loadTime: Date.now() - task.startTime
          });
          
          return;
        } catch (e) {
          // 缓存无效，需要处理失败情况
          this._log('缓存文件无效: ' + e.message, null, true);
          delete cacheTarget[cacheKey];
        }
      }
      
      // 如果断网模式且无缓存，直接返回失败
      if (!this._networkStatus.isConnected || adaptiveConfig.cacheOnly) {
        this._log('断网模式：无可用缓存，加载失败: ' + task.url, null, true);
        
        this._loading.currentTasks--;
        
        // 加载下一个任务
        this._loadNextTask();
        
        // 拒绝Promise
        task.reject(new Error('网络已断开，且无可用缓存'));
        
        return;
      }
    }
    
    // 创建下载任务
    var downloadTask = wx.downloadFile({
      url: task.url,
      header: {},
      timeout: adjustedTimeout,
      success: function(res) {
        // 清除超时定时器
        if (task.timeoutTimer) {
          clearTimeout(task.timeoutTimer);
          task.timeoutTimer = null;
        }
        
        // 重置连续失败计数
        that._consecutiveFailures = 0;
        
        // 成功下载
        if (res.statusCode >= 200 && res.statusCode < 300 || res.statusCode === 304 || 
           (adaptiveConfig.cacheOnly && this.adaptiveLoadingEnabled)) {
          
          that._log('图片下载成功: ' + task.url, {
            statusCode: res.statusCode,
            tempFile: res.tempFilePath
          });
          
          // 清除断点续传记录
          delete that._resumableDownloads[task.url];
          
          // 记录网络性能数据
          that._recordNetworkPerformance(true, Date.now() - task.startTime);
          
          // 处理图片加载成功
          that._processDownloadSuccess(task, res.tempFilePath);
        } else {
          // HTTP错误
          var error = new Error('HTTP错误: ' + res.statusCode);
          that._handleRequestFailure(task, error, res.statusCode);
        }
      },
      fail: function(err) {
        // 清除超时定时器
        if (task.timeoutTimer) {
          clearTimeout(task.timeoutTimer);
          task.timeoutTimer = null;
        }
        
        // 记录失败，但排除用户手动中断的情况
        if (err.errMsg && err.errMsg.indexOf('abort') === -1) {
          that._handleRequestFailure(task, err, 0);
        }
      },
      complete: function() {
        // 下载任务对象完成后置空，防止内存泄漏
        task.downloadTask = null;
      }
    });
    
    // 设置下载进度回调
    if (downloadTask && downloadTask.onProgressUpdate) {
      downloadTask.onProgressUpdate(function(res) {
        // 更新接收的字节数
        var newReceivedBytes = Math.floor(res.totalBytesWritten);
        
        // 只有在进度增加时才更新
        if (newReceivedBytes > task.receivedBytes) {
          task.receivedBytes = newReceivedBytes;
          task.totalBytes = Math.max(task.totalBytes, res.totalBytesExpectedToWrite);
          
          // 重置超时定时器（数据在流动，说明连接是活的）
          if (task.timeoutTimer) {
            clearTimeout(task.timeoutTimer);
            task.timeoutTimer = null;
            createTimeout();
          }
          
          // 更新断点续传信息
          that._resumableDownloads[task.url] = {
            url: task.url,
            receivedBytes: task.receivedBytes,
            totalBytes: task.totalBytes,
            timestamp: Date.now()
          };
          
          // 计算并记录下载速度
          if (task.lastProgressTime) {
            var timeDiff = Date.now() - task.lastProgressTime;
            var bytesDiff = task.receivedBytes - task.lastReceivedBytes;
            
            if (timeDiff > 0) {
              var downloadSpeed = (bytesDiff / timeDiff) * 1000 / 1024; // KB/s
              that._updateNetworkStats({downloadSpeed});
            }
          }
          
          // 记录最后进度更新时间和字节数
          task.lastProgressTime = Date.now();
          task.lastReceivedBytes = task.receivedBytes;
          
          // 计算加载进度
          var progress = task.totalBytes > 0 ? 
                        (task.receivedBytes / task.totalBytes) : 0;
          
          // 触发进度回调
          if (typeof task.options.onProgress === 'function') {
            try {
              task.options.onProgress({
                url: task.url,
                receivedBytes: task.receivedBytes,
                totalBytes: task.totalBytes,
                progress: progress
              });
            } catch (e) {
              that._log('进度回调执行出错: ' + e.message);
            }
          }
        }
      });
    }
    
    // 设置初始超时
    createTimeout();
    
    // 记录当前下载任务
    this._loading.currentDownloads = this._loading.currentDownloads || {};
    this._loading.currentDownloads[task.url] = task;
  },
  
  /**
   * 调整图片大小
   * @param {String} filePath 图片文件路径
   * @param {Object} imgInfo 图片信息
   * @param {Number} targetSize 目标尺寸
   * @param {Object} task 加载任务
   * @private
   */
  _resizeImage: function(filePath, imgInfo, targetSize, task) {
    var that = this;
    
    // 计算调整后的尺寸，保持纵横比
    var ratio = Math.min(targetSize / imgInfo.width, targetSize / imgInfo.height);
    var width = Math.round(imgInfo.width * ratio);
    var height = Math.round(imgInfo.height * ratio);
    
    // 获取当前页面
    var currentPages = getCurrentPages();
    var currentPage = currentPages[currentPages.length - 1];
    
    // 如果获取不到页面，直接使用原图，避免失败
    if (!currentPage) {
      this._log('无法获取当前页面，跳过图片调整', null, true);
      this._saveImageToCache(filePath, imgInfo, task);
      return;
    }
    
    this._log(`调整图片大小: ${imgInfo.width}x${imgInfo.height} -> ${width}x${height}`);
    
    // 获取canvas上下文
    var query = currentPage.createSelectorQuery();
    
    // 创建临时离屏canvas
    query.select('#optimizedImageCanvas')
      .fields({ node: true, size: true })
      .exec(function(res) {
        var canvas;
        var ctx;
        
        try {
          // 检查是否获取到canvas节点
          if (!res || !res[0] || !res[0].node) {
            // 如果没有获取到canvas节点，直接使用原图
            that._log('无法获取canvas节点，跳过图片调整', null, true);
            that._saveImageToCache(filePath, imgInfo, task);
            return;
          }
          
          canvas = res[0].node;
          ctx = canvas.getContext('2d');
          
          // 设置canvas尺寸
          canvas.width = width;
          canvas.height = height;
          
          // 清空canvas
          ctx.clearRect(0, 0, width, height);
          
          // 创建图片对象
          var img = canvas.createImage();
          
          // 设置图片加载事件
          img.onload = function() {
            try {
              // 绘制图片到canvas
              ctx.drawImage(img, 0, 0, width, height);
              
              // 从canvas导出图片
              wx.canvasToTempFilePath({
                canvas: canvas,
                width: width,
                height: height,
                destWidth: width,
                destHeight: height,
                fileType: 'jpg',
                quality: that._config.quality,
                success: function(res) {
                  // 使用缩放后的图片
                  var resizedPath = res.tempFilePath;
                  
                  // 更新图片信息
                  var resizedInfo = {
                    width: width,
                    height: height,
                    path: resizedPath
                  };
                  
                  // 保存调整后的图片到缓存
                  that._saveImageToCache(resizedPath, resizedInfo, task);
                  
                  // 释放资源
                  that._releaseResources(ctx, canvas, img);
                },
                fail: function(error) {
                  that._log('导出调整后的图片失败', error, true);
                  
                  // 失败时使用原图
                  that._saveImageToCache(filePath, imgInfo, task);
                  
                  // 释放资源
                  that._releaseResources(ctx, canvas, img);
                }
              });
            } catch (e) {
              that._log('绘制图片到canvas失败', e.message, true);
              
              // 出错时使用原图
              that._saveImageToCache(filePath, imgInfo, task);
              
              // 释放资源
              that._releaseResources(ctx, canvas, img);
            }
          };
          
          // 设置错误处理
          img.onerror = function() {
            that._log('图片加载失败', null, true);
            
            // 失败时使用原图
            that._saveImageToCache(filePath, imgInfo, task);
            
            // 释放资源
            that._releaseResources(ctx, canvas, img);
          };
          
          // 设置图片路径，触发加载
          img.src = filePath;
        } catch (e) {
          that._log('创建canvas上下文失败', e.message, true);
          
          // 出错时使用原图
          that._saveImageToCache(filePath, imgInfo, task);
          
          // 释放资源
          if (ctx && canvas) {
            that._releaseResources(ctx, canvas, img);
          }
        }
      });
  },
  
  /**
   * 释放资源，防止内存泄漏
   * @param {Object} ctx canvas上下文
   * @param {Object} canvas canvas对象 
   * @param {Object} img 图片对象
   * @private
   */
  _releaseResources: function(ctx, canvas, img) {
    // 清理canvas
    if (ctx) {
      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } catch (e) {
        this._log('清理canvas失败', e.message);
      }
    }
    
    // 解除图片引用
    if (img) {
      img.onload = null;
      img.onerror = null;
    }
    
    // 设置canvas宽高为0，释放内存
    if (canvas) {
      try {
        canvas.width = 0;
        canvas.height = 0;
      } catch (e) {
        this._log('重置canvas尺寸失败', e.message);
      }
    }
    
    // 在下一个事件循环中触发垃圾回收
    setTimeout(function() {
      if (typeof gc === 'function') {
        try {
          gc();
        } catch (e) {
          // 忽略gc错误
        }
      }
    }, 100);
  },
  
  /**
   * 保存图片到缓存
   * @param {String} filePath 文件路径
   * @param {Object} imgInfo 图片信息
   * @param {Object} task 加载任务
   * @private
   */
  _saveImageToCache: function(filePath, imgInfo, task) {
    var that = this;
    var fsm = wx.getFileSystemManager();
    
    // 验证文件路径安全性
    if (!filePath || typeof filePath !== 'string') {
      that._log('无效的文件路径', filePath, true);
      
      // 更新加载状态
      that._loading.currentTasks--;
      
      // 加载下一个任务
      that._loadNextTask();
      
      // 拒绝Promise
      task.reject(new Error('无效的文件路径'));
      return;
    }
    
    // 验证文件是否真实存在
    try {
      fsm.accessSync(filePath);
    } catch (e) {
      that._log('文件不存在', filePath, true);
      
      // 更新加载状态
      that._loading.currentTasks--;
      
      // 加载下一个任务
      that._loadNextTask();
      
      // 拒绝Promise
      task.reject(new Error('文件不存在'));
      return;
    }
    
    // 验证是否为图片文件
    const mimeCheck = new Promise((resolve) => {
      fsm.readFile({
        filePath: filePath,
        position: 0,
        length: 12, // 只读取文件头部来判断文件类型
        success: (res) => {
          const header = res.data;
          let isImage = false;
          
          // 检查常见图片格式的文件头
          // JPEG: FF D8 FF
          // PNG: 89 50 4E 47
          // GIF: 47 49 46 38
          // WEBP: 52 49 46 46 ... 57 45 42 50
          // BMP: 42 4D
          
          if (header.byteLength >= 3) {
            const byte1 = header[0];
            const byte2 = header[1];
            const byte3 = header[2];
            
            if (
              (byte1 === 0xFF && byte2 === 0xD8 && byte3 === 0xFF) || // JPEG
              (byte1 === 0x89 && byte2 === 0x50 && byte3 === 0x4E) || // PNG
              (byte1 === 0x47 && byte2 === 0x49 && byte3 === 0x46) || // GIF
              (byte1 === 0x52 && byte2 === 0x49 && byte3 === 0x46) || // WEBP/RIFF
              (byte1 === 0x42 && byte2 === 0x4D)                      // BMP
            ) {
              isImage = true;
            }
          }
          
          resolve(isImage);
        },
        fail: () => {
          // 无法读取文件头，保守处理为非图片
          resolve(false);
        }
      });
    });
    
    mimeCheck.then((isImage) => {
      if (!isImage) {
        that._log('无效的图片文件类型', filePath, true);
        
        // 更新加载状态
        that._loading.currentTasks--;
        
        // 加载下一个任务
        that._loadNextTask();
        
        // 拒绝Promise
        task.reject(new Error('无效的图片文件类型'));
        return;
      }
      
      // 生成安全的缓存路径
      var cachePath = that._getCachePath(task.cacheKey);
      
      // 复制文件到缓存目录
      fsm.copyFile({
        srcPath: filePath,
        destPath: cachePath,
        success: function() {
          // 获取文件大小
          fsm.stat({
            path: cachePath,
            success: function(res) {
              var fileSize = res.stats.size;
              
              // 创建缓存项
              var cacheItem = {
                path: cachePath,
                url: task.url,
                width: imgInfo.width,
                height: imgInfo.height,
                size: fileSize,
                timestamp: Date.now(),
                lastUsed: Date.now()
              };
              
              // 添加到缓存
              var cacheTarget = task.isThumbnail ? that._cache.thumbnails : that._cache.images;
              cacheTarget[task.cacheKey] = cacheItem;
              
              // 更新缓存总大小
              that._cache.totalSize += fileSize;
              
              that._log('保存图片到缓存: ' + task.url, {
                path: cachePath,
                size: fileSize,
                width: imgInfo.width,
                height: imgInfo.height
              });
              
              // 如果缓存超过最大大小，执行清理
              if (that._cache.totalSize > that._cache.maxSize) {
                that._cleanupCache();
              }
              
              // 更新加载状态
              that._loading.currentTasks--;
              
              // 保存缓存索引到存储
              that._saveCacheIndex();
              
              // 加载下一个任务
              that._loadNextTask();
              
              // 返回结果
              task.resolve({
                path: cachePath,
                width: imgInfo.width,
                height: imgInfo.height,
                size: fileSize,
                fromCache: false
              });
            },
            fail: function(err) {
              that._log('获取缓存文件大小失败: ' + task.url, err);
              
              // 更新加载状态
              that._loading.currentTasks--;
              
              // 加载下一个任务
              that._loadNextTask();
              
              // 返回结果（不更新缓存）
              task.resolve({
                path: cachePath,
                width: imgInfo.width,
                height: imgInfo.height,
                fromCache: false
              });
            }
          });
        },
        fail: function(err) {
          that._log('保存图片到缓存失败: ' + task.url, err, true);
          
          // 更新加载状态
          that._loading.currentTasks--;
          
          // 加载下一个任务
          that._loadNextTask();
          
          // 返回原始临时路径
          task.resolve({
            path: filePath,
            width: imgInfo.width,
            height: imgInfo.height,
            fromCache: false
          });
        }
      });
    });
  },
  
  /**
   * 加载队列中的下一个任务
   * @private
   */
  _loadNextTask: function() {
    if (this._loading.tasks.length > 0 && 
        this._loading.currentTasks < this._config.concurrentLoads) {
      // 从队列中取出下一个任务
      var nextTask = this._loading.tasks.shift();
      this._executeLoadTask(nextTask);
    }
  },
  
  /**
   * 保存缓存索引到存储
   * @private
   */
  _saveCacheIndex: function() {
    var cacheIndex = {
      images: this._cache.images,
      thumbnails: this._cache.thumbnails,
      timestamp: Date.now()
    };
    
    wx.setStorage({
      key: 'optimized_image_cache_index',
      data: cacheIndex,
      fail: function(err) {
        console.log('[OptimizedImageLoader] 保存缓存索引失败', err);
      }
    });
  },
  
  /**
   * 清理缓存
   * @param {Boolean} aggressive 是否积极清理
   * @returns {Promise} 清理结果Promise
   */
  clearCache: function(aggressive) {
    var that = this;
    
    return new Promise(function(resolve, reject) {
      try {
        var fsm = wx.getFileSystemManager();
        var cacheSize = that._cache.totalSize;
        var targetSize = aggressive ? 
                        (that._cache.maxSize * 0.3) : // 积极清理，保留30%
                        (that._cache.maxSize * 0.7);  // 一般清理，保留70%
        
        that._log('开始清理缓存, 当前: ' + (cacheSize / (1024 * 1024)).toFixed(2) + 
                 'MB, 目标: ' + (targetSize / (1024 * 1024)).toFixed(2) + 'MB' +
                 (aggressive ? ' (积极清理)' : ''));
        
        // 如果缓存大小已经小于目标，不需要清理
        if (cacheSize <= targetSize) {
          that._log('缓存大小已经小于目标，无需清理');
          resolve({
            success: true,
            clearedSize: 0,
            remainingSize: cacheSize
          });
          return;
        }
        
        // 收集所有缓存项
        var allItems = [];
        
        // 添加图片缓存项
        Object.keys(that._cache.images).forEach(function(key) {
          var item = that._cache.images[key];
          allItems.push({
            key: key,
            type: 'images',
            lastUsed: item.lastUsed || 0,
            accessCount: item.accessCount || 0,
            size: item.size || 0,
            path: item.path
          });
        });
        
        // 添加缩略图缓存项
        Object.keys(that._cache.thumbnails).forEach(function(key) {
          var item = that._cache.thumbnails[key];
          allItems.push({
            key: key,
            type: 'thumbnails',
            lastUsed: item.lastUsed || 0,
            accessCount: item.accessCount || 0,
            size: item.size || 0,
            path: item.path
          });
        });
        
        // 排序规则改进：结合访问频率和最后访问时间
        // 优先保留访问频率高和最近访问的缓存项
        allItems.sort(function(a, b) {
          // 访问频率的权重
          var frequencyWeight = 0.7;
          // 最后访问时间的权重
          var recencyWeight = 0.3;
          
          // 归一化访问频率 (0-1之间)
          var maxCount = Math.max(...allItems.map(item => item.accessCount || 0));
          var normalizedCountA = maxCount > 0 ? (a.accessCount || 0) / maxCount : 0;
          var normalizedCountB = maxCount > 0 ? (b.accessCount || 0) / maxCount : 0;
          
          // 归一化最后访问时间 (0-1之间)
          var now = Date.now();
          var maxAge = now - Math.min(...allItems.map(item => item.lastUsed || 0));
          var ageA = now - (a.lastUsed || 0);
          var ageB = now - (b.lastUsed || 0);
          var normalizedAgeA = maxAge > 0 ? 1 - (ageA / maxAge) : 0;
          var normalizedAgeB = maxAge > 0 ? 1 - (ageB / maxAge) : 0;
          
          // 计算综合得分
          var scoreA = (normalizedCountA * frequencyWeight) + (normalizedAgeA * recencyWeight);
          var scoreB = (normalizedCountB * frequencyWeight) + (normalizedAgeB * recencyWeight);
          
          // 按得分从低到高排序（低分的先被删除）
          return scoreA - scoreB;
        });
        
        var itemsToRemove = [];
        var sizeToRemove = cacheSize - targetSize;
        var removedSize = 0;
        
        // 选择要删除的项目
        for (var i = 0; i < allItems.length && removedSize < sizeToRemove; i++) {
          var item = allItems[i];
          itemsToRemove.push(item);
          removedSize += item.size;
        }
        
        that._log('将删除 ' + itemsToRemove.length + ' 个缓存项，总大小: ' + 
                  (removedSize / (1024 * 1024)).toFixed(2) + 'MB');
        
        // 删除选定的项目
        itemsToRemove.forEach(function(item) {
          try {
            // 从文件系统中删除文件
            fsm.unlinkSync(item.path);
            
            // 从缓存索引中删除
            delete that._cache[item.type][item.key];
            
            // 更新总大小
            that._cache.totalSize -= item.size;
            
            that._log('从缓存中删除: ' + item.key + ', 大小: ' + 
                      (item.size / 1024).toFixed(2) + 'KB');
          } catch (e) {
            that._log('删除缓存项失败: ' + item.key, e.message);
          }
        });
        
        // 保存更新后的缓存索引
        that._saveCacheIndex();
        
        resolve({
          success: true,
          clearedItems: itemsToRemove.length,
          clearedSize: removedSize,
          remainingSize: that._cache.totalSize
        });
      } catch (e) {
        that._log('清理缓存失败', e.message, true);
        reject(e);
      }
    });
  },
  
  /**
   * 预加载图片
   * @param {Array} urls 图片URL数组
   * @param {Object} options 加载选项
   * @returns {Promise} 加载结果Promise
   */
  preloadImages: function(urls, options) {
    var that = this;
    options = options || {};
    
    // 验证输入
    if (!Array.isArray(urls) || urls.length === 0) {
      return Promise.resolve([]);
    }
    
    // 设置最大并发预加载数
    var maxConcurrent = options.maxConcurrent || 2;
    
    that._log('开始预加载 ' + urls.length + ' 张图片，并发数: ' + maxConcurrent);
    
    return new Promise(function(resolve, reject) {
      var results = [];
      var completedCount = 0;
      var hasError = false;
      var activeLoads = 0;
      var urlQueue = urls.slice(); // 复制URL数组，避免修改原数组
      
      // 处理预加载队列
      function processQueue() {
        // 检查是否所有图片都已完成
        if (completedCount >= urls.length) {
          that._log('预加载完成，成功: ' + results.filter(r => r.success).length + 
                   ', 失败: ' + results.filter(r => !r.success).length);
          resolve(results);
          return;
        }
        
        // 启动更多预加载任务，直到达到最大并发数或队列为空
        while (activeLoads < maxConcurrent && urlQueue.length > 0) {
          var url = urlQueue.shift();
          activeLoads++;
          
          // 低优先级加载
          var loadOptions = Object.assign({}, options, {
            // 确保缩略图设置正确，默认为缩略图
            thumbnail: options.thumbnail !== undefined ? options.thumbnail : true,
            // 较长的超时时间
            timeout: options.timeout || that._config.timeout * 1.5
          });
          
          // 开始加载
          that.loadImage(url, loadOptions)
            .then(function(imageResult) {
              activeLoads--;
              completedCount++;
              
              results.push({
                url: url,
                success: true,
                fromCache: imageResult.fromCache,
                size: imageResult.size,
                width: imageResult.width,
                height: imageResult.height
              });
              
              processQueue(); // 处理队列中的下一个
            })
            .catch(function(error) {
              activeLoads--;
              completedCount++;
              
              that._log('预加载图片失败: ' + url, error.message);
              
              results.push({
                url: url,
                success: false,
                error: error.message
              });
              
              processQueue(); // 处理队列中的下一个
            });
        }
      }
      
      // 开始处理队列
      processQueue();
    });
  },
  
  /**
   * 获取图片信息
   * @param {String} url 图片URL
   * @param {Object} options 选项
   * @returns {Promise} 图片信息Promise
   */
  getImageInfo: function(url, options) {
    var that = this;
    options = options || {};
    
    return new Promise(function(resolve, reject) {
      if (!url) {
        reject(new Error('无效的图片URL'));
        return;
      }
      
      var cacheKey = that._generateCacheKey(url, options.type || 'img');
      
      // 检查缓存中是否有图片信息
      var cacheTarget = options.thumbnail ? that._cache.thumbnails : that._cache.images;
      var cacheItem = cacheTarget[cacheKey];
      
      if (cacheItem) {
        that._log('从缓存获取图片信息: ' + url);
        
        // 更新最后使用时间
        cacheItem.lastUsed = Date.now();
        
        resolve({
          width: cacheItem.width,
          height: cacheItem.height,
          size: cacheItem.size,
          path: cacheItem.path,
          fromCache: true,
          url: url
        });
        return;
      }
      
      // 没有缓存，通过微信API获取
      that._log('从网络获取图片信息: ' + url);
      
      wx.getImageInfo({
        src: url,
        success: function(res) {
          that._log('获取图片信息成功: ' + url);
          resolve({
            width: res.width,
            height: res.height,
            path: res.path,
            fromCache: false,
            url: url
          });
        },
        fail: function(err) {
          that._log('获取图片信息失败: ' + url, err, true);
          reject(new Error('获取图片信息失败: ' + err.errMsg));
        }
      });
    });
  },
  
  /**
   * 记录日志
   * @param {String} message 日志消息
   * @param {Boolean} force 是否强制输出
   * @private
   */
  _log: function(message, data, force) {
    if (this._config.debug || force === true) {
      console.log('[OptimizedImageLoader] ' + message, data || '');
    }
  },
  
  /**
   * 记录性能数据
   * @param {String} url 图片URL
   * @param {String} action 操作类型
   * @param {Number} duration 耗时(ms)
   * @private
   */
  _recordPerformance: function(url, action, duration) {
    // 初始化性能记录对象
    if (!this._performanceData) {
      this._performanceData = {
        loads: 0,
        cacheHits: 0,
        cacheMisses: 0,
        failures: 0,
        totalLoadTime: 0,
        averageLoadTime: 0,
        history: []
      };
    }
    
    // 更新统计数据
    switch(action) {
      case 'load_complete':
        this._performanceData.loads++;
        this._performanceData.totalLoadTime += duration;
        this._performanceData.averageLoadTime = 
          this._performanceData.totalLoadTime / this._performanceData.loads;
        break;
      case 'cache_hit':
        this._performanceData.cacheHits++;
        break;
      case 'cache_miss':
        this._performanceData.cacheMisses++;
        break;
      case 'cache_invalid':
        this._performanceData.cacheMisses++;
        break;
      case 'load_failed':
        this._performanceData.failures++;
        break;
    }
    
    // 只在调试模式下保存详细历史
    if (this._config.debug) {
      // 限制历史记录长度，避免内存占用过高
      if (this._performanceData.history.length > 100) {
        this._performanceData.history.shift();
      }
      
      this._performanceData.history.push({
        url: url,
        action: action,
        duration: duration,
        timestamp: Date.now()
      });
    }
  },
  
  /**
   * 获取性能统计数据
   * @returns {Object} 性能统计信息
   */
  getPerformanceStats: function() {
    if (!this._performanceData) {
      return {
        loads: 0,
        cacheHits: 0, 
        cacheMisses: 0,
        cacheHitRate: 0,
        averageLoadTime: 0,
        totalErrors: 0
      };
    }
    
    var stats = { ...this._performanceData };
    
    // 计算缓存命中率
    var totalCacheRequests = stats.cacheHits + stats.cacheMisses;
    stats.cacheHitRate = totalCacheRequests > 0 ? 
      (stats.cacheHits / totalCacheRequests) : 0;
    
    // 格式化数据
    stats.cacheHitRate = Math.round(stats.cacheHitRate * 100);
    stats.averageLoadTime = Math.round(stats.averageLoadTime);
    
    return stats;
  },
  
  /**
   * 重置性能统计数据
   */
  resetPerformanceStats: function() {
    this._performanceData = null;
  },
  
  /**
   * 设置网络状态监控
   * @private
   */
  _setupNetworkMonitor: function() {
    var that = this;
    
    // 获取初始网络状态
    wx.getNetworkType({
      success: function(res) {
        that._networkStatus.type = res.networkType;
        that._networkStatus.isConnected = res.networkType !== 'none';
        that._log('网络状态: ' + res.networkType);
        
        // 初始评估网络强度
        that._evaluateNetworkStrength(res.networkType);
      }
    });
    
    // 监听网络变化
    wx.onNetworkStatusChange(function(res) {
      var oldNetworkType = that._networkStatus.type;
      var wasConnected = that._networkStatus.isConnected;
      
      that._networkStatus.type = res.networkType;
      that._networkStatus.isConnected = res.networkType !== 'none';
      that._log('网络状态变化: ' + oldNetworkType + ' -> ' + res.networkType);
      
      // 评估网络强度
      that._evaluateNetworkStrength(res.networkType);
      
      // 检测网络重连情况
      if (!wasConnected && that._networkStatus.isConnected) {
        that._networkStatus.reconnectCount++;
        that._networkStatus.lastReconnectTime = Date.now();
        that._log('网络已重连', null, true);
        
        // 处理重连后的任务恢复
        that._handleNetworkReconnect();
      }
      
      // 网络断开时，处理断网情况
      if (wasConnected && !that._networkStatus.isConnected) {
        that._handleNetworkDisconnect();
      }
      
      // 网络类型变化但仍然连接，调整策略
      if (wasConnected && that._networkStatus.isConnected && 
          oldNetworkType !== res.networkType) {
        that._adjustNetworkStrategy(res.networkType);
      }
    });
    
    // 定时检查网络状态
    setInterval(function() {
      that._checkNetworkStatus();
    }, that._config.networkCheckInterval);
  },
  
  /**
   * 评估网络强度
   * @param {String} networkType 网络类型
   * @private
   */
  _evaluateNetworkStrength: function(networkType) {
    // 基于网络类型和历史性能数据评估网络强度
    if (networkType === 'wifi') {
      this._networkStatus.signalStrength = 'strong';
    } else if (networkType === '4g' || networkType === '5g') {
      this._networkStatus.signalStrength = 'medium';
    } else if (networkType === '3g' || networkType === '2g' || networkType === 'unknown') {
      this._networkStatus.signalStrength = 'weak';
    } else {
      this._networkStatus.signalStrength = 'none';
    }
    
    // 如果有性能历史记录，根据下载速度和失败率进一步调整
    if (this._performanceLog && this._performanceLog.length > 0) {
      var recentLogs = this._performanceLog.slice(-10);
      var failCount = 0;
      var totalTime = 0;
      var totalSize = 0;
      
      recentLogs.forEach(function(log) {
        if (log.status === 'load_failed') {
          failCount++;
        } else if (log.status === 'load_complete' && log.size) {
          totalTime += log.duration;
          totalSize += log.size;
        }
      });
      
      // 计算失败率
      this._networkStatus.failureRate = failCount / recentLogs.length;
      
      // 计算平均下载速度 (KB/s)
      if (totalTime > 0 && totalSize > 0) {
        this._networkStatus.downloadSpeed = (totalSize / 1024) / (totalTime / 1000);
      }
      
      // 根据实际表现调整网络强度评估
      if (this._networkStatus.failureRate > 0.3 || this._networkStatus.downloadSpeed < 50) {
        // 失败率高或速度慢，降级网络强度评估
        if (this._networkStatus.signalStrength === 'strong') {
          this._networkStatus.signalStrength = 'medium';
        } else if (this._networkStatus.signalStrength === 'medium') {
          this._networkStatus.signalStrength = 'weak';
        }
      }
    }
    
    this._log('网络强度评估: ' + this._networkStatus.signalStrength, {
      failureRate: this._networkStatus.failureRate,
      downloadSpeed: this._networkStatus.downloadSpeed
    });
  },
  
  /**
   * 处理网络重连
   * @private 
   */
  _handleNetworkReconnect: function() {
    // 重置所有正在执行的任务
    for (var i = 0; i < this._loading.tasks.length; i++) {
      var task = this._loading.tasks[i];
      if (task.downloadTask) {
        task.downloadTask.abort();
        task.downloadTask = null;
      }
    }
    
    // 重置当前任务计数
    this._loading.currentTasks = 0;
    
    // 开始处理队列中的任务
    this._loadNextTask();
    
    // 如果有需要断点续传的任务，优先处理
    var resumableDownloads = Object.keys(this._resumableDownloads);
    if (resumableDownloads.length > 0) {
      this._log('恢复断点续传任务: ' + resumableDownloads.length + '个', null, true);
      
      // 将断点续传任务添加到队列头部
      for (var url in this._resumableDownloads) {
        var resumableTask = this._resumableDownloads[url].task;
        if (resumableTask) {
          // 将任务移到队列头部优先处理
          this._loading.tasks.unshift(resumableTask);
        }
      }
      
      // 立即开始处理队列
      this._loadNextTask();
    }
  },
  
  /**
   * 处理网络断开
   * @private
   */
  _handleNetworkDisconnect: function() {
    this._log('网络已断开，暂停非缓存任务', null, true);
    
    // 遍历所有正在执行的任务，尝试从缓存中获取
    for (var i = 0; i < this._loading.tasks.length; i++) {
      var task = this._loading.tasks[i];
      
      // 如果任务正在下载，暂停它
      if (task.downloadTask) {
        task.downloadTask.abort();
        task.downloadTask = null;
        
        // 记录到断点续传列表
        this._resumableDownloads[task.url] = {
          url: task.url,
          task: task,
          receivedBytes: 0,
          totalBytes: 0,
          timestamp: Date.now()
        };
      }
    }
  },
  
  /**
   * 调整网络策略
   * @param {String} networkType 网络类型
   * @private
   */
  _adjustNetworkStrategy: function(networkType) {
    // 根据网络类型调整并发数
    switch (networkType) {
      case 'wifi':
      case '5g':
        this._config.concurrentLoads = 4;
        this._config.retryCount = 2;
        this._config.retryDelay = 1000;
        break;
      case '4g':
        this._config.concurrentLoads = 3;
        this._config.retryCount = 3;
        this._config.retryDelay = 1500;
        break;
      case '3g':
        this._config.concurrentLoads = 2;
        this._config.retryCount = 4;
        this._config.retryDelay = 2000;
        break;
      case '2g':
      case 'unknown':
        this._config.concurrentLoads = 1;
        this._config.retryCount = 5;
        this._config.retryDelay = 3000;
        break;
      default:
        this._config.concurrentLoads = 1;
        this._config.retryCount = 2;
        this._config.retryDelay = 2000;
    }
    
    this._log('网络策略已调整', {
      networkType: networkType,
      concurrentLoads: this._config.concurrentLoads,
      retryCount: this._config.retryCount,
      retryDelay: this._config.retryDelay
    });
    
    // 继续处理任务
    this._loadNextTask();
  },
  
  /**
   * 响应自适应策略变更
   * @param {Object} newStrategy 新策略
   * @param {Object} oldStrategy 旧策略
   * @param {Object} networkInfo 网络信息
   * @private
   */
  _onAdaptiveStrategyChange: function(newStrategy, oldStrategy, networkInfo) {
    this._log('自适应策略变更', {
      networkType: networkInfo.type,
      maxConcurrent: newStrategy.preload.maxConcurrent,
      retryCount: newStrategy.retry.maxRetries
    });
    
    // 调整加载器配置
    this._config.concurrentLoads = newStrategy.preload.maxConcurrent;
    this._config.retryCount = newStrategy.retry.maxRetries;
    this._config.retryDelay = newStrategy.retry.retryInterval;
    this._config.timeout = newStrategy.timeout;
    
    // 如果是离线模式，暂停所有非缓存任务
    if (newStrategy.cacheOnly) {
      this._handleNetworkDisconnect();
    } else {
      // 如果从离线模式恢复，重新开始加载
      if (oldStrategy && oldStrategy.cacheOnly) {
        this._handleNetworkReconnect();
      }
    }
  },
  
  /**
   * 重试失败的任务
   */
  _retryFailedTasks() {
    if (!this._failedTasks || this._failedTasks.length === 0) return;
    
    console.log(`[OptimizedImageLoader] 开始重试 ${this._failedTasks.length} 个失败任务`);
    
    // 复制失败任务列表并清空
    const tasksToRetry = [...this._failedTasks];
    this._failedTasks = [];
    
    // 重试每个失败的任务
    tasksToRetry.forEach(task => {
      console.log(`[OptimizedImageLoader] 重试加载: ${task.url}`);
      
      // 重新提交任务
      this._executeLoadingTask(task.url, task.options)
        .then(result => {
          if (task.resolve) task.resolve(result);
        })
        .catch(error => {
          if (task.reject) task.reject(error);
          
          // 如果仍然失败，重新添加到失败列表
          this._failedTasks.push(task);
        });
    });
  },
  
  /**
   * 增强版下载执行器
   * @param {Object} task 任务对象
   * @returns {Promise} 下载结果Promise
   */
  _executeDownloadTask: function(task) {
    var that = this;
    var resumeInfo = this._resumableDownloads[task.url];
    var startPosition = resumeInfo ? resumeInfo.receivedBytes : 0;
    var hasResumeSupport = startPosition > 0 && task.retryCount > 0;
    
    // 设置超时处理
    const createTimeout = () => {
      // 根据网络状态调整超时时间
      var timeoutDuration = task.timeout;
      if (this._networkStatus.signalStrength === 'weak') {
        timeoutDuration *= this._config.weakNetworkTimeoutMultiplier;
      }
      
      // 创建超时定时器
      task.timeoutTimer = setTimeout(() => {
        if (task.downloadTask) {
          this._log('下载任务超时: ' + task.url, {
            timeout: timeoutDuration,
            retryCount: task.retryCount
          }, true);
          
          try {
            // 保存已接收的字节数，用于断点续传
            if (task.downloadTask && task.receivedBytes > 0) {
              this._resumableDownloads[task.url] = {
                url: task.url,
                receivedBytes: task.receivedBytes,
                totalBytes: task.totalBytes,
                timestamp: Date.now()
              };
            }
            
            // 中断下载
            task.downloadTask.abort();
          } catch (e) {
            this._log('中断下载任务出错: ' + e.message);
          }
          
          // 标记下载任务为null
          task.downloadTask = null;
          
          // 处理超时失败
          this._handleRequestFailure(task, new Error('下载超时'), 0);
        }
      }, timeoutDuration);
    };
    
    // 清除之前的超时定时器
    if (task.timeoutTimer) {
      clearTimeout(task.timeoutTimer);
      task.timeoutTimer = null;
    }
    
    // 记录下载开始和请求信息
    task.startTime = Date.now();
    task.receivedBytes = startPosition;
    task.totalBytes = resumeInfo ? (resumeInfo.totalBytes || 0) : 0;
    
    this._log('开始下载图片: ' + task.url + 
             (hasResumeSupport ? ' (从断点' + startPosition + '字节继续)' : ''));
    
    // 创建自定义请求头
    var header = {};
    
    // 添加断点续传头
    if (hasResumeSupport) {
      header['Range'] = 'bytes=' + startPosition + '-';
      this._log('添加断点续传请求头: ' + header['Range']);
    }
    
    // 创建下载任务
    task.downloadTask = wx.downloadFile({
      url: task.url,
      header: header,
      timeout: task.timeout,
      success: function(res) {
        // 清除超时定时器
        if (task.timeoutTimer) {
          clearTimeout(task.timeoutTimer);
          task.timeoutTimer = null;
        }
        
        // 重置连续失败计数
        that._consecutiveFailures = 0;
        
        // 成功下载
        if (res.statusCode >= 200 && res.statusCode < 300 || res.statusCode === 304 || 
           (hasResumeSupport && res.statusCode === 206)) {
          
          that._log('图片下载成功: ' + task.url, {
            statusCode: res.statusCode,
            tempFile: res.tempFilePath
          });
          
          // 清除断点续传记录
          delete that._resumableDownloads[task.url];
          
          // 记录网络性能数据
          that._recordNetworkPerformance(true, Date.now() - task.startTime);
          
          // 处理图片加载成功
          that._processDownloadSuccess(task, res.tempFilePath);
        } else {
          // HTTP错误
          var error = new Error('HTTP错误: ' + res.statusCode);
          that._handleRequestFailure(task, error, res.statusCode);
        }
      },
      fail: function(err) {
        // 清除超时定时器
        if (task.timeoutTimer) {
          clearTimeout(task.timeoutTimer);
          task.timeoutTimer = null;
        }
        
        // 记录失败，但排除用户手动中断的情况
        if (err.errMsg && err.errMsg.indexOf('abort') === -1) {
          that._handleRequestFailure(task, err, 0);
        }
      },
      complete: function() {
        // 下载任务对象完成后置空，防止内存泄漏
        task.downloadTask = null;
      }
    });
    
    // 设置下载进度回调
    if (task.downloadTask && typeof task.downloadTask.onProgressUpdate === 'function') {
      task.downloadTask.onProgressUpdate(function(res) {
        // 更新接收的字节数
        var newReceivedBytes = Math.floor(res.totalBytesWritten);
        
        // 只有在进度增加时才更新
        if (newReceivedBytes > task.receivedBytes) {
          task.receivedBytes = newReceivedBytes;
          task.totalBytes = Math.max(task.totalBytes, res.totalBytesExpectedToWrite);
          
          // 重置超时定时器（数据在流动，说明连接是活的）
          if (task.timeoutTimer) {
            clearTimeout(task.timeoutTimer);
            task.timeoutTimer = null;
            createTimeout();
          }
          
          // 更新断点续传信息
          that._resumableDownloads[task.url] = {
            url: task.url,
            receivedBytes: task.receivedBytes,
            totalBytes: task.totalBytes,
            timestamp: Date.now()
          };
          
          // 计算并记录下载速度
          if (task.lastProgressTime) {
            var timeDiff = Date.now() - task.lastProgressTime;
            var bytesDiff = task.receivedBytes - task.lastReceivedBytes;
            
            if (timeDiff > 0) {
              var downloadSpeed = (bytesDiff / timeDiff) * 1000 / 1024; // KB/s
              that._updateNetworkStats({downloadSpeed});
            }
          }
          
          // 记录最后进度更新时间和字节数
          task.lastProgressTime = Date.now();
          task.lastReceivedBytes = task.receivedBytes;
          
          // 计算加载进度
          var progress = task.totalBytes > 0 ? 
                        (task.receivedBytes / task.totalBytes) : 0;
          
          // 触发进度回调
          if (typeof task.options.onProgress === 'function') {
            try {
              task.options.onProgress({
                url: task.url,
                receivedBytes: task.receivedBytes,
                totalBytes: task.totalBytes,
                progress: progress
              });
            } catch (e) {
              that._log('进度回调执行出错: ' + e.message);
            }
          }
        }
      });
    }
    
    // 设置初始超时
    createTimeout();
    
    // 记录当前下载任务
    this._loading.currentDownloads = this._loading.currentDownloads || {};
    this._loading.currentDownloads[task.url] = task;
  },
  
  /**
   * 处理下载成功
   * @param {Object} task 任务对象
   * @param {String} tempFilePath 临时文件路径
   * @private
   * 创建日期: 2025-04-11 15:05:42
   * 创建者: Claude AI 3.7 Sonnet
   */
  _processDownloadSuccess: function(task, tempFilePath) {
    var that = this;
    var fsm = wx.getFileSystemManager();
    
    // 获取缓存目录
    this._getCacheDirectory().then(function(cacheDir) {
      // 生成目标文件路径
      var targetPath = that._getCachePath(task.cacheKey, task.url);
      
      // 尝试获取图片信息
      wx.getImageInfo({
        src: tempFilePath,
        success: function(res) {
          // 是否需要调整大小
          var needResize = that._shouldResizeImage(res, task.options);
          
          if (needResize) {
            // 调整图片大小
            that._resizeImage(tempFilePath, res, task.options)
              .then(function(resizedInfo) {
                // 保存并处理调整大小后的图片
                that._saveToCacheAndFinish(task, resizedInfo.path, resizedInfo);
              })
              .catch(function(err) {
                that._log('调整图片大小失败: ' + err.message, null, true);
                // 调整大小失败时，仍然使用原始图片
                that._saveToCacheAndFinish(task, tempFilePath, res);
              });
          } else {
            // 直接保存原始图片
            that._saveToCacheAndFinish(task, tempFilePath, res);
          }
        },
        fail: function(err) {
          that._log('获取图片信息失败: ' + err.errMsg, null, true);
          
          // 即使无法获取图片信息，也尝试保存图片
          that._saveToCacheAndFinish(task, tempFilePath, {
            width: 0,
            height: 0,
            path: tempFilePath
          });
        }
      });
    }).catch(function(err) {
      that._log('获取缓存目录失败: ' + err.message, null, true);
      
      // 直接使用临时文件
      task.resolve({
        path: tempFilePath,
        width: 0,
        height: 0,
        fromCache: false,
        loadTime: Date.now() - task.startTime
      });
      
      // 减少当前任务计数并加载下一个任务
      that._loading.currentTasks--;
      that._loadNextTask();
    });
  },
  
  /**
   * 更新网络统计信息
   * @param {Object} stats 要更新的统计信息
   * @private
   * 创建日期: 2025-04-11 15:12:18
   * 创建者: Claude AI 3.7 Sonnet
   */
  _updateNetworkStats: function(stats) {
    // 更新下载速度（使用移动平均）
    if (stats.downloadSpeed) {
      if (!this._networkStatus.downloadSpeedSamples) {
        this._networkStatus.downloadSpeedSamples = [];
      }
      
      // 添加新样本
      this._networkStatus.downloadSpeedSamples.push(stats.downloadSpeed);
      
      // 保留最近的10个样本
      if (this._networkStatus.downloadSpeedSamples.length > 10) {
        this._networkStatus.downloadSpeedSamples.shift();
      }
      
      // 计算平均下载速度
      var sum = this._networkStatus.downloadSpeedSamples.reduce(function(a, b) {
        return a + b;
      }, 0);
      
      this._networkStatus.downloadSpeed = sum / this._networkStatus.downloadSpeedSamples.length;
      
      // 根据下载速度调整网络信号强度评估
      if (this._networkStatus.downloadSpeed < 30) { // 小于30KB/s认为是弱网
        this._networkStatus.signalStrength = 'weak';
      } else if (this._networkStatus.downloadSpeed < 200) { // 小于200KB/s认为是中等
        this._networkStatus.signalStrength = 'medium';
      } else {
        this._networkStatus.signalStrength = 'strong';
      }
    }
    
    // 更新失败率
    if (typeof stats.success !== 'undefined') {
      // 初始化计数器
      if (!this._networkStatus.requestSamples) {
        this._networkStatus.requestSamples = [];
      }
      
      // 添加新样本 (1=成功, 0=失败)
      this._networkStatus.requestSamples.push(stats.success ? 1 : 0);
      
      // 保留最近的20个样本
      if (this._networkStatus.requestSamples.length > 20) {
        this._networkStatus.requestSamples.shift();
      }
      
      // 计算失败率
      var successCount = this._networkStatus.requestSamples.filter(function(v) {
        return v === 1;
      }).length;
      
      this._networkStatus.failureRate = 1 - (successCount / this._networkStatus.requestSamples.length);
      
      // 根据失败率调整信号强度评估
      if (this._networkStatus.failureRate > 0.5) { // 失败率超过50%
        this._networkStatus.signalStrength = 'weak';
      }
    }
  },
  
  /**
   * 保存图片到缓存并完成任务
   * @param {Object} task 任务对象 
   * @param {String} sourcePath 源文件路径
   * @param {Object} imageInfo 图片信息
   * @private
   * 创建日期: 2025-04-11 15:18:35
   * 创建者: Claude AI 3.7 Sonnet
   */
  _saveToCacheAndFinish: function(task, sourcePath, imageInfo) {
    var that = this;
    var fsm = wx.getFileSystemManager();
    
    // 生成缓存文件路径
    var cacheKey = task.cacheKey;
    var targetPath = this._getCachePath(cacheKey, task.url);
    
    // 确保目标目录存在
    var targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
    try {
      fsm.accessSync(targetDir);
    } catch (e) {
      try {
        fsm.mkdirSync(targetDir, true);
      } catch (dirErr) {
        that._log('创建缓存目录失败: ' + dirErr.errMsg, null, true);
      }
    }
    
    // 复制文件到缓存
    fsm.copyFile({
      srcPath: sourcePath,
      destPath: targetPath,
      success: function() {
        // 获取文件大小
        fsm.stat({
          path: targetPath,
          success: function(stats) {
            var fileSize = stats.stats.size;
            
            // 更新缓存索引
            var cacheTarget = task.isThumbnail ? that._cache.thumbnails : that._cache.images;
            cacheTarget[cacheKey] = {
              url: task.url,
              path: targetPath,
              size: fileSize,
              width: imageInfo.width,
              height: imageInfo.height,
              timestamp: Date.now(),
              accessCount: 1,
              lastUsed: Date.now()
            };
            
            // 更新缓存总大小
            that._cache.totalSize += fileSize;
            that._cache.itemCount++;
            
            // 检查缓存大小，如果超过限制则清理
            if (that._cache.totalSize > that._config.maxCacheSize) {
              that._cleanupCache();
            }
            
            // 保存缓存索引
            that._saveCacheIndex();
            
            // 解析任务
            task.resolve({
              path: targetPath,
              width: imageInfo.width,
              height: imageInfo.height,
              size: fileSize,
              fromCache: false,
              loadTime: Date.now() - task.startTime
            });
            
            // 清理临时文件(如果不是目标文件)
            if (sourcePath !== targetPath) {
              fsm.unlink({
                filePath: sourcePath,
                fail: function(err) {
                  that._log('清理临时文件失败: ' + err.errMsg);
                }
              });
            }
            
            // 减少当前任务计数并加载下一个任务
            that._loading.currentTasks--;
            that._loadNextTask();
          },
          fail: function(err) {
            that._log('获取文件大小失败: ' + err.errMsg, null, true);
            
            // 即使获取文件大小失败，也返回成功结果
            task.resolve({
              path: targetPath,
              width: imageInfo.width,
              height: imageInfo.height,
              fromCache: false,
              loadTime: Date.now() - task.startTime
            });
            
            that._loading.currentTasks--;
            that._loadNextTask();
          }
        });
      },
      fail: function(err) {
        that._log('保存文件到缓存失败: ' + err.errMsg, null, true);
        
        // 返回临时文件
        task.resolve({
          path: sourcePath,
          width: imageInfo.width,
          height: imageInfo.height,
          fromCache: false,
          loadTime: Date.now() - task.startTime
        });
        
        that._loading.currentTasks--;
        that._loadNextTask();
      }
    });
  },
  
  /**
   * 销毁图片加载器，释放资源
   */
  destroy() {
    // 销毁网络自适应策略
    if (this.adaptiveLoadingEnabled && this.adaptiveStrategy) {
      if (this._adaptiveStrategyUnsubscribe) {
        this._adaptiveStrategyUnsubscribe();
        this._adaptiveStrategyUnsubscribe = null;
      }
      
      this.adaptiveStrategy.destroy();
      this.adaptiveStrategy = null;
    }
    
    this._log('info', '图片加载器已销毁');
  },
  
  /**
   * 获取当前网络环境信息
   * @returns {Object|null} 网络环境信息
   */
  getNetworkInfo() {
    if (this.adaptiveLoadingEnabled && this.adaptiveStrategy) {
      return {
        ...this.adaptiveStrategy.getCurrentNetwork(),
        qualityScore: this.adaptiveStrategy.getNetworkQualityScore()
      };
    }
    return null;
  },
  
  /**
   * 获取当前活跃的加载策略
   * @returns {Object|null} 当前活跃的加载策略
   */
  getActiveStrategy() {
    if (this.adaptiveLoadingEnabled && this.adaptiveStrategy) {
      return this.adaptiveStrategy.getActiveStrategy();
    }
    return null;
  },
  
  /**
   * 处理网络状态变化
   * @param {Object} res 网络状态信息
   * @private
   * 修改日期: 2025-04-11 14:23:45
   * 修改者: Claude AI 3.7 Sonnet
   */
  _handleNetworkStatusChange: function(res) {
    var prevStatus = this._networkStatus.type;
    
    // 更新网络状态
    this._networkStatus = {
      type: res.networkType,
      isConnected: res.isConnected,
      signalStrength: this._getSignalStrength(res.networkType),
      lastUpdate: Date.now()
    };
    
    this._log('网络状态变化: ' + prevStatus + ' -> ' + res.networkType + 
              (res.isConnected ? '' : ' (已断开)'), this._networkStatus);
    
    // 网络恢复连接时处理
    if (!this._lastNetworkStatus.isConnected && res.isConnected) {
      this._log('网络已恢复连接，准备重试失败任务', null, true);
      this._onNetworkReconnected();
    }
    
    // 断网处理
    if (this._lastNetworkStatus.isConnected && !res.isConnected) {
      this._log('网络已断开，切换到离线模式', null, true);
      this._handleOfflineMode();
    }
    
    // 网络类型变更处理（例如从4G切换到WiFi）
    if (prevStatus !== res.networkType && res.isConnected) {
      this._log('网络类型变更，调整加载策略', null);
      this._adjustLoadingStrategy();
    }
    
    // 保存上一次状态
    this._lastNetworkStatus = { ...this._networkStatus };
    
    // 通知自适应策略管理器
    if (this._adaptiveStrategy) {
      this._adaptiveStrategy._handleNetworkChange({
        isConnected: res.isConnected,
        networkType: res.networkType
      });
    }
  },
  
  /**
   * 网络恢复连接时的处理
   * @private
   * 创建日期: 2025-04-11 14:25:21
   * 创建者: Claude AI 3.7 Sonnet
   */
  _onNetworkReconnected: function() {
    // 网络恢复时，先延迟一段时间确保连接稳定
    var that = this;
    setTimeout(function() {
      // 设置网络恢复标志
      that._networkRecoveryMode = true;
      
      // 重试所有失败的任务
      that._retryFailedTasks();
      
      // 恢复断点续传任务
      var resumableTasks = Object.values(that._resumableDownloads);
      if (resumableTasks.length > 0) {
        that._log('恢复断点续传任务: ' + resumableTasks.length + '个', resumableTasks.map(t => t.url));
        
        // 按最近失败的优先恢复
        resumableTasks.sort((a, b) => b.timestamp - a.timestamp);
        
        // 将断点续传任务优先加入队列
        resumableTasks.forEach(function(resumableInfo) {
          if (resumableInfo.task) {
            // 如果已经有任务对象，直接重试
            that._executeLoadTask(resumableInfo.task);
          }
        });
      }
      
      // 15秒后关闭恢复模式
      setTimeout(function() {
        that._networkRecoveryMode = false;
        that._log('网络恢复模式已结束');
      }, 15000);
    }, 2000); // 延迟2秒等待网络稳定
  },
  
  /**
   * 获取信号强度评估
   * @param {String} networkType 网络类型
   * @return {String} 信号强度评估 (strong|medium|weak|none)
   * @private
   * 创建日期: 2025-04-11 14:27:58
   * 创建者: Claude AI 3.7 Sonnet
   */
  _getSignalStrength: function(networkType) {
    // 信号强度映射表
    var strengthMap = {
      'wifi': 'strong',
      '5g': 'strong',
      '4g': 'medium',
      '3g': 'weak',
      '2g': 'weak',
      'unknown': 'medium',
      'none': 'none'
    };
    
    // 如果有平均响应时间和失败率记录，可以进一步调整强度评估
    if (this._networkPerformance.avgResponseTime > 0) {
      if (this._networkPerformance.avgResponseTime > 3000) {
        // 平均响应时间超过3秒，降低一级
        if (strengthMap[networkType] === 'strong') return 'medium';
        if (strengthMap[networkType] === 'medium') return 'weak';
      }
      
      if (this._networkPerformance.failureRate > 0.3) {
        // 失败率超过30%，降低一级
        if (strengthMap[networkType] === 'strong') return 'medium';
        if (strengthMap[networkType] === 'medium') return 'weak';
      }
    }
    
    return strengthMap[networkType] || 'medium';
  },
  
  /**
   * 增强型弱网适应优化
   * @param {Object} task 加载任务
   * @return {Object} 优化后的任务配置
   * @private
   * 创建日期: 2025-04-13 16:22:45
   * 创建者: Claude AI 3.7 Sonnet
   */
  _enhancedWeakNetworkAdaptation: function(task) {
    // 如果不是弱网环境，直接返回原任务
    if (this._networkStatus.signalStrength !== 'weak') {
      return task;
    }
    
    this._log('应用增强型弱网适应优化');
    
    // 创建优化后的任务副本，不修改原始任务
    var optimizedTask = { ...task };
    
    // 1. 自动降低图片质量
    if (!task.isThumbnail && !task.qualityAdjusted) {
      this._log('弱网环境：自动降低图片质量', task.url);
      optimizedTask.qualityAdjusted = true;
      
      // 设置最大尺寸限制，减少传输数据量
      var weakNetQuality = {
        maxWidth: this._config.weakNetworkMaxWidth || 800,
        maxHeight: this._config.weakNetworkMaxHeight || 800,
        quality: this._config.weakNetworkQuality || 80
      };
      
      optimizedTask.options = optimizedTask.options || {};
      optimizedTask.options.maxWidth = weakNetQuality.maxWidth;
      optimizedTask.options.maxHeight = weakNetQuality.maxHeight;
      optimizedTask.options.quality = weakNetQuality.quality;
    }
    
    // 2. 增加重试机制的韧性
    optimizedTask.retryWithExponentialBackoff = true;
    optimizedTask.maxRetriesOverride = this._config.weakNetworkMaxRetries || 5;
    
    // 3. 优先从缓存加载
    optimizedTask.options = optimizedTask.options || {};
    optimizedTask.options.preferCache = true;
    
    // 4. 断点续传增强（添加标记以便下载失败时记录）
    optimizedTask.enableResumableDownload = true;
    
    return optimizedTask;
  },
  
  /**
   * 网络请求失败时的处理逻辑
   * @param {Object} task 任务对象
   * @param {Error} error 错误对象 
   * @param {Number} statusCode HTTP状态码
   * @private
   * 创建日期: 2025-04-11 14:35:18
   * 创建者: Claude AI 3.7 Sonnet
   */
  _handleRequestFailure: function(task, error, statusCode) {
    var that = this;
    
    // 记录失败
    this._recordNetworkPerformance(false, Date.now() - task.startTime, statusCode);
    
    // 判断是否为网络错误
    var isNetworkError = !statusCode || statusCode < 100 || statusCode >= 500 || 
                         error.message.indexOf('网络') >= 0 || 
                         error.message.indexOf('timeout') >= 0;

    // 判断是否为可恢复的失败（服务器问题或网络问题，非4xx客户端错误）
    var isRecoverable = isNetworkError || 
                       (statusCode && statusCode >= 500 && statusCode < 600);
    
    this._log('请求失败: ' + task.url + 
             (statusCode ? ' (状态码: ' + statusCode + ')' : '') + 
             (isRecoverable ? ' - 可恢复' : ' - 不可恢复'), 
             error.message, true);
    
    // 如果是网络错误并且有连接，检查网络状态
    if (isNetworkError && this._networkStatus.isConnected) {
      this._checkNetworkReliability();
    }
    
    // 检查是否处于弱网环境，调整重试策略
    var maxRetries = task.maxRetriesOverride || this._config.retryCount;
    if (this._networkStatus.signalStrength === 'weak' && !task.maxRetriesOverride) {
      maxRetries = this._config.weakNetworkMaxRetries || 5;
      this._log('弱网环境下增加重试次数到: ' + maxRetries, task.url);
    }
    
    // 可恢复错误且未超过重试次数，进行重试
    if (isRecoverable && task.retryCount < maxRetries) {
      // 保存断点续传信息
      if ((task.enableResumableDownload || this._networkStatus.signalStrength === 'weak') && 
          !that._resumableDownloads[task.url]) {
        that._resumableDownloads[task.url] = {
          url: task.url,
          task: task,
          receivedBytes: task.receivedBytes || 0,
          totalBytes: task.totalBytes || 0,
          timestamp: Date.now()
        };
      }
      
      // 增加重试次数
      task.retryCount++;
      
      // 计算退避时间
      var backoffTime = this._calculateBackoffTime(task.retryCount);
      
      this._log('安排重试 (' + task.retryCount + '/' + maxRetries + 
               '): ' + task.url + '，延迟: ' + backoffTime + 'ms');
      
      // 延迟重试
      setTimeout(function() {
        that._executeLoadTask(task);
      }, backoffTime);
    } else {
      // 超过重试次数或不可恢复的错误
      this._loading.currentTasks--;
      
      // 清除相关定时器
      if (task.timeoutTimer) {
        clearTimeout(task.timeoutTimer);
        task.timeoutTimer = null;
      }
      
      // 记录到失败队列，以便网络恢复时重试
      if (isRecoverable) {
        this._failedTasks[task.url] = {
          task: task,
          timestamp: Date.now(),
          error: error
        };
      }
      
      // 加载下一个任务
      this._loadNextTask();
      
      // 拒绝Promise
      var rejectError = new Error(
        '图片加载失败' + 
        (statusCode ? ' (HTTP ' + statusCode + ')' : '') + ': ' + 
        error.message
      );
      rejectError.statusCode = statusCode;
      rejectError.url = task.url;
      rejectError.recoverable = isRecoverable;
      task.reject(rejectError);
    }
  },
  
  /**
   * 计算指数退避重试时间
   * @param {Number} retryCount 当前重试次数
   * @return {Number} 退避时间(毫秒)
   * @private
   * 创建日期: 2025-04-11 14:38:45
   * 创建者: Claude AI 3.7 Sonnet
   */
  _calculateBackoffTime: function(retryCount) {
    // 基础退避时间
    var baseTime = this._config.retryDelay;
    
    // 网络状态调整
    if (this._networkStatus.signalStrength === 'weak') {
      baseTime *= 2; // 弱网环境下基础时间翻倍
      
      // 计算弱网程度系数
      var weakNetFactor = 1.0;
      if (this._networkPerformance.failureRate > 0.5) {
        // 失败率超过50%，进一步增加退避时间
        weakNetFactor += (this._networkPerformance.failureRate - 0.5) * 2;
      }
      
      if (this._networkPerformance.avgResponseTime > 2000) {
        // 响应时间超过2秒，进一步增加退避时间
        weakNetFactor += Math.min(3, (this._networkPerformance.avgResponseTime - 2000) / 2000);
      }
      
      baseTime *= weakNetFactor;
      
      this._log('弱网环境退避时间系数: ' + weakNetFactor.toFixed(2));
    }
    
    // 指数退避增长（1，2，4，8...）但增加一些随机性
    var exponentialTime = baseTime * Math.pow(2, retryCount - 1);
    
    // 添加随机抖动以防止同时重试风暴（抖动范围±30%）
    var jitter = exponentialTime * 0.3 * (Math.random() * 2 - 1);
    
    // 计算最终时间，同时设置上限
    var finalTime = Math.min(
      exponentialTime + jitter, 
      this._config.maxRetryDelay || 30000
    );
    
    return Math.round(finalTime);
  },
  
  /**
   * 检查网络可靠性
   * @private
   * 创建日期: 2025-04-11 14:41:32
   * 创建者: Claude AI 3.7 Sonnet
   */
  _checkNetworkReliability: function() {
    var that = this;
    
    // 增加连续失败计数
    this._consecutiveFailures++;
    
    // 如果连续失败过多，可能是网络出现问题但系统未检测到
    if (this._consecutiveFailures >= 3 && !this._isCheckingNetwork) {
      this._isCheckingNetwork = true;
      this._log('检测到连续失败，主动检查网络状态...', null, true);
      
      // 主动获取网络状态
      wx.getNetworkType({
        success: function(res) {
          that._log('主动获取网络状态: ' + res.networkType);
          
          // 如果系统认为有网但连续失败，则降低网络质量评估
          if (res.networkType !== 'none') {
            that._networkStatus.signalStrength = 'weak';
            
            // 暂时降低并发请求数以减轻负载
            var originalConcurrent = that._config.concurrentLoads;
            that._config.concurrentLoads = Math.max(1, Math.floor(originalConcurrent / 2));
            
            that._log('网络不稳定，临时降低并发请求数: ' + 
                     that._config.concurrentLoads + ' (原: ' + originalConcurrent + ')', null, true);
            
            // 30秒后恢复
            setTimeout(function() {
              that._config.concurrentLoads = originalConcurrent;
              that._log('恢复原并发请求数: ' + originalConcurrent);
            }, 30000);
          } else {
            // 系统认为断网，但状态未更新
            that._handleNetworkStatusChange({
              networkType: 'none',
              isConnected: false
            });
          }
        },
        complete: function() {
          that._isCheckingNetwork = false;
        }
      });
    }
    
    // 5秒内没有新失败，重置连续失败计数
    clearTimeout(this._failureResetTimer);
    this._failureResetTimer = setTimeout(function() {
      that._consecutiveFailures = 0;
    }, 5000);
  },
  
  /**
   * 更新网络波动检测
   * @param {Boolean} success 是否成功
   * @param {Number} responseTime 响应时间(ms)
   * @private
   * 创建日期: 2025-04-13 16:35:28
   * 创建者: Claude AI 3.7 Sonnet
   */
  _updateNetworkFluctuation: function(success, responseTime) {
    if (!this._networkFluctuation.enabled || !responseTime) {
      return;
    }
    
    var now = Date.now();
    
    // 添加样本
    this._networkFluctuation.samples.push({
      time: now,
      success: success,
      responseTime: responseTime
    });
    
    // 保持样本数量在限制内
    if (this._networkFluctuation.samples.length > this._networkFluctuation.maxSamples) {
      this._networkFluctuation.samples.shift();
    }
    
    // 至少需要3个样本才能评估
    if (this._networkFluctuation.samples.length < 3) {
      return;
    }
    
    // 计算波动性
    var samples = this._networkFluctuation.samples;
    var responseTimes = samples.map(s => s.responseTime);
    
    // 计算平均值和标准差
    var avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    var variance = responseTimes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / responseTimes.length;
    var stdDev = Math.sqrt(variance);
    
    // 变异系数（标准差/平均值）作为波动的指标
    var fluctuation = stdDev / avg;
    
    // 连续慢响应检测
    if (responseTime > avg * 1.5) {
      this._networkFluctuation.consecutiveSlowResponses++;
    } else {
      this._networkFluctuation.consecutiveSlowResponses = 0;
    }
    
    // 计算波动评分 (0-100)
    var fluctuationScore = Math.min(100, Math.round(fluctuation * 100));
    
    // 增加失败率的影响
    var failureRate = samples.filter(s => !s.success).length / samples.length;
    fluctuationScore += Math.round(failureRate * 50);
    
    // 检测网络不稳定
    var instabilityDetected = 
      fluctuationScore > 50 || 
      failureRate > 0.3 || 
      this._networkFluctuation.consecutiveSlowResponses >= 3;
    
    // 更新数据
    this._networkFluctuation.fluctuationScore = Math.min(100, fluctuationScore);
    this._networkFluctuation.lastCheckTime = now;
    this._networkFluctuation.instabilityDetected = instabilityDetected;
    
    // 网络不稳定时触发弱网策略
    if (instabilityDetected && this._networkStatus.signalStrength !== 'weak') {
      this._log('检测到网络不稳定，波动评分: ' + fluctuationScore + 
               '，失败率: ' + (failureRate * 100).toFixed(1) + '%，' +
               '切换到弱网模式', null, true);
      
      this._networkStatus.signalStrength = 'weak';
      this._adjustLoadingStrategy();
    }
  },
  
  /**
   * 记录网络性能数据
   * @param {Boolean} success 请求是否成功
   * @param {Number} responseTime 响应时间(ms)
   * @param {Number} statusCode HTTP状态码
   * @private
   * 修改日期: 2025-04-13 16:42:15
   * 修改者: Claude AI 3.7 Sonnet
   */
  _recordNetworkPerformance: function(success, responseTime, statusCode) {
    var now = Date.now();
    
    // 更新性能统计
    this._networkPerformance.samples++;
    
    if (success) {
      this._networkPerformance.successCount++;
      
      if (responseTime > 0) {
        // 更新平均响应时间（使用移动平均）
        if (this._networkPerformance.avgResponseTime === 0) {
          this._networkPerformance.avgResponseTime = responseTime;
        } else {
          // 使用最近30个请求的移动平均
          var weight = Math.min(1, 1 / Math.min(30, this._networkPerformance.samples));
          this._networkPerformance.avgResponseTime = 
            this._networkPerformance.avgResponseTime * (1 - weight) + responseTime * weight;
        }
        
        // 更新最小/最大响应时间
        if (this._networkPerformance.minResponseTime === 0 || 
            responseTime < this._networkPerformance.minResponseTime) {
          this._networkPerformance.minResponseTime = responseTime;
        }
        
        if (responseTime > this._networkPerformance.maxResponseTime) {
          this._networkPerformance.maxResponseTime = responseTime;
        }
      }
    } else {
      this._networkPerformance.failureCount++;
    }
    
    // 计算失败率
    var totalRequests = this._networkPerformance.successCount + this._networkPerformance.failureCount;
    if (totalRequests > 0) {
      this._networkPerformance.failureRate = this._networkPerformance.failureCount / totalRequests;
    }
    
    this._networkPerformance.lastUpdate = now;
    
    // 调用网络波动检测
    this._updateNetworkFluctuation(success, responseTime);
    
    // 当有足够的样本时，根据性能数据自动调整策略
    if (this._networkPerformance.samples >= 5 && 
        now - this._lastStrategyAdjustTime > 10000) { // 至少10秒一次调整
      this._lastStrategyAdjustTime = now;
      this._adjustLoadingStrategy();
    }
  },
  
  /**
   * 根据网络状态自动调整加载策略
   * @private
   * 创建日期: 2025-04-13 16:45:32
   * 创建者: Claude AI 3.7 Sonnet
   */
  _adjustLoadingStrategy: function() {
    var networkStatus = this._networkStatus;
    var fluctuation = this._networkFluctuation;
    var performance = this._networkPerformance;
    
    // 未启用自适应加载或没有性能数据，不进行调整
    if (!this._config.adaptiveLoadingEnabled || performance.samples < 5) {
      return;
    }
    
    this._log('调整加载策略，当前网络: ' + networkStatus.type + 
             '，信号强度: ' + networkStatus.signalStrength +
             '，失败率: ' + (performance.failureRate * 100).toFixed(1) + '%');
    
    // 根据网络状态调整并发数
    var newConcurrent = this._config.concurrentLoads;
    
    // 1. 根据网络类型基础调整
    switch (networkStatus.type) {
      case 'wifi':
      case '5g':
        newConcurrent = 5;
        break;
      case '4g':
        newConcurrent = 4;
        break;
      case '3g':
        newConcurrent = 3;
        break;
      case '2g':
      default:
        newConcurrent = 2;
        break;
    }
    
    // 2. 根据信号强度调整
    if (networkStatus.signalStrength === 'weak') {
      newConcurrent = Math.max(1, newConcurrent - 2);
    } else if (networkStatus.signalStrength === 'medium') {
      newConcurrent = Math.max(1, newConcurrent - 1);
    }
    
    // 3. 根据性能数据微调
    if (performance.failureRate > 0.3) {
      // 高失败率，降低并发
      newConcurrent = Math.max(1, newConcurrent - 1);
    }
    
    if (performance.avgResponseTime > 3000) {
      // 响应时间过长，降低并发
      newConcurrent = Math.max(1, newConcurrent - 1);
    }
    
    // 4. 网络波动检测调整
    if (fluctuation.instabilityDetected) {
      // 网络波动大，限制并发
      newConcurrent = Math.max(1, Math.min(newConcurrent, 2));
      
      // 极端波动情况
      if (fluctuation.fluctuationScore > 75) {
        newConcurrent = 1;
      }
    }
    
    // 应用调整
    if (newConcurrent !== this._config.concurrentLoads) {
      this._log('调整并发加载数: ' + this._config.concurrentLoads + ' -> ' + newConcurrent);
      this._config.concurrentLoads = newConcurrent;
    }
    
    // 在弱网环境下可能需要更新缓存策略
    if (networkStatus.signalStrength === 'weak' && !this._weakNetCachePolicyApplied) {
      this._log('应用弱网缓存策略', null, true);
      
      // 增加缓存过期时间
      this._config.cacheExpiration = 14 * 24 * 60 * 60 * 1000; // 14天
      
      // 更多弱网优化策略可以在这里应用
      this._weakNetCachePolicyApplied = true;
    }
  },
};

module.exports = OptimizedImageLoader; 