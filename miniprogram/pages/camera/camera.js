const app = getApp();
const ErrorCollector = require('../../utils/error-collector.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    hasCamera: false,
    cameraReady: false,
    currentMode: 'normal', // normal, continuous, timer
    flashMode: 'auto',
    devicePosition: 'back',
    showControls: true,
    timerDelay: 3,
    isPreviewMode: false,
    photoList: [],
    isLoading: true,
    
    // 错误状态
    hasError: false,
    errorMessage: '',
    isRecoveringFromError: false,
    
    // 诊断状态
    diagnosisOn: false,
    diagnosisResults: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 记录页面加载
    ErrorCollector.reportWarning('camera-page', '相机页面加载', { options });
    
    try {
      // 获取设备信息
      this.systemInfo = app.globalData.systemInfo || wx.getSystemInfoSync();
      
      // 根据性能调整相机参数
      this._adjustCameraSettings();
      
      // 设置相机参数
      this.setData({
        isLoading: true,
        hasCamera: false,
        // 根据传入选项设置初始模式
        currentMode: options.mode || 'normal',
        // 根据设备性能调整选项
        enableDiagnostics: true  // 开启诊断
      });
    } catch (err) {
      ErrorCollector.reportError('camera-page-load', '加载相机页面出错', { error: err });
      this.setData({
        hasError: true,
        errorMessage: '初始化相机失败: ' + (err.message || '未知错误')
      });
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    // 页面渲染完成后再初始化相机，以提高性能
    setTimeout(() => {
      this.setData({
        isLoading: false
      });
    }, 500);
    
    // 设置错误处理
    this._setupErrorHandling();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 记录页面显示
    ErrorCollector.reportWarning('camera-page', '相机页面显示');
    
    // 恢复相机
    if (this.data.hasCamera && !this.data.cameraReady) {
      this.setData({
        isLoading: true
      });
      
      // 延迟重新初始化相机
      setTimeout(() => {
        this.setData({
          isLoading: false
        });
      }, 500);
    }
    
    // 检查小程序环境和权限
    this._checkEnvironment();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    // 记录页面隐藏
    ErrorCollector.reportWarning('camera-page', '相机页面隐藏');
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    // 记录页面卸载
    ErrorCollector.reportWarning('camera-page', '相机页面卸载');
    
    // 清理资源
    this._cleanupTemporaryFiles();
  },
  
  /**
   * 相机组件就绪处理
   */
  handleCameraReady: function(e) {
    this.setData({
      cameraReady: true,
      hasCamera: true,
      hasError: false,
      errorMessage: ''
    });
    
    ErrorCollector.reportWarning('camera-page', '相机组件已就绪');
  },
  
  /**
   * 相机权限被拒绝处理
   */
  handlePermissionDenied: function(e) {
    this.setData({
      hasCamera: false,
      cameraReady: false,
      hasError: true,
      errorMessage: '相机权限被拒绝，请在设置中允许小程序使用相机'
    });
    
    ErrorCollector.reportFeatureUnavailable('camera-permission', '相机权限被拒绝');
    
    // 显示提示，引导用户开启权限
    wx.showModal({
      title: '需要相机权限',
      content: '请允许使用相机权限，以便拍照',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          // 跳转到设置页面
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.camera']) {
                // 用户授权了，重新加载页面
                this.setData({
                  hasCamera: true,
                  cameraReady: false,
                  hasError: false,
                  isLoading: true
                });
                
                // 延迟重新初始化
                setTimeout(() => {
                  this.setData({
                    isLoading: false
                  });
                }, 500);
                
                ErrorCollector.reportWarning('camera-permission', '用户已授权相机权限');
              }
            }
          });
        }
      }
    });
  },
  
  /**
   * 拍照完成处理
   */
  handlePhotoTaken: function(e) {
    const photo = e.detail.photo;
    
    // 添加到照片列表
    const updatedList = this.data.photoList.concat(photo);
    
    this.setData({
      photoList: updatedList,
      isRecoveringFromError: false
    });
    
    ErrorCollector.reportWarning('camera-page', '拍照成功', { photoPath: photo.path });
  },
  
  /**
   * 相机错误处理
   */
  handleCameraError: function(e) {
    const error = e.detail.error;
    
    ErrorCollector.reportError('camera-error', '相机出错', { error });
    
    this.setData({
      hasError: true,
      errorMessage: '相机出错: ' + (error.errMsg || '未知错误'),
      isRecoveringFromError: false
    });
    
    // 尝试恢复
    this._recoverFromError();
  },
  
  /**
   * 拍照按钮点击
   */
  handleTakePhoto: function() {
    // 获取相机组件引用
    const cameraComponent = this.selectComponent('#cameraManager');
    if (cameraComponent) {
      // 调用组件的拍照方法
      cameraComponent.takePhoto();
    } else {
      ErrorCollector.reportError('camera-page', '无法获取相机组件引用');
      
      this.setData({
        hasError: true,
        errorMessage: '相机组件未找到'
      });
    }
  },
  
  /**
   * 切换闪光灯
   */
  toggleFlash: function() {
    const modes = ['auto', 'on', 'off'];
    const currentIndex = modes.indexOf(this.data.flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    
    this.setData({
      flashMode: modes[nextIndex]
    });
    
    ErrorCollector.reportWarning('camera-page', '切换闪光灯模式', { mode: modes[nextIndex] });
  },
  
  /**
   * 切换相机方向
   */
  toggleCameraPosition: function() {
    const newPosition = this.data.devicePosition === 'back' ? 'front' : 'back';
    
    this.setData({
      devicePosition: newPosition
    });
    
    ErrorCollector.reportWarning('camera-page', '切换相机方向', { position: newPosition });
  },
  
  /**
   * 切换相机模式
   */
  changeMode: function(e) {
    const mode = e.currentTarget.dataset.mode;
    
    this.setData({
      currentMode: mode
    });
    
    ErrorCollector.reportWarning('camera-page', '切换相机模式', { mode });
  },
  
  /**
   * 预览照片
   */
  previewPhoto: function(e) {
    const index = e.currentTarget.dataset.index;
    const photos = this.data.photoList;
    
    if (index >= 0 && index < photos.length) {
      const current = photos[index].path;
      const urls = photos.map(photo => photo.path);
      
      wx.previewImage({
        current: current,
        urls: urls,
        fail: (err) => {
          ErrorCollector.reportError('photo-preview', '预览照片失败', { error: err });
          wx.showToast({
            title: '预览失败',
            icon: 'none'
          });
        }
      });
    }
  },
  
  /**
   * 重试按钮点击
   */
  handleRetry: function() {
    // 标记正在恢复
    this.setData({
      isRecoveringFromError: true,
      hasError: false,
      errorMessage: '',
      isLoading: true
    });
    
    ErrorCollector.reportWarning('camera-page', '用户触发重试');
    
    // 尝试恢复相机
    this._recoverFromError();
    
    // 延迟重新初始化
    setTimeout(() => {
      this.setData({
        isLoading: false
      });
      
      // 获取相机组件引用
      const cameraComponent = this.selectComponent('#cameraManager');
      if (cameraComponent) {
        // 调用组件的自我修复方法
        cameraComponent.selfRepair();
      }
    }, 1000);
  },
  
  /**
   * 运行相机诊断
   */
  runDiagnosis: function() {
    // 切换诊断状态
    this.setData({
      diagnosisOn: !this.data.diagnosisOn
    });
    
    // 如果打开诊断，获取诊断报告
    if (this.data.diagnosisOn) {
      ErrorCollector.reportWarning('camera-page', '开始运行相机诊断');
      
      // 获取相机组件引用
      const cameraComponent = this.selectComponent('#cameraManager');
      if (cameraComponent) {
        // 获取诊断报告
        const report = cameraComponent.getDiagnosticReport();
        
        this.setData({
          diagnosisResults: report
        });
        
        // 记录诊断结果
        ErrorCollector.reportWarning('camera-diagnosis', '相机诊断结果', { 
          isReady: report.camera.isReady,
          hasPermission: report.camera.hasPermission,
          errors: report.diagnostics.errors
        });
      } else {
        this.setData({
          diagnosisResults: {
            error: true,
            message: '无法获取相机组件引用'
          }
        });
      }
    } else {
      // 关闭诊断
      this.setData({
        diagnosisResults: null
      });
    }
  },
  
  /**
   * 根据设备性能调整相机设置
   * @private
   */
  _adjustCameraSettings: function() {
    try {
      // 获取全局设置
      const settings = app.globalData.settings || {};
      const performanceLevel = app.globalData.performanceLevel || 'medium';
      
      // 根据性能级别设置相机参数
      let resolution = 'medium';
      let maxPhotos = 10;
      
      switch (performanceLevel) {
        case 'high':
          resolution = 'high';
          maxPhotos = 20;
          break;
        case 'medium':
          resolution = 'medium';
          maxPhotos = 10;
          break;
        case 'low':
          resolution = 'low';
          maxPhotos = 5;
          break;
      }
      
      // 更新数据
      this.setData({
        resolution: resolution,
        maxContinuousPhotos: maxPhotos
      });
      
      ErrorCollector.reportWarning('camera-settings', '相机设置已调整', { 
        resolution,
        maxPhotos,
        performanceLevel
      });
    } catch (err) {
      ErrorCollector.reportError('camera-settings', '调整相机设置出错', { error: err });
    }
  },
  
  /**
   * 检查小程序环境和权限
   * @private
   */
  _checkEnvironment: function() {
    try {
      // 检查设备是否支持相机
      if (this.systemInfo && (this.systemInfo.platform === 'devtools')) {
        // 开发工具中，模拟相机可用
        ErrorCollector.reportWarning('camera-env', '在开发工具中使用相机模拟');
      } else if (this.systemInfo && this.systemInfo.SDKVersion) {
        // 检查SDK版本是否支持相机
        const version = this.systemInfo.SDKVersion;
        const hasCamera = compareVersion(version, '2.10.0') >= 0;
        
        if (!hasCamera) {
          ErrorCollector.reportFeatureUnavailable('camera-sdk', 'SDK版本过低，不支持相机功能', { 
            version: version 
          });
          
          this.setData({
            hasError: true,
            errorMessage: '当前微信版本过低，请升级微信后再使用'
          });
        }
      }
    } catch (err) {
      ErrorCollector.reportError('camera-env', '检查相机环境出错', { error: err });
    }
    
    // 检查存储空间
    this._checkStorageSpace();
  },
  
  /**
   * 检查存储空间
   * @private
   */
  _checkStorageSpace: function() {
    try {
      wx.getStorageInfo({
        success: (res) => {
          const limitSize = res.limitSize || 0;
          const currentSize = res.currentSize || 0;
          
          // 如果已使用存储空间超过80%，显示警告
          if (limitSize > 0 && (currentSize / limitSize > 0.8)) {
            wx.showToast({
              title: '存储空间不足，请清理',
              icon: 'none',
              duration: 3000
            });
            
            ErrorCollector.reportWarning('camera-storage', '存储空间不足', { 
              currentSize: currentSize,
              limitSize: limitSize,
              usageRatio: (currentSize / limitSize).toFixed(2)
            });
          }
        },
        fail: (err) => {
          ErrorCollector.reportError('camera-storage', '获取存储信息失败', { error: err });
        }
      });
    } catch (err) {
      ErrorCollector.reportError('camera-storage', '检查存储空间出错', { error: err });
    }
  },
  
  /**
   * 设置错误处理
   * @private
   */
  _setupErrorHandling: function() {
    // 原始方法的错误监听
    const originalTakePhoto = this.handleTakePhoto;
    
    // 替换为包装后的方法
    this.handleTakePhoto = ErrorCollector.wrapWithErrorHandler(originalTakePhoto, 'camera-take-photo');
    
    // 其他方法同理
    this.toggleFlash = ErrorCollector.wrapWithErrorHandler(this.toggleFlash, 'camera-toggle-flash');
    this.toggleCameraPosition = ErrorCollector.wrapWithErrorHandler(this.toggleCameraPosition, 'camera-toggle-position');
  },
  
  /**
   * 从错误状态恢复
   * @private
   */
  _recoverFromError: function() {
    try {
      // 获取相机组件引用
      const cameraComponent = this.selectComponent('#cameraManager');
      
      if (cameraComponent) {
        // 如果是拍照错误，调用重试方法
        cameraComponent.retryPhoto();
      }
      
      // 延迟后检查恢复状态
      setTimeout(() => {
        if (this.data.isRecoveringFromError) {
          // 还在恢复中，尝试重新初始化相机
          this.setData({
            cameraReady: false,
            isLoading: true
          });
          
          // 再次延迟
          setTimeout(() => {
            this.setData({
              isLoading: false,
              isRecoveringFromError: false
            });
          }, 1000);
        }
      }, 3000);
    } catch (err) {
      ErrorCollector.reportError('camera-recovery', '从错误恢复出错', { error: err });
      
      // 回退到错误状态
      this.setData({
        hasError: true,
        errorMessage: '恢复失败: ' + (err.message || '未知错误'),
        isRecoveringFromError: false
      });
    }
  },
  
  /**
   * 清理临时文件
   * @private
   */
  _cleanupTemporaryFiles: function() {
    try {
      // 获取存储管理器
      const storageManager = app.storageManager;
      
      if (storageManager) {
        // 清理临时存储
        storageManager.cleanup(storageManager.STORAGE_TYPES.TEMP);
      }
    } catch (err) {
      ErrorCollector.reportError('camera-cleanup', '清理临时文件出错', { error: err });
    }
  }
});

/**
 * 比较版本号
 * @param {string} v1 版本号1
 * @param {string} v2 版本号2
 * @returns {number} 0: 相等, 1: v1大, -1: v2大
 */
function compareVersion(v1, v2) {
  v1 = v1.split('.');
  v2 = v2.split('.');
  const len = Math.max(v1.length, v2.length);
  
  while (v1.length < len) {
    v1.push('0');
  }
  while (v2.length < len) {
    v2.push('0');
  }
  
  for (let i = 0; i < len; i++) {
    const num1 = parseInt(v1[i]);
    const num2 = parseInt(v2[i]);
    
    if (num1 > num2) {
      return 1;
    } else if (num1 < num2) {
      return -1;
    }
  }
  
  return 0;
} 