/**
 * 优化的照片采集组件
 * 提供高效的照片采集、处理和上传功能，并实现了内存管理和弱网络优化
 */

// 导入依赖模块
const B1PhotoOptimizedLoader = require('../../utils/b1-photo-optimized-loader');
const PhotoBatchProcessor = require('../../utils/photo-batch-processor');
const NetworkMonitor = require('../../utils/network-monitor');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 最大照片数量
    maxPhotos: {
      type: Number,
      value: 9
    },
    
    // 照片质量，范围0-1
    photoQuality: {
      type: Number,
      value: 0.8
    },
    
    // 是否开启闪光灯
    flash: {
      type: String,
      value: 'auto' // 可选值：auto, on, off, torch
    },
    
    // 照片尺寸模式
    sizeType: {
      type: Array,
      value: ['original', 'compressed']
    },
    
    // 相机位置
    cameraPosition: {
      type: String,
      value: 'back' // 可选值：back, front
    },
    
    // 自动优化内存
    autoOptimize: {
      type: Boolean,
      value: true
    },
    
    // 预览模式：单击预览/长按预览/不预览
    previewMode: {
      type: String,
      value: 'tap' // 可选值：tap, longpress, none
    },
    
    // 是否显示删除按钮
    showDelete: {
      type: Boolean,
      value: true
    },
    
    // 是否显示添加按钮
    showAdd: {
      type: Boolean,
      value: true
    },
    
    // 上传URL
    uploadUrl: {
      type: String,
      value: ''
    },
    
    // 上传参数
    uploadParams: {
      type: Object,
      value: {}
    },
    
    // 网络状态提示
    showNetworkStatus: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 已拍摄照片列表
    photoList: [],
    
    // 组件状态：idle（空闲）, taking（拍照中）, processing（处理中）, uploading（上传中）
    status: 'idle',
    
    // 是否正在预览
    isPreviewing: false,
    
    // 当前预览的照片索引
    currentPreviewIndex: 0,
    
    // 网络状态
    networkType: 'unknown',
    
    // 内存警告状态
    memoryWarningLevel: 0,
    
    // 相机错误信息
    cameraError: '',
    
    // 是否显示相机
    showCamera: false,
    
    // 批处理进度
    processingProgress: 0,
    
    // 上传进度
    uploadProgress: 0
  },

  /**
   * 生命周期函数
   */
  lifetimes: {
    // 在组件实例进入页面节点树时执行
    attached() {
      // 初始化照片加载器
      this._photoLoader = B1PhotoOptimizedLoader.init({
        logLevel: 2
      });
      
      // 初始化照片批处理器
      this._photoBatchProcessor = PhotoBatchProcessor.init({
        logLevel: 2
      });
      
      // 初始化网络监控
      this._networkMonitor = NetworkMonitor.init();
      this._networkMonitor.onNetworkStatusChange(this._handleNetworkChange.bind(this));
      
      // 初始化网络状态
      this._updateNetworkStatus();
      
      // 设置内存警告监听
      this._setupMemoryWarning();
    },
    
    // 在组件实例被从页面节点树移除时执行
    detached() {
      this._cleanup();
    },
  },
  
  /**
   * 页面生命周期函数
   */
  pageLifetimes: {
    // 组件所在页面显示时执行
    show() {
      // 恢复组件状态
      if (this.data.showCamera) {
        this._initCamera();
      }
      
      // 更新网络状态
      this._updateNetworkStatus();
    },
    
    // 组件所在页面隐藏时执行
    hide() {
      // 停止相机预览，释放资源
      this._stopCamera();
    },
    
    // 组件所在页面尺寸变化时执行
    resize() {
      if (this.data.showCamera) {
        // 如果相机正在显示，重新初始化，以适应新尺寸
        this._initCamera();
      }
    },
  },
  
  /**
   * 监听属性和数据字段变化
   */
  observers: {
    'photoList': function(photoList) {
      // 当照片列表变化时，通知外部
      this.triggerEvent('change', { photos: photoList });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 显示相机
     */
    showCamera() {
      this.setData({
        showCamera: true
      }, () => {
        this._initCamera();
      });
    },
    
    /**
     * 隐藏相机
     */
    hideCamera() {
      this._stopCamera();
      this.setData({
        showCamera: false
      });
    },
    
    /**
     * 初始化相机
     * @private
     */
    _initCamera() {
      this.setData({
        cameraError: '',
        status: 'idle'
      });
      
      const cameraContext = wx.createCameraContext(this);
      this._cameraContext = cameraContext;
      
      cameraContext.onCameraFrame((frame) => {
        // 相机帧回调，可以用于优化相机预览
        // 实际上，微信小程序中这个API很耗性能，仅在必要时使用
      });
    },
    
    /**
     * 停止相机
     * @private
     */
    _stopCamera() {
      if (this._cameraContext) {
        try {
          // 尝试停止相机预览
          this._cameraContext = null;
        } catch (e) {
          console.error('停止相机出错:', e);
        }
      }
    },
    
    /**
     * 拍照
     */
    takePhoto() {
      if (this.data.status !== 'idle') {
        return;
      }
      
      // 检查是否已达到最大照片数量
      if (this.data.photoList.length >= this.data.maxPhotos) {
        wx.showToast({
          title: `最多只能拍摄${this.data.maxPhotos}张照片`,
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        status: 'taking'
      });
      
      // 检查相机上下文
      if (!this._cameraContext) {
        this._initCamera();
      }
      
      // 拍照
      this._cameraContext.takePhoto({
        quality: this.data.photoQuality,
        success: (res) => {
          // 处理照片
          this._processPhoto(res.tempImagePath);
        },
        fail: (err) => {
          console.error('拍照失败:', err);
          this.setData({
            status: 'idle',
            cameraError: '拍照失败: ' + (err.errMsg || JSON.stringify(err))
          });
        }
      });
    },
    
    /**
     * 处理照片
     * @param {String} tempPath 临时文件路径
     * @private
     */
    _processPhoto(tempPath) {
      this.setData({
        status: 'processing',
        processingProgress: 10
      });
      
      // 获取图片信息
      wx.getImageInfo({
        src: tempPath,
        success: (info) => {
          // 更新进度
          this.setData({
            processingProgress: 30
          });
          
          // 创建照片对象
          const photo = {
            path: tempPath,
            width: info.width,
            height: info.height,
            size: 0, // 文件大小未知
            timestamp: Date.now(),
            processed: false,
            uploaded: false
          };
          
          // 更新进度
          this.setData({
            processingProgress: 50
          });
          
          // 如果需要优化内存且照片过大，执行压缩
          if (this.data.autoOptimize && (info.width > 2000 || info.height > 2000)) {
            // 添加到批处理队列
            this._photoBatchProcessor.compressPhotos([{
              path: tempPath,
              options: {
                quality: this.data.photoQuality,
                maxWidth: 2000,
                maxHeight: 2000
              }
            }])
            .then(result => {
              if (result.results && result.results[0]) {
                // 使用压缩后的照片
                photo.path = result.results[0].compressed;
                photo.width = result.results[0].width;
                photo.height = result.results[0].height;
                photo.original = tempPath;
                photo.processed = true;
              }
              
              // 添加照片到列表
              this._addPhotoToList(photo);
            })
            .catch(err => {
              console.error('压缩照片失败:', err);
              // 使用原图
              this._addPhotoToList(photo);
            });
          } else {
            // 不需要压缩，直接添加
            this._addPhotoToList(photo);
          }
        },
        fail: (err) => {
          console.error('获取图片信息失败:', err);
          
          // 创建照片对象（没有宽高信息）
          const photo = {
            path: tempPath,
            timestamp: Date.now(),
            processed: false,
            uploaded: false
          };
          
          // 添加照片到列表
          this._addPhotoToList(photo);
        }
      });
    },
    
    /**
     * 添加照片到列表
     * @param {Object} photo 照片对象
     * @private
     */
    _addPhotoToList(photo) {
      // 更新进度
      this.setData({
        processingProgress: 80
      });
      
      // 添加到照片列表
      const newList = [...this.data.photoList, photo];
      
      this.setData({
        photoList: newList,
        status: 'idle',
        processingProgress: 100
      });
      
      // 通知外部
      this.triggerEvent('add', { photo, index: newList.length - 1 });
      
      // 如果内存警告级别较高，尝试清理未使用的缓存
      if (this.data.memoryWarningLevel > 0 && this.data.autoOptimize) {
        this._photoLoader.clearUnusedCache();
      }
      
      // 短时间后隐藏进度
      setTimeout(() => {
        this.setData({
          processingProgress: 0
        });
      }, 500);
    },
    
    /**
     * 从相册选择照片
     */
    chooseFromAlbum() {
      if (this.data.status !== 'idle') {
        return;
      }
      
      // 计算剩余可选数量
      const remainCount = this.data.maxPhotos - this.data.photoList.length;
      if (remainCount <= 0) {
        wx.showToast({
          title: `最多只能选择${this.data.maxPhotos}张照片`,
          icon: 'none'
        });
        return;
      }
      
      // 从相册选择照片
      wx.chooseImage({
        count: remainCount,
        sizeType: this.data.sizeType,
        sourceType: ['album'],
        success: (res) => {
          // 处理选择的照片
          this._processSelectedPhotos(res.tempFilePaths);
        },
        fail: (err) => {
          // 用户取消选择不提示错误
          if (err.errMsg.indexOf('cancel') === -1) {
            console.error('选择照片失败:', err);
            wx.showToast({
              title: '选择照片失败',
              icon: 'none'
            });
          }
        }
      });
    },
    
    /**
     * 处理选择的照片
     * @param {Array} tempFilePaths 临时文件路径数组
     * @private
     */
    _processSelectedPhotos(tempFilePaths) {
      if (!tempFilePaths || tempFilePaths.length === 0) {
        return;
      }
      
      this.setData({
        status: 'processing',
        processingProgress: 10
      });
      
      // 创建照片处理队列
      const photos = tempFilePaths.map(path => {
        return { path };
      });
      
      // 使用批处理器处理照片
      this._photoBatchProcessor.compressPhotos(photos, {
        quality: this.data.photoQuality,
        maxWidth: 2000,
        maxHeight: 2000
      })
      .then(result => {
        // 更新进度
        this.setData({
          processingProgress: 80
        });
        
        // 添加处理后的照片到列表
        if (result.results && result.results.length > 0) {
          const newPhotos = result.results.map(item => {
            return {
              path: item.compressed,
              original: item.original,
              width: item.width,
              height: item.height,
              size: item.size || 0,
              timestamp: Date.now(),
              processed: true,
              uploaded: false
            };
          });
          
          // 添加到照片列表
          const newList = [...this.data.photoList, ...newPhotos];
          this.setData({
            photoList: newList,
            status: 'idle',
            processingProgress: 100
          });
          
          // 通知外部
          this.triggerEvent('add', { photos: newPhotos });
        } else {
          this.setData({
            status: 'idle',
            processingProgress: 0
          });
        }
        
        // 短时间后隐藏进度
        setTimeout(() => {
          this.setData({
            processingProgress: 0
          });
        }, 500);
      })
      .catch(err => {
        console.error('处理照片失败:', err);
        this.setData({
          status: 'idle',
          processingProgress: 0
        });
        
        wx.showToast({
          title: '处理照片失败',
          icon: 'none'
        });
      });
    },
    
    /**
     * 删除照片
     * @param {Object} e 事件对象
     */
    deletePhoto(e) {
      const index = e.currentTarget.dataset.index;
      if (index === undefined || index < 0 || index >= this.data.photoList.length) {
        return;
      }
      
      wx.showModal({
        title: '提示',
        content: '确定要删除这张照片吗？',
        success: (res) => {
          if (res.confirm) {
            // 获取要删除的照片
            const photo = this.data.photoList[index];
            
            // 从列表中删除
            const newList = [...this.data.photoList];
            newList.splice(index, 1);
            
            this.setData({
              photoList: newList
            });
            
            // 通知外部
            this.triggerEvent('delete', { photo, index });
          }
        }
      });
    },
    
    /**
     * 预览照片
     * @param {Object} e 事件对象
     */
    previewPhoto(e) {
      if (this.data.previewMode === 'none') {
        return;
      }
      
      const index = e.currentTarget.dataset.index;
      if (index === undefined || index < 0 || index >= this.data.photoList.length) {
        return;
      }
      
      // 准备预览图片列表
      const urls = this.data.photoList.map(photo => photo.path);
      
      this.setData({
        isPreviewing: true,
        currentPreviewIndex: index
      });
      
      // 使用微信预览图片接口
      wx.previewImage({
        current: urls[index],
        urls: urls,
        complete: () => {
          this.setData({
            isPreviewing: false
          });
        }
      });
    },
    
    /**
     * 上传照片
     * @param {Boolean} autoClose 上传完成后是否自动关闭
     * @returns {Promise} 上传结果
     */
    uploadPhotos(autoClose = false) {
      // 检查是否有照片
      if (this.data.photoList.length === 0) {
        wx.showToast({
          title: '没有照片可上传',
          icon: 'none'
        });
        return Promise.reject(new Error('没有照片可上传'));
      }
      
      // 检查上传URL
      if (!this.data.uploadUrl) {
        wx.showToast({
          title: '未设置上传地址',
          icon: 'none'
        });
        return Promise.reject(new Error('未设置上传地址'));
      }
      
      // 检查网络状态
      if (this.data.networkType === 'none') {
        wx.showToast({
          title: '当前无网络连接，请稍后重试',
          icon: 'none'
        });
        return Promise.reject(new Error('当前无网络连接'));
      }
      
      // 设置上传状态
      this.setData({
        status: 'uploading',
        uploadProgress: 0
      });
      
      // 准备上传任务
      const uploadTasks = this.data.photoList.map((photo, index) => {
        return {
          path: photo.path,
          url: this.data.uploadUrl,
          formData: {
            ...this.data.uploadParams,
            index: index,
            timestamp: photo.timestamp
          },
          onProgress: (progress) => {
            // 更新单张照片的上传进度
            const newList = [...this.data.photoList];
            newList[index] = {
              ...newList[index],
              uploadProgress: progress
            };
            
            // 计算总进度
            let totalProgress = 0;
            newList.forEach(p => {
              totalProgress += (p.uploadProgress || 0);
            });
            totalProgress = Math.floor(totalProgress / newList.length);
            
            this.setData({
              photoList: newList,
              uploadProgress: totalProgress
            });
          }
        };
      });
      
      // 开始上传
      return this._photoBatchProcessor.uploadPhotos(uploadTasks, {
        compressBeforeUpload: this.data.networkType !== 'wifi',
        quality: this.data.networkType === '2g' ? 0.6 : 0.8,
        retry: 2
      })
      .then(result => {
        // 更新照片上传状态
        const newList = [...this.data.photoList];
        result.results.forEach((res, index) => {
          if (res.success) {
            newList[index] = {
              ...newList[index],
              uploaded: true,
              uploadResult: res.data,
              uploadProgress: 100
            };
          } else {
            newList[index] = {
              ...newList[index],
              uploadError: res.errorMsg,
              uploadProgress: 0
            };
          }
        });
        
        this.setData({
          photoList: newList,
          status: 'idle',
          uploadProgress: 100
        });
        
        // 检查结果
        const successCount = result.results.filter(res => res.success).length;
        const totalCount = result.results.length;
        
        // 短时间后隐藏进度
        setTimeout(() => {
          this.setData({
            uploadProgress: 0
          });
          
          if (successCount === totalCount) {
            wx.showToast({
              title: '上传成功',
              icon: 'success'
            });
            
            // 通知外部
            this.triggerEvent('upload', { 
              success: true, 
              results: result.results 
            });
            
            // 如果需要自动关闭
            if (autoClose) {
              setTimeout(() => {
                this.hideCamera();
              }, 1500);
            }
          } else {
            wx.showToast({
              title: `上传完成，${successCount}/${totalCount}个成功`,
              icon: 'none'
            });
            
            // 通知外部
            this.triggerEvent('upload', { 
              success: false, 
              results: result.results,
              successCount,
              totalCount
            });
          }
        }, 500);
        
        return result;
      })
      .catch(err => {
        console.error('上传照片失败:', err);
        this.setData({
          status: 'idle',
          uploadProgress: 0
        });
        
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        });
        
        // 通知外部
        this.triggerEvent('upload', { 
          success: false, 
          error: err
        });
        
        return Promise.reject(err);
      });
    },
    
    /**
     * 清空照片
     */
    clearPhotos() {
      if (this.data.photoList.length === 0) {
        return;
      }
      
      wx.showModal({
        title: '提示',
        content: '确定要清空所有照片吗？',
        success: (res) => {
          if (res.confirm) {
            const oldList = [...this.data.photoList];
            
            this.setData({
              photoList: []
            });
            
            // 通知外部
            this.triggerEvent('clear', { photos: oldList });
            
            // 清理缓存
            if (this.data.autoOptimize) {
              this._photoLoader.clearCache();
            }
          }
        }
      });
    },
    
    /**
     * 切换相机位置
     */
    switchCamera() {
      const newPosition = this.data.cameraPosition === 'back' ? 'front' : 'back';
      
      this.setData({
        cameraPosition: newPosition
      });
      
      // 通知外部
      this.triggerEvent('switch', { position: newPosition });
    },
    
    /**
     * 设置内存警告监听
     * @private
     */
    _setupMemoryWarning() {
      wx.onMemoryWarning(res => {
        console.warn(`内存警告，级别: ${res.level}`);
        
        this.setData({
          memoryWarningLevel: res.level
        });
        
        // 处理内存警告
        if (this.data.autoOptimize) {
          if (res.level >= 10) {
            // 轻微警告，清理未使用的缓存
            this._photoLoader.clearUnusedCache();
          }
          
          if (res.level >= 15) {
            // 中度警告，更激进地清理缓存
            this._photoLoader.clearCache(true);
          }
          
          if (res.level >= 20) {
            // 严重警告，执行紧急清理
            this._photoLoader.emergencyCleanup();
            
            // 显示提示
            wx.showToast({
              title: '内存不足，已释放部分资源',
              icon: 'none'
            });
          }
        }
        
        // 通知外部
        this.triggerEvent('memorywarning', { level: res.level });
      });
    },
    
    /**
     * 处理网络变化
     * @param {Object} res 网络状态
     * @private
     */
    _handleNetworkChange(res) {
      // 更新网络状态
      this.setData({
        networkType: res.networkType
      });
      
      // 通知外部
      this.triggerEvent('networkchange', { networkType: res.networkType });
      
      // 根据网络状态调整拍照质量
      if (res.networkType === '2g' || res.networkType === 'none') {
        // 弱网环境下降低照片质量
        if (this.data.photoQuality > 0.7) {
          this.setData({
            photoQuality: 0.7
          });
        }
      }
    },
    
    /**
     * 更新网络状态
     * @private
     */
    _updateNetworkStatus() {
      wx.getNetworkType({
        success: (res) => {
          this._handleNetworkChange(res);
        }
      });
    },
    
    /**
     * 清理资源
     * @private
     */
    _cleanup() {
      // 停止相机
      this._stopCamera();
      
      // 销毁加载器
      if (this._photoLoader) {
        this._photoLoader.destroy();
      }
      
      // 销毁批处理器
      if (this._photoBatchProcessor) {
        this._photoBatchProcessor.destroy();
      }
      
      // 取消网络状态监听
      if (this._networkMonitor) {
        this._networkMonitor.offNetworkStatusChange(this._handleNetworkChange);
      }
      
      console.log('[OptimizedPhotoCapture] 组件已销毁，资源已释放');
    }
  }
}); 