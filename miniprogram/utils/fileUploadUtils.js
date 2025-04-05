/**
 * 文件上传工具
 * 提供大文件分片上传、断点续传和上传进度管理功能
 */

import { hasNetworkConnection, getNetworkType, isWeakNetwork } from './networkUtils';
import { storage } from './storageUtils';

// 默认配置
const DEFAULT_CONFIG = {
  chunkSize: 1024 * 1024, // 默认分片大小为1MB
  maxRetries: 3,          // 最大重试次数
  retryDelay: 1000,       // 重试延迟时间（毫秒）
  concurrentUploads: 3,   // 并发上传分片数
  serverUrl: '/api/upload'// 上传接口
};

// 本地存储键
const STORAGE_KEYS = {
  UPLOAD_TASKS: 'upload_tasks',
  UPLOAD_PROGRESS: 'upload_progress'
};

/**
 * 文件分片上传管理器
 */
export default class FileUploadManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeUploads = new Map(); // 活跃上传任务Map
    this.uploadListeners = new Map(); // 上传进度监听器
  }

  /**
   * 获取文件信息
   * @param {string} filePath 文件路径
   * @returns {Promise<Object>} 文件信息
   */
  getFileInfo(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath,
        success: (res) => resolve(res),
        fail: (err) => reject(err)
      });
    });
  }

  /**
   * 检查文件是否过大（超过10MB）
   * @param {number} fileSize 文件大小（字节）
   * @returns {boolean} 是否是大文件
   */
  isLargeFile(fileSize) {
    return fileSize > 10 * 1024 * 1024; // 大于10MB视为大文件
  }

  /**
   * 分片上传文件
   * @param {string} filePath 文件路径
   * @param {Object} options 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async uploadFile(filePath, options = {}) {
    try {
      // 获取文件信息
      const fileInfo = await this.getFileInfo(filePath);
      const { size } = fileInfo;
      const fileName = filePath.split('/').pop();
      
      // 生成上传任务ID
      const taskId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      // 判断是否需要分片上传
      if (this.isLargeFile(size)) {
        return this.uploadLargeFile(taskId, filePath, fileName, size, options);
      } else {
        return this.uploadSingleFile(filePath, options);
      }
    } catch (error) {
      console.error('上传文件失败:', error);
      throw error;
    }
  }

  /**
   * 常规上传（小文件）
   * @param {string} filePath 文件路径
   * @param {Object} options 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  uploadSingleFile(filePath, options = {}) {
    const { serverUrl = this.config.serverUrl, formData = {}, onProgress } = options;
    
    return new Promise((resolve, reject) => {
      const uploadTask = wx.uploadFile({
        url: serverUrl,
        filePath,
        name: 'file',
        formData,
        success: (res) => {
          try {
            const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            resolve(result);
          } catch (e) {
            resolve(res.data);
          }
        },
        fail: (err) => reject(err)
      });

      // 监听上传进度
      if (typeof onProgress === 'function') {
        uploadTask.onProgressUpdate((res) => {
          onProgress(res.progress, res);
        });
      }
    });
  }

  /**
   * 分片上传大文件
   * @param {string} taskId 任务ID
   * @param {string} filePath 文件路径
   * @param {string} fileName 文件名
   * @param {number} fileSize 文件大小
   * @param {Object} options 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async uploadLargeFile(taskId, filePath, fileName, fileSize, options = {}) {
    const { 
      serverUrl = this.config.serverUrl,
      formData = {},
      chunkSize = this.config.chunkSize,
      concurrentUploads = this.config.concurrentUploads,
      onProgress,
      onStart,
      onPause,
      onResume,
      onCancel,
      onComplete,
      onError
    } = options;

    // 创建上传任务
    const uploadTask = {
      taskId,
      filePath,
      fileName,
      fileSize,
      chunkSize,
      totalChunks: Math.ceil(fileSize / chunkSize),
      uploadedChunks: [],
      status: 'preparing',
      startTime: Date.now(),
      pauseTime: null,
      resumeTime: null,
      completeTime: null,
      serverUrl,
      formData
    };

    // 保存任务到本地存储
    await this.saveUploadTask(uploadTask);
    
    // 添加到活跃上传
    this.activeUploads.set(taskId, uploadTask);

    try {
      // 检查是否有未完成的上传任务
      const resumedTask = await this.checkResumeTask(taskId);
      if (resumedTask) {
        // 恢复上传
        uploadTask.uploadedChunks = resumedTask.uploadedChunks;
        if (typeof onResume === 'function') {
          onResume(uploadTask);
        }
      }

      // 更新状态为开始上传
      uploadTask.status = 'uploading';
      await this.updateUploadTask(uploadTask);
      
      if (typeof onStart === 'function') {
        onStart(uploadTask);
      }

      // 添加进度监听器
      if (typeof onProgress === 'function') {
        this.addProgressListener(taskId, onProgress);
      }

      // 计算待上传的分片
      const pendingChunks = [];
      for (let i = 0; i < uploadTask.totalChunks; i++) {
        if (!uploadTask.uploadedChunks.includes(i)) {
          pendingChunks.push(i);
        }
      }

      // 分片并发上传
      const results = await this.uploadChunks(uploadTask, pendingChunks, concurrentUploads);
      
      // 所有分片上传完成，合并文件
      const mergeResult = await this.mergeChunks(uploadTask);
      
      // 更新状态为完成
      uploadTask.status = 'completed';
      uploadTask.completeTime = Date.now();
      await this.updateUploadTask(uploadTask);
      
      // 移除活跃上传任务
      this.activeUploads.delete(taskId);
      
      // 调用完成回调
      if (typeof onComplete === 'function') {
        onComplete(mergeResult);
      }
      
      return mergeResult;
    } catch (error) {
      // 更新状态为错误
      uploadTask.status = 'error';
      uploadTask.error = error.message;
      await this.updateUploadTask(uploadTask);
      
      // 调用错误回调
      if (typeof onError === 'function') {
        onError(error);
      }
      
      throw error;
    }
  }

  /**
   * 上传文件分片
   * @param {Object} task 上传任务
   * @param {Array} chunkIndices 分片索引列表
   * @param {number} concurrentLimit 并发限制
   * @returns {Promise<Array>} 上传结果
   */
  async uploadChunks(task, chunkIndices, concurrentLimit) {
    const { taskId, filePath, fileName, chunkSize, fileSize, serverUrl, formData } = task;
    const results = [];
    
    // 使用信号量控制并发数
    const semaphore = concurrentLimit;
    let activeUploads = 0;
    let completedChunks = 0;
    
    return new Promise((resolve, reject) => {
      const uploadNextChunk = async () => {
        if (chunkIndices.length === 0) {
          // 所有分片已添加到队列
          if (completedChunks === task.totalChunks - task.uploadedChunks.length) {
            resolve(results);
          }
          return;
        }
        
        if (activeUploads >= semaphore) {
          return;
        }
        
        // 获取下一个分片索引
        const chunkIndex = chunkIndices.shift();
        activeUploads++;
        
        try {
          // 计算分片位置和大小
          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, fileSize);
          const chunkData = await this.readFileChunk(filePath, start, end - start);
          
          // 上传分片
          await this.uploadChunk(taskId, chunkIndex, chunkData, {
            url: serverUrl,
            formData: {
              ...formData,
              taskId,
              fileName,
              chunkIndex,
              totalChunks: task.totalChunks
            }
          });
          
          // 更新上传进度
          task.uploadedChunks.push(chunkIndex);
          await this.updateUploadTask(task);
          
          // 计算并通知进度
          completedChunks++;
          const progress = Math.floor(
            ((task.uploadedChunks.length / task.totalChunks) * 100)
          );
          this.notifyProgress(taskId, progress);
          
          results.push({ chunkIndex, success: true });
        } catch (error) {
          console.error(`分片 ${chunkIndex} 上传失败:`, error);
          // 重新添加到队列末尾进行重试
          chunkIndices.push(chunkIndex);
          results.push({ chunkIndex, success: false, error });
        } finally {
          activeUploads--;
          // 继续处理下一个分片
          uploadNextChunk();
        }
      };
      
      // 启动初始并发上传
      for (let i = 0; i < concurrentLimit; i++) {
        uploadNextChunk();
      }
    });
  }

  /**
   * 读取文件分片
   * @param {string} filePath 文件路径
   * @param {number} start 起始位置
   * @param {number} length 长度
   * @returns {Promise<ArrayBuffer>} 文件分片数据
   */
  readFileChunk(filePath, start, length) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath,
        position: start,
        length,
        success: (res) => resolve(res.data),
        fail: (err) => reject(err)
      });
    });
  }

  /**
   * 上传单个分片
   * @param {string} taskId 任务ID
   * @param {number} chunkIndex 分片索引
   * @param {ArrayBuffer} chunkData 分片数据
   * @param {Object} options 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async uploadChunk(taskId, chunkIndex, chunkData, options) {
    const { url, formData } = options;
    const maxRetries = this.config.maxRetries;
    const retryDelay = this.config.retryDelay;
    
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        return await new Promise((resolve, reject) => {
          const uploadTask = wx.uploadFile({
            url,
            filePath: chunkData,
            name: 'chunk',
            formData: {
              ...formData,
              chunkIndex,
              taskId
            },
            success: (res) => {
              try {
                const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                resolve(result);
              } catch (e) {
                resolve(res.data);
              }
            },
            fail: (err) => reject(err)
          });
        });
      } catch (error) {
        attempt++;
        
        if (attempt >= maxRetries) {
          throw error;
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * 请求服务器合并分片
   * @param {Object} task 上传任务
   * @returns {Promise<Object>} 合并结果
   */
  async mergeChunks(task) {
    const { taskId, fileName, totalChunks, serverUrl, formData } = task;
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${serverUrl}/merge`,
        method: 'POST',
        data: {
          taskId,
          fileName,
          totalChunks,
          ...formData
        },
        success: (res) => resolve(res.data),
        fail: (err) => reject(err)
      });
    });
  }

  /**
   * 暂停上传任务
   * @param {string} taskId 任务ID
   * @returns {Promise<boolean>} 是否成功暂停
   */
  async pauseUpload(taskId) {
    const task = this.activeUploads.get(taskId);
    if (!task) {
      return false;
    }
    
    task.status = 'paused';
    task.pauseTime = Date.now();
    await this.updateUploadTask(task);
    
    return true;
  }

  /**
   * 恢复上传任务
   * @param {string} taskId 任务ID
   * @returns {Promise<Object>} 恢复的任务
   */
  async resumeUpload(taskId) {
    const taskData = await this.getUploadTask(taskId);
    if (!taskData || taskData.status !== 'paused') {
      return null;
    }
    
    taskData.status = 'uploading';
    taskData.resumeTime = Date.now();
    await this.updateUploadTask(taskData);
    
    // 重新上传未完成的分片
    const pendingChunks = [];
    for (let i = 0; i < taskData.totalChunks; i++) {
      if (!taskData.uploadedChunks.includes(i)) {
        pendingChunks.push(i);
      }
    }
    
    // 调用上传大文件的函数继续上传
    return this.uploadLargeFile(
      taskId,
      taskData.filePath,
      taskData.fileName,
      taskData.fileSize,
      {
        serverUrl: taskData.serverUrl,
        formData: taskData.formData,
        chunkSize: taskData.chunkSize
      }
    );
  }

  /**
   * 取消上传任务
   * @param {string} taskId 任务ID
   * @returns {Promise<boolean>} 是否成功取消
   */
  async cancelUpload(taskId) {
    const task = this.activeUploads.get(taskId);
    if (task) {
      task.status = 'cancelled';
      await this.updateUploadTask(task);
      this.activeUploads.delete(taskId);
    }
    
    return true;
  }

  /**
   * 添加上传进度监听器
   * @param {string} taskId 任务ID
   * @param {Function} listener 监听器函数
   */
  addProgressListener(taskId, listener) {
    if (typeof listener === 'function') {
      this.uploadListeners.set(taskId, listener);
    }
  }

  /**
   * 移除上传进度监听器
   * @param {string} taskId 任务ID
   */
  removeProgressListener(taskId) {
    this.uploadListeners.delete(taskId);
  }

  /**
   * 通知上传进度更新
   * @param {string} taskId 任务ID
   * @param {number} progress 进度百分比
   */
  notifyProgress(taskId, progress) {
    const listener = this.uploadListeners.get(taskId);
    const task = this.activeUploads.get(taskId);
    
    if (listener && task) {
      listener(progress, {
        taskId,
        uploaded: task.uploadedChunks.length,
        total: task.totalChunks,
        status: task.status
      });
    }
  }

  /**
   * 检查任务是否可以恢复
   * @param {string} taskId 任务ID
   * @returns {Promise<Object|null>} 可恢复的任务或null
   */
  async checkResumeTask(taskId) {
    const task = await this.getUploadTask(taskId);
    
    if (task && (task.status === 'paused' || task.status === 'uploading')) {
      return task;
    }
    
    return null;
  }

  /**
   * 获取上传任务
   * @param {string} taskId 任务ID
   * @returns {Promise<Object|null>} 上传任务或null
   */
  async getUploadTask(taskId) {
    try {
      const tasks = await storage.get(STORAGE_KEYS.UPLOAD_TASKS) || {};
      return tasks[taskId] || null;
    } catch (error) {
      console.error('获取上传任务失败:', error);
      return null;
    }
  }

  /**
   * 保存上传任务
   * @param {Object} task 上传任务
   * @returns {Promise<void>}
   */
  async saveUploadTask(task) {
    try {
      const tasks = await storage.get(STORAGE_KEYS.UPLOAD_TASKS) || {};
      tasks[task.taskId] = task;
      await storage.set(STORAGE_KEYS.UPLOAD_TASKS, tasks);
    } catch (error) {
      console.error('保存上传任务失败:', error);
    }
  }

  /**
   * 更新上传任务
   * @param {Object} task 上传任务
   * @returns {Promise<void>}
   */
  async updateUploadTask(task) {
    return this.saveUploadTask(task);
  }

  /**
   * 删除上传任务
   * @param {string} taskId 任务ID
   * @returns {Promise<boolean>} 是否成功删除
   */
  async deleteUploadTask(taskId) {
    try {
      const tasks = await storage.get(STORAGE_KEYS.UPLOAD_TASKS) || {};
      
      if (tasks[taskId]) {
        delete tasks[taskId];
        await storage.set(STORAGE_KEYS.UPLOAD_TASKS, tasks);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('删除上传任务失败:', error);
      return false;
    }
  }

  /**
   * 获取所有上传任务
   * @returns {Promise<Array>} 任务列表
   */
  async getAllUploadTasks() {
    try {
      const tasks = await storage.get(STORAGE_KEYS.UPLOAD_TASKS) || {};
      return Object.values(tasks);
    } catch (error) {
      console.error('获取所有上传任务失败:', error);
      return [];
    }
  }

  /**
   * 清理过期的上传任务
   * @param {number} expireTime 过期时间（毫秒），默认7天
   * @returns {Promise<number>} 清理的任务数量
   */
  async cleanExpiredTasks(expireTime = 7 * 24 * 60 * 60 * 1000) {
    try {
      const tasks = await storage.get(STORAGE_KEYS.UPLOAD_TASKS) || {};
      const now = Date.now();
      let cleanCount = 0;
      
      for (const taskId in tasks) {
        const task = tasks[taskId];
        
        // 判断任务是否过期：已完成或已取消的任务超过过期时间
        if (
          (task.status === 'completed' || task.status === 'cancelled' || task.status === 'error') &&
          (now - (task.completeTime || task.pauseTime || task.startTime)) > expireTime
        ) {
          delete tasks[taskId];
          cleanCount++;
        }
      }
      
      await storage.set(STORAGE_KEYS.UPLOAD_TASKS, tasks);
      return cleanCount;
    } catch (error) {
      console.error('清理过期任务失败:', error);
      return 0;
    }
  }
} 