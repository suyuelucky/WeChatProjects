/**
 * 上传管理器
 * 负责照片上传管理，包括网络状态监测、上传策略调整和上传执行
 */

// 导入任务管理器
const TaskManager = require('./task-manager');

/**
 * 上传管理器
 */
const UploadManager = {
  /**
   * 上传质量等级
   * high: 原图上传 
   * medium: 中等压缩
   * low: 高度压缩
   */
  quality: 'high',
  
  /**
   * 并发上传数
   */
  concurrent: 3,
  
  /**
   * 当前是否正在上传
   */
  isUploading: false,
  
  /**
   * 当前活跃的上传任务数
   */
  activeUploads: 0,
  
  /**
   * uploadTask实例映射
   * 用于存储wx.uploadFile返回的uploadTask实例，方便控制
   */
  uploadTaskMap: {},
  
  /**
   * 服务器上传地址
   */
  uploadUrl: 'https://example.com/api/upload', // 实际项目中替换为真实的上传地址
  
  /**
   * 初始化上传管理器
   */
  init() {
    // 初始化网络监听
    this.setupNetworkMonitor();
    
    console.log('[UploadManager] 上传管理器初始化完成');
  },
  
  /**
   * 设置上传质量
   * @param {String} level 质量等级 - 'high'|'medium'|'low'
   */
  setQuality(level) {
    if (['high', 'medium', 'low'].includes(level)) {
      this.quality = level;
      console.log(`[UploadManager] 已设置上传质量: ${level}`);
    }
  },
  
  /**
   * 设置并发上传数
   * @param {Number} num 并发数
   */
  setConcurrent(num) {
    if (num > 0 && num <= 5) {
      this.concurrent = num;
      console.log(`[UploadManager] 已设置并发上传数: ${num}`);
    }
  },
  
  /**
   * 设置网络监听
   * 监听网络状态变化并调整上传策略
   */
  setupNetworkMonitor() {
    // 获取初始网络状态
    wx.getNetworkType({
      success: (res) => {
        this.applyNetworkStrategy(res.networkType);
      }
    });
    
    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      this.applyNetworkStrategy(res.networkType);
      
      // 网络恢复后自动继续上传
      if (res.isConnected && !this.isUploading) {
        this.resumeAllUploads();
      }
    });
  },
  
  /**
   * 应用网络策略
   * 根据网络类型调整上传参数
   * @param {String} networkType 网络类型 wifi/4g/3g/2g/unknown/none
   */
  applyNetworkStrategy(networkType) {
    console.log(`[UploadManager] 当前网络类型: ${networkType}`);
    
    switch(networkType) {
      case 'wifi':
        this.setQuality('high');
        this.setConcurrent(3);
        break;
      case '4g':
        this.setQuality('medium');
        this.setConcurrent(2);
        break;
      case '3g':
      case '2g':
        this.setQuality('low');
        this.setConcurrent(1);
        break;
      case 'none':
        // 无网络，暂停所有上传
        this.pauseAllUploads();
        break;
      default:
        // 未知网络，使用保守策略
        this.setQuality('medium');
        this.setConcurrent(1);
    }
  },
  
  /**
   * 上传照片
   * @param {Object} photoInfo 照片信息对象
   * @param {String} photoInfo.tempFilePath 临时文件路径
   * @param {Number} photoInfo.size 文件大小(可选)
   * @param {Number} priority 上传优先级(1-10, 10最高)
   * @returns {Promise} 上传结果Promise
   */
  uploadPhoto(photoInfo, priority = 5) {
    return new Promise((resolve, reject) => {
      // 检查照片大小，超过10MB的照片需要压缩
      const shouldCompress = !photoInfo.size || photoInfo.size > 10 * 1024 * 1024;
      
      // 处理照片(生成缩略图、按需压缩)
      this.processPhoto(photoInfo, shouldCompress)
        .then(processedPhoto => {
          // 创建上传任务
          const taskId = TaskManager.addTask(processedPhoto, priority);
          
          // 尝试立即开始上传
          this.processQueue();
          
          resolve({ taskId, photoInfo: processedPhoto });
        })
        .catch(err => {
          console.error('[UploadManager] 照片处理失败', err);
          reject(err);
        });
    });
  },
  
  /**
   * 处理照片
   * 生成缩略图、按需压缩照片
   * @param {Object} photoInfo 原始照片信息
   * @param {Boolean} shouldCompress 是否需要压缩
   * @returns {Promise} 处理后的照片信息
   */
  processPhoto(photoInfo, shouldCompress) {
    return new Promise((resolve, reject) => {
      // 创建处理后的照片信息对象
      const processedPhoto = {
        ...photoInfo,
        originalPath: photoInfo.tempFilePath,
        createTime: Date.now()
      };
      
      // 根据质量级别决定是否需要压缩
      const needsCompress = shouldCompress || this.quality !== 'high';
      
      if (needsCompress) {
        // 根据质量级别设置压缩参数
        let quality = 80; // 默认中等质量
        if (this.quality === 'low') {
          quality = 50; // 低质量(高压缩率)
        } else if (this.quality === 'high') {
          quality = 95; // 高质量(低压缩率)
        }
        
        // 压缩图片
        wx.compressImage({
          src: photoInfo.tempFilePath,
          quality,
          success: (res) => {
            processedPhoto.tempFilePath = res.tempFilePath;
            processedPhoto.isCompressed = true;
            processedPhoto.compressionQuality = quality;
            
            // 生成缩略图
            this.generateThumbnail(processedPhoto.tempFilePath)
              .then(thumbnailPath => {
                processedPhoto.thumbnailPath = thumbnailPath;
                resolve(processedPhoto);
              })
              .catch(err => {
                // 缩略图生成失败，但仍然可以继续
                console.warn('[UploadManager] 缩略图生成失败', err);
                resolve(processedPhoto);
              });
          },
          fail: (err) => {
            console.error('[UploadManager] 图片压缩失败', err);
            // 压缩失败时，使用原图
            this.generateThumbnail(photoInfo.tempFilePath)
              .then(thumbnailPath => {
                processedPhoto.thumbnailPath = thumbnailPath;
                resolve(processedPhoto);
              })
              .catch(thumbErr => {
                // 即使缩略图生成失败，也返回原始照片
                resolve(processedPhoto);
              });
          }
        });
      } else {
        // 不需要压缩，仅生成缩略图
        this.generateThumbnail(photoInfo.tempFilePath)
          .then(thumbnailPath => {
            processedPhoto.thumbnailPath = thumbnailPath;
            resolve(processedPhoto);
          })
          .catch(err => {
            // 缩略图生成失败，但仍然可以继续
            console.warn('[UploadManager] 缩略图生成失败', err);
            resolve(processedPhoto);
          });
      }
    });
  },
  
  /**
   * 生成缩略图
   * @param {String} imagePath 原图路径
   * @returns {Promise<String>} 缩略图路径
   */
  generateThumbnail(imagePath) {
    return new Promise((resolve, reject) => {
      // 使用canvasToTempFilePath生成缩略图
      // 在实际应用中，可能需要先获取图片信息，然后绘制到Canvas上再导出
      // 这里简化处理，直接使用compressImage API
      wx.compressImage({
        src: imagePath,
        quality: 30, // 缩略图使用低质量以节省空间
        success: (res) => {
          resolve(res.tempFilePath);
        },
        fail: reject
      });
    });
  },
  
  /**
   * 处理上传队列
   * 检查并启动符合条件的上传任务
   */
  processQueue() {
    // 如果没有正在上传，且有空闲并发槽，则开始上传
    if (!this.isUploading) {
      this.startUploadQueue();
    }
  },
  
  /**
   * 开始上传队列
   * 同时启动多个上传任务
   */
  startUploadQueue() {
    // 标记为正在上传
    this.isUploading = true;
    
    // 检查是否有可用的并发槽
    const startNextUpload = () => {
      // 如果当前活跃上传数小于并发上限
      if (this.activeUploads < this.concurrent) {
        // 获取下一个待上传任务
        const nextTask = TaskManager.getNextPendingTask();
        
        if (nextTask) {
          // 开始上传任务
          this.startUploadTask(nextTask)
            .then(() => {
              // 上传完成后，检查下一个任务
              startNextUpload();
            })
            .catch(err => {
              console.error('[UploadManager] 任务上传失败', err);
              // 上传失败后，检查下一个任务
              startNextUpload();
            });
        } else {
          // 没有更多待上传任务
          if (this.activeUploads === 0) {
            // 所有任务都已完成
            this.isUploading = false;
            console.log('[UploadManager] 所有任务已完成');
          }
        }
      }
    };
    
    // 启动初始上传任务
    for (let i = 0; i < this.concurrent; i++) {
      startNextUpload();
    }
  },
  
  /**
   * 开始上传单个任务
   * @param {Object} task 任务对象
   * @returns {Promise} 上传结果
   */
  startUploadTask(task) {
    return new Promise((resolve, reject) => {
      // 更新任务状态为上传中
      TaskManager.startTask(task.taskId);
      
      // 增加活跃上传计数
      this.activeUploads++;
      
      // 上传文件
      const uploadTask = wx.uploadFile({
        url: this.uploadUrl,
        filePath: task.fileInfo.tempFilePath,
        name: 'photo',
        formData: {
          taskId: task.taskId,
          createTime: task.fileInfo.createTime,
          // 添加其他需要的表单数据
        },
        success: (res) => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(res.data);
              // 上传成功
              TaskManager.completeTask(task.taskId);
              console.log(`[UploadManager] 任务 ${task.taskId} 上传成功`);
              resolve(data);
            } catch (e) {
              // 服务器返回的不是有效的JSON
              TaskManager.failTask(task.taskId);
              console.error(`[UploadManager] 任务 ${task.taskId} 上传失败: 服务器响应解析错误`, e);
              reject(new Error('服务器响应解析错误'));
            }
          } else {
            // HTTP状态码不为200
            TaskManager.failTask(task.taskId);
            console.error(`[UploadManager] 任务 ${task.taskId} 上传失败: HTTP状态码 ${res.statusCode}`);
            reject(new Error(`HTTP状态码 ${res.statusCode}`));
          }
        },
        fail: (err) => {
          // 上传失败，可能是网络问题
          TaskManager.failTask(task.taskId);
          console.error(`[UploadManager] 任务 ${task.taskId} 上传失败`, err);
          reject(err);
        },
        complete: () => {
          // 无论成功失败，都减少活跃上传计数
          this.activeUploads--;
          
          // 从映射中移除uploadTask
          delete this.uploadTaskMap[task.taskId];
        }
      });
      
      // 存储uploadTask实例，方便控制
      this.uploadTaskMap[task.taskId] = uploadTask;
      
      // 监听上传进度
      uploadTask.onProgressUpdate((res) => {
        // 更新任务进度
        TaskManager.updateTaskProgress(task.taskId, res.progress);
      });
    });
  },
  
  /**
   * 暂停所有上传
   */
  pauseAllUploads() {
    console.log('[UploadManager] 暂停所有上传');
    this.isUploading = false;
    
    // 暂停所有活跃的上传任务
    Object.keys(this.uploadTaskMap).forEach(taskId => {
      // 中止uploadTask
      this.uploadTaskMap[taskId].abort();
      
      // 更新任务状态为暂停
      TaskManager.pauseTask(taskId);
      
      // 从映射中移除uploadTask
      delete this.uploadTaskMap[taskId];
    });
    
    // 重置活跃上传计数
    this.activeUploads = 0;
  },
  
  /**
   * 恢复所有上传
   */
  resumeAllUploads() {
    console.log('[UploadManager] 恢复所有上传');
    
    // 重新启动上传队列
    this.processQueue();
  },
  
  /**
   * 暂停指定任务
   * @param {String} taskId 任务ID
   */
  pauseTask(taskId) {
    // 如果任务正在上传中，中止上传
    if (this.uploadTaskMap[taskId]) {
      this.uploadTaskMap[taskId].abort();
      delete this.uploadTaskMap[taskId];
      this.activeUploads--;
    }
    
    // 更新任务状态为暂停
    TaskManager.pauseTask(taskId);
    
    // 检查是否需要启动新任务
    this.processQueue();
  },
  
  /**
   * 恢复指定任务
   * @param {String} taskId 任务ID
   */
  resumeTask(taskId) {
    // 将任务状态更新为等待中
    TaskManager.resumeTask(taskId);
    
    // 处理上传队列，可能会立即开始该任务
    this.processQueue();
  },
  
  /**
   * 重试失败的任务
   * @param {String} taskId 任务ID
   */
  retryTask(taskId) {
    const task = TaskManager.getTask(taskId);
    if (task && task.uploadStatus === 'failed') {
      // 重置任务状态
      task.retryCount++;
      TaskManager.resumeTask(taskId);
      
      // 处理上传队列
      this.processQueue();
    }
  },
  
  /**
   * 智能重试所有失败的任务
   * 使用指数退避算法重试
   */
  retryFailedTasks() {
    // 获取所有失败的任务
    const failedTasks = TaskManager.taskQueue.filter(task => 
      task.uploadStatus === 'failed');
    
    if (failedTasks.length === 0) return;
    
    console.log(`[UploadManager] 尝试重试 ${failedTasks.length} 个失败任务`);
    
    // 按重试次数升序排序，优先重试失败次数少的任务
    failedTasks.sort((a, b) => a.retryCount - b.retryCount);
    
    // 最多重试5次
    const tasksToRetry = failedTasks.filter(task => task.retryCount < 5);
    
    // 使用指数退避重试
    tasksToRetry.forEach(task => {
      const delay = Math.min(1000 * Math.pow(2, task.retryCount), 30000);
      
      setTimeout(() => {
        this.retryTask(task.taskId);
      }, delay + Math.random() * 1000); // 增加随机抖动
    });
  }
};

module.exports = UploadManager; 