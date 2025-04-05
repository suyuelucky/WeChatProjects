// 日记首页

Page({
  /**
   * 页面的初始数据
   */
  data: {
    diaries: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 加载日记数据
    this.loadDiaries();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 页面显示时刷新数据
    this.loadDiaries();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    // 下拉刷新
    this.loadDiaries();
    wx.stopPullDownRefresh();
  },

  /**
   * 加载日记数据
   */
  loadDiaries: function () {
    try {
      // 从本地缓存获取日记数据
      const diaries = wx.getStorageSync('diaries') || [];
      
      // 按日期倒序排列
      diaries.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      this.setData({
        diaries: diaries
      });
    } catch (error) {
      console.error('加载日记失败:', error);
      wx.showToast({
        title: '加载日记失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  /**
   * 跳转到日记编辑页面
   */
  navigateToEditor: function () {
    wx.navigateTo({
      url: '/pages/diary/editor/index'
    });
  },

  /**
   * 查看日记详情
   */
  viewDiary: function (e) {
    const diaryId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/diary/editor/index?id=${diaryId}`
    });
  }
}); 