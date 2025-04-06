/**
 * 上传任务管理器
 * 负责管理照片上传任务的创建、存储、恢复和执行
 */

// 任务存储键名
const TASK_QUEUE_KEY = 'PHOTO_UPLOAD_TASK_QUEUE';

/**
 * 上传任务管理器
 */
const TaskManager = {
  /**
   * 任务队列
   */
  taskQueue: [],
  
  /**
   * 初始化任务管理器
   * 从本地存储加载未完成的任务
   */
  init() {
    return new Promise((resolve) => {
      wx.getStorage({
        key: TASK_QUEUE_KEY,
        success: (res) => {
          if (res.data && Array.isArray(res.data)) {
            this.taskQueue = res.data;
            console.log(`[TaskManager] 已加载 ${this.taskQueue.length} 个未完成任务`);
          }
          resolve(this.taskQueue);
        },
        fail: () => {
          this.taskQueue = [];
          console.log('[TaskManager] 无未完成任务或加载失败');
          resolve([]);
        }
      });
    });
  },
  
  /**
   * 添加新上传任务
   * @param {Object} fileInfo 文件信息
   * @param {String} fileInfo.tempFilePath 临时文件路径
   * @param {Number} fileInfo.size 文件大小
   * @param {Number} fileInfo.createTime 创建时间
   * @param {Number} priority 任务优先级(1-10, 10最高)
   * @returns {String} 新任务ID
   */
  addTask(fileInfo, priority = 5) {
    // 生成唯一任务ID
    const taskId = 'task_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // 创建新任务
    const newTask = {
      taskId,
      fileInfo,
      uploadStatus: 'pending', // pending|uploading|paused|completed|failed
      progress: 0,
      priority: priority,
      createTime: Date.now(),
      lastUpdated: Date.now(),
      retryCount: 0
    };
    
    // 添加到任务队列
    this.taskQueue.push(newTask);
    
    // 持久化任务队列
    this.persistTaskQueue();
    
    console.log(`[TaskManager] 已添加新任务: ${taskId}`);
    return taskId;
  },
  
  /**
   * 获取任务信息
   * @param {String} taskId 任务ID
   * @returns {Object|null} 任务信息
   */
  getTask(taskId) {
    return this.taskQueue.find(task => task.taskId === taskId) || null;
  },
  
  /**
   * 获取所有未完成的任务
   * @returns {Array} 未完成任务列表
   */
  getPendingTasks() {
    return this.taskQueue.filter(task => 
      task.uploadStatus !== 'completed' && task.uploadStatus !== 'failed');
  },
  
  /**
   * 更新任务状态
   * @param {String} taskId 任务ID
   * @param {String} status 新状态
   * @returns {Boolean} 更新是否成功
   */
  updateTaskStatus(taskId, status) {
    const task = this.getTask(taskId);
    if (!task) return false;
    
    task.uploadStatus = status;
    task.lastUpdated = Date.now();
    
    this.persistTaskQueue();
    return true;
  },
  
  /**
   * 更新任务进度
   * @param {String} taskId 任务ID
   * @param {Number} progress 进度(0-100)
   * @returns {Boolean} 更新是否成功
   */
  updateTaskProgress(taskId, progress) {
    const task = this.getTask(taskId);
    if (!task) return false;
    
    task.progress = progress;
    task.lastUpdated = Date.now();
    
    // 只有进度变化较大时才持久化，避免频繁写入存储
    if (progress % 10 === 0 || progress === 100) {
      this.persistTaskQueue();
    }
    
    return true;
  },
  
  /**
   * 开始执行任务
   * @param {String} taskId 任务ID
   */
  startTask(taskId) {
    return this.updateTaskStatus(taskId, 'uploading');
  },
  
  /**
   * 暂停任务
   * @param {String} taskId 任务ID
   */
  pauseTask(taskId) {
    return this.updateTaskStatus(taskId, 'paused');
  },
  
  /**
   * 恢复任务
   * @param {String} taskId 任务ID
   */
  resumeTask(taskId) {
    return this.updateTaskStatus(taskId, 'pending');
  },
  
  /**
   * 完成任务
   * @param {String} taskId 任务ID
   */
  completeTask(taskId) {
    return this.updateTaskStatus(taskId, 'completed');
  },
  
  /**
   * 标记任务失败
   * @param {String} taskId 任务ID
   */
  failTask(taskId) {
    return this.updateTaskStatus(taskId, 'failed');
  },
  
  /**
   * 删除任务
   * @param {String} taskId 任务ID
   * @returns {Boolean} 删除是否成功
   */
  removeTask(taskId) {
    const index = this.taskQueue.findIndex(task => task.taskId === taskId);
    if (index === -1) return false;
    
    this.taskQueue.splice(index, 1);
    this.persistTaskQueue();
    
    return true;
  },
  
  /**
   * 清理已完成任务
   * 删除所有已完成的任务
   * @returns {Number} 清理的任务数量
   */
  cleanCompletedTasks() {
    const before = this.taskQueue.length;
    this.taskQueue = this.taskQueue.filter(task => 
      task.uploadStatus !== 'completed');
    
    const cleanedCount = before - this.taskQueue.length;
    if (cleanedCount > 0) {
      this.persistTaskQueue();
    }
    
    return cleanedCount;
  },
  
  /**
   * 将任务队列持久化到本地存储
   */
  persistTaskQueue() {
    wx.setStorage({
      key: TASK_QUEUE_KEY,
      data: this.taskQueue,
      fail: (err) => {
        console.error('[TaskManager] 任务队列持久化失败', err);
      }
    });
  },
  
  /**
   * 获取下一个待执行任务
   * 根据优先级排序，返回优先级最高的任务
   * @returns {Object|null} 下一个待执行任务
   */
  getNextPendingTask() {
    // 根据优先级和创建时间排序
    const pendingTasks = this.taskQueue
      .filter(task => task.uploadStatus === 'pending')
      .sort((a, b) => {
        // 先按优先级降序
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        // 再按创建时间升序(先创建先执行)
        return a.createTime - b.createTime;
      });
    
    return pendingTasks.length > 0 ? pendingTasks[0] : null;
  },
  
  /**
   * 注册任务恢复确认
   * 在应用启动时调用，检查中断任务并提示用户
   */
  checkInterruptedTasks() {
    const interruptedTasks = this.taskQueue.filter(task => 
      task.uploadStatus === 'uploading');
    
    if (interruptedTasks.length > 0) {
      wx.showModal({
        title: '发现未完成的上传任务',
        content: `有 ${interruptedTasks.length} 个上传任务在上次使用时被中断，是否恢复？`,
        confirmText: '恢复上传',
        cancelText: '稍后处理',
        success: (res) => {
          if (res.confirm) {
            // 恢复所有中断任务
            interruptedTasks.forEach(task => {
              this.resumeTask(task.taskId);
            });
            console.log('[TaskManager] 已恢复中断任务');
          } else {
            // 将所有任务标记为暂停
            interruptedTasks.forEach(task => {
              this.pauseTask(task.taskId);
            });
            console.log('[TaskManager] 已暂停中断任务');
          }
        }
      });
    }
  }
};

module.exports = TaskManager; 