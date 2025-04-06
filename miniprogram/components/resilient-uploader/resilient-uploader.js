// components/resilient-uploader/resilient-uploader.js

// 导入增强版上传管理器和事件总线
const EnhancedUploadManager = require('../../utils/enhanced-upload-manager');
const EventBus = require('../../utils/eventBus');
const NetworkMonitor = require('../../utils/network-monitor');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否开启断点续传
    resumable: {
      type: Boolean,
      value: true
    },
    // 最大重试次数
    maxRetries: {
      type: Number,
      value: 3
    },
    // 单次最大选择数量
    maxCount: {
      type: Number,
      value: 9
    },
    // 显示上传进度
    showProgress: {
      type: Boolean,
      value: true
    },
    // 自动上传
    autoUpload: {
      type: Boolean,
      value: true
    },
    // 上传API地址
    uploadUrl: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 待上传的照片列表
    pendingPhotos: [],
    // 上传中的照片列表
    uploadingPhotos: [],
    // 已上传的照片列表
    uploadedPhotos: [],
    // 失败的照片列表
    failedPhotos: [],
    // 网络状态
    networkState: {
      connected: true,
      networkType: 'unknown',
      signalStrength: 'normal'
    },
    // 上传状态
    isUploading: false,
    // 显示网络提示
    showNetworkTip: false,
    // 网络提示消息
    networkTip: ''
  },

  /**
   * 组件的生命周期
   */
  lifetimes: {
    attached() {
      // 初始化上传管理器
      EnhancedUploadManager.init({
        uploadUrl: this.properties.uploadUrl
      });
      
      // 初始化网络监控
      NetworkMonitor.init();
      
      // 监听网络状态变化
      this._setupNetworkMonitor();
      
      // 监听上传事件
      this._setupUploadEvents();
    },
    
    detached() {
      // 取消事件监听
      this._removeEventListeners();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 设置网络监控
     * @private
     */
    _setupNetworkMonitor() {
      // 保存取消监听的函数
      this._networkUnsubscribe = NetworkMonitor.onNetworkChange(state => {
        // 更新网络状态
        this.setData({
          networkState: state
        });
        
        // 当网络状态变化时，显示提示
        this._showNetworkTip(state);
      });
    },
    
    /**
     * 显示网络提示
     * @param {Object} state 网络状态
     * @private
     */
    _showNetworkTip(state) {
      let tip = '';
      
      if (!state.connected) {
        tip = '网络连接已断开，上传已暂停。恢复连接后将自动继续。';
      } else if (state.networkType === '2g') {
        tip = '当前为2G网络，已启用最低质量上传模式';
      } else if (state.networkType === '3g') {
        tip = '当前为3G网络，已启用低质量上传模式';
      } else if (state.signalStrength === 'weak') {
        tip = '网络信号较弱，已自动降低上传质量';
      }
      
      if (tip) {
        this.setData({
          showNetworkTip: true,
          networkTip: tip
        });
        
        // 3秒后自动隐藏提示
        setTimeout(() => {
          this.setData({
            showNetworkTip: false
          });
        }, 3000);
      }
    },
    
    /**
     * 设置上传事件监听
     * @private
     */
    _setupUploadEvents() {
      // 上传开始事件
      this._startSubscription = EventBus.on('upload:start', this._handleUploadStart.bind(this));
      
      // 上传进度事件
      this._progressSubscription = EventBus.on('upload:progress', this._handleUploadProgress.bind(this));
      
      // 上传完成事件
      this._completeSubscription = EventBus.on('upload:complete', this._handleUploadComplete.bind(this));
      
      // 上传错误事件
      this._errorSubscription = EventBus.on('upload:error', this._handleUploadError.bind(this));
      
      // 上传取消事件
      this._cancelSubscription = EventBus.on('upload:cancel', this._handleUploadCancel.bind(this));
    },
    
    /**
     * 移除事件监听
     * @private
     */
    _removeEventListeners() {
      // 移除网络监听
      if (this._networkUnsubscribe) {
        this._networkUnsubscribe();
      }
      
      // 移除上传事件监听
      if (this._startSubscription) EventBus.off('upload:start', this._startSubscription);
      if (this._progressSubscription) EventBus.off('upload:progress', this._progressSubscription);
      if (this._completeSubscription) EventBus.off('upload:complete', this._completeSubscription);
      if (this._errorSubscription) EventBus.off('upload:error', this._errorSubscription);
      if (this._cancelSubscription) EventBus.off('upload:cancel', this._cancelSubscription);
    },
    
    /**
     * 处理上传开始事件
     * @param {Object} data 事件数据
     * @private
     */
    _handleUploadStart(data) {
      console.log('[ResilientUploader] 上传开始', data);
      
      // 更新上传状态
      const { pendingPhotos, uploadingPhotos } = this.data;
      
      // 找到对应的待上传照片
      const photoIndex = pendingPhotos.findIndex(p => p.id === data.photoId);
      
      if (photoIndex !== -1) {
        // 从待上传列表中移除
        const photo = pendingPhotos[photoIndex];
        const updatedPending = [...pendingPhotos];
        updatedPending.splice(photoIndex, 1);
        
        // 添加到上传中列表
        const updatedUploading = [...uploadingPhotos, {
          ...photo,
          taskId: data.taskId,
          progress: 0,
          status: 'uploading'
        }];
        
        // 更新状态
        this.setData({
          pendingPhotos: updatedPending,
          uploadingPhotos: updatedUploading,
          isUploading: true
        });
      }
      
      // 触发上传开始事件
      this.triggerEvent('uploadstart', {
        photoId: data.photoId,
        taskId: data.taskId
      });
    },
    
    /**
     * 处理上传进度事件
     * @param {Object} data 事件数据
     * @private
     */
    _handleUploadProgress(data) {
      // 更新上传进度
      const { uploadingPhotos } = this.data;
      
      // 找到对应的上传中照片
      const photoIndex = uploadingPhotos.findIndex(p => p.taskId === data.taskId);
      
      if (photoIndex !== -1) {
        // 更新进度
        const updatedUploading = [...uploadingPhotos];
        updatedUploading[photoIndex].progress = data.progress;
        
        // 更新状态
        this.setData({
          uploadingPhotos: updatedUploading
        });
      }
      
      // 触发进度事件
      this.triggerEvent('uploadprogress', {
        photoId: data.photoId,
        taskId: data.taskId,
        progress: data.progress,
        totalBytes: data.totalBytes,
        uploadedBytes: data.uploadedBytes
      });
    },
    
    /**
     * 处理上传完成事件
     * @param {Object} data 事件数据
     * @private
     */
    _handleUploadComplete(data) {
      console.log('[ResilientUploader] 上传完成', data);
      
      // 更新上传状态
      const { uploadingPhotos, uploadedPhotos } = this.data;
      
      // 找到对应的上传中照片
      const photoIndex = uploadingPhotos.findIndex(p => p.taskId === data.taskId);
      
      if (photoIndex !== -1) {
        // 从上传中列表移除
        const photo = uploadingPhotos[photoIndex];
        const updatedUploading = [...uploadingPhotos];
        updatedUploading.splice(photoIndex, 1);
        
        // 添加到已上传列表
        const updatedUploaded = [...uploadedPhotos, {
          ...photo,
          status: 'uploaded',
          progress: 100,
          response: data.response
        }];
        
        // 更新状态
        this.setData({
          uploadingPhotos: updatedUploading,
          uploadedPhotos: updatedUploaded,
          isUploading: updatedUploading.length > 0
        });
        
        // 检查是否需要自动上传下一张
        this._checkAutoUpload();
      }
      
      // 触发上传完成事件
      this.triggerEvent('uploadcomplete', {
        photoId: data.photoId,
        taskId: data.taskId,
        response: data.response
      });
    },
    
    /**
     * 处理上传错误事件
     * @param {Object} data 事件数据
     * @private
     */
    _handleUploadError(data) {
      console.error('[ResilientUploader] 上传错误', data);
      
      // 更新上传状态
      const { uploadingPhotos, failedPhotos } = this.data;
      
      // 找到对应的上传中照片
      const photoIndex = uploadingPhotos.findIndex(p => p.taskId === data.taskId);
      
      if (photoIndex !== -1) {
        // 从上传中列表移除
        const photo = uploadingPhotos[photoIndex];
        const updatedUploading = [...uploadingPhotos];
        updatedUploading.splice(photoIndex, 1);
        
        // 添加到失败列表
        const updatedFailed = [...failedPhotos, {
          ...photo,
          status: 'failed',
          error: data.error
        }];
        
        // 更新状态
        this.setData({
          uploadingPhotos: updatedUploading,
          failedPhotos: updatedFailed,
          isUploading: updatedUploading.length > 0
        });
        
        // 检查是否需要自动上传下一张
        this._checkAutoUpload();
      }
      
      // 触发上传错误事件
      this.triggerEvent('uploaderror', {
        photoId: data.photoId,
        taskId: data.taskId,
        error: data.error
      });
    },
    
    /**
     * 处理上传取消事件
     * @param {Object} data 事件数据
     * @private
     */
    _handleUploadCancel(data) {
      console.log('[ResilientUploader] 上传取消', data);
      
      // 更新上传状态
      const { uploadingPhotos, pendingPhotos } = this.data;
      
      // 找到对应的上传中照片
      const photoIndex = uploadingPhotos.findIndex(p => p.taskId === data.taskId);
      
      if (photoIndex !== -1) {
        // 从上传中列表移除
        const photo = uploadingPhotos[photoIndex];
        const updatedUploading = [...uploadingPhotos];
        updatedUploading.splice(photoIndex, 1);
        
        // 重新添加到待上传列表
        const updatedPending = [...pendingPhotos, {
          ...photo,
          status: 'pending',
          taskId: null
        }];
        
        // 更新状态
        this.setData({
          uploadingPhotos: updatedUploading,
          pendingPhotos: updatedPending,
          isUploading: updatedUploading.length > 0
        });
      }
      
      // 触发上传取消事件
      this.triggerEvent('uploadcancel', {
        photoId: data.photoId,
        taskId: data.taskId
      });
    },
    
    /**
     * 检查是否需要自动上传下一张
     * @private
     */
    _checkAutoUpload() {
      if (this.properties.autoUpload && this.data.pendingPhotos.length > 0) {
        // 延迟一点时间再上传下一张，避免瞬间启动多个上传任务
        setTimeout(() => {
          this.startUpload();
        }, 300);
      }
    },
    
    /**
     * 选择照片
     */
    choosePhoto() {
      // 检查网络是否连接
      if (!this.data.networkState.connected) {
        wx.showToast({
          title: '网络已断开，请先连接网络',
          icon: 'none'
        });
        return;
      }
      
      // 选择图片
      wx.chooseMedia({
        count: this.properties.maxCount,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          // 处理选择的照片
          const photos = res.tempFiles.map((file, index) => ({
            id: `photo_${Date.now()}_${index}`,
            path: file.tempFilePath,
            size: file.size,
            type: 'image',
            createTime: Date.now(),
            name: `photo_${Date.now()}_${index}.jpg`,
            status: 'pending',
            progress: 0
          }));
          
          // 更新待上传照片列表
          this.setData({
            pendingPhotos: [...this.data.pendingPhotos, ...photos]
          });
          
          // 触发照片选择事件
          this.triggerEvent('photochoose', {
            photos: photos
          });
          
          // 如果设置了自动上传，则开始上传
          if (this.properties.autoUpload) {
            this.startUpload();
          }
        }
      });
    },
    
    /**
     * 开始上传
     */
    startUpload() {
      const { pendingPhotos, networkState } = this.data;
      
      // 检查是否有待上传照片
      if (pendingPhotos.length === 0) {
        return;
      }
      
      // 检查网络是否连接
      if (!networkState.connected) {
        wx.showToast({
          title: '网络已断开，请先连接网络',
          icon: 'none'
        });
        return;
      }
      
      // 获取第一张待上传照片
      const photoToUpload = pendingPhotos[0];
      
      // 准备上传选项
      const uploadOptions = {
        fileName: photoToUpload.name,
        photoId: photoToUpload.id,
        maxRetries: this.properties.maxRetries,
        header: {
          'X-Photo-ID': photoToUpload.id
        },
        formData: {
          createTime: photoToUpload.createTime,
          photoName: photoToUpload.name
        }
      };
      
      // 上传照片
      EnhancedUploadManager.uploadPhoto(photoToUpload, uploadOptions)
        .catch(err => {
          console.error('[ResilientUploader] 上传照片失败', err);
          
          // 触发错误事件
          this.triggerEvent('uploaderror', {
            photoId: photoToUpload.id,
            error: err
          });
        });
    },
    
    /**
     * 重试上传失败的照片
     * @param {Object} e 事件对象
     */
    retryUpload(e) {
      const { photoId } = e.currentTarget.dataset;
      const { failedPhotos, pendingPhotos } = this.data;
      
      // 找到失败的照片
      const photoIndex = failedPhotos.findIndex(p => p.id === photoId);
      
      if (photoIndex !== -1) {
        // 从失败列表中移除
        const photo = failedPhotos[photoIndex];
        const updatedFailed = [...failedPhotos];
        updatedFailed.splice(photoIndex, 1);
        
        // 添加到待上传列表
        const updatedPending = [...pendingPhotos, {
          ...photo,
          status: 'pending',
          taskId: null,
          error: null
        }];
        
        // 更新状态
        this.setData({
          failedPhotos: updatedFailed,
          pendingPhotos: updatedPending
        });
        
        // 如果设置了自动上传，则开始上传
        if (this.properties.autoUpload) {
          this.startUpload();
        }
      }
    },
    
    /**
     * 取消上传
     * @param {Object} e 事件对象
     */
    cancelUpload(e) {
      const { taskId } = e.currentTarget.dataset;
      
      if (taskId) {
        EnhancedUploadManager.cancelUpload(taskId);
      }
    },
    
    /**
     * 暂停所有上传
     */
    pauseAllUploads() {
      EnhancedUploadManager.pauseAllUploads();
      
      // 更新状态
      this.setData({
        isUploading: false
      });
      
      // 触发暂停事件
      this.triggerEvent('uploadpause');
    },
    
    /**
     * 恢复所有上传
     */
    resumeAllUploads() {
      EnhancedUploadManager.resumeAllUploads();
      
      // 如果还有待上传照片，开始上传
      if (this.data.pendingPhotos.length > 0) {
        this.startUpload();
      }
      
      // 触发恢复事件
      this.triggerEvent('uploadresume');
    },
    
    /**
     * 清理已上传的照片
     */
    clearUploadedPhotos() {
      // 更新状态
      this.setData({
        uploadedPhotos: []
      });
      
      // 清理已完成的上传任务
      EnhancedUploadManager.clearCompletedTasks();
    }
  }
}); 