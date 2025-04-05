// pages/discover/index.js
Page({
  data: {
    feeds: [
      {
        id: 1,
        title: '街道志愿者活动圆满完成',
        author: '北海老街社区',
        authorAvatar: '/static/images/demo/avatar1.jpg',
        coverImages: ['/static/images/demo/volunteer1.jpg', '/static/images/demo/volunteer2.jpg'],
        publishTime: '2025-03-26 10:30',
        viewCount: 258,
        likeCount: 45,
        commentCount: 12,
        isOfficial: true,
        summary: '今天，北海老街社区组织了一场志愿者活动，共有50名志愿者参与，清理了社区环境...'
      },
      {
        id: 2,
        title: '基层干部培训会议顺利举行',
        author: '丰台区民政局',
        authorAvatar: '/static/images/demo/avatar2.jpg',
        coverImages: ['/static/images/demo/meeting1.jpg'],
        publishTime: '2025-03-25 15:20',
        viewCount: 176,
        likeCount: 38,
        commentCount: 5,
        isOfficial: true,
        summary: '为进一步提升基层干部工作能力，丰台区民政局组织了一场培训会议，邀请专家讲解...'
      },
      {
        id: 3,
        title: '社区便民服务指南',
        author: '城东社区',
        authorAvatar: '/static/images/demo/avatar3.jpg',
        coverImages: [
          '/static/images/demo/service1.jpg', 
          '/static/images/demo/service2.jpg', 
          '/static/images/demo/service3.jpg'
        ],
        publishTime: '2025-03-24 09:15',
        viewCount: 345,
        likeCount: 67,
        commentCount: 24,
        isOfficial: true,
        summary: '为方便居民办理各项业务，城东社区整理了最新的便民服务指南，包括办理流程...'
      },
      {
        id: 4,
        title: '社区垃圾分类成效显著',
        author: '张明',
        authorAvatar: '/static/images/demo/avatar4.jpg',
        coverImages: ['/static/images/demo/recycle1.jpg'],
        publishTime: '2025-03-23 14:40',
        viewCount: 203,
        likeCount: 42,
        commentCount: 8,
        isOfficial: false,
        summary: '自从实施垃圾分类以来，我们社区的环境变得更加整洁，居民的参与意识也得到了提高...'
      }
    ],
    banners: [
      {
        id: 1,
        image: '/static/images/demo/banner1.jpg',
        title: '社区工作者表彰大会',
        url: '/pages/discover/detail?id=5'
      },
      {
        id: 2,
        image: '/static/images/demo/banner2.jpg',
        title: '2025年基层工作新要求',
        url: '/pages/discover/detail?id=6'
      },
      {
        id: 3,
        image: '/static/images/demo/banner3.jpg',
        title: '社区便民服务创新案例',
        url: '/pages/discover/detail?id=7'
      }
    ],
    categories: [
      { id: 1, name: '社区动态', icon: '/static/images/icons/community.png' },
      { id: 2, name: '政策解读', icon: '/static/images/icons/policy.png' },
      { id: 3, name: '便民服务', icon: '/static/images/icons/service.png' },
      { id: 4, name: '志愿活动', icon: '/static/images/icons/volunteer.png' },
      { id: 5, name: '工作指南', icon: '/static/images/icons/guide.png' }
    ],
    activeTab: 'recommend', // recommend, following, official
    isLoading: false,
    networkStatus: 'online',
    searchText: '',
    showSearchBar: false
  },

  onLoad: function() {
    this.checkNetworkStatus();
    
    wx.onNetworkStatusChange(res => {
      this.setData({
        networkStatus: res.isConnected ? 'online' : 'offline'
      });
    });
  },

  checkNetworkStatus: function() {
    wx.getNetworkType({
      success: res => {
        this.setData({
          networkStatus: res.networkType === 'none' ? 'offline' : 'online'
        });
      }
    });
  },

  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  toggleSearchBar: function() {
    this.setData({
      showSearchBar: !this.data.showSearchBar
    });
  },

  onSearch: function(e) {
    this.setData({
      searchText: e.detail.value
    });
    // 实际应用中这里会过滤内容
  },

  goToDetail: function(e) {
    const feedId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/discover/detail?id=${feedId}`
    });
  },

  goToUnitHome: function(e) {
    const unitId = e.currentTarget.dataset.unit;
    wx.navigateTo({
      url: `/pages/discover/unit?id=${unitId}`
    });
  },

  goToCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/discover/category?id=${categoryId}`
    });
  },

  goToSearch: function() {
    wx.navigateTo({
      url: '/pages/discover/search'
    });
  },

  onPullDownRefresh: function() {
    this.setData({
      isLoading: true
    });
    
    // 模拟刷新
    setTimeout(() => {
      this.setData({
        isLoading: false
      });
      wx.stopPullDownRefresh();
    }, 1000);
  },

  onReachBottom: function() {
    // 模拟加载更多
    wx.showLoading({
      title: '加载中',
    });
    
    setTimeout(() => {
      wx.hideLoading();
    }, 1000);
  },

  onShareAppMessage: function() {
    return {
      title: '绣花针 - 发现社区精彩',
      path: '/pages/discover/index'
    };
  }
}); 