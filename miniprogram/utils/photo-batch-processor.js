/**
 * 照片批处理器
 * 用于批量处理照片和优化内存使用
 * 
 * 创建时间: 2025-04-10 12:15:27
 * 创建者: Claude AI 3.7 Sonnet
 */

/**
 * 照片批处理器
 */
var PhotoBatchProcessor = {
  // 批处理队列
  _queue: [],
  
  // 运行状态
  _isProcessing: false,
  
  // 照片加载器
  _photoLoader: null,
  
  // 配置
  _config: {
    // 批次大小：每次处理的照片数量
    batchSize: 3,
    
    // 批次间隔（毫秒）
    batchInterval: 300,
    
    // 处理完成后自动清理
    autoCleanup: true,
    
    // 日志级别
    logLevel: 2
  },
  
  /**
   * 初始化批处理器
   * @param {Object} options 配置选项
   * @returns {Object} 当前实例
   */
  init: function(options) {
    // 合并配置
    if (options && typeof options === 'object') {
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this._config[key] = options[key];
        }
      }
    }
    
    // 初始化照片加载器
    if (typeof require === 'function') {
      try {
        var B1PhotoOptimizedLoader = require('./b1-photo-optimized-loader');
        this._photoLoader = B1PhotoOptimizedLoader.init({
          logLevel: this._config.logLevel
        });
      } catch (e) {
        this._log(1, '[PhotoBatchProcessor] 加载照片加载器失败: ' + e.message);
        // 创建一个临时加载器对象，确保操作能够继续
        this._photoLoader = {
          clearUnusedCache: function() { return true; }
        };
      }
    }
    
    this._log(3, '[PhotoBatchProcessor] 初始化完成');
    
    return this;
  },
  
  /**
   * 记录日志
   * @param {Number} level 日志级别
   * @param {String} message 日志消息
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
   * 添加批处理任务
   * @param {Array} photos 照片数组
   * @param {Function} processor 处理函数
   * @param {Object} options 处理选项
   * @returns {Promise} 处理结果
   */
  addBatch: function(photos, processor, options) {
    var that = this;
    
    if (!photos || photos.length === 0) {
      return Promise.resolve({ results: [], errors: [] });
    }
    
    if (!processor || typeof processor !== 'function') {
      return Promise.reject(new Error('处理函数不能为空且必须是函数'));
    }
    
    options = options || {};
    
    return new Promise(function(resolve, reject) {
      // 创建批处理任务
      var task = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        photos: photos.slice(), // 复制照片数组
        processor: processor,
        options: options,
        results: [],
        errors: [],
        onComplete: function(results, errors) {
          resolve({ results: results, errors: errors });
        },
        onError: function(error) {
          reject(error);
        }
      };
      
      // 添加到队列
      that._queue.push(task);
      
      // 如果没有在处理中，开始处理
      if (!that._isProcessing) {
        that._processNextBatch();
      }
    });
  },
  
  /**
   * 处理下一批次
   * @private
   */
  _processNextBatch: function() {
    var that = this;
    
    if (this._queue.length === 0) {
      this._isProcessing = false;
      return;
    }
    
    this._isProcessing = true;
    var currentTask = this._queue[0];
    
    // 取出批次大小的照片
    var currentBatch = currentTask.photos.splice(0, this._config.batchSize);
    
    if (currentBatch.length === 0) {
      // 当前任务已处理完毕
      this._log(3, '[PhotoBatchProcessor] 任务 ' + currentTask.id + ' 已完成，处理了 ' + currentTask.results.length + ' 张照片');
      
      // 执行完成回调
      currentTask.onComplete(currentTask.results, currentTask.errors);
      
      // 从队列移除
      this._queue.shift();
      
      // 处理下一个任务
      this._processNextBatch();
      return;
    }
    
    this._log(3, '[PhotoBatchProcessor] 正在处理批次，共 ' + currentBatch.length + ' 张照片');
    
    // 处理当前批次
    var processBatchPromises = [];
    
    for (var i = 0; i < currentBatch.length; i++) {
      (function(photo) {
        var processPromise = new Promise(function(resolveProcess) {
          // 使用传入的处理函数处理照片
          try {
            var result = currentTask.processor(photo, currentTask.options);
            
            // 检查是否返回Promise
            if (result && typeof result.then === 'function') {
              result.then(function(processedResult) {
                currentTask.results.push(processedResult);
                resolveProcess();
              }).catch(function(error) {
                that._log(1, '[PhotoBatchProcessor] 处理照片出错:', error);
                currentTask.errors.push({ photo: photo, error: error });
                resolveProcess(); // 错误不中断流程
              });
            } else {
              // 同步结果
              currentTask.results.push(result);
              resolveProcess();
            }
          } catch (error) {
            that._log(1, '[PhotoBatchProcessor] 处理照片异常:', error);
            currentTask.errors.push({ photo: photo, error: error });
            resolveProcess(); // 错误不中断流程
          }
        });
        
        processBatchPromises.push(processPromise);
      })(currentBatch[i]);
    }
    
    // 等待所有处理完成
    Promise.all(processBatchPromises)
      .then(function() {
        // 设置定时器延迟处理下一批
        setTimeout(function() {
          that._processNextBatch();
        }, that._config.batchInterval);
        
        // 处理完一批后检查是否需要清理
        if (that._config.autoCleanup && currentTask.photos.length % 10 === 0) {
          if (that._photoLoader) {
            that._photoLoader.clearUnusedCache();
          }
        }
      })
      .catch(function(error) {
        that._log(1, '[PhotoBatchProcessor] 批处理出错:', error);
        currentTask.onError(error);
        
        // 从队列移除
        that._queue.shift();
        
        // 处理下一个任务
        that._processNextBatch();
      });
  },
  
  /**
   * 批量压缩照片
   * @param {Array} photos 照片数组，每个元素为{path, options?}结构
   * @param {Object} globalOptions 全局选项
   * @returns {Promise} 压缩结果
   */
  compressPhotos: function(photos, globalOptions) {
    var that = this;
    
    if (!photos || photos.length === 0) {
      return Promise.resolve([]);
    }
    
    var defaultOptions = {
      quality: 0.8,
      maxWidth: 1280,
      maxHeight: 1280,
      format: 'jpg'
    };
    
    // 合并选项
    var options = {};
    for (var key in defaultOptions) {
      if (defaultOptions.hasOwnProperty(key)) {
        options[key] = defaultOptions[key];
      }
    }
    
    if (globalOptions && typeof globalOptions === 'object') {
      for (var key in globalOptions) {
        if (globalOptions.hasOwnProperty(key)) {
          options[key] = globalOptions[key];
        }
      }
    }
    
    // 照片处理函数
    var processor = function(photo, opts) {
      // 合并全局选项和单张照片选项
      var photoOptions = {};
      for (var key in opts) {
        if (opts.hasOwnProperty(key)) {
          photoOptions[key] = opts[key];
        }
      }
      
      // 应用照片特定选项
      if (photo.options && typeof photo.options === 'object') {
        for (var key in photo.options) {
          if (photo.options.hasOwnProperty(key)) {
            photoOptions[key] = photo.options[key];
          }
        }
      }
      
      return new Promise(function(resolve, reject) {
        // 获取图片信息
        wx.getImageInfo({
          src: photo.path,
          success: function(info) {
            // 计算目标尺寸
            var targetSize = that._calculateTargetSize(
              info.width,
              info.height,
              photoOptions.maxWidth,
              photoOptions.maxHeight
            );
            
            // 检查是否需要压缩
            if (targetSize.width < info.width || 
                targetSize.height < info.height || 
                photoOptions.quality < 1.0 ||
                (info.type !== photoOptions.format && photoOptions.format !== 'original')) {
              
              // 压缩图片
              wx.compressImage({
                src: photo.path,
                quality: Math.floor(photoOptions.quality * 100),
                compressedWidth: targetSize.width,
                compressedHeight: targetSize.height,
                success: function(res) {
                  resolve({
                    original: photo.path,
                    compressed: res.tempFilePath,
                    width: targetSize.width,
                    height: targetSize.height,
                    quality: photoOptions.quality,
                    format: photoOptions.format,
                    size: 0, // 实际大小需要进一步获取
                    metadata: photo.metadata || {}
                  });
                },
                fail: function(err) {
                  that._log(1, '[PhotoBatchProcessor] 压缩图片失败:', err);
                  reject(err);
                }
              });
            } else {
              // 不需要压缩，直接返回原图
              resolve({
                original: photo.path,
                compressed: photo.path, // 原图即为"压缩图"
                width: info.width,
                height: info.height,
                quality: 1.0,
                format: info.type,
                size: 0, // 实际大小需要进一步获取
                metadata: photo.metadata || {}
              });
            }
          },
          fail: function(err) {
            that._log(1, '[PhotoBatchProcessor] 获取图片信息失败:', err);
            reject(err);
          }
        });
      });
    };
    
    // 执行批处理
    return this.addBatch(photos, processor, options)
      .then(function(result) {
        return result.results; // 只返回成功结果
      });
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
   * 取消所有任务
   */
  cancelAll() {
    this._log(2, '[PhotoBatchProcessor] 取消所有任务');
    this._queue = [];
    this._isProcessing = false;
  },
  
  /**
   * 销毁实例
   */
  destroy() {
    this.cancelAll();
    
    if (this._photoLoader) {
      this._photoLoader.destroy();
    }
    
    this._log(3, '[PhotoBatchProcessor] 已销毁');
  }
};

// 导出模块
module.exports = PhotoBatchProcessor; 