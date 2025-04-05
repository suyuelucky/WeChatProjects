// 发现页面脚本
Page({
  /**
   * 页面的初始数据
   */
  data: {
    navItems: [
      { id: 1, name: '热门活动', icon: '🎉' },
      { id: 2, name: '附近', icon: '📍' },
      { id: 3, name: '好物推荐', icon: '🎁' },
      { id: 4, name: '打卡地点', icon: '📸' },
      { id: 5, name: '创意手工', icon: '🧶' },
      { id: 6, name: '旅行攻略', icon: '🧳' },
      { id: 7, name: '美食', icon: '🍜' },
      { id: 8, name: '心理', icon: '🧠' },
      { id: 9, name: '读书', icon: '📚' },
      { id: 10, name: '更多', icon: '⋯' }
    ],
    recommendedContent: [
      {
        id: 1,
        title: '2025年最值得去的10个小众旅行地',
        description: '厌倦了人挤人的景点？这些小众目的地能带给你意想不到的惊喜。',
        image: '/static/images/banner1.jpg'
      },
      {
        id: 2,
        title: '居家整理术：如何让你的家焕然一新',
        description: '10个简单的整理技巧，让你的家更加整洁舒适。',
        image: '/static/images/banner2.jpg'
      },
      {
        id: 3,
        title: '每天15分钟冥想，改变你的注意力和专注度',
        description: '科学证明，冥想能有效缓解压力，提高注意力。',
        image: '/static/images/banner1.jpg'
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    
  },

  /**
   * 搜索点击事件
   */
  onSearchTap: function () {
    wx.showToast({
      title: '搜索功能开发中',
      icon: 'none'
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '发现更多精彩内容',
      path: '/pages/discover/index/index'
    };
  }
}); 