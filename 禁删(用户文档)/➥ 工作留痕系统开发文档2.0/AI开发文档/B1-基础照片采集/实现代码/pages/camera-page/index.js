const photoStorage = require('../../utils/photo-storage');
const compressImage = require('../../utils/image-compressor');

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
    // 页面显示时检查授权状态
    this.checkCameraAuth();
  },
  
  // 检查相机权限
  checkCameraAuth() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.camera'] === false) {
          this.setData({
            hasError: true,
            errorMsg: '未获得相机权限，请在设置中允许使用相机'
          });
        } else if (res.authSetting['scope.camera'] === true) {
          // 已授权，直接初始化相机
          this.setData({
            hasError: false,
            errorMsg: ''
          });
        } else {
          // 首次使用，需要请求权限
          wx.authorize({
            scope: 'scope.camera',
            success: () => {
              this.setData({
                hasError: false,
                errorMsg: ''
              });
            },
            fail: () => {
              this.setData({
                hasError: true,
                errorMsg: '未获得相机权限，请允许使用相机'
              });
            }
          });
        }
      }
    });
  },
  
  // 加载已拍摄照片计数
  loadPhotoCounter() {
    if (this.data.projectId) {
      photoStorage.getPhotoCount(this.data.projectId, this.data.locationName)
        .then(count => {
          this.setData({ photoCounter: count });
        })
        .catch(err => {
          console.error('获取照片计数失败', err);
        });
    }
  },
  
  // 相机准备就绪
  handleCameraReady() {
    this.setData({ isReady: true });
  },
  
  // 相机出错
  handleCameraError(e) {
    console.error('相机错误:', e.detail);
    this.setData({
      hasError: true,
      errorMsg: e.detail.errMsg || '相机发生错误'
    });
  },
  
  // 切换相机位置（前后摄像头）
  handleSwitchCamera(e) {
    const position = e.detail?.position || (this.data.devicePosition === 'back' ? 'front' : 'back');
    this.setData({ devicePosition: position });
  },
  
  // 切换闪光灯模式
  handleSwitchFlash(e) {
    const flash = e.detail?.flash || 'auto';
    this.setData({ flash });
  },
  
  // 拍照
  handleTakePhoto() {
    if (this.data.isTaking || !this.data.isReady) {
      return;
    }
    
    this.setData({ isTaking: true });
    
    // 获取相机组件实例
    const cameraContext = wx.createCameraContext();
    
    // 拍照
    cameraContext.takePhoto({
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
  
  // 压缩并预览照片
  compressAndPreviewPhoto(tempImagePath) {
    compressImage(tempImagePath)
      .then(compressedPath => {
        this.setData({
          tempImagePath: compressedPath,
          showPreview: true,
          isTaking: false
        });
      })
      .catch(err => {
        console.error('压缩图片失败:', err);
        // 压缩失败时使用原图
        this.setData({
          tempImagePath: tempImagePath,
          showPreview: true,
          isTaking: false
        });
      });
  },
  
  // 将分辨率设置映射到相机质量参数
  mapResolutionToQuality(resolution) {
    const qualityMap = {
      'low': 'low',
      'medium': 'normal',
      'high': 'high'
    };
    return qualityMap[resolution] || 'normal';
  },
  
  // 保存照片
  handleSavePhoto() {
    if (!this.data.tempImagePath) {
      return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    photoStorage.savePhoto({
      projectId: this.data.projectId,
      locationName: this.data.locationName,
      tempImagePath: this.data.tempImagePath,
      devicePosition: this.data.devicePosition,
      createTime: new Date().getTime()
    })
      .then(() => {
        wx.hideLoading();
        
        // 更新照片计数
        this.setData({
          photoCounter: this.data.photoCounter + 1,
          showPreview: false,
          tempImagePath: ''
        });
        
        wx.showToast({
          title: '照片已保存',
          icon: 'success'
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('保存照片失败:', err);
        
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
      });
  },
  
  // 重新拍照（放弃当前照片）
  handleRetakePhoto() {
    this.setData({
      showPreview: false,
      tempImagePath: ''
    });
  },
  
  // 返回上一页
  handleBack() {
    wx.navigateBack();
  },
  
  // 打开照片列表页
  viewPhotoList() {
    wx.navigateTo({
      url: `/pages/photo-list/index?projectId=${this.data.projectId}&locationName=${this.data.locationName}`
    });
  }
}); 