/**
 * B1照片优化加载器
 * 专为基础照片采集功能优化的图片加载器
 * 
 * 创建时间: 2025-04-10 12:45:38
 * 创建者: Claude AI 3.7 Sonnet
 */

// 导入依赖
const ImageLoadingStrategy = require('./image-loading-strategy');
const EnhancedImageCacheManager = require('./enhanced-image-cache-manager');
const NetworkMonitor = require('./network-monitor');

/**
 * B1照片优化加载器
 */
var B1PhotoOptimizedLoader = {
  // 缓存管理器
  _cacheManager: null,
  
  // 加载策略
  _loadingStrategy: null,
  
  // 网络监控
  _networkMonitor: null,
  
  // 配置选项
  _config: {
    // 默认质量
    defaultQuality: 0.8,
    
    // 缩略图最大尺寸
    thumbnailMaxSize: 200,
    
    // 预览图最大尺寸
    previewMaxSize: 800,
    
    // 自动清理临时文件的间隔(毫秒)
    cleanupInterval: 5 * 60 * 1000, // 5分钟
    
    // 日志级别
    logLevel: 2
  },
  
  // 初始化状态
  _initialized: false,
  
  // 自动清理定时器
  _cleanupTimer: null,
  
  // 临时文件记录
  _tempFiles: [],
  
  /**
   * 初始化加载器
   * @param {Object} options 配置选项
   * @returns {Object} 当前实例
   */
  init: function(options) {
    if (this._initialized) {
      this._log(2, '[B1PhotoOptimizedLoader] 已经初始化，忽略重复调用');
      return this;
    }
    
    // 合并配置
    if (options && typeof options === 'object') {
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this._config[key] = options[key];
        }
      }
    }
    
    // 初始化缓存管理器
    this._cacheManager = EnhancedImageCacheManager.init({
      logLevel: this._config.logLevel
    });
    
    // 初始化加载策略
    this._loadingStrategy = ImageLoadingStrategy.init({
      logLevel: this._config.logLevel
    });
    
    // 初始化网络监控
    this._networkMonitor = NetworkMonitor.init();
    
    // 设置内存警告监听
    this._setupMemoryWarningListener();
    
    // 开始定时清理
    this._startCleanupTimer();
    
    this._initialized = true;
    this._log(3, '[B1PhotoOptimizedLoader] 初始化完成');
    
    return this;
  },
  
  /**
   * 记录日志
   * @param {Number} level 日志级别
   * @param {String} message 日志信息
   * @param {Object} data 附加数据
   * @private
   */
  _log: function(level, message, data) {
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
  _setupMemoryWarningListener: function() {
    wx.onMemoryWarning(res => {
      this._log(2, `[B1PhotoOptimizedLoader] 收到内存警告，级别: ${res.level}`);
      
      // 根据警告级别采取不同的措施
      switch (res.level) {
        case 10: // 轻微警告
          this.clearUnusedCache();
          break;
        case 15: // 中度警告
          this.clearCache(true);
          break;
        case 20: // 严重警告
          this.emergencyCleanup();
          break;
      }
    });
  },
  
  /**
   * 开始定时清理
   * @private
   */
  _startCleanupTimer: function() {
    // 清理旧的定时器
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
    }
    
    // 创建新的定时器
    this._cleanupTimer = setInterval(function() {
      this._cleanTempFiles(false);
    }.bind(this), this._config.cleanupInterval);
  },
  
  /**
   * 停止定时清理
   * @private
   */
  _stopCleanupTimer: function() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  },
  
  /**
   * 加载照片
   * @param {String} url 照片URL
   * @param {Object} options 加载选项
   * @returns {Promise} 加载结果
   */
  loadPhoto: function(url, options) {
    var that = this;
    
    if (!this._initialized) {
      this.init();
    }
    
    // 默认选项
    var defaultOptions = {
      mode: 'preview', // 可选: 'thumbnail', 'preview', 'full'
      cacheKey: null,
      customSize: null,
      quality: null,
      useCache: true
    };
    
    // 合并选项
    var opts = {};
    for (var key in defaultOptions) {
      if (defaultOptions.hasOwnProperty(key)) {
        opts[key] = defaultOptions[key];
      }
    }
    
    if (options && typeof options === 'object') {
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          opts[key] = options[key];
        }
      }
    }
    
    // 生成缓存键
    var cacheKey = opts.cacheKey || this._getCacheKey(url, opts.mode);
    
    // 构建加载参数
    var loadParams = {
      src: url,
      quality: opts.quality || this._config.defaultQuality,
      maxWidth: 0,
      maxHeight: 0
    };
    
    // 根据模式设置尺寸
    switch (opts.mode) {
      case 'thumbnail':
        loadParams.maxWidth = this._config.thumbnailMaxSize;
        loadParams.maxHeight = this._config.thumbnailMaxSize;
        break;
      case 'preview':
        loadParams.maxWidth = this._config.previewMaxSize;
        loadParams.maxHeight = this._config.previewMaxSize;
        break;
      case 'full':
        // 全尺寸，不设置限制
        break;
    }
    
    // 应用自定义尺寸
    if (opts.customSize && typeof opts.customSize === 'object') {
      if (opts.customSize.width) {
        loadParams.maxWidth = opts.customSize.width;
      }
      if (opts.customSize.height) {
        loadParams.maxHeight = opts.customSize.height;
      }
    }
    
    return this._loadImage(loadParams);
  },
  
  /**
   * 预加载照片
   * @param {Array|String} urls 照片URL或URL数组
   * @param {Object} options 加载选项
   * @returns {Promise} 加载结果
   */
  preloadPhotos: function(urls, options) {
    var that = this;
    
    if (!urls) {
      return Promise.resolve([]);
    }
    
    // 确保urls是数组
    if (!Array.isArray(urls)) {
      urls = [urls];
    }
    
    if (urls.length === 0) {
      return Promise.resolve([]);
    }
    
    // 默认选项
    options = options || {};
    options.mode = options.mode || 'thumbnail'; // 默认加载缩略图
    
    // 并发加载限制
    var limit = Math.min(urls.length, 3); // 最多同时加载3张
    var completed = 0;
    var results = [];
    var errors = [];
    
    return new Promise(function(resolve) {
      function startNext(index) {
        if (index >= urls.length) {
          // 所有任务已添加到队列
          return;
        }
        
        that.loadPhoto(urls[index], options)
          .then(function(result) {
            results.push({
              url: urls[index],
              result: result,
              success: true
            });
          })
          .catch(function(error) {
            errors.push({
              url: urls[index],
              error: error,
              success: false
            });
          })
          .finally(function() {
            completed++;
            
            // 检查是否所有照片都处理完成
            if (completed === urls.length) {
              resolve({
                results: results,
                errors: errors
              });
            } else {
              // 继续加载下一张
              startNext(index + limit);
            }
          });
      }
      
      // 启动初始批次的加载
      for (var i = 0; i < limit; i++) {
        startNext(i);
      }
    });
  },
  
  /**
   * 加载图片
   * @param {Object} params 加载参数
   * @returns {Promise} 加载结果
   * @private
   */
  _loadImage: function(params) {
    var that = this;
    
    return new Promise(function(resolve, reject) {
      // 获取图片信息
      wx.getImageInfo({
        src: params.src,
        success: function(info) {
          // 检查是否需要调整大小
          if ((params.maxWidth > 0 && info.width > params.maxWidth) || 
              (params.maxHeight > 0 && info.height > params.maxHeight)) {
            
            // 计算目标尺寸
            var targetSize = that._calculateTargetSize(
              info.width,
              info.height,
              params.maxWidth || info.width,
              params.maxHeight || info.height
            );
            
            // 压缩图片
            that._compressImage(params.src, targetSize, params.quality)
              .then(function(res) {
                // 记录临时文件
                that._recordTempFile(res.tempFilePath);
                
                // 返回结果
                resolve({
                  path: res.tempFilePath,
                  width: targetSize.width,
                  height: targetSize.height,
                  original: {
                    path: params.src,
                    width: info.width,
                    height: info.height
                  }
                });
              })
              .catch(function(err) {
                that._log(1, '[B1PhotoOptimizedLoader] 压缩图片失败:', err);
                
                // 压缩失败时，返回原图
                resolve({
                  path: params.src,
                  width: info.width,
                  height: info.height,
                  original: {
                    path: params.src,
                    width: info.width,
                    height: info.height
                  }
                });
              });
          } else {
            // 不需要调整大小，直接返回原图
            resolve({
              path: params.src,
              width: info.width,
              height: info.height,
              original: {
                path: params.src,
                width: info.width,
                height: info.height
              }
            });
          }
        },
        fail: function(err) {
          that._log(1, '[B1PhotoOptimizedLoader] 获取图片信息失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 压缩图片
   * @param {String} filePath 图片路径
   * @param {Object} targetSize 目标尺寸
   * @param {Number} quality 压缩质量
   * @returns {Promise} 压缩结果
   * @private
   */
  _compressImage: function(filePath, targetSize, quality) {
    return new Promise(function(resolve, reject) {
      wx.compressImage({
        src: filePath,
        quality: Math.floor(quality * 100),
        compressedWidth: targetSize.width,
        compressedHeight: targetSize.height,
        success: resolve,
        fail: reject
      });
    });
  },
  
  /**
   * 记录临时文件
   * @param {String} filePath 文件路径
   * @private
   */
  _recordTempFile: function(filePath) {
    // 只记录以临时路径开头的文件
    if (filePath && filePath.indexOf('wxfile://') === 0 || 
        filePath.indexOf('http://tmp/') === 0) {
      this._tempFiles.push({
        path: filePath,
        timestamp: Date.now()
      });
    }
  },
  
  /**
   * 计算目标尺寸
   * @param {Number} width 原始宽度
   * @param {Number} height 原始高度
   * @param {Number} maxWidth 最大宽度
   * @param {Number} maxHeight 最大高度
   * @returns {Object} 目标尺寸 {width, height}
   * @private
   */
  _calculateTargetSize: function(width, height, maxWidth, maxHeight) {
    // 检查尺寸是否超出限制
    if (width <= maxWidth && height <= maxHeight) {
      return { width: width, height: height };
    }
    
    // 计算缩放比例
    var ratio = Math.min(maxWidth / width, maxHeight / height);
    
    // 计算新尺寸
    var newWidth = Math.floor(width * ratio);
    var newHeight = Math.floor(height * ratio);
    
    return { width: newWidth, height: newHeight };
  },
  
  /**
   * 获取缓存键
   * @param {String} url 图片URL
   * @param {String} mode 加载模式
   * @returns {String} 缓存键
   * @private
   */
  _getCacheKey: function(url, mode) {
    var key = 'b1_' + mode + '_' + url.replace(/[^a-z0-9]/gi, '_');
    return key;
  },
  
  /**
   * 清理未使用的缓存
   */
  clearUnusedCache: function() {
    // 清理临时文件
    this._cleanTempFiles(false);
    return true;
  },
  
  /**
   * 清理缓存
   * @param {Boolean} aggressive 是否积极清理
   */
  clearCache: function(aggressive = false) {
    if (aggressive) {
      this._log(2, '[B1PhotoOptimizedLoader] 积极清理缓存');
      
      // 清理所有缓存
      this._cacheManager.clearCache();
      
      // 清理所有临时文件
      this._cleanTempFiles(true);
    } else {
      this.clearUnusedCache();
    }
  },
  
  /**
   * 紧急清理
   */
  emergencyCleanup: function() {
    this._log(1, '[B1PhotoOptimizedLoader] 执行紧急清理');
    
    // 清理所有缓存
    this._cacheManager.clearCache();
    
    // 立即清理所有临时文件
    this._cleanTempFiles(true);
    
    // 清理内存缓存
    this._loadingStrategy.releaseMemory();
  },
  
  /**
   * 清理临时文件
   * @param {Boolean} cleanAll 是否清理所有文件
   * @private
   */
  _cleanTempFiles: function(cleanAll) {
    if (this._tempFiles.length === 0) {
      return;
    }
    
    var now = Date.now();
    var filesToRemove = cleanAll ? this._tempFiles.slice() : [];
    
    if (!cleanAll) {
      // 找出超过5分钟的临时文件
      for (var i = 0; i < this._tempFiles.length; i++) {
        var fileInfo = this._tempFiles[i];
        // 如果文件创建时间超过5分钟，加入清理列表
        if (now - fileInfo.timestamp > 5 * 60 * 1000) {
          filesToRemove.push(fileInfo);
        }
      }
    }
    
    if (filesToRemove.length === 0) {
      return;
    }
    
    this._log(3, '[B1PhotoOptimizedLoader] 清理临时文件: ' + filesToRemove.length + '个');
    
    // 清理文件
    for (var i = 0; i < filesToRemove.length; i++) {
      var fileInfo = filesToRemove[i];
      wx.removeSavedFile({
        filePath: fileInfo.path,
        fail: function(err) {
          // 清理失败不做特殊处理
        }
      });
      
      // 从数组中移除
      var index = this._tempFiles.indexOf(fileInfo);
      if (index >= 0) {
        this._tempFiles.splice(index, 1);
      }
    }
  },
  
  /**
   * 销毁实例
   */
  destroy: function() {
    // 停止定时清理
    this._stopCleanupTimer();
    
    // 清理所有临时文件
    this._cleanTempFiles(true);
    
    this._tempFiles = [];
    this._initialized = false;
    
    this._log(3, '[B1PhotoOptimizedLoader] 已销毁');
  }
};

// 导出模块
module.exports = B1PhotoOptimizedLoader; 