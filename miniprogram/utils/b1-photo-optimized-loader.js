/**
 * B1照片优化加载器
 * 专为基础照片采集功能优化的图片加载器
 */

// 导入依赖
const ImageLoadingStrategy = require('./image-loading-strategy');
const EnhancedImageCacheManager = require('./enhanced-image-cache-manager');
const NetworkMonitor = require('./network-monitor');

/**
 * B1照片优化加载器
 */
const B1PhotoOptimizedLoader = {
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
  init(options = {}) {
    if (this._initialized) {
      console.warn('[B1PhotoOptimizedLoader] 已经初始化，忽略重复调用');
      return this;
    }
    
    // 合并配置
    this._config = {
      ...this._config,
      ...options
    };
    
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
  _setupMemoryWarningListener() {
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
  _startCleanupTimer() {
    // 清理旧的定时器
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
    }
    
    // 创建新的定时器
    this._cleanupTimer = setInterval(() => {
      this._cleanTempFiles();
    }, this._config.cleanupInterval);
  },
  
  /**
   * 停止定时清理
   * @private
   */
  _stopCleanupTimer() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  },
  
  /**
   * 加载照片
   * @param {String} url 照片URL
   * @param {Object} options 加载选项
   * @returns {Promise<Object>} 加载结果
   */
  loadPhoto(url, options = {}) {
    if (!this._initialized) {
      this.init();
    }
    
    const defaultOptions = {
      mode: 'preview', // 可选: 'thumbnail', 'preview', 'full'
      cacheKey: null,
      customSize: null,
      quality: null,
      useCache: true
    };
    
    const opts = { ...defaultOptions, ...options };
    const cacheKey = opts.cacheKey || this._getCacheKey(url, opts.mode, opts.customSize);
    
    // 如果启用缓存，先检查缓存
    if (opts.useCache) {
      const cached = this._cacheManager.get(cacheKey);
      if (cached) {
        return Promise.resolve(cached);
      }
    }
    
    // 获取最佳加载策略
    const strategy = this._loadingStrategy.getStrategy(opts.mode);
    
    // 构建加载参数
    const loadParams = {
      src: url,
      quality: opts.quality || strategy.quality,
      maxWidth: opts.customSize ? opts.customSize.width : strategy.maxWidth,
      maxHeight: opts.customSize ? opts.customSize.height : strategy.maxHeight
    };
    
    // 加载照片
    return this._loadWithStrategy(loadParams, cacheKey, opts.mode);
  },
  
  /**
   * 使用策略加载照片
   * @param {Object} params 加载参数
   * @param {String} cacheKey 缓存键
   * @param {String} mode 加载模式
   * @returns {Promise<Object>} 加载结果
   * @private
   */
  _loadWithStrategy(params, cacheKey, mode) {
    return new Promise((resolve, reject) => {
      let loadTask;
      
      // 网络图片
      if (params.src.startsWith('http')) {
        // 获取网络状态
        const networkType = this._networkMonitor.getNetworkType();
        
        // 如果网络不好并且是完整图片模式，降级处理
        if (mode === 'full' && (networkType === 'none' || networkType === '2g')) {
          this._log(2, '[B1PhotoOptimizedLoader] 网络状况不佳，降级加载模式');
          // 降级为预览图
          params.maxWidth = this._config.previewMaxSize;
          params.maxHeight = this._config.previewMaxSize;
          params.quality = params.quality * 0.8; // 降低质量
        }
        
        // 下载图片
        loadTask = wx.downloadFile({
          url: params.src,
          success: (res) => {
            if (res.statusCode === 200) {
              // 下载成功
              this._processTempFile(res.tempFilePath, params, cacheKey, mode)
                .then(resolve)
                .catch(reject);
            } else {
              reject(new Error(`下载失败，状态码: ${res.statusCode}`));
            }
          },
          fail: (err) => {
            this._log(1, `[B1PhotoOptimizedLoader] 下载图片失败: ${params.src}`, err);
            reject(err);
          }
        });
      } else if (params.src.startsWith('wxfile://') || params.src.indexOf('://') === -1) {
        // 本地文件，直接处理
        this._processTempFile(params.src, params, cacheKey, mode)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error(`不支持的图片源: ${params.src}`));
      }
    });
  },
  
  /**
   * 处理临时文件
   * @param {String} filePath 文件路径
   * @param {Object} params 处理参数
   * @param {String} cacheKey 缓存键
   * @param {String} mode 加载模式
   * @returns {Promise<Object>} 处理结果
   * @private
   */
  _processTempFile(filePath, params, cacheKey, mode) {
    return new Promise((resolve, reject) => {
      // 记录临时文件
      if (filePath.indexOf('wxfile://tmp_') === 0 || filePath.indexOf('http://tmp/') === 0) {
        this._tempFiles.push({
          path: filePath,
          createTime: Date.now()
        });
      }
      
      // 检查是否需要压缩
      if (params.quality < 1.0 || params.maxWidth || params.maxHeight) {
        // 获取图片信息
        wx.getImageInfo({
          src: filePath,
          success: (info) => {
            // 计算目标尺寸
            const targetSize = this._calculateTargetSize(
              info.width, 
              info.height,
              params.maxWidth,
              params.maxHeight
            );
            
            // 如果尺寸或质量需要调整，执行压缩
            if ((targetSize.width < info.width || targetSize.height < info.height || params.quality < 1.0)
                && mode !== 'full') { // 全尺寸模式不压缩
              this._compressImage(filePath, targetSize, params.quality)
                .then(compressedPath => {
                  // 添加到缓存
                  this._cacheManager.set(cacheKey, compressedPath, {
                    originalWidth: info.width,
                    originalHeight: info.height,
                    width: targetSize.width,
                    height: targetSize.height,
                    mode: mode,
                    quality: params.quality
                  }).then(result => {
                    resolve(result);
                  }).catch(err => {
                    resolve({ src: compressedPath }); // 缓存失败也返回路径
                  });
                })
                .catch(err => {
                  // 压缩失败，使用原图
                  this._log(1, `[B1PhotoOptimizedLoader] 压缩图片失败，使用原图`, err);
                  resolve({ src: filePath });
                });
            } else {
              // 不需要压缩，直接使用
              this._cacheManager.set(cacheKey, filePath, {
                width: info.width,
                height: info.height,
                mode: mode
              }).then(result => {
                resolve(result);
              }).catch(err => {
                resolve({ src: filePath }); // 缓存失败也返回路径
              });
            }
          },
          fail: (err) => {
            this._log(1, `[B1PhotoOptimizedLoader] 获取图片信息失败`, err);
            // 获取信息失败，直接使用原图
            resolve({ src: filePath });
          }
        });
      } else {
        // 不需要压缩，直接使用
        resolve({ src: filePath });
      }
    });
  },
  
  /**
   * 压缩图片
   * @param {String} filePath 文件路径
   * @param {Object} targetSize 目标尺寸
   * @param {Number} quality 质量
   * @returns {Promise<String>} 压缩后的文件路径
   * @private
   */
  _compressImage(filePath, targetSize, quality) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: filePath,
        quality: Math.floor(quality * 100),
        compressedWidth: targetSize.width,
        compressedHeight: targetSize.height,
        success: (res) => {
          // 记录新的临时文件
          if (res.tempFilePath.indexOf('wxfile://tmp_') === 0 || 
              res.tempFilePath.indexOf('http://tmp/') === 0) {
            this._tempFiles.push({
              path: res.tempFilePath,
              createTime: Date.now()
            });
          }
          resolve(res.tempFilePath);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },
  
  /**
   * 计算目标尺寸
   * @param {Number} width 原始宽度
   * @param {Number} height 原始高度
   * @param {Number} maxWidth 最大宽度
   * @param {Number} maxHeight 最大高度
   * @returns {Object} 目标尺寸
   * @private
   */
  _calculateTargetSize(width, height, maxWidth, maxHeight) {
    if (!maxWidth && !maxHeight) {
      return { width, height };
    }
    
    let targetWidth = width;
    let targetHeight = height;
    
    if (maxWidth && width > maxWidth) {
      targetWidth = maxWidth;
      targetHeight = Math.floor(height * (maxWidth / width));
    }
    
    if (maxHeight && targetHeight > maxHeight) {
      targetWidth = Math.floor(targetWidth * (maxHeight / targetHeight));
      targetHeight = maxHeight;
    }
    
    return { width: targetWidth, height: targetHeight };
  },
  
  /**
   * 获取缓存键
   * @param {String} url 图片URL
   * @param {String} mode 加载模式
   * @param {Object} customSize 自定义尺寸
   * @returns {String} 缓存键
   * @private
   */
  _getCacheKey(url, mode, customSize) {
    let key = `b1_${mode}_${url.replace(/[^a-z0-9]/gi, '_')}`;
    
    if (customSize) {
      key += `_${customSize.width}x${customSize.height}`;
    }
    
    return key;
  },
  
  /**
   * 清理未使用的缓存
   */
  clearUnusedCache() {
    // 仅清理过期或长时间未访问的缓存
    this._log(3, '[B1PhotoOptimizedLoader] 清理未使用的缓存');
    
    // 清理临时文件
    this._cleanTempFiles();
  },
  
  /**
   * 清理缓存
   * @param {Boolean} aggressive 是否积极清理
   */
  clearCache(aggressive = false) {
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
  emergencyCleanup() {
    this._log(1, '[B1PhotoOptimizedLoader] 执行紧急清理');
    
    // 清理所有缓存
    this._cacheManager.clearCache();
    
    // 立即清理所有临时文件
    this._cleanTempFiles(true);
    
    // 清理内存缓存
    this._loadingStrategy.releaseMemory();
  },
  
  /**
   * 预加载照片
   * @param {String|Array} urls 照片URL或URL数组
   * @param {Object} options 加载选项
   * @returns {Promise<Array>} 加载结果
   */
  preloadPhotos(urls, options = {}) {
    if (!Array.isArray(urls)) {
      urls = [urls];
    }
    
    // 默认使用缩略图模式
    const opts = { 
      mode: 'thumbnail',
      ...options
    };
    
    // 创建加载任务
    const tasks = urls.map(url => {
      return this.loadPhoto(url, opts)
        .catch(err => {
          this._log(2, `[B1PhotoOptimizedLoader] 预加载失败: ${url}`, err);
          return null; // 忽略错误，继续加载其他图片
        });
    });
    
    return Promise.all(tasks);
  },
  
  /**
   * 清理临时文件
   * @param {Boolean} cleanAll 是否清理所有临时文件
   * @private
   */
  _cleanTempFiles(cleanAll = false) {
    if (this._tempFiles.length === 0) {
      return;
    }
    
    const now = Date.now();
    const fs = wx.getFileSystemManager();
    const MAX_AGE = 10 * 60 * 1000; // 10分钟
    let cleanCount = 0;
    
    // 过滤需要清理的文件
    const filesToKeep = this._tempFiles.filter(file => {
      if (cleanAll || (now - file.createTime > MAX_AGE)) {
        // 删除文件
        try {
          fs.unlink({
            filePath: file.path,
            fail: () => {} // 忽略错误
          });
          cleanCount++;
        } catch (e) {
          // 忽略错误
        }
        return false;
      }
      return true;
    });
    
    // 更新临时文件列表
    this._tempFiles = filesToKeep;
    
    if (cleanCount > 0) {
      this._log(3, `[B1PhotoOptimizedLoader] 已清理 ${cleanCount} 个临时文件`);
    }
  },
  
  /**
   * 销毁加载器
   */
  destroy() {
    // 停止定时清理
    this._stopCleanupTimer();
    
    // 清理所有临时文件
    this._cleanTempFiles(true);
    
    // 重置状态
    this._initialized = false;
    this._tempFiles = [];
    
    this._log(3, '[B1PhotoOptimizedLoader] 已销毁');
  }
};

module.exports = B1PhotoOptimizedLoader; 