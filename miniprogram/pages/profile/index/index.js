// 个人资料页面脚本
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    userId: '10086',
    stats: {
      diaries: 0,
      ledgers: 0,
      days: 0
    },
    menuItems1: [
      { id: 'sync', name: '数据同步', iconClass: 'icon-sync' },
      { id: 'collection', name: '我的收藏', iconClass: 'icon-favorite' },
      { id: 'notification', name: '消息通知', iconClass: 'icon-notification' }
    ],
    menuItems2: [
      { id: 'settings', name: '设置', iconClass: 'icon-settings' },
      { id: 'feedback', name: '意见反馈', iconClass: 'icon-feedback' },
      { id: 'about', name: '关于我们', iconClass: 'icon-about' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadUserInfo();
    this.loadStats();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.loadUserInfo();
    this.loadStats();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo: function () {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.setData({
          userInfo
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  /**
   * 加载统计数据
   */
  loadStats: function () {
    try {
      // 获取日记数量
      const diaries = wx.getStorageSync('diaries') || [];
      
      // 获取记账数量
      const ledgers = wx.getStorageSync('ledgers') || [];
      
      // 获取连续天数（示例）
      const days = 3;
      
      this.setData({
        stats: {
          diaries: diaries.length,
          ledgers: ledgers.length,
          days
        }
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  /**
   * 编辑资料
   */
  editProfile: function () {
    wx.showToast({
      title: '编辑资料功能开发中',
      icon: 'none'
    });
  },

  /**
   * 菜单项点击事件
   */
  onMenuItemTap: function (e) {
    const id = e.currentTarget.dataset.id;
    
    switch (id) {
      case 'sync':
        this.handleSync();
        break;
      case 'collection':
        this.handleCollection();
        break;
      case 'notification':
        this.handleNotification();
        break;
      case 'settings':
        this.handleSettings();
        break;
      case 'feedback':
        this.handleFeedback();
        break;
      case 'about':
        this.handleAbout();
        break;
      default:
        break;
    }
  },

  /**
   * 处理同步
   */
  handleSync: function () {
    wx.showToast({
      title: '数据同步功能开发中',
      icon: 'none'
    });
  },

  /**
   * 处理收藏
   */
  handleCollection: function () {
    wx.showToast({
      title: '收藏功能开发中',
      icon: 'none'
    });
  },

  /**
   * 处理通知
   */
  handleNotification: function () {
    wx.showToast({
      title: '通知功能开发中',
      icon: 'none'
    });
  },

  /**
   * 处理设置
   */
  handleSettings: function () {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    });
  },

  /**
   * 处理反馈
   */
  handleFeedback: function () {
    wx.showToast({
      title: '反馈功能开发中',
      icon: 'none'
    });
  },

  /**
   * 处理关于
   */
  handleAbout: function () {
    wx.showToast({
      title: '关于我们功能开发中',
      icon: 'none'
    });
  },

  /**
   * 登录
   */
  login: function () {
    wx.showToast({
      title: '登录功能开发中',
      icon: 'none'
    });
  }
}); 