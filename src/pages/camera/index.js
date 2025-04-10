/**
 * 相机页面
 * 演示B1基础照片采集模块的使用
 */

const { log, reportError } = require('../../utils/logger');
const { checkStorageSpace, clearTempCache } = require('../../utils/storageHelper');

Page({
  data: {
    hasError: false,
    errorMessage: '',
    isReady: false,
    spaceInfo: null
  },
  
  // 页面加载时执行
  onLoad: function(options) {
    log('相机页面加载');
  },
  
  // 页面显示时执行
  onShow: function() {
    log('相机页面显示');
    this._checkStorageSpace();
  },
  
  // 页面隐藏时执行
  onHide: function() {
    log('相机页面隐藏');
  },
  
  // 页面卸载时执行
  onUnload: function() {
    log('相机页面卸载');
    clearTempCache()
      .then(() => {
        log('临时缓存已清理');
      })
      .catch((error) => {
        reportError('清理缓存失败', error);
      });
  },
  
  /**
   * 检查存储空间
   * @private
   */
  _checkStorageSpace: function() {
    checkStorageSpace()
      .then(spaceInfo => {
        this.setData({ spaceInfo });
        
        // 检查存储空间是否不足
        if (spaceInfo.freeSize < 5 * 1024) { // 小于5MB时警告
          wx.showToast({
            title: '存储空间不足',
            icon: 'none',
            duration: 2000
          });
        }
      })
      .catch(error => {
        reportError('获取存储空间信息失败', error);
      });
  },
  
  /**
   * 相机组件准备就绪事件处理
   */
  handleCameraReady: function() {
    log('相机已准备就绪');
    this.setData({ isReady: true });
  },
  
  /**
   * 相机组件错误事件处理
   */
  handleCameraError: function(e) {
    const error = e.detail.message || '相机初始化失败';
    reportError('相机错误', error);
    
    this.setData({
      hasError: true,
      errorMessage: error
    });
    
    wx.showModal({
      title: '相机错误',
      content: error,
      showCancel: false
    });
  },
  
  /**
   * 拍照成功事件处理
   */
  handleCapturePhoto: function(e) {
    const photo = e.detail.photo;
    log('拍照成功: ' + photo.compressedPath);
    
    wx.showToast({
      title: '拍照成功',
      icon: 'success',
      duration: 1500
    });
  },
  
  /**
   * 保存照片事件处理
   */
  handleSavePhoto: function(e) {
    const photo = e.detail.photo;
    log('照片已保存: ' + photo.savedPath);
    
    wx.showToast({
      title: '照片已保存',
      icon: 'success',
      duration: 1500
    });
  },
  
  /**
   * 切换相机事件处理
   */
  handleSwitchCamera: function(e) {
    const position = e.detail.position;
    log('相机切换为: ' + position);
  },
  
  /**
   * 闪光灯变更事件处理
   */
  handleFlashChange: function(e) {
    const mode = e.detail.mode;
    log('闪光灯模式: ' + mode);
  },
  
  /**
   * 用户点击拍照按钮
   */
  handleTapTakePhoto: function() {
    if (!this.data.isReady) {
      return;
    }
    
    // 获取相机组件实例
    const cameraComponent = this.selectComponent('#photoCapture');
    if (cameraComponent) {
      cameraComponent.takePhoto();
    }
  },
  
  /**
   * 用户点击切换相机按钮
   */
  handleTapSwitchCamera: function() {
    if (!this.data.isReady) {
      return;
    }
    
    // 获取相机组件实例
    const cameraComponent = this.selectComponent('#photoCapture');
    if (cameraComponent) {
      cameraComponent.switchCamera();
    }
  },
  
  /**
   * 用户点击切换闪光灯按钮
   */
  handleTapSwitchFlash: function() {
    if (!this.data.isReady) {
      return;
    }
    
    // 获取相机组件实例
    const cameraComponent = this.selectComponent('#photoCapture');
    if (cameraComponent) {
      cameraComponent.switchFlash();
    }
  },
  
  /**
   * 返回上一页
   */
  handleBack: function() {
    wx.navigateBack({
      delta: 1
    });
  }
}); 