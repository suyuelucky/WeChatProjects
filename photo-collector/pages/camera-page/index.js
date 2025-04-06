// pages/camera-page/index.js
// 引入工具模块
var imageCompressor = require('../../utils/image-compressor');
var photoStorage = require('../../utils/photo-storage');

Page({
  data: {
    // 相机设置
    devicePosition: 'back',  // 'front' 或 'back'
    flash: 'auto',  // 'auto', 'on', 'off'
    resolution: 'medium',  // 'low', 'medium', 'high'
    
    // 状态控制
    isReady: false,
    isTaking: false,
    hasError: false,
    errorMsg: '',
    
    // 拍照后的图片
    tempImagePath: '',
    showPreview: false,
    
    // 工作模式相关
    cameraMode: 'normal',  // 'normal', 'continuous', 'timer'
    modeTitle: '照片采集',
    projectId: '', // 当前项目ID
    locationName: '', // 当前位置名称
    photoCounter: 0, // 已拍摄照片计数
    
    // 相机支持的功能
    supportedFlash: ['auto', 'on', 'off']
  },

  onLoad(options) {
    // 获取上个页面传递的参数
    if (options) {
      const { projectId, locationName, modeTitle } = options;
      
      let data = {};
      if (projectId) data.projectId = projectId;
      if (locationName) data.locationName = locationName;
      if (modeTitle) data.modeTitle = modeTitle;
      
      if (Object.keys(data).length > 0) {
        this.setData(data);
      }
    }
    
    // 获取已拍摄照片数量
    this.loadPhotoCounter();
  },
  
  onShow() {
    // 刷新照片计数
    this.loadPhotoCounter();
  },
  
  onReady() {
    // 创建相机上下文
    this.cameraContext = wx.createCameraContext();
    
    // 设置相机就绪状态
    this.setData({
      isReady: true
    });
  },
  
  onUnload() {
    // 释放资源
    this.cameraContext = null;
  },
  
  // 加载照片计数
  loadPhotoCounter() {
    if (!this.data.projectId) {
      return;
    }
    
    photoStorage.getPhotos(
      { projectId: this.data.projectId },
      photos => {
        this.setData({
          photoCounter: photos.length
        });
      }
    );
  },
  
  // 处理相机错误
  handleCameraError(e) {
    console.error('相机错误:', e.detail);
    
    this.setData({
      hasError: true,
      errorMsg: e.detail.errMsg || '相机发生错误'
    });
    
    wx.showToast({
      title: '相机初始化失败',
      icon: 'none'
    });
  },
  
  // 切换前后摄像头
  switchCamera() {
    if (this.data.isTaking) {
      return;
    }
    
    const newPosition = this.data.devicePosition === 'back' ? 'front' : 'back';
    
    this.setData({
      devicePosition: newPosition
    });
  },
  
  // 切换闪光灯模式
  switchFlash() {
    if (this.data.isTaking) {
      return;
    }
    
    const currentIndex = this.data.supportedFlash.indexOf(this.data.flash);
    const nextIndex = (currentIndex + 1) % this.data.supportedFlash.length;
    
    this.setData({
      flash: this.data.supportedFlash[nextIndex]
    });
  },
  
  // 处理相机模式变更
  handleModeChange(e) {
    const mode = e.detail.mode;
    this.setData({
      cameraMode: mode
    });
  },
  
  // 处理开始拍照
  handleCaptureStart(e) {
    // 防止重复拍照
    if (this.data.isTaking) {
      return;
    }
    
    this.setData({
      isTaking: true
    });
    
    // 根据模式拍照
    this.takePhoto();
  },
  
  // 处理拍照准备
  handleCapturePrepare(e) {
    const { mode, count, interval, delay } = e.detail;
    
    // 显示提示
    let message = '';
    if (mode === 'continuous') {
      message = `连拍模式：${count}张照片，间隔${interval/1000}秒`;
    } else if (mode === 'timer') {
      message = `倒计时：${delay}秒`;
    }
    
    if (message) {
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 1500
      });
    }
  },
  
  // 拍照
  takePhoto() {
    if (!this.data.isReady || !this.cameraContext) {
      wx.showToast({
        title: '相机未就绪',
        icon: 'none'
      });
      this.setData({ isTaking: false });
      return;
    }
    
    // 拍照前播放声音和动画效果
    this.playShutterSound();
    this.showShutterAnimation();
    
    // 执行拍照
    this.cameraContext.takePhoto({
      quality: this.mapResolutionToQuality(this.data.resolution),
      success: (res) => {
        // 压缩图片
        this.compressAndPreviewPhoto(res.tempImagePath);
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        wx.showToast({
          title: '拍照失败，请重试',
          icon: 'none'
        });
        this.setData({ isTaking: false });
      }
    });
  },
  
  // 将分辨率映射到拍照质量
  mapResolutionToQuality(resolution) {
    const qualityMap = {
      'low': 'low',
      'medium': 'normal',
      'high': 'high'
    };
    return qualityMap[resolution] || 'normal';
  },
  
  // 压缩和预览照片
  compressAndPreviewPhoto(tempImagePath) {
    // 连拍或定时模式下直接保存照片，不显示预览
    if (this.data.cameraMode !== 'normal') {
      this.savePhoto(tempImagePath);
      return;
    }
    
    // 标准模式下显示预览
    this.setData({
      tempImagePath: tempImagePath,
      showPreview: true,
      isTaking: false
    });
  },
  
  // 保存照片
  savePhoto(tempImagePath = '') {
    const imagePath = tempImagePath || this.data.tempImagePath;
    
    if (!imagePath) {
      this.setData({ isTaking: false });
      return;
    }
    
    // 连拍或定时模式无需显示loading
    if (this.data.cameraMode === 'normal') {
      wx.showLoading({ title: '保存中...' });
    }
    
    // 压缩照片
    imageCompressor.compressImage({
      src: imagePath,
      quality: 80,
      success: (res) => {
        // 保存照片信息
        const photoInfo = {
          projectId: this.data.projectId,
          locationId: this.data.locationName,
          filePath: res.tempFilePath,
          remark: `使用${this.data.cameraMode}模式拍摄`
        };
        
        // 保存到存储
        photoStorage.savePhoto(photoInfo, (success, photoId) => {
          if (this.data.cameraMode === 'normal') {
            wx.hideLoading();
          }
          
          if (success) {
            // 更新照片计数
            this.setData({
              photoCounter: this.data.photoCounter + 1,
              showPreview: false,
              tempImagePath: '',
              isTaking: false
            });
            
            // 连拍或定时模式下不显示提示
            if (this.data.cameraMode === 'normal') {
              wx.showToast({
                title: '照片已保存',
                icon: 'success'
              });
            }
          } else {
            console.error('保存照片失败');
            wx.showToast({
              title: '保存失败，请重试',
              icon: 'none'
            });
            this.setData({ isTaking: false });
          }
        });
      },
      fail: (error) => {
        console.error('压缩图片失败:', error);
        
        if (this.data.cameraMode === 'normal') {
          wx.hideLoading();
        }
        
        wx.showToast({
          title: '图片处理失败',
          icon: 'none'
        });
        
        this.setData({ isTaking: false });
      }
    });
  },
  
  // 取消保存
  cancelSave() {
    this.setData({
      showPreview: false,
      tempImagePath: ''
    });
  },
  
  // 查看照片列表
  viewPhotoList() {
    wx.navigateTo({
      url: `/pages/photo-list/index?projectId=${this.data.projectId}&locationName=${this.data.locationName}`
    });
  },
  
  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },
  
  // 播放快门声音
  playShutterSound() {
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = '/assets/sounds/shutter.mp3';
    innerAudioContext.play();
  },
  
  // 显示快门动画
  showShutterAnimation() {
    // 创建一个白色遮罩快速闪现再消失的动画效果
    const shutterMask = this.selectComponent('#shutterMask');
    if (shutterMask) {
      shutterMask.flash();
    }
  },
  
  // 处理拍照完成事件
  handleCaptureComplete(e) {
    const { mode, count } = e.detail;
    
    let message = '';
    if (mode === 'continuous') {
      message = `已完成${count}张连拍`;
    } else if (mode === 'timer') {
      message = '定时拍照完成';
    }
    
    if (message) {
      wx.showToast({
        title: message,
        icon: 'success',
        duration: 2000
      });
    }
    
    // 更新状态
    this.setData({
      isTaking: false
    });
  }
}) 