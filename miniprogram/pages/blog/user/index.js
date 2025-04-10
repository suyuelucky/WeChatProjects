/**
 * 用户博客页
 * 创建时间：2025年04月10日 21:10:59
 * 创建者：Claude助手
 * 编辑时间：2025年04月10日 22:18:15
 * 编辑内容：修复导航路径格式
 */

Page({
  data: {
    userInfo: {},
    blogList: [],
    loading: false
  },

  onLoad: function (options) {
    // 获取用户信息
    this.getUserInfo();
    // 获取用户发布的博客列表
    this.loadUserBlogs();
  },

  /**
   * 获取用户信息
   */
  getUserInfo: function () {
    // 模拟获取用户信息
    this.setData({
      userInfo: {
        avatarUrl: 'https://picsum.photos/200/200?random=user',
        nickName: '测试用户',
        signature: '这是一个测试签名'
      }
    });
  },

  /**
   * 加载用户发布的博客列表
   */
  loadUserBlogs: function () {
    this.setData({ loading: true });

    // 模拟加载用户博客列表
    setTimeout(() => {
      const mockBlogs = [];
      
      // 生成10条测试博客
      for (let i = 0; i < 10; i++) {
        mockBlogs.push({
          id: `user_blog_${i}`,
          content: `这是用户发布的第${i + 1}条博客内容，测试博客内容展示效果。`,
          images: i % 2 === 0 ? [
            `https://picsum.photos/400/300?random=${i}`,
            i % 3 === 0 ? `https://picsum.photos/400/300?random=${i + 10}` : ''
          ].filter(Boolean) : [],
          createTime: new Date(Date.now() - i * 3600000 * 24).toLocaleString(),
          likes: Math.floor(Math.random() * 50),
          comments: Math.floor(Math.random() * 10)
        });
      }
      
      this.setData({
        blogList: mockBlogs,
        loading: false
      });
    }, 1000);
  },

  /**
   * 点击博客项
   */
  onTapBlogItem: function (e) {
    const { id } = e.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/blog/detail/index?id=${id}`
    });
  },

  /**
   * 点击发布按钮
   */
  onTapPublish: function () {
    wx.navigateTo({
      url: '/pages/blog/publish/index'
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function () {
    this.loadUserBlogs();
    wx.stopPullDownRefresh();
  },

  /**
   * 分享
   */
  onShareAppMessage: function () {
    return {
      title: `${this.data.userInfo.nickName}的博客`,
      path: '/pages/blog/user/index'
    };
  }
}); 