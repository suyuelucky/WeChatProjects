const app = getApp();

Page({
  data: {
    motto: '欢迎使用绣花针',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: typeof wx.getUserProfile === 'function',
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && 
      wx.canIUse('open-data.type.userNickName'),
    lastPage: '',
  },
  
  onLoad() {
    // 读取上次离开的页面
    try {
      const lastPage = wx.getStorageSync('lastPage') || '';
      if (lastPage) {
        this.setData({ lastPage });
      }
    } catch (e) {
      console.error('读取lastPage失败', e);
    }
    
    // 监听网络状态变化
    app.onNetworkStatusChange(res => {
      app.globalData.networkType = res.networkType;
      app.globalData.isConnected = res.isConnected;
      
      if (!res.isConnected) {
        wx.showToast({
          title: '网络已断开',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
    wx.getUserProfile({
      desc: '展示用户信息', 
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
      }
    });
  },
  
  goToDiscover() {
    // 使用switchTab确保正确切换到tabBar页面
    wx.switchTab({
      url: '/pages/discover/index/index',
      success: () => {
        console.log('成功跳转到发现页面');
        wx.setStorageSync('lastPage', 'discover');
      },
      fail: (err) => {
        console.error('跳转到发现页面失败', err);
        // 提示用户
        wx.showToast({
          title: '页面跳转失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  goToDiary() {
    // 使用switchTab确保正确切换到tabBar页面
    wx.switchTab({
      url: '/pages/diary/index/index',
      success: () => {
        console.log('成功跳转到日记页面');
        wx.setStorageSync('lastPage', 'diary');
      },
      fail: (err) => {
        console.error('跳转到日记页面失败', err);
        // 提示用户
        wx.showToast({
          title: '页面跳转失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  takePicture() {
    wx.navigateTo({
      url: '/pages/diary/camera/index',
      fail: (err) => {
        console.error('跳转到相机页面失败', err);
        wx.showToast({
          title: '相机功能加载失败，请重试',
          icon: 'none'
        });
      }
    });
  }
}); 