/**
 * 照片批处理器
 * 用于批量处理照片和优化内存使用
 */

// 导入依赖模块
const B1PhotoOptimizedLoader = require('./b1-photo-optimized-loader');

/**
 * 照片批处理器
 */
const PhotoBatchProcessor = {
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
  init(options = {}) {
    // 合并配置
    this._config = {
      ...this._config,
      ...options
    };
    
    // 初始化照片加载器
    this._photoLoader = B1PhotoOptimizedLoader.init({
      logLevel: this._config.logLevel
    });
    
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
   * 添加批处理任务
   * @param {Array} photos 照片数组
   * @param {Function} processor 处理函数
   * @param {Object} options 处理选项
   * @returns {Promise<Array>} 处理结果
   */
  addBatch(photos, processor, options = {}) {
    if (!photos || photos.length === 0) {
      return Promise.resolve([]);
    }
    
    if (!processor || typeof processor !== 'function') {
      return Promise.reject(new Error('处理函数不能为空且必须是函数'));
    }
    
    return new Promise((resolve, reject) => {
      // 创建批处理任务
      const task = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        photos: [...photos],
        processor: processor,
        options: options,
        results: [],
        errors: [],
        onComplete: (results, errors) => {
          resolve({ results, errors });
        },
        onError: (error) => {
          reject(error);
        }
      };
      
      // 添加到队列
      this._queue.push(task);
      
      // 如果没有在处理中，开始处理
      if (!this._isProcessing) {
        this._processNextBatch();
      }
    });
  },
  
  /**
   * 处理下一批次
   * @private
   */
  _processNextBatch() {
    if (this._queue.length === 0) {
      this._isProcessing = false;
      return;
    }
    
    this._isProcessing = true;
    const currentTask = this._queue[0];
    
    // 取出批次大小的照片
    const currentBatch = currentTask.photos.splice(0, this._config.batchSize);
    
    if (currentBatch.length === 0) {
      // 当前任务已处理完毕
      this._log(3, `[PhotoBatchProcessor] 任务 ${currentTask.id} 已完成，处理了 ${currentTask.results.length} 张照片`);
      
      // 执行完成回调
      currentTask.onComplete(currentTask.results, currentTask.errors);
      
      // 从队列移除
      this._queue.shift();
      
      // 处理下一个任务
      this._processNextBatch();
      return;
    }
    
    this._log(3, `[PhotoBatchProcessor] 正在处理批次，共 ${currentBatch.length} 张照片`);
    
    // 处理当前批次
    const processBatchPromises = currentBatch.map(photo => {
      return new Promise((resolve) => {
        // 使用传入的处理函数处理照片
        Promise.resolve(currentTask.processor(photo, currentTask.options))
          .then(result => {
            currentTask.results.push(result);
            resolve();
          })
          .catch(error => {
            this._log(1, `[PhotoBatchProcessor] 处理照片出错:`, error);
            currentTask.errors.push({ photo, error });
            resolve(); // 错误不中断流程
          });
      });
    });
    
    // 等待所有处理完成
    Promise.all(processBatchPromises)
      .then(() => {
        // 设置定时器延迟处理下一批
        setTimeout(() => {
          this._processNextBatch();
        }, this._config.batchInterval);
        
        // 处理完一批后检查是否需要清理
        if (this._config.autoCleanup && currentTask.photos.length % 10 === 0) {
          this._photoLoader.clearUnusedCache();
        }
      })
      .catch(error => {
        this._log(1, `[PhotoBatchProcessor] 批处理出错:`, error);
        currentTask.onError(error);
        
        // 从队列移除
        this._queue.shift();
        
        // 处理下一个任务
        this._processNextBatch();
      });
  },
  
  /**
   * 批量压缩照片
   * @param {Array} photos 照片数组，每个元素为{path, options?}结构
   * @param {Object} globalOptions 全局选项
   * @returns {Promise<Array>} 压缩结果
   */
  compressPhotos(photos, globalOptions = {}) {
    const defaultOptions = {
      quality: 0.8,
      maxWidth: 1280,
      maxHeight: 1280,
      format: 'jpg'
    };
    
    const options = { ...defaultOptions, ...globalOptions };
    
    // 照片处理函数
    const processor = (photo, opts) => {
      // 合并全局选项和单张照片选项
      const photoOptions = { ...opts, ...(photo.options || {}) };
      
      return new Promise((resolve, reject) => {
        // 获取图片信息
        wx.getImageInfo({
          src: photo.path,
          success: (info) => {
            // 计算目标尺寸
            const targetSize = this._calculateTargetSize(
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
                success: (res) => {
                  resolve({
                    original: photo.path,
                    compressed: res.tempFilePath,
                    width: targetSize.width,
                    height: targetSize.height,
                    size: 0, // 文件大小未知
                    quality: photoOptions.quality
                  });
                },
                fail: (err) => {
                  this._log(1, `[PhotoBatchProcessor] 压缩图片失败:`, err);
                  // 压缩失败，返回原图
                  resolve({
                    original: photo.path,
                    compressed: photo.path,
                    width: info.width,
                    height: info.height,
                    size: 0,
                    quality: 1.0,
                    error: err
                  });
                }
              });
            } else {
              // 不需要压缩，返回原图
              resolve({
                original: photo.path,
                compressed: photo.path,
                width: info.width,
                height: info.height,
                size: 0,
                quality: 1.0,
                skipped: true
              });
            }
          },
          fail: (err) => {
            this._log(1, `[PhotoBatchProcessor] 获取图片信息失败:`, err);
            reject(err);
          }
        });
      });
    };
    
    // 添加批处理任务
    return this.addBatch(photos, processor, options);
  },
  
  /**
   * 批量预加载照片
   * @param {Array} photoUrls 照片URL数组
   * @param {String} mode 加载模式：thumbnail/preview/full
   * @returns {Promise<Array>} 加载结果
   */
  preloadPhotos(photoUrls, mode = 'thumbnail') {
    if (!photoUrls || photoUrls.length === 0) {
      return Promise.resolve([]);
    }
    
    // 格式化输入
    const photos = photoUrls.map(url => {
      return typeof url === 'string' ? { path: url } : url;
    });
    
    // 照片处理函数
    const processor = (photo) => {
      return this._photoLoader.loadPhoto(photo.path, {
        mode: mode,
        useCache: true
      });
    };
    
    // 添加批处理任务
    return this.addBatch(photos, processor, { mode });
  },
  
  /**
   * 批量上传照片
   * @param {Array} photos 照片数组，每个元素为{path, url, formData?, name?, header?}结构
   * @param {Object} globalOptions 全局选项
   * @returns {Promise<Array>} 上传结果
   */
  uploadPhotos(photos, globalOptions = {}) {
    const defaultOptions = {
      compressBeforeUpload: true,
      quality: 0.7,
      maxWidth: 1500,
      maxHeight: 1500,
      formData: {},
      header: {},
      name: 'file',
      retry: 1
    };
    
    const options = { ...defaultOptions, ...globalOptions };
    
    // 照片处理函数
    const processor = (photo, opts) => {
      // 合并全局选项和单张照片选项
      const photoOptions = { ...opts, ...(photo.options || {}) };
      
      return new Promise((resolve, reject) => {
        const upload = (path) => {
          // 执行上传
          const uploadTask = wx.uploadFile({
            url: photo.url,
            filePath: path,
            name: photo.name || photoOptions.name,
            formData: { ...photoOptions.formData, ...(photo.formData || {}) },
            header: { ...photoOptions.header, ...(photo.header || {}) },
            success: (res) => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                // 上传成功
                let data = null;
                try {
                  data = JSON.parse(res.data);
                } catch (e) {
                  data = res.data;
                }
                
                resolve({
                  path: path,
                  statusCode: res.statusCode,
                  data: data,
                  success: true
                });
              } else {
                // 服务器返回错误
                this._log(1, `[PhotoBatchProcessor] 上传失败，状态码: ${res.statusCode}`);
                resolve({
                  path: path,
                  statusCode: res.statusCode,
                  errorMsg: `上传失败，状态码: ${res.statusCode}`,
                  success: false
                });
              }
            },
            fail: (err) => {
              this._log(1, `[PhotoBatchProcessor] 上传失败:`, err);
              // 检查是否需要重试
              if (photoOptions.retry > 0) {
                this._log(2, `[PhotoBatchProcessor] 尝试重新上传，剩余重试次数: ${photoOptions.retry - 1}`);
                // 减少重试次数
                photoOptions.retry--;
                // 延迟重试
                setTimeout(() => {
                  upload(path);
                }, 1000);
              } else {
                resolve({
                  path: path,
                  errorMsg: err.errMsg || '上传失败',
                  success: false
                });
              }
            }
          });
          
          // 监听上传进度
          if (photo.onProgress && typeof photo.onProgress === 'function') {
            uploadTask.onProgressUpdate(res => {
              photo.onProgress(res.progress);
            });
          }
        };
        
        if (photoOptions.compressBeforeUpload) {
          // 先压缩再上传
          this.compressPhotos([photo], photoOptions)
            .then(result => {
              if (result.results && result.results[0]) {
                upload(result.results[0].compressed);
              } else {
                upload(photo.path); // 压缩失败，使用原图
              }
            })
            .catch(err => {
              this._log(1, `[PhotoBatchProcessor] 压缩失败:`, err);
              upload(photo.path); // 压缩失败，使用原图
            });
        } else {
          // 直接上传原图
          upload(photo.path);
        }
      });
    };
    
    // 添加批处理任务
    return this.addBatch(photos, processor, options);
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

module.exports = PhotoBatchProcessor; 