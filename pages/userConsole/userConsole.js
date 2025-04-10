/**
 * 用户控制台页面
 * 创建时间：2025年04月10日 21:40:59
 * 创建者：Claude助手
 */

Page({
  data: {
    openid: '',
    userInfo: {},
    isLoading: true,
    functionList: [
      { id: 'userInfo', name: '用户信息', icon: 'user' },
      { id: 'setting', name: '应用设置', icon: 'setting' },
      { id: 'storage', name: '数据存储', icon: 'storage' },
      { id: 'trace', name: '故障排查', icon: 'bug' }
    ]
  },

  onLoad: function(options) {
    this.setData({
      isLoading: true
    });

    // 获取用户openid和信息
    this.getUserOpenId();
  },

  // 获取用户openid
  getUserOpenId: function() {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] [login] 调用成功', res);
        this.setData({
          openid: res.result.openid,
          isLoading: false
        });
        
        // 获取用户信息
        this.getUserInfo();
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err);
        this.setData({
          isLoading: false
        });
        
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取用户信息
  getUserInfo: function() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: res => {
        this.setData({
          userInfo: res.userInfo
        });
      },
      fail: err => {
        console.error('获取用户信息失败', err);
      }
    });
  },

  // 处理功能点击
  handleFunctionClick: function(e) {
    const functionId = e.currentTarget.dataset.id;
    
    switch(functionId) {
      case 'userInfo':
        this.navigateToUserInfo();
        break;
      case 'setting':
        this.navigateToSetting();
        break;
      case 'storage':
        this.navigateToStorage();
        break;
      case 'trace':
        this.navigateToTrace();
        break;
      default:
        break;
    }
  },

  // 跳转到用户信息页面
  navigateToUserInfo: function() {
    wx.showToast({
      title: '用户信息功能开发中',
      icon: 'none'
    });
  },

  // 跳转到设置页面
  navigateToSetting: function() {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    });
  },

  // 跳转到数据存储页面
  navigateToStorage: function() {
    wx.navigateTo({
      url: '/pages/storage-demo/storage-demo',
    });
  },

  // 跳转到故障排查页面
  navigateToTrace: function() {
    wx.navigateTo({
      url: '/pages/trace/index/index',
    });
  },

  // 清除缓存
  clearStorage: function() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？这将清除所有本地存储的数据。',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              wx.showToast({
                title: '缓存已清除',
                icon: 'success'
              });
            },
            fail: (err) => {
              console.error('清除缓存失败', err);
              wx.showToast({
                title: '清除缓存失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  }
}); 