App({
  globalData: {
    version: '1.0.0',
    systemInfo: null
  },

  onLaunch: function() {
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查相机权限
    this.checkCameraAuth();
    
    // 检查存储空间
    this.checkStorageSpace();
  },
  
  getSystemInfo: function() {
    try {
      var info = wx.getSystemInfoSync();
      this.globalData.systemInfo = info;
      console.log('系统信息:', info);
    } catch (e) {
      console.error('获取系统信息失败:', e);
    }
  },
  
  checkCameraAuth: function() {
    var that = this;
    wx.getSetting({
      success: function(res) {
        if (!res.authSetting['scope.camera']) {
          // 首次进入或未授权，将在使用相机时请求授权
          console.log('相机未授权');
        } else if (res.authSetting['scope.camera'] === false) {
          // 之前拒绝过授权
          wx.showModal({
            title: '提示',
            content: '需要您授权相机权限才能进行照片采集，是否前往设置开启权限？',
            success: function(tip) {
              if (tip.confirm) {
                wx.openSetting({
                  success: function(setting) {
                    console.log('设置页授权结果:', setting);
                  }
                });
              }
            }
          });
        }
      }
    });
  },
  
  onError: function(err) {
    // 全局错误捕获
    console.error('应用发生错误:', err);
  },
  
  checkStorageSpace: function() {
    wx.getStorageInfo({
      success: function(res) {
        var usagePercentage = (res.currentSize / res.limitSize) * 100;
        console.log('存储空间使用率:', usagePercentage.toFixed(2) + '%');
        
        // 如果存储空间使用率超过90%，提示用户
        if (usagePercentage > 90) {
          wx.showModal({
            title: '存储空间不足',
            content: '本地存储空间即将用尽，建议清理部分数据以确保正常使用',
            showCancel: false
          });
        }
      }
    });
  }
}) 