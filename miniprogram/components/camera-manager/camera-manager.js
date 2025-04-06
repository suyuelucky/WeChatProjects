/**
 * 相机管理组件
 * 负责处理相机调用、权限管理、拍照逻辑和模式切换等功能
 */
var EventBus = require('../../utils/eventBus.js');

// 导入安全过滤器和照片元数据净化工具
const SecurityFilter = require('../../utils/security-filter.js');
const PhotoMetadataCleaner = require('../../utils/photo-metadata-cleaner.js');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 初始模式: normal(普通), continuous(连拍), timer(定时)
    initialMode: {
      type: String,
      value: 'normal'
    },
    // 照片分辨率: low, medium, high
    resolution: {
      type: String,
      value: 'medium'
    },
    // 是否显示控制按钮
    showControls: {
      type: Boolean,
      value: true
    },
    // 定时器延迟(秒)
    timerDelay: {
      type: Number,
      value: 3
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 相机状态
    isReady: false,
    hasPermission: false,
    devicePosition: 'back', // front或back
    flashMode: 'auto',      // auto, on, off
    currentMode: 'normal',  // normal, continuous, timer
    
    // 拍照状态
    isTakingPhoto: false,
    isCountingDown: false,
    countdownNumber: 0,
    
    // 连拍状态
    isContinuous: false,
    continuousCount: 0,
    
    // 照片管理
    photoList: []
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      // 设置初始模式
      this.setData({
        currentMode: this.properties.initialMode
      });
      
      // 检查相机权限
      this.checkCameraPermission();
      
      // 注册内存警告监听
      this._setupMemoryWarning();
    },
    
    detached: function() {
      // 清理资源
      this.stopContinuousCapture();
      this.stopCountdown();
      
      // 取消内存警告监听
      if (this._memoryWarningCallback) {
        wx.offMemoryWarning(this._memoryWarningCallback);
        this._memoryWarningCallback = null;
      }
      
      // 清理临时文件
      this._cleanupTempFiles();
      
      // 释放相机资源
      if (this.cameraContext) {
        this.cameraContext = null;
      }
    }
  },

  /**
   * 组件方法列表
   */
  methods: {
    /**
     * 检查相机权限
     * @private
     */
    checkCameraPermission: function() {
      var that = this;
      
      wx.getSetting({
        success: function(res) {
          if (res.authSetting['scope.camera']) {
            // 已授权
            that.setData({
              hasPermission: true
            });
            
            // 初始化相机
            that.initCamera();
          } else if (res.authSetting['scope.camera'] === false) {
            // 已拒绝授权
            that.setData({
              hasPermission: false
            });
            
            // 触发权限拒绝事件
            that.triggerEvent('permissionDenied');
          } else {
            // 首次使用，请求授权
            wx.authorize({
              scope: 'scope.camera',
              success: function() {
                that.setData({
                  hasPermission: true
                });
                
                // 初始化相机
                that.initCamera();
              },
              fail: function() {
                that.setData({
                  hasPermission: false
                });
                
                // 触发权限拒绝事件
                that.triggerEvent('permissionDenied');
              }
            });
          }
        }
      });
    },
    
    /**
     * 初始化相机
     * @private
     */
    initCamera: function() {
      if (!this.data.hasPermission) {
        return;
      }
      
      // 初始化相机上下文
      this.cameraContext = wx.createCameraContext(this);
      
      // 标记相机就绪
      this.setData({
        isReady: true
      });
      
      // 触发相机就绪事件
      this.triggerEvent('cameraReady');
    },
    
    /**
     * 切换前后摄像头
     */
    switchCamera: function() {
      if (!this.data.isReady || this.data.isTakingPhoto) {
        return;
      }
      
      this.setData({
        devicePosition: this.data.devicePosition === 'back' ? 'front' : 'back'
      });
    },
    
    /**
     * 切换闪光灯模式
     */
    switchFlash: function() {
      if (!this.data.isReady || this.data.isTakingPhoto) {
        return;
      }
      
      // 循环切换闪光灯模式
      var modes = ['auto', 'on', 'off'];
      var currentIndex = modes.indexOf(this.data.flashMode);
      var nextIndex = (currentIndex + 1) % modes.length;
      
      this.setData({
        flashMode: modes[nextIndex]
      });
    },
    
    /**
     * 切换拍照模式
     * @param {string} mode 模式名称
     */
    switchMode: function(mode) {
      if (!this.data.isReady || this.data.isTakingPhoto) {
        return;
      }
      
      // 停止当前模式的相关操作
      this.stopContinuousCapture();
      this.stopCountdown();
      
      // 设置新模式
      var newMode = mode;
      if (typeof mode === 'object') {
        // 事件对象处理
        newMode = mode.currentTarget.dataset.mode;
      }
      
      this.setData({
        currentMode: newMode
      });
    },
    
    /**
     * 处理拍照按钮点击
     */
    handleCaptureClick: function() {
      if (!this.data.isReady || this.data.isTakingPhoto) {
        return;
      }
      
      switch (this.data.currentMode) {
        case 'normal':
          this.takePhoto();
          break;
        case 'continuous':
          if (this.data.isContinuous) {
            this.stopContinuousCapture();
          } else {
            this.startContinuousCapture();
          }
          break;
        case 'timer':
          if (this.data.isCountingDown) {
            this.stopCountdown();
          } else {
            this.startCountdown();
          }
          break;
      }
    },
    
    /**
     * 拍照核心方法 - 已优化以解决内存问题
     */
    takePhoto: function() {
      if (this.data.isTakingPhoto) return;
      
      this.setData({ isTakingPhoto: true });
      
      // 获取照片质量级别 - 根据分辨率正确设置
      const qualityMapping = {
        low: 'low',
        medium: 'medium',
        high: 'high'
      };
      const quality = qualityMapping[this.properties.resolution] || 'medium';

      // 拍照前检查内存状态      
      this._checkMemoryBeforeCapture()
        .then(() => {
          // 调用相机接口
          if (!this.cameraContext) {
            this.initCamera();
            if (!this.cameraContext) {
              throw new Error('相机未初始化');
            }
          }
          
          this.cameraContext.takePhoto({
            quality: quality,
            success: (res) => {
              try {
                console.log('拍照成功:', res.tempImagePath);
                
                // 处理照片（安全清理和添加元数据）
                this._processPhoto(res.tempImagePath)
                  .then((photoInfo) => {
                    // 触发拍照成功事件
                    this.triggerEvent('photoTaken', { photo: photoInfo });
                    
                    // 添加到本地照片列表 - 最多保留最近10张照片
                    const updatedList = this.data.photoList.concat(photoInfo);
                    const limitedList = updatedList.length > 10 ? updatedList.slice(-10) : updatedList;
                    
                    this.setData({ 
                      photoList: limitedList,
                      isTakingPhoto: false 
                    });
                  })
                  .catch((err) => {
                    console.error('处理照片失败:', err);
                    wx.showToast({
                      title: '照片处理失败',
                      icon: 'none'
                    });
                    this.setData({ isTakingPhoto: false });
                  });
              } catch (error) {
                console.error('拍照处理异常:', error);
                this.setData({ isTakingPhoto: false });
              }
            },
            fail: (err) => {
              console.error('拍照失败:', err);
              this.triggerEvent('error', { error: err });
              
              wx.showToast({
                title: '拍照失败',
                icon: 'none'
              });
              this.setData({ isTakingPhoto: false });
            }
          });
        })
        .catch(err => {
          console.error('拍照前内存检查失败:', err);
          this.setData({ isTakingPhoto: false });
          wx.showToast({
            title: err.message || '内存不足',
            icon: 'none'
          });
        });
    },
    
    /**
     * 处理拍摄的照片
     * @param {String} tempImagePath 临时图片路径
     * @returns {Promise<Object>} 处理后的照片信息
     * @private
     */
    _processPhoto: function(tempImagePath) {
      return new Promise((resolve, reject) => {
        // 获取图片信息
        wx.getImageInfo({
          src: tempImagePath,
          success: (imageInfo) => {
            // 创建照片对象
            var photo = {
              id: 'photo_' + Date.now(),
              path: tempImagePath,
              width: imageInfo.width,
              height: imageInfo.height,
              orientation: imageInfo.orientation,
              type: 'image',
              size: 0, // 先默认为0，后续可能会更新
              createdAt: new Date().toISOString(),
              status: 'temp'
            };
            
            // 使用PhotoMetadataCleaner清理元数据
            photo = PhotoMetadataCleaner.cleanMetadata(photo);
            
            // 安全处理文件名
            photo.fileName = PhotoMetadataCleaner.generateSafeFileName(photo);
            
            resolve(photo);
          },
          fail: (err) => {
            console.error('获取图片信息失败:', err);
            reject(err);
          }
        });
      });
    },
    
    /**
     * 拍照前检查内存状态
     * @returns {Promise<void>}
     * @private
     */
    _checkMemoryBeforeCapture: function() {
      return new Promise((resolve, reject) => {
        // 检查本地存储空间
        wx.getStorageInfo({
          success: (res) => {
            const availableSize = res.limitSize - res.currentSize;
            
            // 如果可用空间小于20MB，提示用户
            if (availableSize < 20 * 1024) {
              reject(new Error('存储空间不足，请清理空间'));
              return;
            }
            
            resolve();
          },
          fail: (err) => {
            console.error('获取存储信息失败:', err);
            // 出错时仍然允许继续，但记录错误
            resolve();
          }
        });
      });
    },
    
    /**
     * 清理临时文件 - 增强版
     * @private
     */
    _cleanupTempFiles: function() {
      try {
        // 获取所有照片的临时路径
        const tempFilePaths = this.data.photoList
          .filter(photo => photo.path && photo.path.indexOf('tmp') !== -1)
          .map(photo => photo.path);
        
        if (tempFilePaths.length === 0) return;
        
        // 获取文件系统管理器
        const fs = wx.getFileSystemManager();
        
        // 删除所有临时文件
        tempFilePaths.forEach(path => {
          try {
            fs.unlink({
              filePath: path,
              fail: (err) => {
                console.warn('删除临时文件失败:', err);
              }
            });
          } catch (e) {
            console.error('清理临时文件出错:', e);
          }
        });
        
        // 清空照片列表
        this.setData({
          photoList: []
        });
        
        console.log('临时文件清理完成');
      } catch (err) {
        console.error('清理临时文件过程出错:', err);
      }
    },
    
    /**
     * 开始倒计时拍照
     */
    startCountdown: function() {
      if (this.data.isCountingDown) return;
      
      this.setData({
        isCountingDown: true,
        countdownNumber: this.properties.timerDelay
      });
      
      var that = this;
      this._countdownTimer = setInterval(function() {
        var newCount = that.data.countdownNumber - 1;
        
        if (newCount <= 0) {
          // 倒计时结束，拍照
          that.stopCountdown();
          that.takePhoto();
        } else {
          that.setData({
            countdownNumber: newCount
          });
        }
      }, 1000);
      
      // 触发倒计时开始事件
      this.triggerEvent('timerStarted');
    },
    
    /**
     * 停止倒计时
     */
    stopCountdown: function() {
      if (this._countdownTimer) {
        clearInterval(this._countdownTimer);
        this._countdownTimer = null;
      }
      
      this.setData({
        isCountingDown: false,
        countdownNumber: 0
      });
      
      // 触发倒计时结束事件
      this.triggerEvent('timerStopped');
    },
    
    /**
     * 开始连拍
     */
    startContinuousCapture: function() {
      if (this._continuousInterval) return;
      
      this.setData({
        isContinuous: true,
        continuousCount: 0
      });
      
      var that = this;
      // 每0.8秒拍一张照片
      this._continuousInterval = setInterval(function() {
        that.takePhoto();
        that.setData({
          continuousCount: that.data.continuousCount + 1
        });
        
        // 如果连拍超过10张，自动停止
        if (that.data.continuousCount >= 10) {
          that.stopContinuousCapture();
        }
      }, 800);
      
      // 触发连拍开始事件
      this.triggerEvent('continuousStarted');
    },
    
    /**
     * 停止连拍
     */
    stopContinuousCapture: function() {
      if (this._continuousInterval) {
        clearInterval(this._continuousInterval);
        this._continuousInterval = null;
      }
      
      this.setData({
        isContinuous: false
      });
      
      // 触发连拍结束事件
      this.triggerEvent('continuousStopped', {
        count: this.data.continuousCount
      });
    },
    
    /**
     * 处理相机错误
     */
    handleCameraError: function(e) {
      console.error('Camera error:', e.detail);
      this.triggerEvent('cameraError', {
        error: e.detail
      });
    },
    
    /**
     * 获取所有拍摄的照片
     */
    getPhotoList: function() {
      return this.data.photoList;
    },
    
    /**
     * 清空照片列表
     */
    clearPhotoList: function() {
      this.setData({
        photoList: []
      });
    },
    
    /**
     * 设置内存警告监听 - 改进版
     * @private
     */
    _setupMemoryWarning: function() {
      this._memoryWarningCallback = (res) => {
        console.warn(`[相机组件] 收到内存警告，级别: ${res.level}`);
        
        // 按内存警告级别采取不同措施
        if (res.level >= 10) {
          // 严重内存不足，停止所有相机活动
          this.stopContinuousCapture();
          this.stopCountdown();
          this._cleanupTempFiles();
          
          wx.showToast({
            title: '内存严重不足，已释放资源',
            icon: 'none',
            duration: 2000
          });
        } else if (res.level >= 5) {
          // 中度内存不足，停止连拍等高内存消耗操作
          if (this.data.isContinuous) {
            this.stopContinuousCapture();
            wx.showToast({
              title: '内存不足，已停止连拍',
              icon: 'none'
            });
          }
          
          // 清理部分临时资源
          this._partialCleanup();
        } else {
          // 轻度内存警告，清理不必要的缓存
          this._partialCleanup();
        }
      };
      
      // 注册内存警告监听
      wx.onMemoryWarning(this._memoryWarningCallback);
    },
    
    /**
     * 部分清理资源
     * @private
     */
    _partialCleanup: function() {
      // 仅保留最近3张照片
      if (this.data.photoList.length > 3) {
        const oldPhotos = this.data.photoList.slice(0, this.data.photoList.length - 3);
        
        // 删除旧的临时文件
        oldPhotos.forEach(photo => {
          if (photo.path && photo.path.indexOf('tmp') !== -1) {
            try {
              wx.getFileSystemManager().unlink({
                filePath: photo.path,
                fail: (err) => {
                  console.warn('删除临时文件失败:', err);
                }
              });
            } catch (e) {
              console.error('清理临时文件出错:', e);
            }
          }
        });
        
        // 更新照片列表，只保留最近3张
        this.setData({
          photoList: this.data.photoList.slice(-3)
        });
        
        console.log('已清理部分临时文件，保留最近3张');
      }
    }
  }
}); 