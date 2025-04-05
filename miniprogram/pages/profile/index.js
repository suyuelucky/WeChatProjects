// pages/profile/index.js
Page({
  data: {
    isLoggedIn: false,
    isNetworkConnected: true,
    userInfo: null,
    loadingUserInfo: true,
    badges: [],
    stats: {
      diaryCount: 0,
      ledgerCount: 0,
      followingCount: 0,
      followersCount: 0
    },
    functionList: [
      {
        id: 'settings',
        name: '设置',
        iconClass: 'icon-settings',
        url: '/pages/profile/settings/index'
      },
      {
        id: 'favorites',
        name: '我的收藏',
        iconClass: 'icon-favorite',
        url: '/pages/profile/favorites/index'
      },
      {
        id: 'feedback',
        name: '意见反馈',
        iconClass: 'icon-feedback',
        url: '/pages/profile/feedback/index'
      },
      {
        id: 'about',
        name: '关于我们',
        iconClass: 'icon-about',
        url: '/pages/profile/about/index'
      }
    ]
  },

  onLoad: function() {
    this._checkNetworkStatus();
    this._loadUserData();
  },

  onShow: function() {
    // 每次页面显示时刷新用户数据
    if (this.data.isNetworkConnected) {
      this._loadUserData();
    }
  },

  onPullDownRefresh: function() {
    // 下拉刷新
    this._loadUserData(true);
  },

  // 检查网络状态
  _checkNetworkStatus: function() {
    wx.getNetworkType({
      success: (res) => {
        this.setData({
          isNetworkConnected: res.networkType !== 'none'
        });
      }
    });

    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      this.setData({
        isNetworkConnected: res.isConnected
      });
      if (res.isConnected) {
        this._loadUserData();
      }
    });
  },

  // 加载用户数据
  _loadUserData: function(isPullDownRefresh = false) {
    // 模拟加载用户数据
    this.setData({
      loadingUserInfo: true
    });

    // 模拟网络请求
    setTimeout(() => {
      // 模拟用户数据
      const mockUserInfo = {
        nickName: '优雅的香奈儿',
        avatarUrl: '/images/avatar.png',
        gender: 1, // 1男性，2女性
        city: '上海',
        signature: '优雅永不过时',
        level: 5,
        points: 2350,
        vipLevel: 2,
        vipExpireDate: '2025-06-30'
      };

      // 模拟徽章数据
      const mockBadges = [
        { id: 'writer', name: '优秀写手', icon: '/images/badges/writer.png', level: 3 },
        { id: 'bookkeeper', name: '记账达人', icon: '/images/badges/bookkeeper.png', level: 2 },
        { id: 'traveler', name: '旅行家', icon: '/images/badges/traveler.png', level: 4 },
        { id: 'collector', name: '收藏家', icon: '/images/badges/collector.png', level: 1 }
      ];

      // 模拟统计数据
      const mockStats = {
        diaryCount: 28,
        ledgerCount: 15,
        followingCount: 65,
        followersCount: 120
      };

      this.setData({
        isLoggedIn: true,
        userInfo: mockUserInfo,
        badges: mockBadges,
        stats: mockStats,
        loadingUserInfo: false
      });

      if (isPullDownRefresh) {
        wx.stopPullDownRefresh();
      }
    }, 800);
  },

  // 跳转到登录页面
  goToLogin: function() {
    wx.navigateTo({
      url: '/pages/login/index'
    });
  },

  // 跳转到个人资料编辑页面
  editProfile: function() {
    wx.navigateTo({
      url: '/pages/profile/edit/index'
    });
  },

  // 跳转到VIP详情页面
  goToVipDetails: function() {
    wx.navigateTo({
      url: '/pages/profile/vip/index'
    });
  },

  // 跳转到徽章详情页面
  viewBadgeDetails: function(e) {
    const badgeId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/profile/badge/index?id=${badgeId}`
    });
  },

  // 跳转到功能页面
  goToFunction: function(e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({
      url: url
    });
  },

  // 跳转到日记列表
  viewDiaries: function() {
    wx.switchTab({
      url: '/pages/diary/index'
    });
  },

  // 跳转到账本列表
  viewLedgers: function() {
    wx.switchTab({
      url: '/pages/ledger/index'
    });
  },

  // 跳转到关注列表
  viewFollowing: function() {
    wx.navigateTo({
      url: '/pages/profile/following/index'
    });
  },

  // 跳转到粉丝列表
  viewFollowers: function() {
    wx.navigateTo({
      url: '/pages/profile/followers/index'
    });
  },

  // 分享小程序
  onShareAppMessage: function() {
    return {
      title: '秀花针 - 优雅记录每一天',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  }
}); 