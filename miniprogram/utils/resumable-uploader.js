/**
 * 断点续传上传器
 * 实现网络不稳定环境下的文件可靠上传
 */

// 导入网络监控工具
const NetworkMonitor = require('./network-monitor');
const SecurityFilter = require('./security-filter');

/**
 * 断点续传上传器
 */
const ResumableUploader = {
  // 上传任务列表
  _uploadTasks: {},
  
  // 断点信息持久化键
  _storageKey: 'resumable_upload_tasks',
  
  // 上传状态
  _isPaused: false,
  
  /**
   * 初始化上传器
   * @returns {Object} 当前实例
   */
  init() {
    // 监听网络状态
    this._setupNetworkListener();
    
    // 加载已保存的上传任务
    this._loadPersistedTasks();
    
    console.log('[ResumableUploader] 断点续传上传器初始化完成');
    return this;
  },
  
  /**
   * 设置网络监听
   * @private
   */
  _setupNetworkListener() {
    NetworkMonitor.onNetworkChange(state => {
      // 如果网络恢复连接，尝试恢复上传
      if (state.connected && this._isPaused) {
        console.log('[ResumableUploader] 网络恢复，尝试恢复上传');
        setTimeout(() => this.resumeAllUploads(), 2000); // 延迟2秒等待网络稳定
      }
      
      // 如果网络断开，暂停所有上传
      if (!state.connected && !this._isPaused) {
        console.log('[ResumableUploader] 网络断开，暂停所有上传');
        this.pauseAllUploads();
      }
    });
  },
  
  /**
   * 加载已保存的上传任务
   * @private
   */
  _loadPersistedTasks() {
    try {
      const tasksStr = wx.getStorageSync(this._storageKey);
      if (tasksStr) {
        const tasks = JSON.parse(tasksStr);
        this._uploadTasks = tasks || {};
        
        console.log(`[ResumableUploader] 已加载${Object.keys(this._uploadTasks).length}个未完成的上传任务`);
        
        // 检查是否有任务需要恢复
        if (Object.keys(this._uploadTasks).length > 0 && !this._isPaused) {
          // 延迟一段时间再恢复上传，确保应用初始化完成
          setTimeout(() => this.resumeAllUploads(), 5000);
        }
      }
    } catch (err) {
      console.error('[ResumableUploader] 加载任务失败:', err);
      this._uploadTasks = {};
    }
  },
  
  /**
   * 保存上传任务状态
   * @private
   */
  _persistTasks() {
    try {
      // 过滤掉已完成的任务，只保存未完成的
      const tasks = {};
      Object.keys(this._uploadTasks).forEach(taskId => {
        const task = this._uploadTasks[taskId];
        if (task.status !== 'completed') {
          tasks[taskId] = task;
        }
      });
      
      wx.setStorageSync(this._storageKey, JSON.stringify(tasks));
    } catch (err) {
      console.error('[ResumableUploader] 保存任务失败:', err);
    }
  },
  
  /**
   * 创建上传任务
   * @param {Object} fileInfo 文件信息
   * @param {String} url 上传地址
   * @param {Object} options 上传选项
   * @returns {String} 上传任务ID
   */
  createUploadTask(fileInfo, url, options = {}) {
    // 安全处理文件名
    const fileName = SecurityFilter.sanitizeFileName(fileInfo.name || 'file_' + Date.now());
    
    // 创建任务ID
    const taskId = 'upload_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // 创建上传任务
    const task = {
      id: taskId,
      file: {
        ...fileInfo,
        name: fileName
      },
      url: url,
      options: options,
      progress: 0,
      uploaded: 0,
      size: fileInfo.size || 0,
      status: 'pending', // pending, uploading, paused, completed, error
      createTime: Date.now(),
      lastUpdateTime: Date.now(),
      error: null,
      retryCount: 0
    };
    
    // 保存任务
    this._uploadTasks[taskId] = task;
    this._persistTasks();
    
    console.log(`[ResumableUploader] 创建上传任务: ${taskId}`);
    
    // 如果当前网络可用且未暂停，立即开始上传
    if (!this._isPaused && NetworkMonitor.getNetworkState().connected) {
      this._startUpload(taskId);
    }
    
    return taskId;
  },
  
  /**
   * 开始上传任务
   * @param {String} taskId 任务ID
   * @private
   */
  _startUpload(taskId) {
    const task = this._uploadTasks[taskId];
    if (!task || task.status === 'completed') {
      return;
    }
    
    // 更新任务状态
    task.status = 'uploading';
    task.lastUpdateTime = Date.now();
    this._persistTasks();
    
    console.log(`[ResumableUploader] 开始上传任务: ${taskId}`);
    
    // 准备上传参数
    const uploadParams = {
      url: task.url,
      filePath: task.file.path,
      name: 'file',
      header: task.options.header || {},
      formData: {
        ...task.options.formData,
        fileName: task.file.name,
        taskId: taskId
      }
    };
    
    // 添加进度监听
    uploadParams.success = (res) => this._onUploadSuccess(taskId, res);
    uploadParams.fail = (err) => this._onUploadFail(taskId, err);
    
    // 执行上传
    const uploadTask = wx.uploadFile(uploadParams);
    
    // 监听上传进度
    uploadTask.onProgressUpdate(res => {
      this._onProgressUpdate(taskId, res);
    });
    
    // 保存uploadTask引用以便控制
    task.uploadTask = uploadTask;
  },
  
  /**
   * 上传成功处理
   * @param {String} taskId 任务ID
   * @param {Object} res 上传结果
   * @private
   */
  _onUploadSuccess(taskId, res) {
    const task = this._uploadTasks[taskId];
    if (!task) return;
    
    // 检查服务器返回的状态码
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // 更新任务状态
      task.status = 'completed';
      task.progress = 100;
      task.uploaded = task.size;
      task.lastUpdateTime = Date.now();
      task.response = res;
      this._persistTasks();
      
      console.log(`[ResumableUploader] 任务完成: ${taskId}`);
      
      // 触发回调
      if (task.options.onSuccess) {
        try {
          task.options.onSuccess(res, taskId);
        } catch (err) {
          console.error(`[ResumableUploader] 执行onSuccess回调出错:`, err);
        }
      }
    } else {
      // 服务器返回错误
      this._onUploadFail(taskId, {
        errMsg: `服务器返回错误状态码: ${res.statusCode}`,
        statusCode: res.statusCode,
        data: res.data
      });
    }
  },
  
  /**
   * 上传失败处理
   * @param {String} taskId 任务ID
   * @param {Object} err 错误信息
   * @private
   */
  _onUploadFail(taskId, err) {
    const task = this._uploadTasks[taskId];
    if (!task) return;
    
    // 更新任务状态
    task.status = 'error';
    task.error = err;
    task.lastUpdateTime = Date.now();
    task.retryCount += 1;
    this._persistTasks();
    
    console.error(`[ResumableUploader] 上传失败: ${taskId}`, err);
    
    // 检查是否需要自动重试
    if (task.retryCount < (task.options.maxRetries || 3)) {
      console.log(`[ResumableUploader] 准备第${task.retryCount}次重试: ${taskId}`);
      
      // 延迟重试
      setTimeout(() => {
        if (this._uploadTasks[taskId] && NetworkMonitor.getNetworkState().connected) {
          this._startUpload(taskId);
        }
      }, (task.options.retryDelay || 3000) * task.retryCount);
    } else {
      // 超过重试次数，触发错误回调
      if (task.options.onError) {
        try {
          task.options.onError(err, taskId);
        } catch (callbackErr) {
          console.error(`[ResumableUploader] 执行onError回调出错:`, callbackErr);
        }
      }
    }
  },
  
  /**
   * 上传进度更新处理
   * @param {String} taskId 任务ID
   * @param {Object} progressInfo 进度信息
   * @private
   */
  _onProgressUpdate(taskId, progressInfo) {
    const task = this._uploadTasks[taskId];
    if (!task) return;
    
    // 更新进度
    task.progress = progressInfo.progress;
    task.uploaded = Math.floor(task.size * (progressInfo.progress / 100));
    
    // 触发进度回调
    if (task.options.onProgress) {
      try {
        task.options.onProgress(progressInfo, taskId);
      } catch (err) {
        console.error(`[ResumableUploader] 执行onProgress回调出错:`, err);
      }
    }
  },
  
  /**
   * 暂停指定上传任务
   * @param {String} taskId 任务ID
   * @returns {Boolean} 是否成功
   */
  pauseUpload(taskId) {
    const task = this._uploadTasks[taskId];
    if (!task || task.status !== 'uploading') {
      return false;
    }
    
    // 如果有活动的上传任务，暂停它
    if (task.uploadTask) {
      try {
        task.uploadTask.abort();
      } catch (err) {
        console.warn(`[ResumableUploader] 中止上传任务出错:`, err);
      }
    }
    
    // 更新任务状态
    task.status = 'paused';
    task.lastUpdateTime = Date.now();
    this._persistTasks();
    
    console.log(`[ResumableUploader] 暂停上传任务: ${taskId}`);
    return true;
  },
  
  /**
   * 暂停所有上传任务
   */
  pauseAllUploads() {
    this._isPaused = true;
    
    Object.keys(this._uploadTasks).forEach(taskId => {
      const task = this._uploadTasks[taskId];
      if (task.status === 'uploading') {
        this.pauseUpload(taskId);
      }
    });
    
    console.log('[ResumableUploader] 已暂停所有上传任务');
  },
  
  /**
   * 恢复指定上传任务
   * @param {String} taskId 任务ID
   * @returns {Boolean} 是否成功
   */
  resumeUpload(taskId) {
    const task = this._uploadTasks[taskId];
    if (!task || task.status === 'completed' || task.status === 'uploading') {
      return false;
    }
    
    // 如果网络不可用，不恢复上传
    if (!NetworkMonitor.getNetworkState().connected) {
      console.log(`[ResumableUploader] 网络不可用，无法恢复任务: ${taskId}`);
      return false;
    }
    
    // 重新开始上传
    this._startUpload(taskId);
    
    console.log(`[ResumableUploader] 恢复上传任务: ${taskId}`);
    return true;
  },
  
  /**
   * 恢复所有上传任务
   */
  resumeAllUploads() {
    // 先检查网络是否可用
    if (!NetworkMonitor.getNetworkState().connected) {
      console.log('[ResumableUploader] 网络不可用，无法恢复上传');
      return;
    }
    
    this._isPaused = false;
    
    Object.keys(this._uploadTasks).forEach(taskId => {
      const task = this._uploadTasks[taskId];
      if (task.status === 'paused' || task.status === 'error') {
        this.resumeUpload(taskId);
      }
    });
    
    console.log('[ResumableUploader] 已恢复所有暂停的上传任务');
  },
  
  /**
   * 取消上传任务
   * @param {String} taskId 任务ID
   * @returns {Boolean} 是否成功
   */
  cancelUpload(taskId) {
    const task = this._uploadTasks[taskId];
    if (!task) {
      return false;
    }
    
    // 如果任务正在上传，先中止
    if (task.status === 'uploading' && task.uploadTask) {
      try {
        task.uploadTask.abort();
      } catch (err) {
        console.warn(`[ResumableUploader] 中止上传任务出错:`, err);
      }
    }
    
    // 删除任务
    delete this._uploadTasks[taskId];
    this._persistTasks();
    
    console.log(`[ResumableUploader] 已取消上传任务: ${taskId}`);
    
    // 触发取消回调
    if (task.options.onCancel) {
      try {
        task.options.onCancel(taskId);
      } catch (err) {
        console.error(`[ResumableUploader] 执行onCancel回调出错:`, err);
      }
    }
    
    return true;
  },
  
  /**
   * 获取上传任务信息
   * @param {String} taskId 任务ID
   * @returns {Object|null} 任务信息
   */
  getTaskInfo(taskId) {
    return this._uploadTasks[taskId] || null;
  },
  
  /**
   * 获取所有上传任务
   * @returns {Object} 所有上传任务
   */
  getAllTasks() {
    return { ...this._uploadTasks };
  },
  
  /**
   * 清理已完成的任务
   */
  clearCompletedTasks() {
    Object.keys(this._uploadTasks).forEach(taskId => {
      const task = this._uploadTasks[taskId];
      if (task.status === 'completed') {
        delete this._uploadTasks[taskId];
      }
    });
    
    this._persistTasks();
    console.log('[ResumableUploader] 已清理完成的上传任务');
  }
};

module.exports = ResumableUploader; 