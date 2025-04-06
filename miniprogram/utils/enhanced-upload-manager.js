/**
 * 强化版上传管理器
 * 整合断点续传上传器和网络监控，提供更可靠的上传体验
 */

// 导入相关工具和服务
const ResumableUploader = require('./resumable-uploader');
const NetworkMonitor = require('./network-monitor');
const SecurityFilter = require('./security-filter');
const EventBus = require('./eventBus');

/**
 * 强化版上传管理器
 */
const EnhancedUploadManager = {
  /**
   * 上传质量等级配置
   */
  _qualitySettings: {
    // 高质量: 原图上传 (95%压缩)
    high: {
      quality: 95,
      maxWidth: 2048,
      maxHeight: 2048
    },
    // 中等质量: 中度压缩 (80%压缩)
    medium: {
      quality: 80,
      maxWidth: 1280,
      maxHeight: 1280
    },
    // 低质量: 高度压缩 (60%压缩)
    low: {
      quality: 60,
      maxWidth: 800,
      maxHeight: 800
    },
    // 最低质量: 极度压缩 (40%压缩)
    minimum: {
      quality: 40,
      maxWidth: 480,
      maxHeight: 480
    }
  },
  
  /**
   * 当前设置的质量级别
   */
  _currentQuality: 'high',
  
  /**
   * 上传服务器地址
   */
  uploadUrl: 'https://example.com/api/upload',
  
  /**
   * 初始化上传管理器
   * @returns {Object} 当前实例
   */
  init(options = {}) {
    console.log('[EnhancedUploadManager] 初始化强化版上传管理器');
    
    // 设置上传URL
    if (options.uploadUrl) {
      this.uploadUrl = options.uploadUrl;
    }
    
    // 初始化断点续传上传器
    ResumableUploader.init();
    
    // 初始化网络监控
    NetworkMonitor.init();
    
    // 监听网络变化并调整上传策略
    this._setupNetworkMonitor();
    
    // 监听上传状态变化
    this._setupUploadListeners();
    
    return this;
  },
  
  /**
   * 监听网络状态变化
   * @private
   */
  _setupNetworkMonitor() {
    NetworkMonitor.onNetworkChange(state => {
      this._adjustUploadStrategy(state);
    });
  },
  
  /**
   * 设置上传状态监听
   * @private
   */
  _setupUploadListeners() {
    // 监听上传开始事件 (可用于UI更新)
    EventBus.on('upload:start', (data) => {
      console.log('[EnhancedUploadManager] 上传开始', data);
    });
    
    // 监听上传进度事件 (可用于UI更新)
    EventBus.on('upload:progress', (data) => {
      console.log('[EnhancedUploadManager] 上传进度', data);
    });
    
    // 监听上传完成事件 (可用于UI更新)
    EventBus.on('upload:complete', (data) => {
      console.log('[EnhancedUploadManager] 上传完成', data);
    });
    
    // 监听上传错误事件 (可用于UI更新)
    EventBus.on('upload:error', (data) => {
      console.log('[EnhancedUploadManager] 上传错误', data);
    });
  },
  
  /**
   * 根据网络状态调整上传策略
   * @param {Object} networkState 网络状态
   * @private
   */
  _adjustUploadStrategy(networkState) {
    // 默认使用中等质量
    let qualityLevel = 'medium';
    
    if (!networkState.connected) {
      console.log('[EnhancedUploadManager] 网络已断开，暂停所有上传');
      return;
    }
    
    // 根据网络类型调整质量
    switch (networkState.networkType) {
      case 'wifi':
        qualityLevel = 'high';
        break;
      case '4g':
        qualityLevel = 'medium';
        break;
      case '3g':
        qualityLevel = 'low';
        break;
      case '2g':
        qualityLevel = 'minimum';
        break;
      default:
        // 未知网络类型，使用中等质量
        qualityLevel = 'medium';
    }
    
    // 如果是弱网络环境，降低一级质量
    if (networkState.signalStrength === 'weak') {
      if (qualityLevel === 'high') {
        qualityLevel = 'medium';
      } else if (qualityLevel === 'medium') {
        qualityLevel = 'low';
      } else if (qualityLevel === 'low') {
        qualityLevel = 'minimum';
      }
    }
    
    // 设置当前质量级别
    this.setQuality(qualityLevel);
    
    console.log(`[EnhancedUploadManager] 网络状态: ${networkState.networkType}, 信号: ${networkState.signalStrength}, 设置质量: ${qualityLevel}`);
  },
  
  /**
   * 设置上传质量
   * @param {String} level 质量级别 high/medium/low/minimum
   * @returns {Object} 当前实例
   */
  setQuality(level) {
    if (this._qualitySettings[level]) {
      this._currentQuality = level;
      console.log(`[EnhancedUploadManager] 已设置上传质量: ${level}`);
    } else {
      console.error(`[EnhancedUploadManager] 无效的质量级别: ${level}`);
    }
    return this;
  },
  
  /**
   * 获取当前质量设置
   * @returns {Object} 质量设置对象
   */
  getQualitySetting() {
    return this._qualitySettings[this._currentQuality];
  },
  
  /**
   * 处理照片
   * 根据当前网络状态和质量设置处理上传前的照片
   * @param {Object} photoInfo 照片信息对象
   * @returns {Promise<Object>} 处理后的照片信息
   */
  async processPhoto(photoInfo) {
    if (!photoInfo || !photoInfo.path) {
      return Promise.reject(new Error('照片信息无效'));
    }
    
    try {
      const processedPhoto = {
        ...photoInfo,
        originalPath: photoInfo.path,
        processTime: Date.now()
      };
      
      // 获取当前质量设置
      const qualitySetting = this.getQualitySetting();
      console.log(`[EnhancedUploadManager] 使用 ${this._currentQuality} 质量处理照片`);
      
      // 清理图片元数据(移除GPS等敏感信息)
      const securedPath = await SecurityFilter.cleanImageMetadata(photoInfo.path);
      processedPhoto.securedPath = securedPath;
      
      // 根据质量设置压缩图片
      if (this._currentQuality !== 'high') {
        try {
          // 压缩图片
          const compressResult = await new Promise((resolve, reject) => {
            wx.compressImage({
              src: securedPath,
              quality: qualitySetting.quality,
              success: resolve,
              fail: reject
            });
          });
          
          processedPhoto.tempFilePath = compressResult.tempFilePath;
          processedPhoto.isCompressed = true;
          processedPhoto.compressionQuality = qualitySetting.quality;
        } catch (compressErr) {
          console.error('[EnhancedUploadManager] 压缩照片失败，使用原图：', compressErr);
          processedPhoto.tempFilePath = securedPath;
          processedPhoto.isCompressed = false;
        }
      } else {
        // 高质量模式使用清理后的原图
        processedPhoto.tempFilePath = securedPath;
        processedPhoto.isCompressed = false;
      }
      
      return processedPhoto;
    } catch (err) {
      console.error('[EnhancedUploadManager] 处理照片失败：', err);
      return Promise.reject(err);
    }
  },
  
  /**
   * 上传照片
   * @param {String|Object} photo 照片路径或照片信息对象
   * @param {Object} options 上传选项
   * @returns {Promise<Object>} 上传任务信息
   */
  async uploadPhoto(photo, options = {}) {
    try {
      // 标准化照片对象
      const photoInfo = typeof photo === 'string' 
        ? { path: photo, size: 0 } 
        : photo;
      
      // 处理照片(根据网络状态压缩等)
      const processedPhoto = await this.processPhoto(photoInfo);
      
      // 准备上传文件信息
      const fileInfo = {
        path: processedPhoto.tempFilePath,
        size: processedPhoto.size || 0,
        name: SecurityFilter.sanitizeFileName(options.fileName || `photo_${Date.now()}.jpg`),
        photoId: processedPhoto.id || options.photoId || `photo_${Date.now()}`
      };
      
      // 准备上传选项
      const uploadOptions = {
        header: options.header || {},
        formData: {
          ...options.formData,
          photoId: fileInfo.photoId,
          quality: this._currentQuality,
          timestamp: Date.now()
        },
        maxRetries: options.maxRetries || 3,
        retryDelay: options.retryDelay || 2000,
        onProgress: (progressInfo, taskId) => {
          // 触发进度事件
          EventBus.emit('upload:progress', {
            taskId,
            photoId: fileInfo.photoId,
            progress: progressInfo.progress,
            totalBytes: fileInfo.size,
            uploadedBytes: Math.floor(fileInfo.size * (progressInfo.progress / 100))
          });
          
          // 调用外部回调
          if (options.onProgress) {
            options.onProgress(progressInfo, taskId);
          }
        },
        onSuccess: (res, taskId) => {
          // 处理响应数据
          let responseData = null;
          try {
            responseData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          } catch (e) {
            responseData = { success: false, message: '响应数据解析失败' };
          }
          
          // 触发完成事件
          EventBus.emit('upload:complete', {
            taskId,
            photoId: fileInfo.photoId,
            response: responseData
          });
          
          // 调用外部回调
          if (options.onSuccess) {
            options.onSuccess(responseData, taskId);
          }
        },
        onError: (err, taskId) => {
          // 触发错误事件
          EventBus.emit('upload:error', {
            taskId,
            photoId: fileInfo.photoId,
            error: err
          });
          
          // 调用外部回调
          if (options.onError) {
            options.onError(err, taskId);
          }
        },
        onCancel: (taskId) => {
          // 触发取消事件
          EventBus.emit('upload:cancel', {
            taskId,
            photoId: fileInfo.photoId
          });
          
          // 调用外部回调
          if (options.onCancel) {
            options.onCancel(taskId);
          }
        }
      };
      
      // 创建上传任务
      const taskId = ResumableUploader.createUploadTask(fileInfo, this.uploadUrl, uploadOptions);
      
      // 触发开始事件
      EventBus.emit('upload:start', {
        taskId,
        photoId: fileInfo.photoId,
        fileInfo
      });
      
      return {
        taskId,
        photoId: fileInfo.photoId,
        status: 'created'
      };
    } catch (err) {
      console.error('[EnhancedUploadManager] 创建上传任务失败：', err);
      return Promise.reject(err);
    }
  },
  
  /**
   * 批量上传照片
   * @param {Array} photos 照片数组
   * @param {Object} options 上传选项
   * @returns {Promise<Array>} 任务信息数组
   */
  async uploadPhotos(photos, options = {}) {
    if (!Array.isArray(photos) || photos.length === 0) {
      return [];
    }
    
    try {
      // 批量创建上传任务
      const tasks = [];
      
      for (const photo of photos) {
        try {
          const task = await this.uploadPhoto(photo, options);
          tasks.push(task);
        } catch (err) {
          console.error('[EnhancedUploadManager] 上传照片失败：', err);
          // 继续处理其他照片
        }
      }
      
      return tasks;
    } catch (err) {
      console.error('[EnhancedUploadManager] 批量上传照片失败：', err);
      return Promise.reject(err);
    }
  },
  
  /**
   * 暂停上传任务
   * @param {String} taskId 任务ID
   * @returns {Boolean} 是否成功
   */
  pauseUpload(taskId) {
    return ResumableUploader.pauseUpload(taskId);
  },
  
  /**
   * 恢复上传任务
   * @param {String} taskId 任务ID
   * @returns {Boolean} 是否成功
   */
  resumeUpload(taskId) {
    return ResumableUploader.resumeUpload(taskId);
  },
  
  /**
   * 取消上传任务
   * @param {String} taskId 任务ID
   * @returns {Boolean} 是否成功
   */
  cancelUpload(taskId) {
    return ResumableUploader.cancelUpload(taskId);
  },
  
  /**
   * 暂停所有上传任务
   */
  pauseAllUploads() {
    ResumableUploader.pauseAllUploads();
  },
  
  /**
   * 恢复所有上传任务
   */
  resumeAllUploads() {
    ResumableUploader.resumeAllUploads();
  },
  
  /**
   * 获取上传任务信息
   * @param {String} taskId 任务ID
   * @returns {Object|null} 任务信息
   */
  getTaskInfo(taskId) {
    return ResumableUploader.getTaskInfo(taskId);
  },
  
  /**
   * 获取所有上传任务
   * @returns {Object} 所有上传任务
   */
  getAllTasks() {
    return ResumableUploader.getAllTasks();
  },
  
  /**
   * 清理已完成的任务
   */
  clearCompletedTasks() {
    ResumableUploader.clearCompletedTasks();
  }
};

module.exports = EnhancedUploadManager; 