App({
  globalData: {
    version: '1.0.0',
    systemInfo: null
  },
  
  onLaunch() {
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查相机权限
    this.checkCameraAuth();
  },
  
  // 获取系统信息
  getSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = systemInfo;
      console.log('系统信息:', systemInfo);
    } catch (err) {
      console.error('获取系统信息失败:', err);
    }
  },
  
  // 检查相机权限
  checkCameraAuth() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.camera'] === false) {
          // 用户拒绝过相机权限
          console.log('用户曾拒绝相机权限');
          
          // 引导用户打开设置页授权
          setTimeout(() => {
            wx.showModal({
              title: '相机权限',
              content: '照片采集需要相机权限，是否前往设置开启？',
              confirmText: '去设置',
              cancelText: '暂不',
              success: (result) => {
                if (result.confirm) {
                  wx.openSetting();
                }
              }
            });
          }, 1000);
        }
      }
    });
  },
  
  // 全局错误处理
  onError(err) {
    console.error('应用发生错误:', err);
    // 可以添加错误日志上报逻辑
  },
  
  // 检查存储空间
  checkStorageSpace() {
    wx.getStorageInfo({
      success: (res) => {
        console.log('存储信息:', res);
        
        // 存储空间超过90%，提示用户清理
        if (res.currentSize / res.limitSize > 0.9) {
          wx.showModal({
            title: '存储空间不足',
            content: '本地存储空间即将用完，建议清理已上传的照片',
            confirmText: '我知道了',
            showCancel: false
          });
        }
      }
    });
  }
}); 